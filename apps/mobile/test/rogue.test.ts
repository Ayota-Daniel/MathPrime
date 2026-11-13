import assert from "node:assert/strict";
import { test } from "node:test";
import { RogueController } from "@shortest/engine/rogue-v1/controller";
import {
  validateRogueSave,
  ROGUE_SAVE_KEY,
} from "@shortest/engine/rogue-v1/persistence";
import { createNativeRogueStorage } from "../src/rogue/adapter";
import {
  constraints,
  insertToken,
  offerDescription,
} from "../src/rogue/presentation";

function rawStorage() {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key: string) {
      return values.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      values.set(key, value);
    },
    async removeItem(key: string) {
      values.delete(key);
    },
  };
}
test("Android: native adapter preserves profile, reports corrupt JSON and saves one complete value", async () => {
  const raw = rawStorage();
  const adapter = createNativeRogueStorage(raw);
  raw.values.set("shortest:save:v3", '{"xp":42}');
  await adapter.storage.set(ROGUE_SAVE_KEY, { version: 2, test: true });
  assert.deepEqual(await adapter.storage.get(ROGUE_SAVE_KEY), {
    version: 2,
    test: true,
  });
  assert.equal(raw.values.get("shortest:save:v3"), '{"xp":42}');
  raw.values.set(ROGUE_SAVE_KEY, "{broken");
  assert.equal(
    validateRogueSave(await adapter.storage.get(ROGUE_SAVE_KEY)).status,
    "invalid",
  );
});
test("Android: two adapter instances serialize critical sections", async () => {
  const raw = rawStorage();
  const a = createNativeRogueStorage(raw);
  const b = createNativeRogueStorage(raw);
  const steps: number[] = [];
  await Promise.all([
    a.exclusive(async () => {
      steps.push(1);
      await Promise.resolve();
      steps.push(2);
    }),
    b.exclusive(async () => {
      steps.push(3);
    }),
  ]);
  assert.deepEqual(steps, [1, 2, 3]);
});
test("Android: reopen via native adapter and AppState-like wake expires once without resetting clock", async () => {
  const raw = rawStorage();
  let wall = 1_000_000;
  let mono = 0;
  const clock = { now: () => mono, schedule: () => 0, cancel: () => {} };
  const env = { civilNow: () => wall, newId: () => "android-session" };
  const first = new RogueController(clock, createNativeRogueStorage(raw), env);
  await first.hydrate();
  await first.dispatch({ type: "new", seed: 42 }, first.getSnapshot().revision);
  await first.dispatch({ type: "start" }, first.getSnapshot().revision);
  await first.dispatch({ type: "hint" }, first.getSnapshot().revision);
  first.dispose();
  wall += 12_000;
  mono = 0;
  const second = new RogueController(clock, createNativeRogueStorage(raw), env);
  await second.hydrate();
  assert.equal(second.getSnapshot().hasSaved, true);
  await second.dispatch({ type: "continue" }, second.getSnapshot().revision);
  assert.equal(second.getSnapshot().remaining, 23);
  assert.equal(second.getSnapshot().hints, 2);
  second.suspend();
  wall += 100_000;
  await second.wake();
  assert.equal(second.getSnapshot().lives, 2);
  assert.equal(second.getSnapshot().result?.cause, "timeout");
  await second.wake();
  assert.equal(second.getSnapshot().lives, 2);
  const json = raw.values.get(ROGUE_SAVE_KEY)!;
  assert.ok(!json.includes("3+3+5*7"));
  second.dispose();
});
test("Android: touch insertion replaces selection and descriptions show exact constraints and sacrifice", () => {
  assert.deepEqual(insertToken("3+5", { start: 2, end: 3 }, "7"), {
    text: "3+7",
    selection: { start: 3, end: 3 },
  });
  const rules = constraints({
    target: 1,
    seconds: 35,
    minimumStars: 2,
    rules: {
      numbers: [3, 5, 7],
      operations: ["+", "-", "*"],
      minimumOccurrences: { 7: 2 },
      requireSubtraction: true,
      maxMultiplications: 1,
    },
  });
  for (const text of ["2 fois", "soustraction", "Maximum 1", "2 étoiles"])
    assert.ok(rules.some((rule) => rule.includes(text)));
  const card = offerDescription(
    { id: "replace", card: "D3", kind: "replace", replaces: "D1" },
    [],
  );
  assert.match(card.operation, /D1/);
  assert.match(card.operation, /Serment du 7/);
});
