import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_CONFIG, phaseAt } from "../src/rogue-v1/model";
import type { CardId, Effect } from "../src/rogue-v1/model";
import { Generator } from "../src/rogue-v1/generator";
import { inspectExpression, expressionValue } from "../src/rogue-v1/math";
import { CARDS } from "../src/rogue-v1/cards";
import { meaningfulRepeat, variedChoices } from "../src/rogue-v1/difficulty";
import {
  LEGACY_ROGUE_RULESET,
  ROGUE_RULESET,
  rulesContract,
} from "../src/rogue-v1/contracts";
import {
  DurableSession,
  validateRogueSave,
} from "../src/rogue-v1/saved-session";
import type { RogueSave } from "../src/rogue-v1/saved-session";
import { RogueController } from "../src/rogue-v1/controller";
import { archiveRun } from "../src/rogue-v1/run-history";
import { ROGUE_STORE_KEY } from "../src/rogue-v1/save-repository";
import {
  EMPTY_HUMAN_FEEDBACK,
  humanPlaytestReport,
} from "../src/rogue-v1/human-playtest";

const golden = JSON.parse(
  readFileSync(
    new URL("./fixtures/r4.1-sessions.json", import.meta.url),
    "utf8",
  ),
) as {
  samples: Record<string, RogueSave>;
  future: Record<string, unknown[]>;
};
function environment(wall = 1_800_000_000_000) {
  return {
    clock: { now: () => 0, schedule: () => undefined, cancel: () => {} },
    civilNow: () => wall,
    newId: () => "r42-test",
  };
}
function nextEncounter(session: DurableSession) {
  const before = session.game.run.current;
  for (let step = 0; step < 12; step++) {
    const game = session.game;
    if (game.screen === "preparation") session.command("demarrer");
    else if (game.screen === "playing")
      session.command(`soumettre ${game.run.current!.expression}`);
    else if (game.screen === "result") session.command("suivant");
    else if (game.screen === "reward") session.command("choisir 0");
    else if (game.screen === "victory") session.command("survie");
    else break;
    if (
      game.run.current &&
      game.run.current !== before &&
      game.screen === "preparation"
    )
      break;
  }
}
function effect(id: CardId, level = 1): Effect {
  return { id, level, remaining: CARDS[id].duration, shieldUsed: false };
}

test("R4.2: six R4.1 states replay and generate their next three historical encounters exactly", () => {
  for (const [name, save] of Object.entries(golden.samples)) {
    const source = JSON.stringify(save);
    assert.equal(validateRogueSave(save).status, "valid", name);
    const session = DurableSession.restore(
      save,
      environment(save.savedAt),
      () => {},
    );
    assert.deepEqual(session.checkpoint(), save.checkpoint, name);
    assert.equal(session.capture().ruleset, LEGACY_ROGUE_RULESET);
    for (const expected of golden.future[name]) {
      nextEncounter(session);
      assert.deepEqual(session.checkpoint(), expected, name);
    }
    assert.equal(JSON.stringify(save), source);
  }
});

test("R4.2: new runs select the new contract; renumbering a historical journal is rejected", () => {
  const current = new DurableSession(42, environment(), () => {});
  assert.equal(current.capture().ruleset, ROGUE_RULESET);
  assert.equal(current.game.run.current?.generation?.profile, "r4.2");
  assert.deepEqual(current.game.run.config.rules.numbers, [3, 5, 7]);
  assert.equal(
    validateRogueSave({ ...golden.samples.bossPlaying, ruleset: ROGUE_RULESET })
      .status,
    "invalid",
  );
  assert.equal(
    validateRogueSave({ ...golden.samples.preparation, ruleset: "future" })
      .status,
    "incompatible",
  );
  assert.deepEqual(rulesContract(LEGACY_ROGUE_RULESET).config, DEFAULT_CONFIG);
  const detached = rulesContract(LEGACY_ROGUE_RULESET);
  detached.config.rules.numbers.push(9);
  assert.deepEqual(
    rulesContract(LEGACY_ROGUE_RULESET).config.rules.numbers,
    [3, 5, 7],
  );
});

