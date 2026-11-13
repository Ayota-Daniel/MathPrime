import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_CONFIG, solveRules } from "@shortest/engine/rogue-v1";
import type { Rules } from "@shortest/engine/rogue-v1";
import type { Clock } from "@shortest/engine/rogue-v1/session";
import { RogueWebController } from "../src/rogue/controller";
import type { RogueView, WebAction } from "../src/rogue/controller";
import { PuzzleRules, RoguePuzzle } from "../src/components/rogue/RoguePuzzle";
import {
  ActiveEffects,
  RogueRewards,
} from "../src/components/rogue/RogueCards";
import {
  RogueWelcome,
  RogueResult,
  RogueSummary,
} from "../src/components/rogue/RoguePanels";

class ManualClock implements Clock {
  time = 0;
  id = 0;
  jobs = new Map<number, { callback: () => void; due: number }>();
  now() {
    return this.time;
  }
  schedule(callback: () => void, ms: number) {
    this.jobs.set(++this.id, { callback, due: this.time + ms });
    return this.id;
  }
  cancel(id: unknown) {
    this.jobs.delete(id as number);
  }
  advance(ms: number) {
    this.time += ms;
    while (true) {
      const job = [...this.jobs].find(([, value]) => value.due <= this.time);
      if (!job) return;
      this.jobs.delete(job[0]);
      job[1].callback();
    }
  }
}
const cache = new Map<string, ReturnType<typeof solveRules>>();
function solution(view: RogueView): string {
  const rules: Rules = view.puzzle!.rules;
  const key = JSON.stringify(rules);
  if (!cache.has(key)) cache.set(key, solveRules(rules, DEFAULT_CONFIG.search));
  return cache.get(key)!.solutions.get(view.puzzle!.target)!.expression;
}
function fixture(seed = 42) {
  const clock = new ManualClock();
  const controller = new RogueWebController(clock);
  const send = (action: WebAction) =>
    controller.dispatch(action, controller.getSnapshot().revision);
  send({ type: "new", seed });
  const view = () => controller.getSnapshot();
  function win() {
    const expression = solution(view());
    send({ type: "start" });
    clock.advance(1_000);
    send({ type: "submit", expression });
    assert.equal(view().result?.success, true);
  }
  function next() {
    send({ type: "next" });
    if (view().screen === "reward") send({ type: "choose", index: 0 });
  }
  return { controller, clock, send, view, win, next };
}

test("R3.1: welcome, explicit start, safe view, and no timers in preparation", () => {
  const f = fixture();
  assert.equal(f.view().screen, "preparation");
  assert.deepEqual(f.view().puzzle!.rules.numbers, [3, 5, 7]);
  assert.equal(f.clock.jobs.size, 0);
  f.clock.advance(900_000);
  assert.equal(f.view().remaining, 35);
  const expression = solution(f.view());
  assert.equal("expression" in f.view().puzzle!, false);
  assert.equal("operands" in f.view().puzzle!, false);
  assert.ok(!JSON.stringify(f.view()).includes(expression));
  const html = renderToStaticMarkup(
    <RoguePuzzle view={f.view()} busy={false} send={f.send} />,
  );
  assert.ok(!html.includes(expression));
  assert.ok(!html.includes("Minimum trouvé"));
  assert.match(html, /Commencer le puzzle/);
  f.send({ type: "start" });
  assert.equal(f.view().screen, "playing");
  assert.equal(f.clock.jobs.size, 1);
  const keyboard = renderToStaticMarkup(
    <RoguePuzzle view={f.view()} busy={false} send={f.send} />,
  );
  assert.match(keyboard, /type="button"[^>]*>3/);
  assert.match(keyboard, /type="submit"/);
  const welcome = renderToStaticMarkup(
    <RogueWelcome busy={false} send={f.send} />,
  );
  assert.match(welcome, /Nouvelle run/);
  assert.match(welcome, /premier choix de carte arrive après deux puzzles/);
  f.controller.dispose();
});

test("R3.1: keyboard syntax, right/wrong answers, stars and score supplied by the engine", () => {
  const f = fixture();
  f.send({ type: "start" });
  f.send({ type: "submit", expression: "(3+5)" });
  assert.equal(f.view().screen, "playing");
  assert.equal(f.view().lives, 3);
  assert.match(f.view().message, /Syntaxe invalide/);
  f.send({ type: "submit", expression: "3" });
  assert.equal(f.view().result?.cause, "wrong-target");
  assert.equal(f.view().lives, 2);
  f.next();
  f.win();
  assert.equal(f.view().result?.stars, 3);
  assert.equal(f.view().score, 100);
  const result = renderToStaticMarkup(
    <RogueResult view={f.view()} busy={false} send={f.send} />,
  );
  assert.match(result, /Minimum trouvé/);
  assert.equal("expression" in (f.view().puzzle ?? {}), false);
  assert.match(result, /La solution n’est pas révélée/);
  f.controller.dispose();
});

