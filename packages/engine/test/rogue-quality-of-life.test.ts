import assert from "node:assert/strict";
import { test } from "node:test";
import { RogueController } from "../src/rogue-v1/controller";
import {
  DurableSession,
  ROGUE_SAVE_KEY,
  validateRogueSave,
} from "../src/rogue-v1/saved-session";
import {
  ROGUE_STORE_KEY,
  MAX_ROGUE_ARCHIVES,
} from "../src/rogue-v1/save-repository";
import { archiveRun, parseRogueStore } from "../src/rogue-v1/run-history";
import {
  DEFAULT_CONFIG,
  buildRules,
  phaseAt,
  inspectExpression,
  editExpression,
  expressionViolations,
  answerViolations,
  describeViolation,
  presentCard,
  offeredMultiplicationLimit,
  advanceTutorial,
} from "../src/rogue-v1";
import type { RogueAction } from "../src/rogue-v1/controller";
import type { RogueSave } from "../src/rogue-v1/saved-session";

function fixture() {
  const values = new Map<string, unknown>();
  let wall = 1_800_000_000_000;
  let ids = 0;
  let failing = false;
  let afterWrite = false;
  let release: (() => void) | null = null;
  let began: (() => void) | null = null;
  let gate: Promise<void> | null = null;
  let tail = Promise.resolve();
  const adapter = {
    exclusive<T>(work: () => Promise<T>) {
      const operation = tail.then(work);
      tail = operation.then(
        () => {},
        () => {},
      );
      return operation;
    },
    storage: {
      async get<T>(key: string) {
        return (
          values.has(key) ? structuredClone(values.get(key)) : null
        ) as T | null;
      },
      async set<T>(key: string, value: T) {
        if (gate) {
          began?.();
          await gate;
        }
        if (failing && !afterWrite) throw new Error("disk-full");
        values.set(key, structuredClone(value));
        if (failing && afterWrite) throw new Error("ack-lost");
      },
      async remove(key: string) {
        values.delete(key);
      },
    },
  };
  const clock = { now: () => wall, schedule: () => 0, cancel: () => {} };
  const env = { civilNow: () => wall, newId: () => `history-${++ids}` };
  const create = () => new RogueController(clock, adapter, env);
  let controller = create();
  const view = () => controller.getSnapshot();
  const send = (action: RogueAction) =>
    controller.dispatch(action, view().revision);
  const store = () => parseRogueStore(values.get(ROGUE_STORE_KEY));
  return {
    values,
    adapter,
    clock,
    env,
    view,
    send,
    store,
    async init() {
      await controller.hydrate();
    },
    async reopen(continueRun = false) {
      controller.dispose();
      controller = create();
      await controller.hydrate();
      if (continueRun) await send({ type: "continue" });
    },
    fail(value: boolean, acknowledgementLost = false) {
      failing = value;
      afterWrite = acknowledgementLost;
    },
    advance(ms: number) {
      wall += ms;
    },
    hold() {
      const started = new Promise<void>((resolve) => (began = resolve));
      gate = new Promise<void>((resolve) => (release = resolve));
      return {
        started,
        release() {
          gate = null;
          release!();
        },
      };
    },
  };
}

test("R4.1: completed and interrupted summaries coexist with stable ids, without replay logs", async () => {
  const f = fixture();
  await f.init();
  await f.send({ type: "new", seed: 42 });
  const first = (f.store().active as RogueSave).id;
  await f.send({ type: "abandon" });
  assert.equal(f.view().history[0].status, "abandoned");
  assert.equal(f.view().history[0].id, first);
  await f.send({ type: "new", seed: 7, replace: true });
  const second = (f.store().active as RogueSave).id;
  await f.send({ type: "start" });
  await f.send({ type: "submit", expression: "3" });
  await f.send({ type: "new", seed: 8, replace: true });
  assert.equal(f.view().history.length, 2);
  assert.equal(f.view().history[0].id, second);
  assert.equal(f.view().history[0].status, "interrupted");
  assert.equal(f.view().history[0].failures, 1);
  assert.equal(f.view().history[0].seed, 7);
  assert.ok(!JSON.stringify(f.view().history).includes("journal"));
  assert.ok(!JSON.stringify(f.view().history).includes("target"));
  const before = f.view().history;
  await f.reopen();
  assert.deepEqual(f.view().history, before);
});

