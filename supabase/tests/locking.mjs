/** Régression PostgreSQL locale : reproduit l'ancien cycle avec une barrière explicite. */
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomInt, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const database = process.env.MATHPRIME_TEST_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(database).hostname), 'test autorisé uniquement sur PostgreSQL local');
const psqlArgs = [database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
const execute = promisify(execFile);
const sql = async (query) => (await execute('psql', [...psqlArgs, '-c', query], { timeout: 15000 })).stdout.trim();
const user = randomUUID();
const event = randomUUID();
const suffix = randomUUID().replaceAll('-', '');
const beginName = `m33-begin-${suffix}`;
const answerName = `m33-answer-${suffix}`;
const triggerName = `m33_pause_${suffix}`;
const gate = randomInt(1, 2147483647);
const sessions = [];

function session(name, query, keepOpen = false) {
  const child = spawn('psql', psqlArgs, { env: { ...process.env, PGAPPNAME: name }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', (error) => { stderr += error.message; });
  const done = new Promise((resolve) => child.on('close', (code) => resolve({ code, stdout, stderr })));
  child.stdin.write(query);
  if (!keepOpen) child.stdin.end();
  const result = { child, done, output: () => stdout };
  sessions.push(result);
  return result;
}
async function waitFor(condition, description) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await delay(25);
  }
  throw new Error(`barrière non atteinte : ${description}`);
}

try {
  const run = JSON.parse(await sql(`
    insert into auth.users(id) values ('${user}');
    select public.competition_begin('${user}');
  `));
  // Le trigger de test ne vise que notre joueur et notre session start.
  await sql(`
    create function public.${triggerName}() returns trigger language plpgsql as $$
    begin
      if current_setting('application_name') = '${beginName}' and new.user_id = '${user}'::uuid then
        perform pg_advisory_xact_lock(${gate});
      end if;
      return new;
    end $$;
    create trigger ${triggerName} after update on public.competition_limits
      for each row execute function public.${triggerName}();
  `);
  const controller = session(`m33-gate-${suffix}`, `select pg_advisory_lock(${gate});\n\\echo GATE_HELD\n`, true);
  await waitFor(() => controller.output().includes('GATE_HELD'), 'barrière détenue');
  const begin = session(beginName, `set statement_timeout = '12s'; set deadlock_timeout = '500ms'; select public.competition_begin('${user}');\n`);
  await waitFor(async () => await sql(`select exists(select 1 from pg_stat_activity where application_name = '${beginName}' and wait_event = 'advisory');`) === 't', 'start dans le quota');
  const answer = session(answerName, `
    set statement_timeout = '12s'; set deadlock_timeout = '500ms';
    select public.competition_commit('${user}', '${run.id}', '${event}', 0, 'locking-test', 'answer', 'locking-test',
      '{"challenge":{"hints":0,"streak":1},"outcome":{"ok":true,"gained":10}}');
  `);
  await waitFor(async () => await sql(`
    select exists(select 1 from pg_stat_activity a, pg_stat_activity b
      where a.application_name = '${beginName}' and b.application_name = '${answerName}'
      and a.pid = any(pg_blocking_pids(b.pid)));
  `) === 't', 'answer attend start');
  const waitingOn = await sql(`
    select coalesce(string_agg(distinct c.relname, ','), 'transactionid')
    from pg_locks l join pg_stat_activity a on a.pid = l.pid join pg_class c on c.oid = l.relation
    where a.application_name = '${answerName}' and l.locktype = 'tuple';
  `);
  console.log(`Barrière atteinte : answer attend start sur ${waitingOn}.`);
  controller.child.stdin.end(`select pg_advisory_unlock(${gate});\n\\q\n`);
  await controller.done;
  const results = await Promise.all([begin.done, answer.done]);
  const errors = results.filter((result) => result.code !== 0);
  assert.equal(errors.length, 0, errors.map((result) => result.stderr).join('\n'));
  const state = JSON.parse(await sql(`
    select json_build_object('version', r.version, 'rewarded', r.rewarded, 'streak', r.streak,
      'events', (select count(*) from public.competition_events where run_id = r.id),
      'score', (select score from public.competition_scores where user_id = r.user_id))
    from public.competition_runs r where id = '${run.id}';
  `));
  assert.deepEqual(state, { version: 1, rewarded: true, streak: 1, events: 1, score: 10 });
  console.log('Verrouillage concurrent réussi : start + answer terminent, une seule récompense et un seul événement.');
} finally {
  for (const current of sessions) {
    if (current.child.exitCode === null) current.child.kill('SIGTERM');
  }
  await Promise.all(sessions.map((current) => current.done));
  await sql(`
    drop trigger if exists ${triggerName} on public.competition_limits;
    drop function if exists public.${triggerName}();
    delete from auth.users where id = '${user}';
  `);
}
