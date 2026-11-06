import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acquire, additionalRule, BALANCE, bossRules, buildRules, CARDS, DEFAULT_CONFIG, draft,
  eligibility, expire, expressionValue, futureErrors, Generator, inspectExpression,
  multiplicationBudget, newRun, phaseAt, puzzleScore, puzzleSeconds, scoreCoefficient,
  simulate, solveRules, starsFor, totalStages, transition,
} from '../src/rogue-v1';
import type { CardId, Config, Effect, Resources, Rules, Run } from '../src/rogue-v1';

const config = (): Config => JSON.parse(JSON.stringify(DEFAULT_CONFIG));
const effect = (id: CardId, remaining = CARDS[id].duration, level = 1): Effect => ({ id, remaining, level, shieldUsed: false });
const resources = (lives = 2, hints = 1, effects: Effect[] = []): Resources => ({ lives, hints, effects });
const generator = new Generator();
function act(run: Run, action: Parameters<typeof transition>[1]): Run { return transition(run, action, generator); }
function win(run: Run): Run {
  if (run.status === 'ready') run = act(run, { type: 'start' });
  assert.equal(run.status, 'playing');
  return act(run, { type: 'submit', expression: run.current!.expression });
}
function reach(stage: number, initial = newRun(42)): Run {
  let run = initial;
  while (run.stage < stage) {
    if (run.status === 'reward') run = act(run, { type: 'choose', offer: null });
    run = win(run);
  }
  return run;
}

test('R1: all twelve cards have explicit metadata, costs, single stacks and duration', () => {
  assert.equal(Object.keys(CARDS).length, 12);
  for (const id of Object.keys(CARDS) as CardId[]) {
    const definition = CARDS[id];
    assert.ok(definition.name && definition.advantage && definition.drawback && definition.compatibility);
    const acquired = acquire(id, resources(), config());
    assert.equal(acquired.effects.length, 1);
    assert.equal(acquired.effects[0].remaining, definition.duration);
    assert.throws(() => acquire(id, acquired, config()), /already-active/);
    const afterFailure = expire(acquired.effects, false)[0];
    assert.equal(afterFailure.remaining, definition.duration === null ? null : definition.duration - Number(id !== 'E1'));
    let active = acquired.effects;
    for (let i = 0; i < 3; i++) active = expire(active, true);
    assert.equal(active.length, definition.duration === null ? 1 : 0);
  }
});

test('R1: resource exchanges, full reservoirs, unpayable costs and effect limits', () => {
  assert.equal(acquire('E1', resources(), config()).lives, 1);
  assert.equal(acquire('E2', resources(), config()).lives, 3);
  assert.equal(acquire('T5', resources(), config()).hints, 2);
  assert.equal(acquire('E3', resources(), config()).hints, 0);
  for (const [id, state] of [
    ['E1', resources(1)], ['E3', resources(2, 0)],
    ['T5', resources(2, 3)], ['E2', resources(3)],
  ] as [CardId, Resources][]) assert.ok(eligibility(id, state, config()).length);
  assert.ok(eligibility('D4', resources(2, 1, ['D1', 'D2', 'D3', 'T1', 'T2', 'T3'].map(id => effect(id as CardId))), config()).includes('active-effect-limit'));
});

test('R1: strict answer syntax, ordinary precedence, counts and combined restrictions', () => {
  const rules: Rules = { ...config().rules, minimumOccurrences: { 7: 2 }, requireSubtraction: true, maxMultiplications: 1 };
  assert.ok(inspectExpression('7*3-7', rules, 500));
  assert.equal(expressionValue('7*3-7'), 14);
  for (const expr of ['7*3', '7+7', '7*7-3*2', '(7*3)-7', '7*3-7garbage', '77-7', '7/7', '-7+7', '7 - 7', '7+']) {
    assert.equal(inspectExpression(expr, rules, 500), null, expr);
  }
  assert.equal(inspectExpression('7*7', { ...rules, requireSubtraction: false }, 40), null);
  assert.equal(solveRules({ ...rules, numbers: [2, 3] }, config().search).solutions.size, 0);
  assert.ok(solveRules({ ...rules, operations: ['+'] }, config().search).errors.includes('subtraction-unavailable'));
});

