import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PlaytestSession } from '../src/rogue-v1/playtest/session';

/** Same-directory rename keeps each autosave a complete JSON document. */
export function saveReport(path: string, report: ReturnType<PlaytestSession['report']>): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  renameSync(temporary, path);
}