test("R4.1: deletion affects one archive only and never resurrects it on last-bilan restore", async () => {
  const f = fixture();
  await f.init();
  for (const seed of [1, 2]) {
    await f.send({ type: "new", seed, replace: true });
    await f.send({ type: "abandon" });
  }
  const active = structuredClone(f.store().active);
  const deleted = f.view().history[0].id;
  await f.send({ type: "home" });
  await f.send({ type: "delete-archive", id: deleted });
  assert.equal(f.view().history.length, 1);
  assert.deepEqual(f.store().active, active);
  await f.reopen(true);
  assert.equal(f.view().history.length, 1);
  assert.ok(f.view().history.every((entry) => entry.id !== deleted));
  await f.send({ type: "home" });
  f.fail(true);
  await f.send({ type: "delete-archive", id: f.view().history[0].id });
  assert.equal(f.store().archives.length, 1);
  assert.match(f.view().storageError, /Suppression impossible/);
  f.fail(false);
  await f.send({ type: "retry" });
  assert.equal(f.view().history.length, 0);
});

test("R4.1: interrupted replacement is atomic before commit, on retry, and after lost acknowledgement", async () => {
  for (const acknowledgementLost of [false, true]) {
    const f = fixture();
    await f.init();
    await f.send({ type: "new", seed: 42 });
    const original = structuredClone(f.store().active);
    f.fail(true, acknowledgementLost);
    await f.send({ type: "new", seed: 9, replace: true });
    assert.ok(f.view().storageError);
    assert.equal(f.view().seed, 42);
    f.fail(false);
    if (!acknowledgementLost) {
      assert.deepEqual(f.store().active, original);
      assert.equal(f.store().archives.length, 0);
      await f.send({ type: "retry" });
    }
    await f.reopen();
    assert.equal((f.store().active as RogueSave).seed, 9);
    assert.equal(f.view().history.length, 1);
    assert.equal(f.view().history[0].id, (original as RogueSave).id);
    assert.equal(f.view().history[0].status, "interrupted");
  }
});

test("R4.1: process interruption before replacement commit preserves the old run", async () => {
  const f = fixture();
  await f.init();
  await f.send({ type: "new", seed: 42 });
  const old = structuredClone(f.store());
  const gate = f.hold();
  const replacement = f.send({ type: "new", seed: 7, replace: true });
  await gate.started;
  assert.deepEqual(f.store(), old);
  // Simulate termination of the operation before the storage replacement.
  f.fail(true);
  gate.release();
  await replacement;
  f.fail(false);
  await f.reopen(true);
  assert.equal(f.view().seed, 42);
  assert.equal(f.view().history.length, 0);
});

test("R4.1: R3.2.2 legacy session migration preserves replay, profile and source bytes", async () => {
  const f = fixture();
  const old = new DurableSession(42, { ...f.env, clock: f.clock }, () => {});
  old.command("demarrer");
  f.advance(12_000);
  old.command("indice");
  const raw = old.capture();
  const source = JSON.stringify(raw);
  f.values.set(ROGUE_SAVE_KEY, raw);
  f.values.set("shortest:save:v3", { xp: 777 });
  f.fail(true);
  await f.init();
  assert.ok(f.view().storageError);
  assert.equal(f.values.has(ROGUE_STORE_KEY), false);
  f.fail(false);
  await f.send({ type: "retry" });
  await f.reopen(true);
  assert.equal(f.view().remaining, 83);
  assert.equal(f.view().hints, 2);
  assert.equal(validateRogueSave(f.store().active).status, "valid");
  assert.equal(JSON.stringify(f.values.get(ROGUE_SAVE_KEY)), source);
  assert.deepEqual(f.values.get("shortest:save:v3"), { xp: 777 });
});

test("R4.1: history is bounded and a corrupt/future store cannot be overwritten", async () => {
  const f = fixture();
  await f.init();
  for (let seed = 0; seed < MAX_ROGUE_ARCHIVES + 2; seed++)
    await f.send({ type: "new", seed, replace: true });
  assert.equal(f.view().history.length, MAX_ROGUE_ARCHIVES);
  assert.equal(f.view().history[0].seed, MAX_ROGUE_ARCHIVES);
  assert.equal(f.view().history.at(-1)!.seed, 1);
  assert.ok(JSON.stringify(f.view().history).length < 50_000);
  f.values.set(ROGUE_STORE_KEY, { ...f.store(), version: 999 });
  const corrupt = structuredClone(f.values.get(ROGUE_STORE_KEY));
  await f.reopen();
  assert.ok(f.view().storageError);
  await f.send({ type: "new", seed: 5, replace: true });
  assert.deepEqual(f.values.get(ROGUE_STORE_KEY), corrupt);
});

