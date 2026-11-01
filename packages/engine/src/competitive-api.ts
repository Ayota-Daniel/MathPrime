import type { SupabaseClient } from '@supabase/supabase-js';
import type { Storage } from './persistence';
import { CompetitionError, isCompetitionReply, type CompetitionApi, type VerifiedEntry } from './competitive-types';

/** Une requête bornée, y compris la lecture du JSON et les appels Auth du SDK. */
export async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}, fetcher = fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(input instanceof URL ? input.toString() : input, { ...init, signal: controller.signal });
    const body = await response.text();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch {
    throw new CompetitionError('network', true);
  } finally { clearTimeout(timer); }
}

export function createCompetitionApi(url: string, key: string, getToken: () => Promise<string>, fetcher = fetch): CompetitionApi {
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/leaderboard`;
  async function request(body?: unknown): Promise<unknown> {
    const token = body ? await getToken() : null;
    const response = await timedFetch(endpoint, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, fetcher);
    if (!response.ok) throw new CompetitionError(`http_${response.status}`, response.status === 401 || response.status === 408 || response.status === 429 || response.status >= 500);
    try { return await response.json(); } catch { throw new CompetitionError('invalid_response', true); }
  }
  async function reply(body: unknown) {
    const value = await request(body);
    if (!isCompetitionReply(value)) throw new CompetitionError('invalid_response', true);
    return value;
  }
  return {
    start: () => reply({ action: 'start', mode: 'daily' }),
    send: (event) => reply(event),
    async top() {
      const rows = await request();
      if (!Array.isArray(rows) || rows.length > 50 || !rows.every((r) => r && typeof r.id === 'string' && typeof r.pseudo === 'string' && r.pseudo.length <= 16 && r.mode === 'daily' && Number.isSafeInteger(r.score) && r.score >= 0 && Number.isFinite(r.at))) {
        throw new CompetitionError('invalid_response', true);
      }
      return rows as VerifiedEntry[];
    },
  };
}

/** Auth initialisée à la première participation explicite, jamais au démarrage hors ligne. */
export function supabaseCompetition(url: string, publishableKey: string, storage: Storage): CompetitionApi {
  let client: SupabaseClient | null = null;
  let authentication: Promise<string> | null = null;
  const getToken = () => {
    if (authentication) return authentication;
    authentication = (async () => {
      if (!client) {
        const { createClient } = await import('@supabase/supabase-js');
        client = createClient(url, publishableKey, {
          global: { fetch: (input, init) => timedFetch(input, init) },
          auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'mathprime:competitive:auth',
            storage: {
              getItem: (key: string) => storage.get<string>(key),
              setItem: (key: string, value: string) => storage.set(key, value),
              removeItem: (key: string) => storage.remove(key),
            },
          },
        });
      }
      const existing = await client.auth.getSession();
      if (existing.error) throw new CompetitionError('auth_unavailable', true);
      if (!existing.data.session) {
        const signedIn = await client.auth.signInAnonymously();
        if (signedIn.error || !signedIn.data.session) throw new CompetitionError('auth_unavailable', true);
        return signedIn.data.session.access_token;
      }
      if ((existing.data.session.expires_at ?? 0) * 1000 <= Date.now() + 60000) {
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error || !refreshed.data.session) throw new CompetitionError('auth_unavailable', true);
        return refreshed.data.session.access_token;
      }
      return existing.data.session.access_token;
    })().finally(() => { authentication = null; });
    return authentication;
  };
  return createCompetitionApi(url, publishableKey, getToken);
}
