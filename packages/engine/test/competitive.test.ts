import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCompetitionApi, timedFetch } from '../src/competitive-api';
import { createCompetitionStore } from '../src/competitive-store';
import { CompetitionError, type CompetitionApi, type CompetitionEvent, type CompetitionReply } from '../src/competitive-types';
import { localLeaderboard } from '../src/leaderboard';
import type { Storage } from '../src/persistence';
import { applyAction, parseAction, present, puzzleFor, RequestError, type ServerRun } from '../../../supabase/functions/_shared/daily';
import { createCompetitionHandler, type CompetitionRepository } from '../../../supabase/functions/_shared/handler';
import { scorePuzzle } from '../src/game-engine';

const USER = '11111111-1111-4111-8111-111111111111';
const RUN = '22222222-2222-4222-8222-222222222222';
const EVENT = '33333333-3333-4333-8333-333333333333';
const serverRun = (): ServerRun => ({ id: RUN, user_id: USER, day: '2026-11-02', version: 0, hints: 0, streak: 2, rewarded: false, confirmed_best: 0 });
const answer = (expression: string): CompetitionEvent => ({ action: 'answer', runId: RUN, eventId: EVENT, version: 0, pseudo: 'joueur', expression });
const memory = (): Storage => {
  const values = new Map<string, unknown>();
  return { async get<T>(key: string) { return values.get(key) as T ?? null; }, async set<T>(key: string, value: T) { values.set(key, structuredClone(value)); }, async remove(key: string) { values.delete(key); } };
};
const accepted = (): CompetitionReply => {
  const run = serverRun();
  const result = applyAction(run, answer(puzzleFor(run).expr), run.day);
  return { ...result, confirmedBest: result.outcome!.gained };
};

test('classement local : deux écritures concurrentes et un score inférieur conservent les meilleurs scores', async () => {
  const board = localLeaderboard(memory());
  const entry = { id: 'device', pseudo: 'moi', mode: 'classic' as const, score: 500, at: 0 };
  await Promise.all([board.submit(entry), board.submit({ ...entry, id: 'autre', score: 300 }), board.submit({ ...entry, score: 100 })]);
  assert.deepEqual((await board.top('classic')).map((row) => row.score), [500, 300]);
});

test('serveur : aucun score, UUID joueur, cible ou nombre d’indices déclaré n’est accepté', () => {
  for (const extra of [{ score: 999999 }, { userId: USER }, { deviceId: USER }, { target: 5 }, { hints: 0 }, { streak: 99 }, { day: '2099-01-01' }]) {
    assert.throws(() => parseAction({ ...answer('3+5'), ...extra }), RequestError);
  }
  assert.throws(() => parseAction({ action: 'start', mode: 'classic' }), RequestError);
  assert.throws(() => parseAction(answer('3'.repeat(257))), RequestError);
});

test('serveur : validation stricte, règles et calcul des étoiles/indices/série proviennent de l’état serveur', () => {
  const run = serverRun();
  const puzzle = puzzleFor(run);
  for (const expression of [puzzle.expr + 'abc', '(3+5)', '3++5', '2+2']) {
    const rejected = applyAction(run, answer(expression), run.day);
    assert.equal(rejected.outcome!.ok, false);
    assert.equal(rejected.outcome!.gained, 0);
  }
  const correct = applyAction(run, answer(puzzle.expr), run.day);
  assert.equal(correct.outcome!.gained, scorePuzzle({ mode: 'daily', difficulty: puzzle.difficulty, stars: 3, streak: 2 }));
  const hinted = applyAction({ ...run, hints: 1 }, answer(puzzle.expr), run.day);
  assert.equal(hinted.outcome!.stars, 2);
  assert.ok(hinted.outcome!.gained < correct.outcome!.gained);
  const hint = applyAction(run, { ...answer(''), action: 'hint', expression: undefined }, run.day);
  assert.equal(hint.challenge.hints, 1);
  assert.equal(hint.challenge.streak, 2);
});

test('serveur : Daily déjà récompensé, jour périmé et version concurrente sont refusés', () => {
  const run = serverRun();
  const event = answer(puzzleFor(run).expr);
  assert.throws(() => applyAction({ ...run, rewarded: true }, event, run.day), /daily_done/);
  assert.throws(() => applyAction(run, event, '2026-11-03'), /expired/);
  assert.throws(() => applyAction({ ...run, version: 1 }, event, run.day), /stale_version/);
});

