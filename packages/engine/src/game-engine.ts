/** game-engine.ts — logique PARTAGÉE (aucune UI). Runtime. */
import { evaluate, type Op } from './evaluate';
import type { Puzzle } from './difficulty';

export interface Rules { numbers: number[]; operations: Op[]; required: number[]; }
export const BASE_RULES: Rules = { numbers: [3, 5, 7], operations: ['+', '-', '*'], required: [] };

export type Mode = 'classic' | 'daily' | 'big3' | 'big5' | 'big7' | 'freeskill' | 'rogue';
export const ALL_MODES: Mode[] = ['classic', 'daily', 'big3', 'big5', 'big7', 'freeskill', 'rogue'];

/* ---------- Validation ---------- */
export type Reason = 'empty' | 'incomplete' | 'bad_token' | 'has_parens' | 'wrong_value' | 'missing_required';
export interface Validation { ok: boolean; value: number | null; reason?: Reason; operands: number; optimalOperands: number; stars: 0 | 1 | 2 | 3; }

export function validateAnswer(input: string, target: number, optimalOperands: number, rules: Rules): Validation {
  const fail = (reason: Reason, value: number | null = null, operands = 0): Validation => ({ ok: false, value, reason, operands, optimalOperands, stars: 0 });
  const expr = input.replace(/\s+/g, '');
  if (!expr) return fail('empty');
  if (/[()]/.test(expr)) return fail('has_parens');
  // Cover the entire input, including the unfinished final operator.
  if (!/^\d+(?:[+\-*]\d+)*[+\-*]?$/.test(expr)) return fail('bad_token');
  if (/[+\-*]$/.test(expr)) return fail('incomplete');
  const tokens = expr.match(/\d+|[+\-*]/g);
  if (!tokens) return fail('bad_token');
  const numSet = new Set(rules.numbers.map(String));
  const opSet = new Set<string>(rules.operations);
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) { if (!numSet.has(tokens[i])) return fail('bad_token'); }
    else if (!opSet.has(tokens[i])) return fail('bad_token');
  }
  const usedNums = tokens.filter((_, i) => i % 2 === 0).map(Number);
  for (const r of rules.required) if (!usedNums.includes(r)) return fail('missing_required');
  const value = evaluate(expr);
  if (value !== target) return fail('wrong_value', value, usedNums.length);
  const operands = usedNums.length;
  const stars: Validation['stars'] = operands <= optimalOperands ? 3 : operands === optimalOperands + 1 ? 2 : 1;
  return { ok: true, value, operands, optimalOperands, stars };
}

/** Un échec de réponse fait perdre la série (toute valeur fausse / contrainte manquée / timeout). */
export const breaksStreak = (reason: Reason | 'timeout' | undefined): boolean =>
  reason === 'wrong_value' || reason === 'missing_required' || reason === 'timeout';

/* ---------- Scoring ---------- */
const BASE_BY_DIFFICULTY = [0, 15, 30, 55, 90, 140]; // courbe relevée (public aguerri)
const MODE_MULT: Record<Mode, number> = { classic: 1, daily: 1.2, big3: 1.25, big5: 1.25, big7: 1.25, freeskill: 1.1, rogue: 1 };
export interface ScoreInput { difficulty: 1 | 2 | 3 | 4 | 5; stars: 0 | 1 | 2 | 3; mode: Mode; secondsLeft?: number; rogueMult?: number; streak?: number; }
export function scorePuzzle({ difficulty, stars, mode, secondsLeft = 0, rogueMult = 1, streak = 0 }: ScoreInput): number {
  if (stars === 0) return 0;
  const optimality = stars === 3 ? 1.5 : stars === 2 ? 1.0 : 0.6;
  const time = mode === 'freeskill' ? Math.max(0, secondsLeft) * 0.5 : 0;
  const streakBonus = 1 + Math.min(0.5, streak * 0.05); // jusqu'à +50%
  return Math.round((BASE_BY_DIFFICULTY[difficulty] * optimality * MODE_MULT[mode] * rogueMult * streakBonus) + time);
}

/* ---------- Progression non 1:1 ---------- */
export const rankForXp = (xp: number): number => Math.max(1, Math.floor((xp / 60) ** (1 / 1.7)) + 1);
export const xpForRank = (rank: number): number => Math.ceil(60 * (rank - 1) ** 1.7);

