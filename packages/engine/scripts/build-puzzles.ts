/** Génère les tables JSON pré-calculées. Lancer : npm run build:puzzles -w @shortest/engine */
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildTable } from '../src/solver';
import { labelDifficulty, operandCount, type Puzzle } from '../src/difficulty';
import type { Op } from '../src/evaluate';

const N = [3, 5, 7];
const OPS: Op[] = ['+', '-', '*'];
const toEntries = (m: Map<number, string>): Puzzle[] =>
  labelDifficulty(Array.from(m.entries()).map(([target, expr]) => ({ target, expr, operands: operandCount(expr) })));

const tables: Record<string, Puzzle[]> = {
  base: toEntries(buildTable(N, OPS)),
  big3: toEntries(buildTable(N, OPS, [3])),
  big5: toEntries(buildTable(N, OPS, [5])),
  big7: toEntries(buildTable(N, OPS, [7])),
};
mkdirSync('data', { recursive: true });
for (const [name, list] of Object.entries(tables)) {
  writeFileSync(`data/puzzles.${name}.json`, JSON.stringify(list));
  const byLvl: Record<number, number> = {};
  for (const p of list) byLvl[p.difficulty] = (byLvl[p.difficulty] ?? 0) + 1;
  console.log(`${name}: ${list.length}  niveaux=${JSON.stringify(byLvl)}`);
}
writeFileSync('data/puzzles.manifest.json', JSON.stringify({ version: 2, numbers: N, operations: OPS, maxTarget: 1000, tables: Object.keys(tables), generatedAt: new Date().toISOString() }, null, 2));
console.log('OK');
