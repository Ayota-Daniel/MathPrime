import type { Op } from '../evaluate';

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export interface Rules {
  numbers: number[];
  operations: Op[];
  minimumOccurrences: Record<number, number>;
  requireSubtraction: boolean;
  maxMultiplications: number | null;
}
export interface SearchLimits {
  maxOperands: number;
  magnitude: number;
  maxTarget: number;
  maxStates: number;
}
export interface Config {
  lives: number;
  hints: number;
  ordinaryPerAct: number;
  bossPhases: [number, number, number];
  seconds: [number, number, number, number, number];
  minimumSeconds: number;
  maximumSeconds: number;
  maxLengthInflation: number;
  minimumTargets: number;
  scoreBase: number;
  bossRewards: [number, number, number];
  hintPenalty: number;
  scoreBounds: [number, number];
  search: SearchLimits;
  rules: Rules;
}
export const DEFAULT_CONFIG: Config = {
  lives: 3, hints: 3, ordinaryPerAct: 3, bossPhases: [2, 2, 3],
  seconds: [35, 45, 60, 75, 90], minimumSeconds: 25, maximumSeconds: 120,
  maxLengthInflation: 2, minimumTargets: 2, scoreBase: 100,
  bossRewards: [150, 250, 500], hintPenalty: 0.15, scoreBounds: [0.5, 2.5],
  search: { maxOperands: 6, magnitude: 500, maxTarget: 150, maxStates: 350_000 },
  rules: { numbers: [2, 3, 7], operations: ['+', '-', '*'], minimumOccurrences: {},
    requireSubtraction: false, maxMultiplications: null },
};
export type CardId = 'D1' | 'D2' | 'D3' | 'D4' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'E1' | 'E2' | 'E3';
export interface Effect { id: CardId; remaining: number | null; level: number; shieldUsed: boolean; }
export interface Resources { lives: number; hints: number; effects: Effect[]; }
export interface Solution { expression: string; operands: number; multiplications: number; }
export interface Puzzle extends Solution {
  target: number;
  rules: Rules;
  difficulty: Difficulty;
  seconds: number;
  minimumStars: number;
  estimatedCost: number;
  warnings: string[];
  candidateCount: number;
  variant: string;
}
export interface Phase { act: number; boss: boolean; index: number; difficulty: Difficulty; survival: number; }
export interface Offer { id: string; card: CardId; kind: 'add' | 'upgrade' | 'replace'; replaces?: CardId; }
export type Status = 'ready' | 'playing' | 'reward' | 'victory' | 'ended' | 'blocked';
export interface Run extends Resources {
  config: Config;
  seed: number;
  stage: number;
  status: Status;
  score: number;
  bestScore: number;
  maxProgress: number;
  officialVictory: boolean;
  defeatedBosses: number[];
  current: Puzzle | null;
  elapsed: number;
  hintsUsed: number;
  nextSeconds: number;
  lastTarget: number | null;
  offers: Offer[];
  purchases: Partial<Record<CardId, number>>;
  endCause: string | null;
  events: { type: string; stage: number; detail: unknown }[];
}
export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
export function random(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}
export function totalStages(config: Config): number {
  return config.ordinaryPerAct * 3 + config.bossPhases.reduce((sum, count) => sum + count, 0);
}
export function phaseAt(stage: number, config: Config): Phase {
  let offset = stage;
  for (let act = 1; act <= 3; act++) {
    const count = config.ordinaryPerAct + config.bossPhases[act - 1];
    if (offset < count) return {
      act, boss: offset >= config.ordinaryPerAct,
      index: offset >= config.ordinaryPerAct ? offset - config.ordinaryPerAct : offset,
      difficulty: Math.min(5, act + (offset >= config.ordinaryPerAct ? 1 : 0)) as Difficulty,
      survival: 0,
    };
    offset -= count;
  }
  return { act: 4, boss: false, index: offset, difficulty: 5, survival: offset + 1 };
}