test("R4.1: smart operators respect selection, allowed operations, cursor, erase and clear", () => {
  const insert = (
    text: string,
    start: number,
    end: number,
    token: string,
    allowed = DEFAULT_CONFIG.rules.operations,
  ) => editExpression(text, { start, end }, { type: "insert", token }, allowed);
  assert.deepEqual(insert("3+", 2, 2, "×"), {
    text: "3*",
    selection: { start: 2, end: 2 },
  });
  assert.deepEqual(insert("3+5", 2, 2, "−"), {
    text: "3-5",
    selection: { start: 2, end: 2 },
  });
  assert.deepEqual(insert("3+5", 1, 1, "*"), {
    text: "3*5",
    selection: { start: 2, end: 2 },
  });
  assert.equal(insert("3+5", 1, 2, "−").text, "3-5");
  // A selection replacement never consumes an additional, unselected operator.
  assert.equal(insert("3+5", 2, 3, "*").text, "3+*");
  assert.equal(insert("3+5", 1, 3, "7").text, "37");
  assert.equal(insert("3+", 2, 2, "*", ["+"]).text, "3+");
  assert.equal(insert("", 0, 0, "+").text, "");
  assert.deepEqual(
    editExpression("3+5", { start: 1, end: 3 }, { type: "erase" }),
    { text: "3", selection: { start: 1, end: 1 } },
  );
  assert.deepEqual(
    editExpression("3+5", { start: 3, end: 3 }, { type: "clear" }),
    { text: "", selection: { start: 0, end: 0 } },
  );
});

test("R4.1: precise multiplication diagnostic describes the real rejection, without a witness", () => {
  const rules = { ...DEFAULT_CONFIG.rules, maxMultiplications: 1 };
  const errors = answerViolations("7*7+5*3", rules, 500, 64, 6, 1);
  assert.equal(inspectExpression("7*7+5*3", rules, 500), null);
  assert.deepEqual(errors, [
    { code: "multiplication-budget", used: 2, allowed: 1 },
  ]);
  assert.match(describeViolation(errors[0]), /2 utilisées, maximum 1/);
  assert.ok(!JSON.stringify(errors).includes("expression"));
});

test("R4.1: typed diagnostics agree with unchanged validation across rules and expressions", () => {
  const expressions = [
    "3",
    "2",
    "3+5",
    "7*7+5*3",
    "3-5",
    "7*7*7*7",
    "(3+5)",
    "3++5",
    "3/5",
    "3+3+3",
    "9-7",
    "9",
  ];
  const configurations = [
    DEFAULT_CONFIG.rules,
    { ...DEFAULT_CONFIG.rules, operations: ["+" as const] },
    {
      ...DEFAULT_CONFIG.rules,
      minimumOccurrences: { 7: 2 },
      requireSubtraction: true,
      maxMultiplications: 1,
    },
    { ...DEFAULT_CONFIG.rules, maxMultiplications: 0 },
  ];
  for (const rules of configurations)
    for (const expression of expressions)
      for (const magnitude of [5, 50, 500])
        assert.equal(
          expressionViolations(expression, rules, magnitude).length === 0,
          inspectExpression(expression, rules, magnitude) !== null,
          JSON.stringify({ rules, expression, magnitude }),
        );
  assert.equal(
    expressionViolations("(3+5)", DEFAULT_CONFIG.rules, 500)[0].code,
    "syntax",
  );
  assert.equal(
    expressionViolations("2", DEFAULT_CONFIG.rules, 500)[0].code,
    "forbidden-digit",
  );
  assert.ok(
    expressionViolations("3+5", configurations[2], 500).some(
      (error) => error.code === "digit-required",
    ),
  );
  assert.ok(
    expressionViolations("3+5", configurations[2], 500).some(
      (error) => error.code === "subtraction-required",
    ),
  );
  assert.equal(
    answerViolations("3+3+3", DEFAULT_CONFIG.rules, 500, 9, 2, 3)[0].code,
    "stars",
  );
});

