import assert from "node:assert/strict";
import { test } from "node:test";
import { RogueController } from "../src/rogue-v1/controller";
import type { RogueAction } from "../src/rogue-v1/controller";
import {
  ROGUE_SAVE_KEY,
  validateRogueSave,
} from "../src/rogue-v1/saved-session";
import {
  ROGUE_STORE_KEY,
  RogueSaveRepository,
} from "../src/rogue-v1/save-repository";
import { DEFAULT_CONFIG, solveRules } from "../src/rogue-v1";
import type { Clock } from "../src/rogue-v1/playtest/session";

class ManualClock implements Clock {
  time = 0;
  civil = 1_700_000_000_000;
  next = 0;
  jobs = new Map<number, { at: number; callback: () => void }>();
  now() {
    return this.time;
  }
  schedule(callback: () => void, ms: number) {
    this.jobs.set(++this.next, { at: this.time + ms, callback });
    return this.next;
  }
  cancel(handle: unknown) {
    this.jobs.delete(handle as number);
  }
  advance(ms: number) {
    this.time += ms;
    this.civil += ms;
    while (true) {
      const job = [...this.jobs].find(([, value]) => value.at <= this.time);
      if (!job) return;
      this.jobs.delete(job[0]);
      job[1].callback();
    }
  }
}
function memory() {
  const values = new Map<string, unknown>();
  let lock = Promise.resolve();
  let fail = false;
  let gate: Promise<void> | null = null;
  let began: (() => void) | null = null;
  const adapter = {
    exclusive<T>(work: () => Promise<T>): Promise<T> {
      const operation = lock.then(work);
      lock = operation.then(
        () => {},
        () => {},
      );
      return operation;
    },
    storage: {
      async get<T>(key: string) {
        return (
          values.has(key) ? JSON.parse(JSON.stringify(values.get(key))) : null
        ) as T | null;
      },
      async set<T>(key: string, value: T) {
        if (gate) {
          began?.();
          await gate;
        }
        if (fail) throw new Error("disk-full");
        values.set(key, JSON.parse(JSON.stringify(value)));
      },
      async remove(key: string) {
        values.delete(key);
      },
    },
  };
  return {
    adapter,
    values,
    fail: (value: boolean) => {
      fail = value;
    },
    hold() {
      let release!: () => void;
      const started = new Promise<void>((resolve) => {
        began = resolve;
      });
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return {
        started,
        release() {
          gate = null;
          release();
        },
      };
    },
  };
}
async function fixture(shared = memory(), clock = new ManualClock()) {
  let ids = 0;
  const controller = new RogueController(clock, shared.adapter, {
    civilNow: () => clock.civil,
    newId: () => `session-${Math.floor(clock.civil)}-${++ids}`,
  });
  await controller.hydrate();
  const view = () => controller.getSnapshot();
  const send = (action: RogueAction) =>
    controller.dispatch(action, view().revision);
  async function win() {
    await send({ type: "start" });
    const puzzle = view().puzzle!;
    if (puzzle.state !== "playing") throw new Error("Start before solving");
    const expression = solveRules(
      puzzle.rules,
      DEFAULT_CONFIG.search,
    ).solutions.get(puzzle.target)!.expression;
    clock.advance(1_123.456);
    await send({ type: "submit", expression });
    assert.equal(view().result?.success, true);
  }
  async function next() {
    await send({ type: "next" });
    if (view().screen === "reward") await send({ type: "choose", index: 0 });
  }
  return { shared, clock, controller, view, send, win, next };
}
function activeSave(shared: ReturnType<typeof memory>): unknown {
  const store = shared.values.get(ROGUE_STORE_KEY) as
    { active: unknown } | undefined;
  return store ? store.active : shared.values.get(ROGUE_SAVE_KEY);
}
async function reopen(f: Awaited<ReturnType<typeof fixture>>, offline: number) {
  f.controller.dispose();
  f.clock.civil += offline;
  const restored = await fixture(f.shared, f.clock);
  assert.equal(restored.view().hasSaved, true);
  await restored.send({ type: "continue" });
  return restored;
}

