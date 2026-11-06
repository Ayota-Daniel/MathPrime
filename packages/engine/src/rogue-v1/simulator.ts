import { inspectExpression } from './math';
import { Generator } from './generator';
import { DEFAULT_CONFIG, random } from './model';
import type { CardId, Config, Run } from './model';
import { newRun, transition } from './run';

export type Policy = 'prudent' | 'equilibre' | 'temeraire';
const PREFERENCES: Record<Policy, CardId[]> = {
  prudent: ['E2', 'T4', 'T5', 'T2', 'E3', 'D4', 'D1', 'D3', 'T3', 'D2', 'T1', 'E1'],
  equilibre: ['D3', 'D1', 'T4', 'E2', 'D4', 'T5', 'T2', 'T3', 'D2', 'E3', 'T1', 'E1'],
  temeraire: ['E1', 'D2', 'D1', 'T1', 'D3', 'T3', 'D4', 'E3', 'E2', 'T5', 'T4', 'T2'],
};
export const POLICY_PARAMETERS = {
  prudent: { errorRate: 0.08, timeFraction: 0.65, hintRate: 0.30, nonOptimalRate: 0.30 },
  equilibre: { errorRate: 0.14, timeFraction: 0.55, hintRate: 0.15, nonOptimalRate: 0.15 },
  temeraire: { errorRate: 0.23, timeFraction: 0.40, hintRate: 0.05, nonOptimalRate: 0.40 },
};
export interface SimulationOptions {
  seed?: number;
  runs?: number;
  policy?: Policy;
  survivalPuzzles?: number;
  config?: Config;
}
export interface SimulationReport {
  disclaimer: string;
  parameters: { seed: number; runs: number; policy: Policy; survivalPuzzles: number; config: Config };
  summary: {
    officialVictories: number; blocked: number; meanScore: number; bestScore: number;
    maxProgress: number; meanProgress: number; bossVictories: number[]; endings: Record<string, number>;
    chosenCards: Partial<Record<CardId, number>>; warnings: number;
  };
  generator: { searches: number; cacheHits: number; states: number };
  runs: Run[];
}
export function simulate(options: SimulationOptions = {}): SimulationReport {
  const { seed = 1, runs = 5, policy = 'equilibre', survivalPuzzles = 0, config = DEFAULT_CONFIG } = options;
  if (!Number.isInteger(runs) || runs < 1 || runs > 1000 || !Number.isInteger(survivalPuzzles) || survivalPuzzles < 0 || survivalPuzzles > 100 || !PREFERENCES[policy]) throw new Error('invalid-simulation-options');
  const generator = new Generator();
  const results: Run[] = [];
  const chosenCards: Partial<Record<CardId, number>> = {};
  const parameters = POLICY_PARAMETERS[policy];
  for (let i = 0; i < runs; i++) {
    let run = newRun(seed + i, config);
    let survivalStart = 0;
    let steps = 0;
    while (run.status !== 'ended' && run.status !== 'blocked') {
      if (++steps > 2000) throw new Error('simulation-step-limit');
      if (run.officialVictory && survivalStart && run.stage - survivalStart >= survivalPuzzles && run.status === 'ready') {
        run = { ...run, status: 'ended', endCause: 'simulation-survival-limit' };
        break;
      }
      if (run.status === 'ready') run = transition(run, { type: 'start' }, generator);
      else if (run.status === 'reward') {
        const preferences = [...PREFERENCES[policy]];
        if (run.lives === 1) preferences.unshift('E2', 'T4');
        const offer = [...run.offers].sort((a, b) => preferences.indexOf(a.card) - preferences.indexOf(b.card))[0];
        if (offer) chosenCards[offer.card] = (chosenCards[offer.card] ?? 0) + 1;
        run = transition(run, { type: 'choose', offer: offer?.id ?? null }, generator);
      } else if (run.status === 'victory') {
        survivalStart = run.stage;
        run = transition(run, { type: survivalPuzzles > 0 ? 'continue' : 'finish' }, generator);
      } else if (run.status === 'playing') {
        const [value, nextSeed] = random(run.seed);
        run = { ...run, seed: nextSeed };
        if (run.hints > 0 && value < parameters.hintRate) run = transition(run, { type: 'hint' }, generator);
        const puzzle = run.current!;
        // Synthetic agents know the witness. Errors/timeouts are controlled experimental assumptions.
        const [error, errorSeed] = random(run.seed);
        run = { ...run, seed: errorSeed };
        if (error < parameters.errorRate / 2) run = transition(run, { type: 'advance', seconds: puzzle.seconds }, generator);
        else {
          run = transition(run, { type: 'advance', seconds: puzzle.seconds * parameters.timeFraction }, generator);
          const [quality, qualitySeed] = random(run.seed);
          run = { ...run, seed: qualitySeed };
          const digit = puzzle.rules.numbers[0];
          const longer = `${puzzle.expression}+${digit}-${digit}`;
          const nonOptimal = quality < parameters.nonOptimalRate && puzzle.minimumStars === 1
            && inspectExpression(longer, puzzle.rules, config.search.magnitude);
          const expression = error < parameters.errorRate ? 'invalid' : nonOptimal ? longer : puzzle.expression;
          run = transition(run, { type: 'submit', expression }, generator);
        }
      }
    }
    results.push(run);
  }
  const endings: Record<string, number> = {};
  for (const run of results) endings[run.endCause ?? 'unknown'] = (endings[run.endCause ?? 'unknown'] ?? 0) + 1;
  return {
    disclaimer: 'Agents synthétiques utilisant les solutions témoins ; aucun taux de victoire humain mesuré.',
    parameters: { seed, runs, policy, survivalPuzzles, config },
    summary: {
      officialVictories: results.filter(run => run.officialVictory).length,
      blocked: results.filter(run => run.status === 'blocked').length,
      meanScore: results.reduce((sum, run) => sum + run.score, 0) / runs,
      bestScore: Math.max(...results.map(run => run.bestScore)),
      maxProgress: Math.max(...results.map(run => run.maxProgress)),
      meanProgress: results.reduce((sum, run) => sum + run.stage, 0) / runs,
      bossVictories: [1, 2, 3].map(act => results.filter(run => run.defeatedBosses.includes(act)).length),
      endings, chosenCards,
      warnings: results.reduce((sum, run) => sum + run.events.filter(event => event.type === 'puzzle' && (event.detail as { warnings: string[] }).warnings.length).length, 0),
    },
    generator: { searches: generator.searches, cacheHits: generator.cacheHits, states: generator.states },
    runs: results,
  };
}
