import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseOptions } from '../src/rogue-v1/playtest/options';
import { PlaytestSession } from '../src/rogue-v1/playtest/session';
import type { Clock } from '../src/rogue-v1/playtest/session';
import { renderRules, renderSession } from '../src/rogue-v1/playtest/render';
import { saveReport } from '../scripts/rogue-playtest-log';
import { progressiveHint, transition, newRun, Generator } from '../src/rogue-v1';

class FakeClock implements Clock {
  time = 0;
  nextId = 1;
  jobs = new Map<number, { due: number; callback: () => void }>();
  now() { return this.time; }
  schedule(callback: () => void, milliseconds: number) {
    const id = this.nextId++;
    this.jobs.set(id, { due: this.time + milliseconds, callback });
    return id;
  }
  cancel(handle: unknown) { this.jobs.delete(handle as number); }
  advance(milliseconds: number) {
    this.time += milliseconds;
    while (true) {
      const due = [...this.jobs].find(([, job]) => job.due <= this.time);
      if (!due) break;
      this.jobs.delete(due[0]);
      due[1].callback();
    }
  }
}
function fixture(format: 'full' | 'short' = 'full') {
  const clock = new FakeClock();
  let notifications = 0;
  const session = new PlaytestSession(format, 42, clock, () => notifications++);
  return { clock, session, notifications: () => notifications };
}
function solve(session: PlaytestSession, clock: FakeClock) {
  assert.equal(session.screen, 'preparation');
  const expression = session.run.current!.expression;
  session.command('demarrer');
  clock.advance(1200);
  session.command(`soumettre ${expression}`);
  assert.equal(session.screen, 'result');
  session.command('suivant');
}
function passReward(session: PlaytestSession) {
  if (session.screen === 'reward') session.command('choisir 0');
}

test('R2.1: preparation is untimed, starts explicitly, deadline expires without input exactly once', () => {
  const { session, clock, notifications } = fixture();
  clock.advance(100_000);
  assert.equal(session.run.elapsed, 0);
  assert.equal(session.remainingSeconds(), 35);
  assert.equal(clock.jobs.size, 0);
  session.command('demarrer');
  const stale = [...clock.jobs.values()][0].callback;
  clock.advance(12_000);
  assert.equal(session.remainingSeconds(), 23);
  session.command('effets');
  assert.equal(session.run.elapsed, 12);
  clock.advance(23_000);
  assert.equal(session.screen, 'result');
  assert.equal(session.run.lives, 2);
  assert.equal(session.attempts[0].cause, 'timeout');
  assert.equal(session.attempts[0].elapsedSeconds, 35);
  stale(); stale();
  clock.advance(100_000);
  assert.equal(notifications(), 1);
  assert.equal(session.run.lives, 2);
  assert.equal(session.run.events.filter(event => event.type === 'failure').length, 1);
  const target = session.attempts[0].puzzle.target;
  session.command('suivant');
  assert.equal(session.screen, 'preparation');
  assert.notEqual(session.run.current!.target, target);
  stale();
  assert.equal(session.run.lives, 2);
});

test('R2.1: deadline wins input races and quit at a deadline still closes the session', () => {
  const { session, clock } = fixture();
  session.command('demarrer');
  clock.time = 35_001; // Simulates a delayed event loop before the timer callback.
  session.command(`soumettre ${session.run.current!.expression}`);
  assert.equal(session.run.lives, 2);
  assert.equal(session.attempts[0].expression, null);
  session.command('quitter');
  assert.equal(session.report().outcome, 'abandoned');
  const other = fixture();
  other.session.command('demarrer');
  other.clock.time = 40_000;
  other.session.command('quitter');
  assert.equal(other.session.screen, 'ended');
  assert.equal(other.clock.jobs.size, 0);
});