test('handler simulé : identité issue uniquement du vérificateur Auth et absence de confirmation si commit échoue', async () => {
  const users: string[] = [];
  const repo: CompetitionRepository = {
    async begin(user) { users.push(user); return serverRun(); },
    async read(user) { users.push(user); return serverRun(); },
    async replay() { return null; },
    async commit() { throw new Error('database unavailable'); },
    async top() { return []; },
  };
  const handler = createCompetitionHandler(repo, async (request) => {
    if (request.headers.get('Authorization') !== 'Bearer valid-test-token') throw new RequestError(401, 'unauthenticated');
    return USER;
  }, () => new Date('2026-11-02T12:00:00Z'));
  const request = (body: unknown, token = 'valid-test-token') => new Request('http://local', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  assert.equal((await handler(request({ action: 'start', mode: 'daily' }, 'forged'))).status, 401);
  assert.equal((await handler(request({ ...answer('3'), userId: 'victim' }))).status, 400);
  assert.equal((await handler(request(answer(puzzleFor(serverRun()).expr)))).status, 503);
  assert.deepEqual(users, [USER]);
});

test('transport : erreurs HTTP, JSON inattendu et interruption réseau ne deviennent pas des acceptations', async () => {
  for (const response of [new Response('{}', { status: 500 }), new Response('not json'), new Response('{}')]) {
    const api = createCompetitionApi('https://example.invalid', 'public-test', async () => 'user-token', async () => response);
    await assert.rejects(api.start(), CompetitionError);
  }
  await assert.rejects(timedFetch('https://example.invalid', {}, async () => { throw new Error('offline'); }), /network/);
});

test('synchronisation simulée : ancien record local sans envoi, double submit, reprise et rejeu du même événement', async () => {
  const storage = memory();
  await storage.set('shortest:save:v3', { bestByMode: { daily: 999999 } });
  const sent: CompetitionEvent[] = [];
  let offline = true;
  const api: CompetitionApi = {
    async start() { return present(serverRun()); },
    async send(event) { sent.push(event); if (offline) throw new CompetitionError('network', true); return accepted(); },
    async top() { return []; },
  };
  const first = createCompetitionStore(api, storage, () => true, () => 'joueur');
  await first.getState().start();
  await Promise.all([first.getState().answer(puzzleFor(serverRun()).expr), first.getState().answer(puzzleFor(serverRun()).expr)]);
  assert.equal(sent.length, 1);
  assert.equal(first.getState().confirmedBest, 0);
  assert.equal(first.getState().status, 'offline');
  const eventId = first.getState().pending!.eventId;
  offline = false;
  const reloaded = createCompetitionStore(api, storage, () => true, () => 'joueur');
  await reloaded.getState().hydrate();
  await reloaded.getState().retry();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].eventId, eventId);
  assert.equal('score' in sent[1], false);
  assert.equal(reloaded.getState().confirmedBest, accepted().confirmedBest);
  assert.equal(reloaded.getState().pending, null);
  assert.equal(reloaded.getState().status, 'accepted');
});

test('sans consentement, aucune requête distante et aucune modification de la sauvegarde du jeu', async () => {
  const storage = memory();
  const gameSave = { xp: 500, bestByMode: { rogue: 400 }, dailyDone: '2026-11-01' };
  await storage.set('shortest:save:v3', gameSave);
  let calls = 0;
  const api: CompetitionApi = { async start() { calls++; return present(serverRun()); }, async send() { calls++; return accepted(); }, async top() { calls++; return []; } };
  const store = createCompetitionStore(api, storage, () => false, () => 'joueur');
  await store.getState().start(); await store.getState().retry();
  assert.equal(calls, 0);
  assert.deepEqual(await storage.get('shortest:save:v3'), gameSave);
});

test('le délai réseau annule une demande sans attendre réellement dix secondes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const request = timedFetch('https://example.invalid', {}, async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const rejected = assert.rejects(request, /network/);
  context.mock.timers.tick(10000);
  await rejected;
});

test('une réponse serveur remplace le cache confirmé sans importer de score historique', async () => {
  const storage = memory();
  await storage.set('mathprime:competition:v1', { pending: null, confirmedBest: 999999 });
  const api: CompetitionApi = { async start() { return present(serverRun()); }, async send() { return accepted(); }, async top() { return []; } };
  const store = createCompetitionStore(api, storage, () => true, () => 'joueur');
  await store.getState().start();
  assert.equal(store.getState().confirmedBest, 0);
});

test('handler simulé : un doublon commité entre lookup et lecture retrouve sa confirmation', async () => {
  let lookups = 0;
  const confirmed = accepted();
  const repo: CompetitionRepository = {
    async begin() { return serverRun(); },
    async read() { return { ...serverRun(), rewarded: true, version: 1 }; },
    async replay() { lookups++; return lookups === 1 ? null : confirmed; },
    async commit() { throw new Error('ne doit pas recommiter'); },
    async top() { return []; },
  };
  const handler = createCompetitionHandler(repo, async () => USER, () => new Date('2026-11-02T12:00:00Z'));
  const response = await handler(new Request('http://local', { method: 'POST', body: JSON.stringify(answer(puzzleFor(serverRun()).expr)) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), confirmed);
});
