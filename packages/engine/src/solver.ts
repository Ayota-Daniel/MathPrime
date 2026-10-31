/** solver.ts — BUILD-TIME UNIQUEMENT. Ne jamais importer côté client. */
import type { Op } from './evaluate';
export interface SolveOptions { maxTarget?: number; magBound?: number; maxOperands?: number; }
interface State { total: number; term: number; mask: number; expr: string; }

export function buildTable(numbers: number[], operations: Op[], constraints: number[] = [], opts: SolveOptions = {}): Map<number, string> {
  const { maxTarget = 1000, magBound = 4000, maxOperands = 18 } = opts;
  const full = (1 << constraints.length) - 1;
  const bitOf = (d: number) => { const i = constraints.indexOf(d); return i < 0 ? 0 : (1 << i); };
  const table = new Map<number, string>();
  const visited = new Set<string>();
  let frontier: State[] = [];
  for (const d of numbers) {
    const mask = bitOf(d), key = `0,${d},${mask}`;
    if (!visited.has(key)) { visited.add(key); frontier.push({ total: 0, term: d, mask, expr: String(d) }); }
  }
  const rec = (v: number, mask: number, e: string) => { if (mask === full && v >= 1 && v <= maxTarget && !table.has(v)) table.set(v, e); };
  for (const s of frontier) rec(s.total + s.term, s.mask, s.expr);
  for (let depth = 1; depth < maxOperands && table.size < maxTarget; depth++) {
    const next: State[] = [];
    for (const s of frontier) for (const d of numbers) for (const op of operations) {
      let nt: number, nm: number;
      if (op === '+') { nt = s.total + s.term; nm = d; }
      else if (op === '-') { nt = s.total + s.term; nm = -d; }
      else { nt = s.total; nm = s.term * d; }
      if (Math.abs(nt) > magBound || Math.abs(nm) > magBound) continue;
      const mask = s.mask | bitOf(d), key = `${nt},${nm},${mask}`;
      if (visited.has(key)) continue; visited.add(key);
      const e = s.expr + op + d; rec(nt + nm, mask, e); next.push({ total: nt, term: nm, mask, expr: e });
    }
    frontier = next;
  }
  return table;
}
