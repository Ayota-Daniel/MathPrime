import { evaluate } from '../evaluate';
import type { Rules, SearchLimits, Solution } from './model';

export function logicalErrors(rules: Rules): string[] {
  const errors: string[] = [];
  if (!rules.numbers.length || rules.numbers.some(n => !Number.isInteger(n) || n < 1 || n > 9)) errors.push('invalid-digits');
  if (rules.operations.some(op => !['+', '-', '*'].includes(op))) errors.push('invalid-operations');
  for (const [digit, count] of Object.entries(rules.minimumOccurrences)) {
    if (!Number.isInteger(count) || count < 0) errors.push('invalid-occurrences');
    if (count > 0 && !rules.numbers.includes(Number(digit))) errors.push(`required-digit-unavailable:${digit}`);
  }
  if (rules.requireSubtraction && !rules.operations.includes('-')) errors.push('subtraction-unavailable');
  if (rules.maxMultiplications !== null && (!Number.isInteger(rules.maxMultiplications) || rules.maxMultiplications < 0)) errors.push('invalid-multiplication-budget');
  return errors;
}

/** Strict syntax validation before calling the legacy arithmetic evaluator. */
export function inspectExpression(expression: string, rules: Rules, magnitude: number): Solution | null {
  if (logicalErrors(rules).length || !/^[1-9](?:[+*\-][1-9])*$/.test(expression)) return null;
  const digits = (expression.match(/[1-9]/g) ?? []).map(Number);
  const operations: string[] = expression.match(/[+*\-]/g) ?? [];
  if (digits.some(n => !rules.numbers.includes(n)) || operations.some(op => !rules.operations.includes(op as '+' | '-' | '*'))) return null;
  if (Object.entries(rules.minimumOccurrences).some(([digit, count]) => digits.filter(n => n === Number(digit)).length < count)) return null;
  const multiplications = operations.filter(op => op === '*').length;
  if (rules.requireSubtraction && !operations.includes('-')) return null;
  if (rules.maxMultiplications !== null && multiplications > rules.maxMultiplications) return null;
  let total = 0;
  let term = digits[0];
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const digit = digits[i + 1];
    if (op === '*') term *= digit;
    else { total += term; term = op === '-' ? -digit : digit; }
    if (Math.abs(total) > magnitude || Math.abs(term) > magnitude) return null;
  }
  if (Math.abs(term) > magnitude) return null;
  return { expression, operands: digits.length, multiplications };
}
export const expressionValue = evaluate;
interface State { total: number; term: number; counts: number[]; subtracted: boolean; multiplications: number; expression: string; }
export interface SearchResult {
  solutions: Map<number, Solution>;
  optimalMaximumMultiplications: Map<number, number>;
  complete: boolean;
  states: number;
  errors: string[];
}

/** Breadth-first search: each retained target has its minimum operand count in the stated bounds.
 * Counts are saturated at requirements; operation budgets remain in the state key.
 * A truncated search is never accepted as proof of optimality by the generator.
 */
export function solveRules(rules: Rules, limits: SearchLimits): SearchResult {
  const errors = logicalErrors(rules);
  const solutions = new Map<number, Solution>();
  const optimalMaximumMultiplications = new Map<number, number>();
  if (errors.length) return { solutions, optimalMaximumMultiplications, complete: true, states: 0, errors };
  if (!Number.isInteger(limits.maxOperands) || limits.maxOperands < 1 || limits.magnitude < 1 || limits.maxStates < 1) {
    return { solutions, optimalMaximumMultiplications, complete: false, states: 0, errors: ['invalid-search-limits'] };
  }
  const required = Object.entries(rules.minimumOccurrences).sort(([a], [b]) => Number(a) - Number(b));
  const digits = [...new Set(rules.numbers)].sort((a, b) => a - b);
  const operations = [...new Set(rules.operations)].sort();
  const visited = new Set<string>();
  let frontier: State[] = [];
  let truncated = false;
  function record(state: State, depth: number): boolean {
    const multiplicationKey = state.multiplications;
    const subtractionKey = rules.requireSubtraction && state.subtracted;
    const key = `${state.total},${state.term},${state.counts.join('.')},${subtractionKey},${multiplicationKey}`;
    if (visited.has(key)) return true;
    if (visited.size >= limits.maxStates) { truncated = true; return false; }
    visited.add(key);
    frontier.push(state);
    const target = state.total + state.term;
    if (target >= 1 && target <= limits.maxTarget
      && (!rules.requireSubtraction || state.subtracted)
      && required.every(([, count], i) => state.counts[i] >= count)) {
      if (!solutions.has(target)) solutions.set(target, { expression: state.expression, operands: depth, multiplications: state.multiplications });
      if (solutions.get(target)!.operands === depth) optimalMaximumMultiplications.set(target,
        Math.max(optimalMaximumMultiplications.get(target) ?? 0, state.multiplications));
    }
    return true;
  }
  for (const digit of digits) {
    if (digit > limits.magnitude) continue;
    record({ total: 0, term: digit, counts: required.map(([n, count]) => Math.min(count, Number(n) === digit ? 1 : 0)),
      subtracted: false, multiplications: 0, expression: String(digit) }, 1);
  }
  for (let depth = 2; depth <= limits.maxOperands && frontier.length && !truncated; depth++) {
    const previous = frontier;
    frontier = [];
    outer: for (const state of previous) for (const digit of digits) for (const op of operations) {
      const multiplications = state.multiplications + Number(op === '*');
      if (rules.maxMultiplications !== null && multiplications > rules.maxMultiplications) continue;
      const total = op === '*' ? state.total : state.total + state.term;
      const term = op === '*' ? state.term * digit : op === '-' ? -digit : digit;
      if (Math.abs(total) > limits.magnitude || Math.abs(term) > limits.magnitude) continue;
      if (!record({ total, term, multiplications,
        counts: required.map(([n, count], i) => Math.min(count, state.counts[i] + Number(Number(n) === digit))),
        subtracted: state.subtracted || op === '-', expression: `${state.expression}${op}${digit}` }, depth)) break outer;
    }
  }
  return { solutions, optimalMaximumMultiplications, complete: !truncated, states: visited.size, errors: truncated ? ['state-budget-exhausted'] : [] };
}