test("R4.2: existing archives survive historical continuation and unsupported contracts remain untouched", async () => {
  for (const ruleset of [LEGACY_ROGUE_RULESET, "future"]) {
    const save = { ...golden.samples.preparation, ruleset };
    const summary = archiveRun(golden.samples.ended, environment(), false);
    const value = {
      version: 1,
      active: save,
      activeArchived: false,
      archives: [summary],
    };
    const values = new Map<string, unknown>([
      [ROGUE_STORE_KEY, structuredClone(value)],
    ]);
    const controller = new RogueController(
      environment().clock,
      {
        exclusive: (work) => work(),
        storage: {
          get: async <T>(key: string) =>
            structuredClone(values.get(key) ?? null) as T | null,
          set: async (key, next) => {
            values.set(key, structuredClone(next));
          },
          remove: async (key) => {
            values.delete(key);
          },
        },
      },
      environment(),
    );
    await controller.hydrate();
    await controller.dispatch(
      { type: "continue" },
      controller.getSnapshot().revision,
    );
    assert.deepEqual(controller.getSnapshot().history, [summary]);
    if (ruleset === LEGACY_ROGUE_RULESET) {
      assert.equal(controller.getSnapshot().screen, "preparation");
      assert.match(controller.getSnapshot().storageNotice, /historiques/);
      assert.equal(
        (values.get(ROGUE_STORE_KEY) as typeof value).active.ruleset,
        ruleset,
      );
    } else assert.deepEqual(values.get(ROGUE_STORE_KEY), value);
    controller.dispose();
  }
});

test("R4.2: short memory prefers new targets and relaxes deterministically in a tiny pool", () => {
  const rules = DEFAULT_CONFIG.rules;
  const candidates = [6, 8, 10].map((target) => ({
    target,
    solution: {
      expression: target === 6 ? "3+3" : target === 8 ? "3+5" : "5+5",
      operands: 2,
      multiplications: 0,
    },
  }));
  const recent = [{ target: 6, rules, expression: "3+3", operands: 2 }];
  const chosen = variedChoices(candidates, null, recent, 2, 500, rules);
  assert.deepEqual(
    chosen.choices.map((item) => item.target),
    [8, 10],
  );
  const tiny = variedChoices(candidates.slice(0, 2), 8, recent, 2, 500, rules);
  assert.deepEqual(
    tiny.choices.map((item) => item.target),
    [6],
  );
  assert.ok(tiny.notes.includes("recent-target-preference-relaxed"));
  assert.deepEqual(
    tiny,
    variedChoices(candidates.slice(0, 2), 8, recent, 2, 500, rules),
  );
  assert.equal(
    meaningfulRepeat(
      recent[0],
      { ...rules, minimumOccurrences: { 7: 1 } },
      500,
    ),
    true,
  );
  assert.equal(
    meaningfulRepeat(recent[0], { ...rules, maxMultiplications: 1 }, 500),
    false,
  );
});

test("R4.2: all cards, upgrades and D1/D2/T3 combinations preserve bounded witnesses and timers", (t) => {
  const builds = Object.keys(CARDS).map((id) => [effect(id as CardId)]);
  for (const id of ["D1", "D2", "D3", "D4"] as const)
    builds.push([effect(id, 2)]);
  for (let seven = 0; seven <= 2; seven++)
    for (let budget = 0; budget <= 2; budget++)
      for (const subtraction of [false, true]) {
        builds.push([
          ...(seven ? [effect("D1", seven)] : []),
          ...(budget ? [effect("D2", budget)] : []),
          ...(subtraction ? [effect("T3")] : []),
        ]);
      }
  const stages = [
    ...Array.from({ length: 16 }, (_, stage) => stage),
    16,
    19,
    30,
    1000,
  ];
  let generated = 0;
  const progressionFallbacks: string[] = [];
  for (const effects of builds) {
    const modern = new Generator("r4.2");
    const legacy = new Generator("legacy");
    for (const stage of stages) {
      const phase = phaseAt(stage, DEFAULT_CONFIG);
      const result = modern.generate(
        DEFAULT_CONFIG,
        effects,
        phase,
        0.42,
        -20,
        null,
      );
      if (!result.puzzle) {
        assert.equal(
          legacy.generate(DEFAULT_CONFIG, effects, phase, 0.42, -20, null)
            .puzzle,
          null,
          JSON.stringify({ effects, stage }),
        );
        continue;
      }
      generated++;
      const puzzle = result.puzzle;
      if (puzzle.generation?.progressionFallback)
        progressionFallbacks.push(
          `${effects.map((effect) => effect.id + ":" + effect.level).join("+") || "none"}@${stage}`,
        );
      const checked = inspectExpression(puzzle.expression, puzzle.rules, 500);
      assert.ok(checked);
      assert.equal(expressionValue(puzzle.expression), puzzle.target);
      assert.ok(puzzle.seconds >= 60);
      assert.ok(puzzle.operands <= 6);
      assert.ok(!/[124689]/.test(puzzle.expression));
      assert.ok(puzzle.candidateCount >= DEFAULT_CONFIG.minimumTargets);
      for (const obligation of puzzle.obligationDiagnostics)
        if (!puzzle.generation?.progressionFallback)
          assert.equal(obligation.status, "restrictive");
      assert.ok(modern.maximumSearchStates <= DEFAULT_CONFIG.search.maxStates);
    }
  }
  assert.equal(generated, builds.length * stages.length);
  t.diagnostic(
    `${generated} generated; ${progressionFallbacks.length} progression preference fallbacks: ${progressionFallbacks.join(", ")}`,
  );
});