test("R3.1: hints remain partial, reduce score by 15 percent and never cap stars", () => {
  const f = fixture();
  const expression = solution(f.view());
  f.send({ type: "start" });
  f.clock.advance(5_000);
  f.controller.refresh();
  f.send({ type: "hint" });
  assert.equal(f.view().hints, 2);
  assert.equal(f.view().remaining, 30);
  assert.ok(!f.view().hintMessages[0].includes(expression));
  f.send({ type: "hint" });
  assert.equal(new Set(f.view().hintMessages).size, 2);
  f.send({ type: "submit", expression });
  assert.equal(f.view().result?.stars, 3);
  assert.equal(f.view().score, 70);
  f.controller.dispose();
});

test("R3.1: automatic timeout, stale callbacks, foreground catchup, disposal and restart", () => {
  const f = fixture();
  f.send({ type: "start" });
  const stale = [...f.clock.jobs.values()][0].callback;
  f.clock.advance(35_000);
  assert.equal(f.view().screen, "result");
  assert.equal(f.view().lives, 2);
  stale();
  stale();
  f.controller.refresh();
  assert.equal(f.view().lives, 2);
  f.next();
  f.send({ type: "start" });
  f.clock.time += 40_000;
  f.controller.refresh();
  assert.equal(f.view().result?.cause, "timeout");
  assert.equal(f.view().lives, 1);
  f.next();
  f.send({ type: "start" });
  f.controller.dispose();
  f.controller.dispose();
  assert.equal(f.clock.jobs.size, 0);
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().endCause, "abandoned");
  f.send({ type: "new", seed: 5 });
  assert.equal(f.view().lives, 3);
  assert.equal(f.view().score, 0);
  f.controller.dispose();
});

test("R3.1: version guards ignore double submissions, double next and double rewards", () => {
  const f = fixture();
  f.send({ type: "start" });
  const expression = solution(f.view());
  const revision = f.view().revision;
  f.controller.dispatch({ type: "submit", expression }, revision);
  f.controller.dispatch({ type: "submit", expression }, revision);
  assert.equal(f.view().successes, 1);
  assert.equal(f.view().score, 100);
  const nextRevision = f.view().revision;
  f.controller.dispatch({ type: "next" }, nextRevision);
  f.controller.dispatch({ type: "next" }, nextRevision);
  assert.equal(f.view().screen, "preparation");
  f.win();
  f.send({ type: "next" });
  assert.equal(f.view().screen, "reward");
  const card = f.view().offers[0].card;
  const choiceRevision = f.view().revision;
  f.controller.dispatch({ type: "choose", index: 1 }, choiceRevision);
  f.controller.dispatch({ type: "choose", index: 1 }, choiceRevision);
  assert.equal(
    f.view().effects.filter((effect) => effect.id === card).length,
    1,
  );
  assert.equal(f.view().stage, 2);
  f.controller.dispose();
});

test("R3.1: cards render true tradeoffs, tactical and major labels, resources and constraints", () => {
  const f = fixture();
  f.win();
  f.next();
  f.win();
  f.send({ type: "next" });
  const rewards = renderToStaticMarkup(
    <RogueRewards
      view={f.view()}
      busy={false}
      choose={(index) => f.send({ type: "choose", index })}
    />,
  );
  assert.match(rewards, /Choix tactique/);
  assert.match(rewards, /contrepartie/);
  f.send({ type: "choose", index: 1 });
  const active = renderToStaticMarkup(
    <ActiveEffects effects={f.view().effects} />,
  );
  assert.match(active, /Votre build/);
  assert.ok(f.view().effects.length > 0);
  const puzzle = {
    ...f.view().puzzle!,
    rules: {
      ...f.view().puzzle!.rules,
      requireSubtraction: true,
      minimumOccurrences: { 7: 2 },
      maxMultiplications: 1,
    },
    minimumStars: 2,
  };
  const rules = renderToStaticMarkup(<PuzzleRules puzzle={puzzle} />);
  for (const text of [
    "2 fois le chiffre 7",
    "une soustraction",
    "maximum 1 multiplication",
    "2 étoiles",
  ])
    assert.ok(rules.includes(text));
  const upgraded = {
    ...f.view(),
    offers: [
      { id: "up", card: "D1", kind: "upgrade" },
      { id: "replace", card: "D3", kind: "replace", replaces: "D1" },
    ],
    effects: [{ id: "D1", level: 1, remaining: null, shieldUsed: false }],
    majorReward: true,
  } as RogueView;
  const major = renderToStaticMarkup(
    <RogueRewards view={upgraded} busy={false} choose={() => {}} />,
  );
  assert.match(major, /Récompense majeure/);
  assert.match(major, /\+30 % score/);
  assert.match(major, /deux occurrences/);
  assert.match(major, /Remplace Serment du 7/);
  f.controller.dispose();
});