test('R1: bounded BFS agrees with exhaustive expressions on small spaces', () => {
  for (const minimumOccurrences of [{}, { 2: 2 }]) for (const requireSubtraction of [false, true]) for (const maxMultiplications of [null, 0, 1]) {
    const rules: Rules = { numbers: [2, 3], operations: ['+', '-', '*'], minimumOccurrences, requireSubtraction, maxMultiplications };
    const limits = { maxOperands: 4, magnitude: 80, maxTarget: 50, maxStates: 100_000 };
    const expected = new Map<number, number>();
    let expressions = ['2', '3'];
    for (let depth = 1; depth <= limits.maxOperands; depth++) {
      for (const expr of expressions) {
        if (!inspectExpression(expr, rules, limits.magnitude)) continue;
        const value = expressionValue(expr);
        if (value >= 1 && value <= limits.maxTarget && !expected.has(value)) expected.set(value, depth);
      }
      expressions = expressions.flatMap(expr => rules.operations.flatMap(op => rules.numbers.map(n => `${expr}${op}${n}`)));
    }
    const actual = solveRules(rules, limits);
    assert.equal(actual.complete, true);
    assert.deepEqual([...actual.solutions].map(([target, s]) => [target, s.operands]).sort(), [...expected].sort());
  }
});

test('R1: active optimum differs from unrestricted optimum; no silent relaxation', () => {
  const limits = { ...config().search, maxOperands: 4 };
  const base = { ...config().rules, numbers: [2, 3], minimumOccurrences: {} };
  const constrained = { ...base, minimumOccurrences: { 2: 2 }, requireSubtraction: true, maxMultiplications: 0 };
  assert.equal(solveRules(base, limits).solutions.get(3)!.operands, 1);
  const solution = solveRules(constrained, limits).solutions.get(3)!;
  assert.equal(solution.operands, 3);
  assert.equal(starsFor(3, solution.operands), 3);
  assert.ok(inspectExpression(solution.expression, constrained, limits.magnitude));
  const impossible = { ...config(), rules: { ...base, numbers: [2], minimumOccurrences: { 7: 1 } } };
  const generated = generator.generate(impossible, [], phaseAt(0, impossible), 0.5, 0, null);
  assert.equal(generated.puzzle, null);
  assert.ok(generated.diagnostics.includes('required-digit-unavailable:7'));
});

test('R1: state budget exhaustion is explicit and never used to claim optimum', () => {
  const tiny = config(); tiny.search.maxStates = 2;
  const result = solveRules(tiny.rules, tiny.search);
  assert.equal(result.complete, false);
  assert.ok(result.errors.includes('state-budget-exhausted'));
  assert.equal(generator.generate(tiny, [], phaseAt(0, tiny), 0, 0, null).puzzle, null);
  const empty = config(); empty.search.maxOperands = 1;
  assert.equal(generator.generate(empty, [effect('T3')], phaseAt(0, empty), 0, 0, null).puzzle, null);
});

test('R1: adaptive multiplication budgets reject free bonuses and length explosions', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(n => multiplicationBudget(n as 1)), [1, 1, 2, 2, 3]);
  const cfg = config();
  const effects = [effect('D1'), effect('D2')];
  const phase = phaseAt(0, cfg);
  const pool = generator.pool(cfg, effects, phase);
  assert.ok(pool.candidates.length >= 2);
  const without = solveRules({ ...pool.rules, maxMultiplications: null }, cfg.search);
  for (const { target, solution } of pool.candidates) {
    const inflation = solution.operands - without.solutions.get(target)!.operands;
    assert.ok(inflation >= 0 && inflation <= 2);
    assert.ok(without.optimalMaximumMultiplications.get(target)! > pool.rules.maxMultiplications!);
    assert.ok(solution.multiplications <= 1);
    assert.ok(inspectExpression(solution.expression, pool.rules, cfg.search.magnitude));
  }
  assert.ok(pool.diagnostics.some(d => d.startsWith('insignificant-budget-rejected')));
  const strict = { ...cfg, maxLengthInflation: 0 };
  const noInflation = generator.pool(strict, effects, phase);
  assert.ok(noInflation.candidates.every(({ target, solution }) => solution.operands === without.solutions.get(target)!.operands));
  assert.ok(noInflation.candidates.length < pool.candidates.length);
  const longCfg = config();
  longCfg.rules = { ...longCfg.rules, numbers: [2, 7], operations: ['+', '*'], maxMultiplications: 0 };
  longCfg.search = { ...longCfg.search, maxOperands: 8, maxTarget: 70, magnitude: 150 };
  assert.equal(solveRules(longCfg.rules, longCfg.search).solutions.get(49)!.operands, 7);
  assert.equal(solveRules({ ...longCfg.rules, maxMultiplications: null }, longCfg.search).solutions.get(49)!.operands, 2);
  const inflated = generator.pool(longCfg, [], phaseAt(0, longCfg));
  assert.ok(!inflated.candidates.some(candidate => candidate.target === 49));
  assert.ok(inflated.diagnostics.some(d => d.startsWith('length-inflation-rejected')));
});