test("R4.2: exhausted progression preferences fall back without dropping active card rules", () => {
  const config = structuredClone(DEFAULT_CONFIG);
  config.search.maxOperands = 4;
  const phase = phaseAt(11, config);
  const effects = [effect("D1")];
  const modern = new Generator("r4.2").generate(
    config,
    effects,
    phase,
    0.5,
    0,
    null,
  );
  const legacy = new Generator("legacy").generate(
    config,
    effects,
    phase,
    0.5,
    0,
    null,
  );
  assert.ok(modern.puzzle && legacy.puzzle);
  assert.equal(modern.puzzle.generation?.progressionFallback, true);
  assert.deepEqual(modern.puzzle.rules, legacy.puzzle.rules);
  assert.equal(modern.puzzle.rules.minimumOccurrences[7], 1);
});

test("R4.2: local exports cover time, failures, hints and cards without witnesses or personal fields", () => {
  for (const ruleset of [LEGACY_ROGUE_RULESET, ROGUE_RULESET]) {
    let wall = 1_800_000_000_000;
    const env = {
      ...environment(),
      clock: { ...environment().clock, now: () => wall },
      civilNow: () => wall,
    };
    const session = new DurableSession(
      42,
      env,
      () => {},
      "private-id",
      ruleset,
    );
    const preparation = session.capture();
    assert.equal(
      humanPlaytestReport(preparation, wall, EMPTY_HUMAN_FEEDBACK)
        .answersSubmitted,
      0,
    );
    session.command("demarrer");
    wall += 7000;
    session.command("indice");
    session.command("soumettre 3");
    session.command("suivant");
    session.command("quitter");
    const saved = session.capture();
    const before = JSON.stringify(saved);
    const report = humanPlaytestReport(saved, wall, {
      difficulty: "hard",
      reason: "rules",
    });
    assert.equal(report.failures, 1);
    assert.equal(report.answersSubmitted, 1);
    assert.equal(report.hintsUsed, 1);
    assert.equal(report.playingSeconds, 7);
    assert.deepEqual(report.feedback, { difficulty: "hard", reason: "rules" });
    assert.ok(
      report.encounters.every((item) => item.rules.numbers.join() === "3,5,7"),
    );
    assert.equal(JSON.stringify(saved), before);
    const text = JSON.stringify(report);
    for (const forbidden of [
      '"target":',
      '"expression":',
      '"solution":',
      "private-id",
      '"savedAt":',
      '"journal":',
      '"profile":',
      '"date":',
    ])
      assert.ok(!text.includes(forbidden), forbidden);
    assert.throws(
      () =>
        humanPlaytestReport(saved, wall, {
          difficulty: "email@example.org",
          reason: "rules",
        } as any),
      /invalid-feedback/,
    );
  }
});

test("R4.6: replacing a won run preserves the victory and bosses even before survival ends", () => {
  const env = environment();
  const session = DurableSession.replay(golden.samples.victory, env, () => {});
  for (const screen of ["victory", "preparation"]) {
    assert.equal(session.game.screen, screen);
    const archive = archiveRun(session.capture(), env, true);
    assert.equal(archive.status, "victory");
    assert.deepEqual(archive.bosses, [1, 2, 3]);
    assert.equal(archive.successes, 16);
    if (screen === "victory") session.command("survie");
  }
});
