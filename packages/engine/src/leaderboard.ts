/** Classement local uniquement. Ses scores ne constituent aucune preuve compétitive. */
import type { Mode } from './game-engine';
import type { Storage } from './persistence';

export interface LbEntry { id: string; pseudo: string; mode: Mode; score: number; expr?: string; at: number; }

export interface LeaderboardClient {
  submit(e: LbEntry): Promise<void>;
  top(mode: Mode, limit?: number): Promise<LbEntry[]>;
}

/** UUID v4 (non cryptographique — sert juste d'identité de device anonyme). */
export function makeDeviceId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16);
  });
}

/** Adaptateur LOCAL : démo/hors-ligne (ne voit QUE cet appareil). */
export function localLeaderboard(storage: Storage): LeaderboardClient {
  const KEY = 'shortest:lb:local';
  const load = async (): Promise<LbEntry[]> => (await storage.get<LbEntry[]>(KEY)) ?? [];
  let pendingWrite: Promise<void> = Promise.resolve();
  return {
    submit(e) {
      const write = pendingWrite.then(async () => {
        const all = await load();
        const i = all.findIndex((x) => x.id === e.id && x.mode === e.mode);
        if (i >= 0) { if (e.score > all[i].score) all[i] = e; } else all.push(e);
        await storage.set(KEY, all);
      });
      pendingWrite = write.catch(() => {});
      return write;
    },
    async top(mode, limit = 50) {
      await pendingWrite;
      return (await load()).filter((x) => x.mode === mode).sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}