/* ---------- Sélection par mode ---------- */
/** Classique : on DÉMARRE dur (≥4 opérandes) et on grimpe vite. */
export function classicCurriculum(base: Puzzle[], count = 100): Puzzle[] {
  return base
    .filter((p) => p.operands >= 4)                 // pas de 3/5/7 ni de trivialités
    .sort((a, b) => a.operands - b.operands || a.target - b.target)
    .slice(0, count);
}
export function dailyPuzzle(base: Puzzle[], date = new Date()): Puzzle {
  const pool = base.filter((p) => p.operands >= 5); // un daily jamais trivial
  const seed = Number(`${date.getUTCFullYear()}${date.getUTCMonth() + 1}${date.getUTCDate()}`);
  return pool[Math.abs((seed * 2654435761) % pool.length)];
}
export function freeSkillPick(base: Puzzle[], level: 1 | 2 | 3 | 4 | 5, rng: () => number = Math.random): Puzzle {
  const pool = base.filter((p) => p.difficulty === level);
  const src = pool.length ? pool : base;
  return src[Math.floor(rng() * src.length)];
}
/** Free Skill démarre au niveau 2 et réagit vite. */
export const FREESKILL_START: 1 | 2 | 3 | 4 | 5 = 2;
export function adjustLevel(level: number, streak: number, fails: number): 1 | 2 | 3 | 4 | 5 {
  let l = level;
  if (streak >= 2) l = Math.min(5, l + 1);   // monte après 2 réussites
  if (fails >= 1) l = Math.max(1, l - 1);    // descend dès 1 échec
  return l as 1 | 2 | 3 | 4 | 5;
}
export const dateKey = (d = new Date()): string => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/* ---------- ROGUE-LIKE : modificateurs + vies ---------- */
export const MAX_LIVES = 3;
export const DRAFT_EVERY = 3;
export interface RogueModifier { id: string; label: string; kind: 'boon' | 'bane'; apply: (r: Rules) => Rules; scoreMult: number; restoreLife?: boolean; }
export const ROGUE_POOL: RogueModifier[] = [
  { id: 'no_mult', label: 'Multiplication interdite', kind: 'bane', apply: (r) => ({ ...r, operations: r.operations.filter((o) => o !== '*') }), scoreMult: 1.6 },
  { id: 'need_7', label: 'Doit contenir un 7', kind: 'bane', apply: (r) => ({ ...r, required: [...new Set([...r.required, 7])] }), scoreMult: 1.4 },
  { id: 'only_35', label: 'Seuls 3 et 5 autorisés', kind: 'bane', apply: (r) => ({ ...r, numbers: r.numbers.filter((n) => n !== 7) }), scoreMult: 1.5 },
  { id: 'double', label: 'Points doublés', kind: 'boon', apply: (r) => r, scoreMult: 2.0 },
  { id: 'add_1', label: 'Ajoute le chiffre 1', kind: 'boon', apply: (r) => ({ ...r, numbers: [...new Set([1, ...r.numbers])] }), scoreMult: 0.8 },
  { id: 'heal', label: 'Récupère une vie', kind: 'boon', apply: (r) => r, scoreMult: 1.0, restoreLife: true },
];
/** Necessary consistency checks; bounded puzzle selection checks reachability separately. */
export function areRulesCompatible(rules: Rules): boolean {
  if (rules.numbers.length === 0) return false;
  if (!rules.required.every((number) => rules.numbers.includes(number))) return false;
  return rules.operations.length > 0 || new Set(rules.required).size <= 1;
}

export function isModifierCompatible(rules: Rules, modifier: RogueModifier): boolean {
  return areRulesCompatible(modifier.apply(rules));
}

export function draftModifiers(rng: () => number = Math.random, n = 3, rules: Rules = BASE_RULES): RogueModifier[] {
  const pool = ROGUE_POOL.filter((modifier) => isModifierCompatible(rules, modifier));
  const out: RogueModifier[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
export interface RogueRun { lives: number; solved: number; score: number; rules: Rules; mods: RogueModifier[]; scoreMult: number; over: boolean; }
export const newRogueRun = (): RogueRun => ({ lives: MAX_LIVES, solved: 0, score: 0, rules: { ...BASE_RULES }, mods: [], scoreMult: 1, over: false });
export function rogueOnSolve(run: RogueRun, gained: number): { run: RogueRun; shouldDraft: boolean } {
  const solved = run.solved + 1;
  return { run: { ...run, solved, score: run.score + gained }, shouldDraft: solved % DRAFT_EVERY === 0 && !run.over };
}
export const rogueOnFail = (run: RogueRun): RogueRun => { const lives = run.lives - 1; return { ...run, lives, over: lives <= 0 }; };
export function applyModifier(run: RogueRun, mod: RogueModifier): RogueRun {
  if (!isModifierCompatible(run.rules, mod)) return run;
  return {
    ...run, rules: mod.apply(run.rules), mods: [...run.mods, mod], scoreMult: run.scoreMult * mod.scoreMult,
    lives: mod.restoreLife ? Math.min(MAX_LIVES, run.lives + 1) : run.lives,
  };
}


/* ---------- HINTS ---------- */
export const exprTokens = (expr: string): string[] => expr.match(/\d+|[+\-*]/g) ?? [];
/** Plafond d'étoiles selon le nb d'indices utilisés (anti-abus).
 *  0 indice -> 3★ possible ; jusqu'à la moitié révélée -> 2★ ; au-delà -> 1★. */
export function hintStarCeiling(hintsUsed: number, totalTokens: number): 0 | 1 | 2 | 3 {
  if (hintsUsed <= 0) return 3;
  if (hintsUsed * 2 <= totalTokens) return 2;
  return 1;
}
