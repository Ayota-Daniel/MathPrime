/** leaderboard.ts — leaderboard ANONYME (pas de login).
 *  Identité = UUID aléatoire local + pseudo choisi. Aucune PII, aucun fingerprint.
 *  Limite assumée : sans auth, un score est falsifiable côté client. On envoie
 *  l'expression gagnante pour permettre une revalidation serveur si tu l'actives. */
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
  return {
    async submit(e) {
      const all = await load();
      const i = all.findIndex((x) => x.id === e.id && x.mode === e.mode);
      if (i >= 0) { if (e.score > all[i].score) all[i] = e; } else all.push(e);
      await storage.set(KEY, all);
    },
    async top(mode, limit = 50) {
      return (await load()).filter((x) => x.mode === mode).sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}

/** Adaptateur Supabase via REST (aucune dépendance). Table publique `scores`.
 *  url = https://xxxx.supabase.co  |  anonKey = clé publique anon.
 *  upsert sur (id,mode) -> une ligne (meilleur score) par appareil et par mode. */
export function supabaseLeaderboard(url: string, anonKey: string): LeaderboardClient {
  const base = `${url.replace(/\/$/, '')}/rest/v1/scores`;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' };
  return {
    async submit(e) {
      await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: e.id, pseudo: e.pseudo, mode: e.mode, score: e.score, expr: e.expr ?? null, at: e.at }),
      });
    },
    async top(mode, limit = 50) {
      const res = await fetch(`${base}?mode=eq.${mode}&order=score.desc&limit=${limit}&select=id,pseudo,mode,score,at`, { headers });
      if (!res.ok) return [];
      return (await res.json()) as LbEntry[];
    },
  };
}