test('R2.1: command/syntax mistakes never submit, explicit valid arithmetic can lose a life', () => {
  const { session, clock } = fixture();
  session.command('soumettre 3');
  assert.equal(session.run.lives, 3);
  session.command('demarrer');
  for (const command of ['3+5', 'submit 3', 'soumettre', 'soumettre (3+5)', 'soumettre 33+5', 'choisir 9', 'indice extra']) {
    clock.advance(100);
    session.command(command);
    assert.equal(session.screen, 'playing', command);
    assert.equal(session.run.lives, 3);
    assert.equal(session.run.events.filter(event => event.type === 'submission').length, 0);
  }
  session.command('soumettre 2');
  assert.equal(session.screen, 'result');
  assert.equal(session.run.lives, 2);
  assert.equal(session.attempts[0].value, 2);
  assert.equal(session.attempts[0].cause, 'active-rules-violated');
  assert.match(renderSession(session), /ÉCHEC/);
  assert.equal(clock.jobs.size, 0);
  session.command('suivant'); session.command('demarrer'); session.command('soumettre 3');
  assert.equal(session.attempts[1].cause, 'wrong-target');
});

test('R2.1: progressive hints are distinct partial facts, time continues and score has no star cap', () => {
  const { session, clock } = fixture();
  const expression = session.run.current!.expression;
  const preparation = renderSession(session);
  assert.ok(!('expression' in session.report().attempts[0].puzzle));
  assert.ok(!('expression' in (session.report().events.find(event => event.type === 'puzzle')!.detail as object)));
  assert.ok(!preparation.includes(expression));
  assert.ok(!preparation.includes('minimum connu'));
  session.command('demarrer');
  for (let i = 0; i < 3; i++) {
    clock.advance(500);
    session.command('indice');
    assert.ok(!session.message.includes(expression));
    assert.ok(!('expression' in (session.run.events.at(-1)!.detail as object)));
  }
  assert.equal(session.run.hints, 0);
  assert.equal(new Set(session.attempts[0].hints).size, 3);
  assert.equal(session.run.elapsed, 1.5);
  session.command('indice');
  assert.equal(session.run.hintsUsed, 3);
  session.command(`soumettre ${expression}`);
  assert.equal(session.attempts[0].stars, 3);
  assert.equal(session.attempts[0].points, 55);
  assert.match(renderSession(session), /minimum connu dans les bornes/);
  assert.ok(renderSession(session).includes(expression));
});

test('R2.1: partial hints describe the constrained witness and do not alter simulator transitions', () => {
  const generator = new Generator();
  let run = newRun();
  run.effects = [{ id: 'D1', level: 1, remaining: null, shieldUsed: false }, { id: 'T3', level: 1, remaining: 3, shieldUsed: false }];
  run = transition(run, { type: 'start' }, generator);
  const puzzle = run.current!;
  assert.equal(progressiveHint(puzzle, 0), `Une solution valide utilise ${(puzzle.expression.match(/\*/g) ?? []).length} multiplication(s).`);
  assert.equal(progressiveHint(puzzle, 1), `Une solution valide utilise exactement ${(puzzle.expression.match(/7/g) ?? []).length} fois le chiffre 7.`);
  assert.equal(progressiveHint(puzzle, 2), `Une solution valide utilise ${(puzzle.expression.match(/-/g) ?? []).length} soustraction(s).`);
  const hintsBefore = run.hints;
  run = transition(run, { type: 'hint' }, generator);
  assert.equal(run.hints, hintsBefore - 1);
});

test('R2.1: constraints and reward terms match applied effects including upgrade and fixed replacement', () => {
  const { session, clock } = fixture();
  const puzzle = { ...session.run.current!, rules: { ...session.run.current!.rules, minimumOccurrences: { 7: 2 }, requireSubtraction: true, maxMultiplications: 1 }, minimumStars: 2 };
  const constraints = renderRules(puzzle);
  for (const phrase of ['3, 5, 7', 'au moins 2 occurrence(s) du 7', 'au moins une soustraction', 'maximum 1 multiplication', '2 étoile(s)']) assert.ok(constraints.includes(phrase));
  solve(session, clock); solve(session, clock);
  assert.equal(session.screen, 'reward');
  assert.match(renderSession(session), /TACTIQUE/);
  assert.match(renderSession(session), /Avantage/);
  session.command('choisir 9');
  assert.equal(session.run.effects.length, 0);
  const selected = session.run.offers[0].card;
  session.command('choisir 1');
  assert.equal(session.screen, 'preparation');
  assert.ok(session.run.effects.some(effect => effect.id === selected));
  // Render a valid major upgrade/replacement without claiming the user can choose the sacrifice.
  session.screen = 'reward';
  session.run.effects = [{ id: 'D1', level: 1, remaining: null, shieldUsed: false }];
  session.run.offers = [{ id: 'up', card: 'D1', kind: 'upgrade' }, { id: 'rep', card: 'D3', kind: 'replace', replaces: 'D1' }];
  session.run.events.push({ type: 'reward', stage: 5, detail: { major: true } });
  const offers = renderSession(session);
  assert.match(offers, /MAJEURE/); assert.match(offers, /\+30 % score/); assert.match(offers, /deux occurrences de 7/);
  assert.match(offers, /remplace précisément D1/);
});

