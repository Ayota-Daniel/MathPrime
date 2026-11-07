import type { Puzzle } from './model';

/** Facts about a valid constrained witness, never the expression itself. */
export function progressiveHint(puzzle: Puzzle, index: number): string {
  const multiplicationCount = (puzzle.expression.match(/\*/g) ?? []).length;
  const sevenCount = (puzzle.expression.match(/7/g) ?? []).length;
  const subtractionCount = (puzzle.expression.match(/-/g) ?? []).length;
  const hints = [
    `Une solution valide utilise ${multiplicationCount} multiplication(s).`,
    `Une solution valide utilise exactement ${sevenCount} fois le chiffre 7.`,
    `Une solution valide utilise ${subtractionCount} soustraction(s).`,
  ];
  if (!hints[index]) throw new Error('no-more-partial-hints');
  return hints[index];
}