test("R3.2: save during puzzle, deterministic restore, hidden witnesses and elapsed civil time", async () => {
  let f = await fixture();
  assert.equal(f.view().hasSaved, false);
  await f.send({ type: "new", seed: 42 });
  assert.equal("target" in f.view().puzzle!, false);
  await f.send({ type: "start" });
  const target = f.view().puzzle!.target!;
  f.clock.advance(5_111.123);
  await f.send({ type: "hint" });
  const raw = activeSave(f.shared);
  assert.equal(validateRogueSave(raw).status, "valid");
  const text = JSON.stringify(raw);
  assert.ok(!text.includes("3+3+5*7"));
  assert.ok(!text.includes("minimumOperands"));
  f = await reopen(f, 10_000);
  assert.equal(f.view().storageError, "");
  assert.equal(f.view().puzzle!.target, target);
  assert.equal(f.view().hints, 2);
  assert.equal(f.view().remaining, 80);
  const expression = solveRules(
    f.view().puzzle!.rules,
    DEFAULT_CONFIG.search,
  ).solutions.get(target)!.expression;
  await f.send({ type: "submit", expression });
  assert.equal(f.view().score, 85);
  const score = f.view().score;
  f = await reopen(f, 500_000);
  assert.equal(f.view().screen, "result");
  assert.equal(f.view().score, score);
  assert.equal(f.view().lives, 3);
  f.controller.dispose();
});

test("R3.2: offline expiration costs one life only, repeated reloads do not duplicate failure", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  f = await reopen(f, 100_000);
  assert.equal(f.view().screen, "result");
  assert.equal(f.view().lives, 2);
  f = await reopen(f, 100_000_000);
  assert.equal(f.view().lives, 2);
  assert.equal(f.view().failures, 1);
  await f.next();
  assert.equal(f.view().screen, "preparation");
  f = await reopen(f, 900_000);
  assert.equal(f.view().remaining, 0);
  assert.equal(f.view().lives, 2);
  f.controller.dispose();
});

test("R3.2: backward wall clock expires the active puzzle conservatively, forward only once", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  f = await reopen(f, -60_000);
  assert.equal(f.view().lives, 2);
  assert.equal(f.view().result?.cause, "timeout");
  assert.match(f.view().storageNotice, /Horloge civile reculée/);
  f = await reopen(f, 3_600_000);
  assert.equal(f.view().lives, 2);
  f.controller.dispose();
});

test("R3.2: background/foreground resumes from civil time without resetting timer or input state", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  f.controller.suspend();
  assert.equal(f.clock.jobs.size, 0);
  f.clock.civil += 12_000;
  await f.controller.wake();
  assert.equal(f.view().remaining, 83);
  f.controller.suspend();
  f.clock.civil += 100_000;
  await f.controller.wake();
  assert.equal(f.view().lives, 2);
  assert.equal(f.view().failures, 1);
  await f.controller.wake();
  assert.equal(f.view().lives, 2);
  f.controller.dispose();
});

test("R3.2: reward offers, resources and constraints restored before and after choosing", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.win();
  await f.next();
  await f.win();
  await f.send({ type: "next" });
  const offers = JSON.stringify(f.view().offers);
  f = await reopen(f, 50_000);
  assert.equal(f.view().screen, "reward");
  assert.equal(JSON.stringify(f.view().offers), offers);
  const card = f.view().offers[0].card;
  const revision = f.view().revision;
  await f.controller.dispatch({ type: "choose", index: 1 }, revision);
  await f.controller.dispatch({ type: "choose", index: 1 }, revision);
  const expected = {
    score: f.view().score,
    effects: f.view().effects,
    lives: f.view().lives,
    hints: f.view().hints,
    rules: f.view().puzzle!.rules,
    target: f.view().puzzle!.target,
  };
  assert.equal(
    expected.effects.filter((effect) => effect.id === card).length,
    1,
  );
  f = await reopen(f, 90_000);
  assert.deepEqual(
    {
      score: f.view().score,
      effects: f.view().effects,
      lives: f.view().lives,
      hints: f.view().hints,
      rules: f.view().puzzle!.rules,
      target: f.view().puzzle!.target,
    },
    expected,
  );
  f.controller.dispose();
});

