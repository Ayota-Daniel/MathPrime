/** Test HTTP sur stack LOCALE uniquement. Les clés de test générées ne sont jamais affichées. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { supabaseCompetition } from '../../packages/engine/src/competitive-api';
import type { Storage } from '../../packages/engine/src/persistence';
import { puzzleFor, type ServerRun } from '../functions/_shared/daily';

const config = JSON.parse(readFileSync(process.env.MATHPRIME_TEST_CONFIG!, 'utf8'));
const url = config.API_URL ?? 'http://127.0.0.1:54321';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'test autorisé uniquement en local');
const key = config.PUBLISHABLE_KEY ?? config.ANON_KEY;
const users: string[] = [];
async function signup() {
  const response = await fetch(`${url}/auth/v1/signup`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }) });
  assert.equal(response.status, 200, 'inscription anonyme locale');
  const body = await response.json(); users.push(body.user.id);
  return body;
}
const post = (token: string, body: unknown) => fetch(`${url}/functions/v1/leaderboard`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
try {
  // Le véritable adaptateur client (SDK Auth chargé à la demande) utilise aussi la stack locale.
  const authValues = new Map<string, unknown>();
  const storage: Storage = {
    async get<T>(name: string) { return authValues.get(name) as T ?? null; },
    async set<T>(name: string, value: T) { authValues.set(name, value); },
    async remove(name: string) { authValues.delete(name); },
  };
  const sdk = supabaseCompetition(url, key, storage);
  const sdkRun = await sdk.start();
  users.push(JSON.parse(authValues.get('mathprime:competitive:auth') as string).user.id);
  const sdkSolution = puzzleFor({ day: sdkRun.challenge.day } as ServerRun).expr;
  const sdkResult = await sdk.send({ action: 'answer', runId: sdkRun.challenge.id, eventId: randomUUID(), version: sdkRun.challenge.version, pseudo: 'sdk-test', expression: sdkSolution });
  assert.equal(sdkResult.outcome!.ok, true, 'SDK réel et validation de la réponse client');
  const first = await signup(); const other = await signup();
  assert.equal((await post('forged-token', { action: 'start', mode: 'daily' })).status, 401);
  const start = await post(first.access_token, { action: 'start', mode: 'daily' });
  assert.equal(start.status, 200, 'défi serveur');
  const initial = await start.json();
  const c = initial.challenge;
  const event = { action: 'hint', runId: c.id, eventId: randomUUID(), version: c.version, pseudo: 'test' };
  assert.equal((await post(other.access_token, event)).status, 404, 'run lié au joueur Auth');
  assert.equal((await post(first.access_token, { ...event, score: 999999 })).status, 400, 'score inventé interdit');
  const duplicateHints = await Promise.all([post(first.access_token, event), post(first.access_token, event)]);
  assert.ok(duplicateHints.every((response) => response.status === 200));
  const hinted = await duplicateHints[0].json();
  assert.deepEqual(await duplicateHints[1].json(), hinted, 'doublon concurrent idempotent');
  assert.equal(hinted.challenge.hints, 1);
  assert.deepEqual(await (await post(first.access_token, event)).json(), hinted, 'rejeu idempotent');
  assert.equal((await post(first.access_token, { ...event, pseudo: 'changed' })).status, 409, 'même ID / corps différent');
  const wrong = await post(first.access_token, { ...event, action: 'answer', version: hinted.challenge.version, eventId: randomUUID(), expression: '3+5abc' });
  assert.equal(wrong.status, 200);
  const rejected = await wrong.json();
  assert.equal(rejected.outcome.ok, false);
  const puzzle = puzzleFor({ day: c.day } as ServerRun);
  const solvedEvent = { ...event, action: 'answer', eventId: randomUUID(), version: rejected.challenge.version, expression: puzzle.expr };
  const solvedResponse = await post(first.access_token, solvedEvent);
  assert.equal(solvedResponse.status, 200);
  const solved = await solvedResponse.json();
  assert.equal(solved.outcome.ok, true);
  assert.equal(solved.outcome.stars, 2, 'indice serveur inclus dans les étoiles');
  assert.ok(solved.confirmedBest > 0);
  assert.deepEqual(await (await post(first.access_token, solvedEvent)).json(), solved);
  assert.equal((await post(first.access_token, { ...solvedEvent, eventId: randomUUID(), version: solved.challenge.version })).status, 409);
  for (const token of [null, first.access_token]) {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const response = await fetch(`${url}/rest/v1/competition_scores?user_id=eq.${first.user.id}`, {
        method, headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
        ...(method !== 'DELETE' ? { body: JSON.stringify({ user_id: first.user.id, mode: 'daily', pseudo: 'forged', score: 999 }) } : {}),
      });
      assert.ok(!response.ok, `écriture directe ${method} refusée`);
    }
  }
  const rpc = await fetch(`${url}/rest/v1/rpc/competition_commit`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${first.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok(!rpc.ok, 'RPC privilégiée inaccessible');
  const top = await fetch(`${url}/functions/v1/leaderboard`, { headers: { apikey: key } });
  assert.equal(top.status, 200);
  const rows = await top.json();
  assert.ok(rows.every((row: Record<string, unknown>) => !('user_id' in row) && !('expression' in row)));
  console.log('Intégration Supabase locale réussie : Auth, Edge, calcul, rejeu, permissions REST et lecture publique.');
} finally {
  for (const user of users) {
    await fetch(`${url}/auth/v1/admin/users/${user}`, { method: 'DELETE', headers: { apikey: config.SERVICE_ROLE_KEY, Authorization: `Bearer ${config.SERVICE_ROLE_KEY}` } });
  }
}
