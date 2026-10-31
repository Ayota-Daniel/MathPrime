import { queryOptions } from '@tanstack/react-query';
import type { Puzzle, Mode, TableName } from '@shortest/engine';

export function tableForMode(mode: Mode): TableName {
  if (mode === 'big3') return 'big3';
  if (mode === 'big5') return 'big5';
  if (mode === 'big7') return 'big7';
  return 'base';
}
async function fetchTable(name: TableName): Promise<Puzzle[]> {
  const res = await fetch(`/data/puzzles.${name}.json`);
  if (!res.ok) throw new Error(`Échec chargement table ${name}`);
  return (await res.json()) as Puzzle[];
}
export const tableQuery = (name: TableName) =>
  queryOptions({ queryKey: ['puzzles', name], queryFn: () => fetchTable(name), staleTime: Infinity, gcTime: Infinity });