test("R3.2: invalid syntax stays replayable; corrupt, incompatible and altered checkpoints are refused", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  await f.send({ type: "submit", expression: "(3+5)" });
  const raw = activeSave(f.shared) as Record<string, unknown>;
  assert.equal(validateRogueSave(raw).status, "valid");
  for (const value of [
    null,
    { version: 2 },
    { ...raw, checkpoint: {} },
    { ...raw, seed: -1 },
    { ...raw, journal: [{ at: -1, command: "indice" }] },
    { ...raw, spy: () => {} },
  ])
    assert.equal(validateRogueSave(value).status, "invalid");
  assert.equal(
    validateRogueSave({ ...raw, version: 999 }).status,
    "incompatible",
  );
  assert.equal(
    validateRogueSave({ ...raw, ruleset: "changed" }).status,
    "incompatible",
  );
  f.controller.dispose();
});

test("R3.2: version-one envelope with an explicit current contract migrates without modifying the preexisting profile", async () => {
  let f = await fixture();
  f.shared.values.set("shortest:save:v3", { xp: 777, dailyDone: "2026-11-13" });
  await f.send({ type: "new", seed: 42 });
  await f.win();
  const raw = activeSave(f.shared) as Record<string, unknown>;
  const { clockAdjusted, ...legacy } = raw;
  f.shared.values.delete(ROGUE_STORE_KEY);
  f.shared.values.set(ROGUE_SAVE_KEY, { ...legacy, version: 1 });
  f = await reopen(f, 0);
  assert.equal(f.view().score, 100);
  assert.equal((activeSave(f.shared) as { version: number }).version, 2);
  assert.deepEqual(f.shared.values.get("shortest:save:v3"), {
    xp: 777,
    dailyDone: "2026-11-13",
  });
  f.controller.dispose();
});

test("R3.2: new run requires replacement, serial writes never revive an old session, abandon keeps result", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.win();
  await f.next();
  const oldId = (activeSave(f.shared) as { id: string }).id;
  await f.send({ type: "new", seed: 7 });
  assert.equal(f.view().seed, 42);
  await f.send({ type: "new", seed: 7, replace: true });
  assert.equal(f.view().score, 0);
  assert.notEqual((activeSave(f.shared) as { id: string }).id, oldId);
  f = await reopen(f, 0);
  assert.equal(f.view().seed, 7);
  assert.equal(f.view().stage, 0);
  await f.send({ type: "abandon" });
  f = await reopen(f, 0);
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().endCause, "abandoned");
  f.controller.dispose();
});

test("R3.2: write failures block play until retry, and stale controllers cannot overwrite newer saves", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  const other = await fixture(f.shared, f.clock);
  f.shared.fail(true);
  await f.send({ type: "start" });
  assert.ok(f.view().storageError);
  assert.equal(f.clock.jobs.size, 0);
  await f.send({ type: "hint" });
  assert.equal(f.view().hints, 3);
  f.shared.fail(false);
  await f.send({ type: "retry" });
  assert.equal(f.view().storageError, "");
  await other.send({ type: "new", seed: 9, replace: true });
  assert.match(other.view().storageError, /autre fenêtre/);
  assert.equal((activeSave(f.shared) as { seed: number }).seed, 42);
  f.controller.dispose();
  other.controller.dispose();
});

test("R3.2: final boss rewards, victory and survival survive restoration without duplication", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  while (f.view().screen !== "victory") {
    await f.win();
    await f.next();
  }
  const score = f.view().score;
  f = await reopen(f, 900_000);
  assert.equal(f.view().screen, "victory");
  assert.equal(f.view().score, score);
  assert.deepEqual(f.view().defeatedBosses, [1, 2, 3]);
  await f.send({ type: "survival" });
  await f.send({ type: "start" });
  f = await reopen(f, 200_000);
  assert.equal(f.view().officialVictory, true);
  assert.equal(f.view().lives, 2);
  await f.next();
  await f.send({ type: "abandon" });
  f = await reopen(f, 0);
  assert.equal(f.view().officialVictory, true);
  assert.equal(f.view().score, score);
  assert.equal(f.view().history.length, 1);
  assert.equal(f.view().history[0].status, "victory");
  assert.equal(f.view().history[0].successes, 16);
  assert.equal(f.view().history[0].failures, 1);
  assert.deepEqual(f.view().history[0].acts, [1, 2, 3]);
  assert.deepEqual(f.view().history[0].bosses, [1, 2, 3]);
  f.controller.dispose();
});