test("R3.1: card constraints and healing/protection use existing validated engine transitions", () => {
  let foundSubtraction = false;
  for (const seed of [42, 1, 2, 3, 4, 5]) {
    const f = fixture(seed);
    f.win();
    f.next();
    f.win();
    f.send({ type: "next" });
    const index = f.view().offers.findIndex((offer) => offer.card === "T3");
    if (index === -1) {
      f.controller.dispose();
      continue;
    }
    f.send({ type: "choose", index: index + 1 });
    assert.equal(f.view().puzzle!.rules.requireSubtraction, true);
    const expression = solution(f.view()) + "+3-3";
    f.send({ type: "start" });
    f.send({ type: "submit", expression });
    assert.equal(f.view().result?.success, true);
    assert.equal(
      f.view().effects.find((effect) => effect.id === "T3")?.remaining,
      2,
    );
    f.controller.dispose();
    foundSubtraction = true;
    break;
  }
  assert.equal(foundSubtraction, true);
});

test("R3.1: all boss phases, retry, victory and optional survival preserve official win", () => {
  const f = fixture();
  const reached = new Set<number>();
  while (f.view().screen !== "victory") {
    if (f.view().phase.boss) reached.add(f.view().phase.act);
    f.win();
    f.next();
  }
  assert.deepEqual([...reached], [1, 2, 3]);
  assert.equal(f.view().successes, 16);
  assert.equal(f.view().officialVictory, true);
  assert.deepEqual(f.view().defeatedBosses, [1, 2, 3]);
  f.send({ type: "survival" });
  for (let i = 0; i < 3; i++) {
    f.send({ type: "start" });
    f.clock.advance(100_000);
    const feedback = renderToStaticMarkup(
      <RogueResult view={f.view()} busy={false} send={f.send} />,
    );
    assert.ok(!feedback.includes("Célébrer la victoire"));
    f.send({ type: "next" });
  }
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().officialVictory, true);
  assert.equal(f.clock.jobs.size, 0);
  const summary = renderToStaticMarkup(
    <RogueSummary
      view={f.view()}
      busy={false}
      send={f.send}
      onMenu={() => {}}
    />,
  );
  assert.match(summary, /Victoire officielle conservée/);
  f.controller.dispose();
});

test("R3.1: boss precision loss, retry at same phase and final victory can end without survival", () => {
  const f = fixture();
  while (f.view().stage < 14) {
    f.win();
    f.next();
  }
  assert.equal(f.view().puzzle!.minimumStars, 2);
  f.send({ type: "start" });
  f.send({ type: "submit", expression: solution(f.view()) + "+3-3" });
  assert.equal(f.view().result?.cause, "insufficient-stars");
  assert.equal(f.view().lives, 2);
  assert.equal(f.view().stage, 14);
  f.next();
  while (f.view().screen !== "victory") {
    f.win();
    f.next();
  }
  f.send({ type: "finish" });
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().endCause, "victory-finished");
  f.send({ type: "home" });
  assert.equal(f.view().screen, "home");
});

test("R3.1: defeat and confirmed abandonment end locally, stale async actions cannot revive run", () => {
  const f = fixture();
  for (let i = 0; i < 3; i++) {
    f.send({ type: "start" });
    f.send({ type: "submit", expression: "3" });
    f.send({ type: "next" });
  }
  assert.equal(f.view().screen, "ended");
  assert.equal(f.view().officialVictory, false);
  f.send({ type: "new", seed: 0 });
  const revision = f.view().revision;
  f.controller.dispose();
  f.controller.dispatch({ type: "start" }, revision);
  assert.equal(f.view().screen, "ended");
  assert.equal(f.clock.jobs.size, 0);
  const aborted = renderToStaticMarkup(
    <RogueSummary
      view={f.view()}
      busy={false}
      send={f.send}
      onMenu={() => {}}
    />,
  );
  assert.match(aborted, /Abandon volontaire/);
});

test("R3.1: contextual healing and insurance rewards apply once with their actual durations", () => {
  const missing = new Set(["E2", "T4"]);
  for (let seed = 0; seed < 16 && missing.size; seed++) {
    const f = fixture(seed);
    f.send({ type: "start" });
    f.send({ type: "submit", expression: "3" });
    f.next();
    f.win();
    f.next();
    f.win();
    f.send({ type: "next" });
    const index = f.view().offers.findIndex((offer) => missing.has(offer.card));
    if (index < 0) {
      f.controller.dispose();
      continue;
    }
    const id = f.view().offers[index].card;
    f.send({ type: "choose", index: index + 1 });
    assert.equal(
      f.view().effects.find((effect) => effect.id === id)?.remaining,
      3,
    );
    if (id === "E2") {
      assert.equal(f.view().lives, 3);
      const score = f.view().score;
      f.win();
      assert.equal(f.view().score - score, 80);
      assert.equal(
        f.view().effects.find((effect) => effect.id === id)?.remaining,
        2,
      );
    } else {
      f.send({ type: "start" });
      f.send({ type: "submit", expression: "3" });
      assert.equal(f.view().lives, 2);
      assert.equal(f.view().result?.livesLost, 0);
      assert.equal(
        f.view().effects.find((effect) => effect.id === id)?.shieldUsed,
        true,
      );
      f.next();
      f.send({ type: "start" });
      f.send({ type: "submit", expression: "3" });
      assert.equal(f.view().lives, 1);
    }
    missing.delete(id);
    f.controller.dispose();
  }
  assert.equal(missing.size, 0);
});
