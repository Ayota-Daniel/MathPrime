import { createCompetitionHandler, type CompetitionRepository } from '../_shared/handler.ts';
import { RequestError } from '../_shared/daily.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const publicKey = Deno.env.get('MATHPRIME_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const secretKey = Deno.env.get('MATHPRIME_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').filter(Boolean);

async function jsonFetch(path: string, init: RequestInit, admin: boolean) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url}${path}`, { ...init, signal: controller.signal,
      headers: { apikey: admin ? secretKey : publicKey, ...(admin && secretKey.startsWith('eyJ') ? { Authorization: `Bearer ${secretKey}` } : {}), ...init.headers } });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const code = String(error.message ?? 'database_error');
      const status = code === 'rate_limited' ? 429 : code === 'not_found' ? 404 : code === 'expired' ? 410 : ['stale_version', 'daily_done', 'event_conflict'].includes(code) ? 409 : 503;
      throw new RequestError(status, status === 503 ? 'service_unavailable' : code);
    }
    return await response.json();
  } finally { clearTimeout(timeout); }
}
const rpc = (name: string, args: unknown) => jsonFetch(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) }, true);
const repository: CompetitionRepository = {
  begin: (user) => rpc('competition_begin', { p_user: user }),
  read: (user, run) => rpc('competition_read', { p_user: user, p_run: run }),
  replay: (user, event, hash) => rpc('competition_replay', { p_user: user, p_event: event, p_fingerprint: hash }),
  commit: (user, event, hash, reply) => rpc('competition_commit', { p_user: user, p_run: event.runId, p_event: event.eventId, p_version: event.version, p_fingerprint: hash, p_action: event.action, p_pseudo: event.pseudo, p_reply: reply }),
  top: () => rpc('competition_top', {}),
};
const authenticate = async (request: Request) => {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new RequestError(401, 'unauthenticated');
  try {
    const user = await jsonFetch('/auth/v1/user', { headers: { Authorization: authorization } }, false);
    if (typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new Error('invalid_user');
    return user.id;
  } catch { throw new RequestError(401, 'unauthenticated'); }
};
Deno.serve(createCompetitionHandler(repository, authenticate, () => new Date(), origins));