test("R3.2: an interrupted in-flight success is published only after durable commit", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  const gate = f.shared.hold();
  const commit = f.send({ type: "submit", expression: "3+3+5*7" });
  await gate.started;
  assert.equal(f.view().score, 0);
  assert.equal(f.view().screen, "playing");
  f.controller.dispose();
  const reopening = fixture(f.shared, f.clock);
  gate.release();
  await commit;
  const next = await reopening;
  await next.send({ type: "continue" });
  assert.equal(next.view().score, 100);
  assert.equal(next.view().successes, 1);
  assert.equal(next.view().screen, "result");
  next.controller.dispose();
});

test("R3.2: a failed interrupted write keeps the preceding complete save replayable", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  await f.send({ type: "start" });
  const gate = f.shared.hold();
  const commit = f.send({ type: "submit", expression: "3+3+5*7" });
  await gate.started;
  f.shared.fail(true);
  gate.release();
  await commit;
  assert.ok(f.view().storageError);
  f.controller.dispose();
  f.shared.fail(false);
  const next = await fixture(f.shared, f.clock);
  await next.send({ type: "continue" });
  assert.equal(next.view().score, 0);
  assert.equal(next.view().screen, "playing");
  await next.send({ type: "submit", expression: "3+3+5*7" });
  assert.equal(next.view().score, 100);
  assert.equal(next.view().successes, 1);
  next.controller.dispose();
});

test("R3.2: absent, corrupt and incompatible saves are preserved until an explicit replacement", async () => {
  for (const raw of [
    { corrupt: true },
    { version: 777 },
    { version: 2, id: "incomplete" },
  ]) {
    const shared = memory();
    shared.values.set(ROGUE_SAVE_KEY, raw);
    const f = await fixture(shared);
    assert.equal(f.view().hasSaved, false);
    assert.ok(f.view().storageNotice);
    await f.send({ type: "continue" });
    assert.equal(f.view().screen, "home");
    assert.deepEqual(shared.values.get(ROGUE_SAVE_KEY), raw);
    await f.send({ type: "new", seed: 42 });
    assert.equal(f.view().screen, "home");
    await f.send({ type: "new", seed: 42, replace: true });
    assert.equal(f.view().screen, "preparation");
    assert.equal(f.view().storageNotice, "");
    assert.equal(validateRogueSave(activeSave(shared)).status, "valid");
    f.controller.dispose();
  }
});

test("R3.2: restored used insurance retains both its charge and expiration", async () => {
  let tested = false;
  for (let seed = 0; seed < 12 && !tested; seed++) {
    let f = await fixture();
    await f.send({ type: "new", seed });
    await f.win();
    await f.next();
    await f.win();
    await f.send({ type: "next" });
    const index = f.view().offers.findIndex((offer) => offer.card === "T4");
    if (index < 0) {
      f.controller.dispose();
      continue;
    }
    await f.send({ type: "choose", index: index + 1 });
    await f.send({ type: "start" });
    await f.send({ type: "submit", expression: "3" });
    assert.equal(f.view().lives, 3);
    f = await reopen(f, 60_000);
    assert.equal(
      f.view().effects.find((effect) => effect.id === "T4")?.shieldUsed,
      true,
    );
    assert.equal(
      f.view().effects.find((effect) => effect.id === "T4")?.remaining,
      2,
    );
    await f.next();
    await f.send({ type: "start" });
    await f.send({ type: "submit", expression: "3" });
    assert.equal(f.view().lives, 2);
    tested = true;
    f.controller.dispose();
  }
  assert.equal(tested, true);
});

test("R3.2: refresh while a timer start is being saved cannot expose uncommitted state", async () => {
  const f = await fixture();
  await f.send({ type: "new", seed: 42 });
  const gate = f.shared.hold();
  const committing = f.send({ type: "start" });
  await gate.started;
  f.clock.advance(5_000);
  f.controller.refresh();
  assert.equal(f.view().screen, "preparation");
  assert.equal(f.view().remaining, 0);
  gate.release();
  await committing;
  assert.equal(f.view().screen, "playing");
  assert.equal(f.view().remaining, 90);
  f.controller.dispose();
});