test('R1: effect combinations are independent of card order and timer caps apply', () => {
  const cfg = config();
  for (const ids of [['D1', 'D2'], ['D1', 'T3'], ['D3', 'T1'], ['T2', 'T5', 'E3'], ['D1', 'D3', 'T1', 'T2', 'E1', 'E2']] as CardId[][]) {
    const effects = ids.map(id => effect(id));
    const reversed = [...effects].reverse();
    const phase = phaseAt(0, cfg);
    assert.deepEqual(buildRules(cfg, effects, phase), buildRules(cfg, reversed, phase));
    assert.equal(puzzleSeconds(cfg, effects, phase, 0), puzzleSeconds(cfg, reversed, phase, 0));
    assert.equal(scoreCoefficient(effects, true, cfg), scoreCoefficient(reversed, true, cfg));
    assert.equal(puzzleScore(cfg, effects, 3, 1, 2), puzzleScore(cfg, reversed, 3, 1, 2));
  }
  assert.equal(puzzleSeconds(cfg, [effect('T5'), effect('T1')], phaseAt(0, cfg), -100), 25);
  assert.equal(puzzleSeconds(cfg, [effect('T2')], phaseAt(0, cfg), 500), 120);
  assert.equal(puzzleSeconds(cfg, [effect('T2'), effect('T5'), effect('E3')], phaseAt(0, cfg), 0), 52);
  assert.equal(puzzleScore(cfg, [effect('D3'), effect('T1')], 3, 0, 1), 165);
  assert.equal(puzzleScore(cfg, [effect('D3')], 2, 0, 1), 54);
  assert.equal(scoreCoefficient(Array(10).fill(effect('E1')), true, cfg), 2.5);
  assert.equal(scoreCoefficient(Array(10).fill(effect('T2')), true, cfg), 0.5);
});

test('R1: simulated clock runs only while playable, retry has a different valid target', () => {
  let run = newRun(4);
  run = act(run, { type: 'advance', seconds: 1_000_000 });
  assert.equal(run.elapsed, 0);
  run = act(run, { type: 'start' });
  const previousTarget = run.current!.target;
  run = act(run, { type: 'advance', seconds: run.current!.seconds - 1 });
  assert.equal(run.status, 'playing');
  run = act(run, { type: 'advance', seconds: 1 });
  assert.equal(run.lives, 2); assert.equal(run.stage, 0);
  run = act(run, { type: 'start' });
  assert.notEqual(run.current!.target, previousTarget);
  run = act(run, { type: 'submit', expression: 'invalid' });
  assert.equal(run.lives, 1);
  run = act(act(run, { type: 'start' }), { type: 'submit', expression: 'invalid' });
  assert.equal(run.status, 'ended'); assert.equal(run.score, 0);
  assert.throws(() => act(run, { type: 'start' }), /invalid-action/);
  assert.throws(() => act(newRun(), { type: 'advance', seconds: -1 }), /invalid-elapsed/);
});

