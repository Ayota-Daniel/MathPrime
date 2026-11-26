import { difficultyForOperands, type Puzzle } from './difficulty';
import { areRulesCompatible, type Rules } from './game-engine';
import { solveOne } from './solve-one';

export const ROGUE_SEARCH_LIMITS = {
  minTarget: 5,
  maxTarget: 199,
  maxOperands: 12,
  magBound: 4000,
  randomAttempts: 60,
} as const;

/** Returns a shortest solution within solveOne's bounds, or an explicit failure. */
export function pickRoguePuzzle(rules: Rules, rng: () => number = Math.random): Puzzle | null {
  if (!areRulesCompatible(rules)) return null;

  const { minTarget, maxTarget, maxOperands, magBound, randomAttempts } = ROGUE_SEARCH_LIMITS;
  const tried = new Set<number>();

  function tryTarget(target: number): Puzzle | null {
    if (tried.has(target)) return null;
    tried.add(target);
    const solution = solveOne(target, rules, maxOperands, magBound);
    return solution ? { target, ...solution, difficulty: difficultyForOperands(solution.operands) } : null;
  }

  for (let attempt = 0; attempt < randomAttempts; attempt++) {
    const target = minTarget + Math.floor(rng() * (maxTarget - minTarget + 1));
    const puzzle = tryTarget(target);
    if (puzzle) return puzzle;
  }

  // Exhaust the same finite target range without repeating failed searches.
  for (let target = minTarget; target <= maxTarget; target++) {
    const puzzle = tryTarget(target);
    if (puzzle) return puzzle;
  }
  return null;
}