test("R4.1: D2 descriptions use actual budgets and explain level II without changing the rules", () => {
  for (const difficulty of [1, 2, 3, 4, 5] as const)
    for (const level of [1, 2]) {
      const phase = { ...phaseAt(0, DEFAULT_CONFIG), difficulty };
      const rules = buildRules(
        DEFAULT_CONFIG,
        [{ id: "D2", level, remaining: null, shieldUsed: false }],
        phase,
      );
      assert.equal(
        offeredMultiplicationLimit(difficulty, level),
        rules.maxMultiplications,
      );
      const card = presentCard("D2", level, rules);
      assert.match(
        card.currentLimit!,
        new RegExp(`maximum ${rules.maxMultiplications}`),
      );
      assert.ok(!card.drawback.includes("opérandes"));
      assert.match(card.advantage, level === 1 ? /25/ : /35/);
    }
});

test("R4.1: tutorial requires replacement, deletion and explicit validation and can restart", () => {
  let step = 0;
  for (const text of ["3+", "3*", "3*5", "3*"])
    step = advanceTutorial(step, text);
  assert.equal(step, 4);
  assert.equal(advanceTutorial(step, "3*7"), 4);
  assert.equal(advanceTutorial(step, "3*7", true), 5);
  assert.equal(advanceTutorial(0, "3*7", true), 0);
});

test("R4.1: conclusion failure never separates the terminal session from its archive", async () => {
  const f = fixture();
  await f.init();
  await f.send({ type: "new", seed: 42 });
  const before = structuredClone(f.store());
  f.fail(true);
  await f.send({ type: "abandon" });
  assert.deepEqual(f.store(), before);
  assert.equal(f.view().history.length, 0);
  f.fail(false);
  await f.send({ type: "retry" });
  await f.reopen(true);
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().history.length, 1);
  assert.equal(f.view().history[0].status, "abandoned");
});

test("R4.1: an existing R3.2.2 concluded save is archived once on migration", async () => {
  const f = fixture();
  const old = new DurableSession(42, { ...f.env, clock: f.clock }, () => {});
  old.command("quitter");
  const save = old.capture();
  f.values.set(ROGUE_SAVE_KEY, save);
  f.advance(3_600_000);
  await f.init();
  assert.equal(f.view().history.length, 1);
  assert.equal(f.view().history[0].id, save.id);
  assert.equal(f.view().history[0].date, save.savedAt);
  await f.reopen(true);
  assert.equal(f.view().history.length, 1);
  assert.equal(f.view().screen, "ended");
});

test("R4.1: stale history deletion cannot overwrite another controller’s session or archives", async () => {
  const f = fixture();
  await f.init();
  await f.send({ type: "new", seed: 42 });
  const stale = new RogueController(f.clock, f.adapter, f.env);
  await stale.hydrate();
  await f.send({ type: "abandon" });
  const committed = structuredClone(f.store());
  await stale.dispatch(
    { type: "delete-archive", id: f.view().history[0].id },
    stale.getSnapshot().revision,
  );
  assert.ok(stale.getSnapshot().storageError);
  assert.deepEqual(f.store(), committed);
  stale.dispose();
});

test("R4.1: archived cards include expired effects rather than only the final build", () => {
  const f = fixture();
  const session = new DurableSession(
    42,
    { ...f.env, clock: f.clock },
    () => {},
  );
  let selected = "";
  for (let stage = 0; stage < 5; stage++) {
    session.command("demarrer");
    session.command(`soumettre ${session.game.run.current!.expression}`);
    session.command("suivant");
    if (session.game.screen === "reward") {
      const choice =
        stage === 1
          ? session.game.run.offers.find((offer) =>
              ["T1", "T3", "T4", "E1", "E3"].includes(offer.card),
            )
          : null;
      if (choice) selected = choice.card;
      session.command(
        `choisir ${choice ? session.game.run.offers.indexOf(choice) + 1 : 0}`,
      );
    }
  }
  assert.ok(selected);
  assert.ok(!session.game.run.effects.some((effect) => effect.id === selected));
  const archive = archiveRun(
    session.capture(),
    { ...f.env, clock: f.clock },
    true,
  );
  assert.ok(
    archive.cards.some((card) => card.id === selected && card.level === 1),
  );
});

test("R4.1: the last lost life archives defeat before the result is dismissed", async () => {
  const f = fixture();
  await f.init();
  await f.send({ type: "new", seed: 42 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await f.send({ type: "start" });
    await f.send({ type: "submit", expression: "3" });
    if (attempt < 2) {
      assert.equal(f.view().history.length, 0);
      await f.send({ type: "next" });
    }
  }
  assert.equal(f.view().screen, "result");
  assert.equal(f.view().lives, 0);
  assert.equal(f.view().history.length, 1);
  assert.equal(f.view().history[0].status, "defeat");
  assert.equal(f.view().history[0].failures, 3);
});
