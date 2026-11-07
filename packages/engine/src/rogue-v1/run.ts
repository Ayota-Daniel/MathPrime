import { BALANCE, expire, puzzleScore, starsFor } from './cards';
import { Generator } from './generator';
import { expressionValue, inspectExpression } from './math';
import { DEFAULT_CONFIG, phaseAt, random, totalStages } from './model';
import type { Config, Run } from './model';
import { applyOffer, draft } from './rewards';

export type Action =
  | { type: 'start' }
  | { type: 'advance'; seconds: number }
  | { type: 'submit'; expression: string }
  | { type: 'hint' }
  | { type: 'choose'; offer: string | null }
  | { type: 'finish' }
  | { type: 'continue' };

export function newRun(seed = 1, config: Config = DEFAULT_CONFIG): Run {
  if (!Number.isFinite(seed) || config.lives < 1 || config.hints < 0 || config.ordinaryPerAct < 1
    || !Number.isInteger(config.ordinaryPerAct) || config.bossPhases.some(n => !Number.isInteger(n) || n < 1)
    || config.minimumTargets < 2 || config.minimumSeconds <= 0 || config.maximumSeconds < config.minimumSeconds
    || config.seconds.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('invalid-run-config');
  return {
    config: JSON.parse(JSON.stringify(config)), seed: seed >>> 0, stage: 0, status: 'ready', lives: config.lives, hints: config.hints,
    effects: [], score: 0, bestScore: 0, maxProgress: 0, officialVictory: false, defeatedBosses: [], current: null,
    elapsed: 0, hintsUsed: 0, nextSeconds: 0, lastTarget: null, offers: [], purchases: {}, endCause: null, events: [],
  };
}
function event(run: Run, type: string, detail: unknown): void {
  run.events.push({ type, stage: run.stage, detail });
}
function fail(run: Run, cause: string): void {
  const shield = run.effects.find(effect => effect.id === 'T4' && !effect.shieldUsed);
  if (shield) shield.shieldUsed = true;
  else run.lives--;
  event(run, 'failure', { cause, protected: Boolean(shield), lives: run.lives, remainingSeconds: run.current!.seconds - run.elapsed });
  run.effects = expire(run.effects, false);
  run.current = null;
  run.status = run.lives > 0 ? 'ready' : 'ended';
  if (!run.lives) run.endCause = cause;
}
function succeed(run: Run, stars: number, operands: number, generator: Generator): void {
  const phase = phaseAt(run.stage, run.config);
  const points = puzzleScore(run.config, run.effects, stars, run.hintsUsed, phase.difficulty);
  run.score += points;
  const fragile = run.effects.find(effect => effect.id === 'D4');
  if (fragile) run.nextSeconds += (BALANCE.fragileSeconds + (fragile.level - 1) * BALANCE.fragileUpgrade) * (stars === 3 ? 1 : -1);
  if (phase.boss && phase.act === 1 && phase.index === 0 && stars === 3) run.nextSeconds += BALANCE.rhythmSeconds;
  event(run, 'success', { target: run.current!.target, stars, operands, points, hints: run.hintsUsed, remainingSeconds: run.current!.seconds - run.elapsed });
  run.effects = expire(run.effects, true);
  run.current = null;
  run.stage++;
  run.maxProgress = Math.max(run.maxProgress, run.stage);
  const bossWon = phase.boss && phase.index === run.config.bossPhases[phase.act - 1] - 1;
  if (bossWon && !run.defeatedBosses.includes(phase.act)) {
    run.defeatedBosses.push(phase.act);
    run.score += run.config.bossRewards[phase.act - 1];
    event(run, 'boss-defeated', { act: phase.act, points: run.config.bossRewards[phase.act - 1] });
  }
  run.bestScore = Math.max(run.bestScore, run.score);
  if (run.stage === totalStages(run.config)) {
    run.officialVictory = true;
    run.status = 'victory';
    event(run, 'official-victory', { score: run.score });
    return;
  }
  const tactical = !phase.boss && phase.survival === 0 && phase.index === Math.min(1, run.config.ordinaryPerAct - 1);
  if ((bossWon && phase.act < 3) || tactical) {
    const reward = draft(run, bossWon, generator);
    run.seed = reward.seed;
    run.offers = reward.offers;
    run.status = 'reward';
    event(run, 'reward', { major: bossWon, offers: reward.offers, rejected: reward.rejected });
  } else run.status = 'ready';
}
/** Pure state transition with an explicit, session-owned solver cache. No real timers. */
export function transition(previous: Run, action: Action, generator = new Generator()): Run {
  const run: Run = { ...previous, effects: previous.effects.map(effect => ({ ...effect })),
    defeatedBosses: [...previous.defeatedBosses], purchases: { ...previous.purchases }, events: [...previous.events] };
  if (action.type === 'advance') {
    if (!Number.isFinite(action.seconds) || action.seconds < 0) throw new Error('invalid-elapsed-time');
    if (run.status !== 'playing') return run;
    run.elapsed += action.seconds;
    if (run.elapsed >= run.current!.seconds) { run.elapsed = run.current!.seconds; fail(run, 'timeout'); }
    return run;
  }
  if (action.type === 'start' && run.status === 'ready') {
    const [value, seed] = random(run.seed);
    run.seed = seed;
    const result = generator.generate(run.config, run.effects, phaseAt(run.stage, run.config), value, run.nextSeconds, run.lastTarget);
    if (!result.puzzle) {
      run.status = 'blocked'; run.endCause = 'generation-unavailable';
      event(run, 'generation-refused', result.diagnostics);
      return run;
    }
    run.current = result.puzzle;
    run.lastTarget = result.puzzle.target;
    run.nextSeconds = 0;
    run.elapsed = 0;
    run.hintsUsed = 0;
    run.status = 'playing';
    event(run, 'puzzle', { ...result.puzzle, effects: run.effects.map(effect => ({ ...effect })), lives: run.lives, hints: run.hints, diagnostics: result.diagnostics });
    return run;
  }
  if (action.type === 'hint' && run.status === 'playing') {
    if (run.hints <= 0) throw new Error('no-hints');
    run.hints--; run.hintsUsed++;
    event(run, 'hint', { expression: run.current!.expression, hints: run.hints });
    return run;
  }
  if (action.type === 'submit' && run.status === 'playing') {
    const puzzle = run.current!;
    event(run, 'submission', { expression: action.expression });
    const solution = inspectExpression(action.expression, puzzle.rules, run.config.search.magnitude);
    const stars = solution ? starsFor(solution.operands, puzzle.operands) : 0;
    if (!solution || expressionValue(action.expression) !== puzzle.target || stars < puzzle.minimumStars) fail(run, 'incorrect-terminal-answer');
    else succeed(run, stars, solution.operands, generator);
    return run;
  }
  if (action.type === 'choose' && run.status === 'reward') {
    if (action.offer !== null) {
      const offer = run.offers.find(offer => offer.id === action.offer);
      if (!offer) throw new Error('unknown-offer');
      Object.assign(run, applyOffer(run, offer));
      run.purchases[offer.card] = (run.purchases[offer.card] ?? 0) + 1;
      event(run, 'choice', { offer, lives: run.lives, hints: run.hints, effects: run.effects });
    } else event(run, 'choice-skipped', null);
    run.offers = [];
    run.status = 'ready';
    return run;
  }
  if (run.status === 'victory' && (action.type === 'finish' || action.type === 'continue')) {
    run.status = action.type === 'finish' ? 'ended' : 'ready';
    run.endCause = action.type === 'finish' ? 'victory-finished' : null;
    event(run, action.type, null);
    return run;
  }
  throw new Error(`invalid-action:${run.status}:${action.type}`);
}
