/** difficulty.ts — labelisation 5 niveaux.
 *
 * Public cible : personnes aguerries en maths -> courbe PLUS DURE.
 * On bucketise par PALIERS D'OPÉRANDES (le vrai signal de difficulté) au lieu
 * de quintiles équilibrés : chaque niveau correspond à un nombre d'opérandes
 * croissant, donc la difficulté monte vite et le début n'est pas trivial.
 *
 * Seuils par défaut (modifiables) :
 *   L1: ≤4 opérandes | L2: 5 | L3: 6 | L4: 7 | L5: ≥8
 */
export interface PuzzleRaw { target: number; expr: string; operands: number; }
export interface Puzzle extends PuzzleRaw { difficulty: 1 | 2 | 3 | 4 | 5; }

export const operandCount = (expr: string): number => (expr.match(/\d+/g) ?? []).length;

/** Paliers d'opérandes -> niveau. Borne supérieure incluse. */
export const DIFFICULTY_TIERS: { maxOperands: number; level: Puzzle['difficulty'] }[] = [
  { maxOperands: 4, level: 1 },
  { maxOperands: 5, level: 2 },
  { maxOperands: 6, level: 3 },
  { maxOperands: 7, level: 4 },
  { maxOperands: Infinity, level: 5 },
];

export function difficultyForOperands(operands: number): Puzzle['difficulty'] {
  for (const t of DIFFICULTY_TIERS) if (operands <= t.maxOperands) return t.level;
  return 5;
}

export function labelDifficulty(entries: PuzzleRaw[]): Puzzle[] {
  return entries
    .map((x) => ({ ...x, difficulty: difficultyForOperands(x.operands) }))
    .sort((a, b) => a.difficulty - b.difficulty || a.target - b.target);
}