test('R2.1: short session completes one actual act and boss; waits outside puzzles consume no time', () => {
  const { session, clock } = fixture('short');
  while (session.screen !== 'ended') {
    passReward(session);
    if (session.run.stage === 3) assert.match(renderSession(session), /Gardien du rythme/);
    solve(session, clock);
    clock.advance(60_000);
  }
  assert.equal(session.attempts.filter(attempt => attempt.outcome === 'success').length, 5);
  assert.deepEqual(session.run.defeatedBosses, [1]);
  assert.equal(session.report().outcome, 'short-completed');
  assert.equal(session.run.officialVictory, false);
  assert.equal(clock.jobs.size, 0);
});

test('R2.1: all acts and boss introductions, final victory, finish or survival preserve official win', () => {
  const { session, clock } = fixture();
  const bosses = new Set<number>();
  let precisionTested = false;
  while (session.screen !== 'victory') {
    passReward(session);
    const stage = session.run.stage;
    if ([3, 8, 13].includes(stage)) bosses.add(stage);
    if (stage === 8) assert.match(renderSession(session), /Maître des opérations/);
    if (stage === 13) assert.match(renderSession(session), /Architecte/);
    if (stage === 14) {
      assert.match(renderSession(session), /2 étoile/);
      if (!precisionTested) {
        precisionTested = true;
        const longAnswer = `${session.run.current!.expression}+3-3`;
        session.command('demarrer'); session.command(`soumettre ${longAnswer}`);
        assert.equal(session.attempts.at(-1)!.cause, 'insufficient-stars');
        assert.match(renderSession(session), /trop longue/);
        session.command('suivant');
      }
    }
    solve(session, clock);
  }
  assert.equal(bosses.size, 3);
  assert.equal(session.run.officialVictory, true);
  assert.equal(clock.jobs.size, 0);
  session.command('survie');
  while (session.screen !== 'ended') {
    session.command('demarrer');
    clock.advance(session.remainingSeconds() * 1000 + 1);
    session.command('suivant');
  }
  assert.equal(session.run.officialVictory, true);
  assert.deepEqual(session.run.defeatedBosses, [1, 2, 3]);
  assert.equal(session.report().outcome, 'timeout');
  const finished = fixture();
  while (finished.session.screen !== 'victory') { passReward(finished.session); solve(finished.session, finished.clock); }
  finished.session.command('terminer');
  assert.equal(finished.session.report().outcome, 'victory-finished');
});

test('R2.1: local journal roundtrip, abandonment elapsed time and read-only final duration', () => {
  const { session, clock } = fixture();
  session.command('demarrer'); clock.advance(2300); session.command('quitter');
  assert.equal(session.attempts[0].outcome, 'abandoned');
  assert.equal(session.attempts[0].elapsedSeconds, 2.3);
  const directory = mkdtempSync(join(tmpdir(), 'rogue-playtest-'));
  try {
    const path = join(directory, 'sessions', 'run.json');
    saveReport(path, session.report());
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), session.report());
    clock.advance(50_000); session.command('quitter');
    assert.equal(session.report().durationSeconds, 2.3);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('R2.1: CLI options select format and seed, reject invalid values before starting', () => {
  assert.deepEqual(parseOptions([]), { format: 'full', seed: 42, help: false });
  assert.deepEqual(parseOptions(['--format', 'short', '--seed', '0']), { format: 'short', seed: 0, help: false });
  assert.equal(parseOptions(['--help']).help, true);
  for (const args of [['--seed', '-1'], ['--seed'], ['--seed', 'NaN'], ['--seed', '4294967296'], ['--format', 'test'], ['--unknown', 'a']]) {
    assert.throws(() => parseOptions(args), /Option invalide/);
  }
});