test("R3.2.2: start publishes target and timer together, without generating again", async () => {
  const f = await fixture();
  const { Generator } = await import("../src/rogue-v1/generator");
  const original = Generator.prototype.generate;
  let generations = 0;
  Generator.prototype.generate = function (...args) {
    generations++;
    return original.apply(this, args);
  };
  try {
    await f.send({ type: "new", seed: 42 });
    assert.equal(generations, 1);
    assert.equal(f.view().puzzle?.state, "preparation");
    assert.equal("target" in f.view().puzzle!, false);
    assert.equal(f.view().remaining, 0);
    f.clock.advance(1_000_000);
    await f.send({ type: "start" });
    assert.equal(generations, 1);
    const active = f.view().puzzle!;
    assert.equal(active.state, "playing");
    assert.equal(active.target, 41);
    assert.equal(f.view().remaining, 95);
    assert.equal(f.clock.jobs.size, 1);
    f.clock.advance(10_000);
    f.controller.refresh();
    assert.equal(f.view().remaining, 85);
  } finally {
    Generator.prototype.generate = original;
    f.controller.dispose();
  }
});

test("R3.2.2: every preparation, including bosses and survival, conceals the target after restore", async () => {
  let f = await fixture();
  await f.send({ type: "new", seed: 42 });
  for (let stage = 0; stage < 18; stage++) {
    assert.equal(f.view().puzzle?.state, "preparation");
    assert.equal("target" in f.view().puzzle!, false);
    assert.ok(!JSON.stringify(f.view()).includes('"target"'));
    assert.ok(f.view().puzzle!.seconds >= 60);
    if (stage === 0) assert.equal(f.view().puzzle!.introduction, "run");
    if (stage === 1) assert.equal(f.view().puzzle!.introduction, null);
    if (f.view().phase.boss && f.view().phase.index > 0)
      assert.notEqual(f.view().puzzle!.introduction, "boss");
    if (stage === 16) assert.equal(f.view().puzzle!.introduction, "survival");
    f = await reopen(f, 500_000);
    assert.equal("target" in f.view().puzzle!, false);
    assert.equal(f.view().remaining, 0);
    await f.win();
    await f.next();
    if (f.view().screen === "victory") await f.send({ type: "survival" });
  }
  assert.equal(f.view().officialVictory, true);
  f.controller.dispose();
});

test("R3.2.2: historical saves remain untouched until a confirmed replacement", async () => {
  const { readFileSync } = await import("node:fs");
  const archived = JSON.parse(
    readFileSync(
      new URL("./fixtures/r3.2-saves.json", import.meta.url),
      "utf8",
    ),
  );
  for (const state of ["preparation", "playing", "timeout"]) {
    const raw = archived[state];
    assert.equal(validateRogueSave(raw).status, "incompatible");
    const shared = memory();
    shared.values.set(ROGUE_SAVE_KEY, raw);
    shared.values.set("shortest:save:v3", { xp: 777 });
    const before = JSON.stringify(raw);
    const f = await fixture(shared);
    assert.equal(f.view().hasSaved, false);
    assert.match(f.view().storageNotice, /incompatible.*60 s/);
    await f.send({ type: "new", seed: 7 });
    assert.equal(JSON.stringify(shared.values.get(ROGUE_SAVE_KEY)), before);
    assert.equal(f.view().screen, "home");
    await f.send({ type: "new", seed: 7, replace: true });
    assert.equal(validateRogueSave(activeSave(shared)).status, "valid");
    assert.equal("target" in f.view().puzzle!, false);
    assert.equal(f.view().puzzle!.seconds, 95);
    assert.deepEqual(shared.values.get("shortest:save:v3"), { xp: 777 });
    f.controller.dispose();
  }
  const legacy = { ...archived.playing, version: 1 };
  delete legacy.ruleset;
  assert.equal(validateRogueSave(legacy).status, "incompatible");
});
