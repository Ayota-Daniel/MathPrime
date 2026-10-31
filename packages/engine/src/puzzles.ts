/** puzzles.ts — RUNTIME. Types + index O(1). PAS de solveur ici. */
import type { Puzzle } from './difficulty';
export type TableName = 'base' | 'big3' | 'big5' | 'big7';

export interface PuzzleIndex { list: Puzzle[]; byTarget: Map<number, Puzzle>; byDifficulty: Map<number, Puzzle[]>; }

export function indexTable(list: Puzzle[]): PuzzleIndex {
  const byTarget = new Map<number, Puzzle>();
  const byDifficulty = new Map<number, Puzzle[]>();
  for (const p of list) {
    byTarget.set(p.target, p);
    const arr = byDifficulty.get(p.difficulty) ?? [];
    arr.push(p); byDifficulty.set(p.difficulty, arr);
  }
  return { list, byTarget, byDifficulty };
}
