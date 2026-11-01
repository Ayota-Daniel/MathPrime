import { dateKey } from '../../../packages/engine/src/game-engine.ts';
import type { CompetitionEvent, CompetitionReply, VerifiedEntry } from '../../../packages/engine/src/competitive-types.ts';
import { applyAction, parseAction, present, RequestError, type ServerRun } from './daily.ts';

export interface CompetitionRepository {
  begin(user: string): Promise<ServerRun>;
  read(user: string, run: string): Promise<ServerRun>;
  replay(user: string, event: string, fingerprint: string): Promise<CompetitionReply | null>;
  commit(user: string, event: CompetitionEvent, fingerprint: string, reply: CompetitionReply): Promise<CompetitionReply>;
  top(): Promise<VerifiedEntry[]>;
}
async function limitedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'empty_body');
  const decoder = new TextDecoder();
  let length = 0; let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); throw new RequestError(413, 'body_too_large'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError(400, 'bad_json'); }
}
export async function fingerprint(event: CompetitionEvent): Promise<string> {
  const canonical = JSON.stringify([event.action, event.runId, event.eventId, event.version, event.pseudo, event.expression ?? null]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function createCompetitionHandler(repository: CompetitionRepository, authenticate: (request: Request) => Promise<string>, now = () => new Date(), origins: string[] = []) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    try {
      if (origin && !origins.includes(origin)) throw new RequestError(403, 'origin_not_allowed');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method === 'GET') return json(await repository.top());
      if (request.method !== 'POST') throw new RequestError(405, 'method_not_allowed');
      const user = await authenticate(request);
      const event = parseAction(await limitedJson(request));
      if (event.action === 'start') return json(present(await repository.begin(user)));
      const hash = await fingerprint(event);
      const previous = await repository.replay(user, event.eventId, hash);
      if (previous) return json(previous);
      try {
        const run = await repository.read(user, event.runId);
        if (run.user_id !== user) throw new RequestError(404, 'not_found');
        const result = applyAction(run, event, dateKey(now()));
        return json(await repository.commit(user, event, hash, result));
      } catch (error) {
        // Une requête identique peut avoir été commitée entre replay() et read().
        if (error instanceof RequestError && error.status === 409) {
          const committed = await repository.replay(user, event.eventId, hash);
          if (committed) return json(committed);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.code }, error.status);
      return json({ error: 'service_unavailable' }, 503);
    }
  };
}