test('R1: assurance protects one failure only, expires unused, blood cost bypasses protection', () => {
  let run = { ...newRun(), effects: [effect('T4')] };
  run = act(act(run, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(run.lives, 3); assert.equal(run.effects[0].remaining, 2);
  run = act(act(run, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(run.lives, 2);
  run = act(act(run, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(run.lives, 1); assert.equal(run.effects.length, 0);
  let unused = [effect('T4')];
  for (let i = 0; i < 3; i++) unused = expire(unused, true);
  assert.equal(unused.length, 0);
  assert.equal(acquire('E1', resources(2, 1, [effect('T4')]), config()).lives, 1);
  const last = { ...newRun(), lives: 1, effects: [effect('T4', 1)] };
  const protectedRun = act(act(last, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(protectedRun.lives, 1); assert.equal(protectedRun.effects.length, 0);
});

test('R1: last attempt scores before expiry, blood counts successes, fragile carries once', () => {
  let run = { ...newRun(), effects: [effect('T1', 1), effect('E1'), effect('D4')] };
  const started = act(run, { type: 'start' });
  run = win(started);
  assert.equal(run.score, 170);
  assert.ok(!run.effects.some(e => e.id === 'T1'));
  assert.equal(run.effects.find(e => e.id === 'E1')!.remaining, 2);
  assert.equal(run.nextSeconds, BALANCE.fragileSeconds);
  run = act(run, { type: 'start' });
  assert.equal(run.current!.seconds, 35 + 8);
  assert.equal(run.nextSeconds, 0);
  run = act(run, { type: 'submit', expression: 'bad' });
  assert.equal(run.effects.find(e => e.id === 'E1')!.remaining, 2);
  assert.equal(act(run, { type: 'start' }).current!.seconds, 35);
});

test('R1: hints consume run reserve, affect score only and never cap stars', () => {
  let run = act(newRun(), { type: 'start' });
  const puzzle = run.current!;
  run = act(run, { type: 'hint' });
  assert.equal(run.hints, 2);
  assert.equal(run.hintsUsed, 1);
  run = act(run, { type: 'submit', expression: puzzle.expression });
  assert.equal(run.score, 85);
  assert.equal((run.events.find(e => e.type === 'success')!.detail as { stars: number }).stars, 3);
  const zero = { ...act(newRun(), { type: 'start' }), hints: 0 };
  assert.throws(() => act(zero, { type: 'hint' }), /no-hints/);
  assert.equal(puzzleScore(config(), [], 3, 2, 1), 70);
});

test('R1: tactical and major rewards are contextual; fewer than three cards and skip are valid', () => {
  const run = reach(2);
  assert.equal(run.status, 'reward');
  const before = JSON.stringify(run);
  const idle = act(run, { type: 'advance', seconds: 10000 });
  assert.equal(JSON.stringify(run), before);
  assert.equal(idle.elapsed, run.elapsed);
  assert.ok(run.offers.every(o => !o.card.startsWith('D') && !['T5', 'E2'].includes(o.card)));
  const chosen = act(run, { type: 'choose', offer: run.offers[0].id });
  assert.equal(chosen.status, 'ready'); assert.equal(chosen.effects.length, 1);
  assert.throws(() => act(run, { type: 'choose', offer: 'missing' }), /unknown-offer/);
  const major = reach(5);
  assert.equal(major.status, 'reward');
  const upgrades = draft({ ...major, effects: [effect('D3')] }, true, generator);
  const allRejected = draft({ ...major, purchases: Object.fromEntries(Object.keys(CARDS).map(id => [id, 3])) }, true, generator);
  assert.equal(allRejected.offers.length, 0);
  assert.equal(act({ ...major, offers: [] }, { type: 'choose', offer: null }).status, 'ready');
  assert.ok(upgrades.rejected.some(r => r.id === 'E2' && r.reasons.includes('lives-full')));
  assert.ok(futureErrors({ ...major, config: { ...config(), search: { ...config().search, maxOperands: 1 } } }, [effect('D1')], generator).length);
});

test('R1: upgrades and replacement carry costs, no upgrade to absent effects', async () => {
  const { applyOffer } = await import('../src/rogue-v1/rewards');
  const run = { ...newRun(), lives: 2, effects: [effect('D1')] };
  const upgraded = applyOffer(run, { id: 'D1:upgrade', card: 'D1', kind: 'upgrade' });
  assert.equal(upgraded.effects[0].level, 2);
  assert.equal(buildRules(config(), upgraded.effects, phaseAt(0, config())).minimumOccurrences[7], 2);
  assert.ok(scoreCoefficient(upgraded.effects, true, config()) > scoreCoefficient(run.effects, true, config()));
  assert.throws(() => applyOffer(run, { id: 'D3:upgrade', card: 'D3', kind: 'upgrade' }), /invalid-upgrade/);
  const replaced = applyOffer(run, { id: 'E1:replace:D1', card: 'E1', kind: 'replace', replaces: 'D1' });
  assert.equal(replaced.lives, 1); assert.deepEqual(replaced.effects.map(e => e.id), ['E1']);
});

test('R1: boss variants add restrictions without repeating active ones', () => {
  const cfg = config();
  const base = buildRules(cfg, [effect('T3')], phaseAt(8, cfg));
  const extra = additionalRule(base, 3);
  assert.equal(extra.requireSubtraction, true);
  assert.equal(extra.maxMultiplications, 2);
  const combined = { ...extra, maxMultiplications: 1 };
  assert.equal(additionalRule(combined, 3).minimumOccurrences[2], 1);
  const architect = phaseAt(15, cfg);
  assert.equal(architect.act, 3); assert.equal(architect.index, 2);
  assert.notDeepEqual(bossRules(cfg.rules, architect), cfg.rules);
  assert.ok(puzzleSeconds(cfg, [], architect, 0) < cfg.seconds[architect.difficulty - 1]);
});

test('R1: sixteen successes win; boss retries preserve phases; scoring and boss bonuses once', () => {
  let run = reach(4);
  assert.deepEqual(run.defeatedBosses, []);
  run = act(run, { type: 'start' });
  assert.equal(run.current!.seconds, config().seconds[1] + 8);
  run = act(run, { type: 'submit', expression: 'bad' });
  assert.equal(run.stage, 4);
  run = win(run);
  assert.deepEqual(run.defeatedBosses, [1]);
  const score = run.score;
  run = act(run, { type: 'choose', offer: null });
  assert.equal(run.score, score);
  run = reach(15, run);
  assert.deepEqual(run.defeatedBosses, [1, 2]);
  run = act(act(run, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(run.stage, 15); assert.equal(run.officialVictory, false);
  run = win(run);
  assert.equal(run.stage, 16); assert.equal(run.officialVictory, true); assert.equal(run.status, 'victory');
  assert.deepEqual(run.defeatedBosses, [1, 2, 3]);
  assert.equal(run.events.filter(e => e.type === 'boss-defeated').length, 3);
  assert.equal(totalStages(config()), 16);
  assert.throws(() => act(run, { type: 'submit', expression: '2' }), /invalid-action/);
  const finished = act(run, { type: 'finish' });
  assert.equal(finished.endCause, 'victory-finished');
  let survival = act(run, { type: 'continue' });
  survival = win(survival);
  assert.equal(survival.maxProgress, 17);
  while (survival.lives > 0) survival = act(act(survival, { type: 'start' }), { type: 'submit', expression: 'bad' });
  assert.equal(survival.officialVictory, true); assert.deepEqual(survival.defeatedBosses, [1, 2, 3]);
  assert.equal(survival.bestScore, survival.score);
});

test('R1: architect precision rejects one-star valid answers; last-life final defeat is not victory', () => {
  let run = reach(15);
  run = act({ ...run, lives: 1 }, { type: 'start' });
  const puzzle = run.current!;
  const long = `${puzzle.expression}+2-2`;
  assert.ok(inspectExpression(long, puzzle.rules, config().search.magnitude));
  assert.equal(expressionValue(long), puzzle.target);
  run = act(run, { type: 'submit', expression: long });
  assert.equal(run.lives, 0); assert.equal(run.status, 'ended'); assert.equal(run.officialVictory, false);
  assert.deepEqual(run.defeatedBosses, [1, 2]);
});

test('R1: simulations are reproducible, policies distinct, generator failure explicitly logged', () => {
  for (const policy of ['prudent', 'equilibre', 'temeraire'] as const) {
    const options = { seed: 42, runs: 3, policy, survivalPuzzles: 2 };
    const a = simulate(options);
    const b = simulate(options);
    assert.deepEqual(a, b);
    assert.equal(a.summary.blocked, 0);
    assert.ok(a.runs.every(run => run.events.some(e => e.type === 'puzzle')));
  }
  assert.notDeepEqual(simulate({ policy: 'prudent' }).summary, simulate({ policy: 'temeraire' }).summary);
  const cfg = config(); cfg.rules.minimumOccurrences = { 9: 1 };
  const blocked = act(newRun(1, cfg), { type: 'start' });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.events[0].type, 'generation-refused');
  assert.throws(() => simulate({ runs: 0 }), /invalid-simulation/);
});

test('R1: score cannot skip phases; nonoptimal answers exercise perfection and fragile penalties', () => {
  let run = { ...newRun(), score: 1_000_000, effects: [effect('D3', null, 2), effect('D4', null, 2)] };
  run = act(run, { type: 'start' });
  run = act(run, { type: 'submit', expression: `${run.current!.expression}+2-2` });
  assert.equal(run.stage, 1);
  assert.equal(run.score, 1_000_028);
  assert.equal(run.nextSeconds, -12);
  assert.equal(act(run, { type: 'start' }).current!.seconds, 25);
});

test('R1: every offered build survives remaining mathematical phases and survival preview', () => {
  const run = reach(5);
  const proposed = draft(run, true, generator);
  assert.ok(proposed.offers.length > 0);
  for (const offer of proposed.offers) {
    const selected = act({ ...run, offers: proposed.offers }, { type: 'choose', offer: offer.id });
    assert.deepEqual(futureErrors(selected, selected.effects, generator), []);
  }
  for (const ids of [['D1', 'D2'], ['D1', 'T3'], ['D1', 'D2', 'T3']] as CardId[][]) {
    for (let stage = 0; stage < 20; stage++) {
      const generated = generator.generate(config(), ids.map(id => effect(id)), phaseAt(stage, config()), 0.25, 0, null);
      if (!generated.puzzle) { assert.ok(generated.diagnostics.length); continue; }
      assert.ok(inspectExpression(generated.puzzle.expression, generated.puzzle.rules, config().search.magnitude));
      assert.equal(expressionValue(generated.puzzle.expression), generated.puzzle.target);
    }
  }
});
