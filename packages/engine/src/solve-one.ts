/** solve-one.ts — RUNTIME borné. Réservé au Rogue (règles dynamiques). */
import type { Rules } from './game-engine';
interface State { total: number; term: number; mask: number; expr: string; }

export function solveOne(target: number, rules: Rules, maxOperands = 12, magBound = 4000): { expr: string; operands: number } | null {
  const { numbers, operations, required } = rules;
  const full = (1 << required.length) - 1;
  const bitOf = (d: number) => { const i = required.indexOf(d); return i < 0 ? 0 : (1 << i); };
  const visited = new Set<string>();
  let frontier: State[] = [];
  for (const d of numbers) {
    const mask = bitOf(d), key = `0,${d},${mask}`;
    if (!visited.has(key)) { visited.add(key); frontier.push({ total: 0, term: d, mask, expr: String(d) }); }
  }
  const hit = (s: State) => s.mask === full && s.total + s.term === target;
  for (const s of frontier) if (hit(s)) return { expr: s.expr, operands: 1 };
  for (let depth = 1; depth < maxOperands; depth++) {
    const next: State[] = [];
    for (const s of frontier) for (const d of numbers) for (const op of operations) {
      let nt: number, nm: number;
      if (op === '+') { nt = s.total + s.term; nm = d; }
      else if (op === '-') { nt = s.total + s.term; nm = -d; }
      else { nt = s.total; nm = s.term * d; }
      if (Math.abs(nt) > magBound || Math.abs(nm) > magBound) continue;
      const mask = s.mask | bitOf(d), key = `${nt},${nm},${mask}`;
      if (visited.has(key)) continue; visited.add(key);
      const ns: State = { total: nt, term: nm, mask, expr: s.expr + op + d };
      if (hit(ns)) return { expr: ns.expr, operands: depth + 1 };
      next.push(ns);
    }
    frontier = next;
  }
  return null;
}
