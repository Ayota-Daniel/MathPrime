/** Tables empaquetées dans l'app (require statique, pas de fetch réseau). */
import type { Puzzle, Mode, TableName } from '@shortest/engine';

const TABLES: Record<TableName, Puzzle[]> = {
  base: require('../assets/data/puzzles.base.json'),
  big3: require('../assets/data/puzzles.big3.json'),
  big5: require('../assets/data/puzzles.big5.json'),
  big7: require('../assets/data/puzzles.big7.json'),
};
export const tableForMode = (mode: Mode): TableName =>
  mode === 'big3' ? 'big3' : mode === 'big5' ? 'big5' : mode === 'big7' ? 'big7' : 'base';
export const loadTable = (mode: Mode): Puzzle[] => TABLES[tableForMode(mode)];
