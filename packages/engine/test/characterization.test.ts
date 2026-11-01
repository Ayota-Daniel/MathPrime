import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BASE_RULES,
  ROGUE_POOL,
  adjustLevel,
  applyModifier,
  areRulesCompatible,
  draftModifiers,
  isModifierCompatible,
  pickRoguePuzzle,
  ROGUE_SEARCH_LIMITS,
  classicCurriculum,
  dailyPuzzle,
  difficultyForOperands,
  evaluate,
  newRogueRun,
  scorePuzzle,
  validateAnswer,
  loadSave,
  webStorage,
  type Puzzle,
  type RogueRun,
  type RogueModifier,
  type Rules,
  type Storage,
} from '../src/index';
import { buildTable } from '../src/solver';
import { solveOne } from '../src/solve-one';
import { createGameStore } from '../src/store';

const puzzle = (target: number, expr: string, operands: number, difficulty: Puzzle['difficulty']): Puzzle => ({
  target,
  expr,
  operands,
  difficulty,
});

function createMemoryStorage(initial: Record<string, unknown> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    async get<T>(key: string) { return (values.get(key) as T | undefined) ?? null; },
    async set<T>(key: string, value: T) { values.set(key, value); },
    async remove(key: string) { values.delete(key); },
  };
}

function createDeferredFirstWriteStorage() {
  const values = new Map<string, unknown>();
  let writeCount = 0;
  let releaseFirstWrite: (() => void) | null = null;
  let markFirstWriteStarted = () => {};
  const firstWriteStarted = new Promise<void>((resolve) => { markFirstWriteStarted = resolve; });
  const storage: Storage = {
    async get<T>(key: string) { return (values.get(key) as T | undefined) ?? null; },
    set<T>(key: string, value: T) {
      writeCount += 1;
      if (writeCount === 1) {
        return new Promise<void>((resolve) => {
          releaseFirstWrite = () => { values.set(key, value); resolve(); };
          markFirstWriteStarted();
        });
      }
      values.set(key, value);
      return Promise.resolve();
    },
    async remove(key: string) { values.delete(key); },
  };
  return {
    storage,
    firstWriteStarted,
    releaseFirstWrite() {
      assert.ok(releaseFirstWrite, 'la première écriture doit avoir démarré');
      releaseFirstWrite();
    },
  };
}

function countOperands(expr: string): number {
  return (expr.match(/\d+/g) ?? []).length;
}

function bruteForceMinimum(target: number, numbers: number[], maxOperands: number): number | null {
  const operators = ['+', '-', '*'] as const;

  function search(remaining: number, expr: string): boolean {
    if (remaining === 0) return evaluate(expr) === target;
    for (const number of numbers) {
      if (expr.length === 0) {
        if (search(remaining - 1, String(number))) return true;
      } else {
        for (const operator of operators) {
          if (search(remaining - 1, `${expr}${operator}${number}`)) return true;
        }
      }
    }
    return false;
  }

  for (let operands = 1; operands <= maxOperands; operands++) {
    if (search(operands, '')) return operands;
  }
  return null;
}

function enterExpression(store: ReturnType<typeof createGameStore>, expr: string) {
  for (const token of expr) store.getState().press(token);
  store.getState().submit();
}

test('evaluate respecte la priorité de multiplication sans parenthèses', () => {
  assert.equal(evaluate('3+5*7'), 38);
  assert.equal(evaluate('3*5+7'), 22);
  assert.equal(evaluate('3-5*7'), -32);
  assert.equal(evaluate('3*5-7*3'), -6);
});

test('buildTable trouve le minimum d’opérandes dans une petite borne exhaustive', () => {
  const numbers = [1, 2];
  const maxOperands = 5;
  const table = buildTable(numbers, ['+', '-', '*'], [], {
    maxTarget: 12,
    magBound: 20,
    maxOperands,
  });

  for (const [target, expr] of table) {
    assert.equal(evaluate(expr), target);
    assert.equal(countOperands(expr), bruteForceMinimum(target, numbers, maxOperands));
  }
});

test('les tables JSON sont valides et reproductibles par le générateur courant', () => {
  const numbers = [3, 5, 7];
  const operations = ['+', '-', '*'] as const;
  const definitions = [
    ['base', []],
    ['big3', [3]],
    ['big5', [5]],
    ['big7', [7]],
  ] as const;
  const dataDirectory = new URL('../data/', import.meta.url);

  for (const [name, required] of definitions) {
    const path = fileURLToPath(new URL(`puzzles.${name}.json`, dataDirectory));
    const entries = JSON.parse(readFileSync(path, 'utf8')) as Puzzle[];
    const generated = buildTable(numbers, [...operations], [...required]);

    assert.equal(entries.length, 1000, `${name} doit contenir 1000 cibles`);
    assert.deepEqual(entries.map((entry) => entry.target).sort((a, b) => a - b), Array.from({ length: 1000 }, (_, i) => i + 1));

    for (const entry of entries) {
      assert.equal(evaluate(entry.expr), entry.target, `${name}: ${entry.expr}`);
      assert.equal(countOperands(entry.expr), entry.operands, `${name}: ${entry.expr}`);
      assert.equal(entry.difficulty, difficultyForOperands(entry.operands), `${name}: difficulté de ${entry.expr}`);
      for (const value of required) assert.ok(entry.expr.match(new RegExp(`(?:^|[^0-9])${value}(?:$|[^0-9])`)));
      assert.equal(validateAnswer(entry.expr, entry.target, entry.operands, { ...BASE_RULES, required: [...required] }).ok, true);
      assert.equal(generated.get(entry.target), entry.expr, `${name}: expression non reproductible pour ${entry.target}`);
    }
  }
});

test('Big Challenge impose son opérande requis et calcule les étoiles', () => {
  const rules = { ...BASE_RULES, required: [7] };
  const accepted = validateAnswer('3+5*7', 38, 3, rules);

  assert.equal(accepted.ok, true);
  assert.equal(accepted.stars, 3);
  assert.equal(validateAnswer('3+5', 8, 2, rules).reason, 'missing_required');
  assert.equal(validateAnswer('(3+5)*7', 56, 3, rules).reason, 'has_parens');
});

test('les contraintes du générateur sont incluses dans chaque solution construite', () => {
  const table = buildTable([2, 3], ['+', '-'], [2], { maxTarget: 20, magBound: 50, maxOperands: 8 });
  assert.ok(table.size > 0);
  for (const [target, expr] of table) {
    assert.equal(evaluate(expr), target);
    assert.match(expr, /2/);
  }
});

test('validation classique traite les erreurs de valeur et les règles normales', () => {
  assert.equal(validateAnswer('3+5', 8, 2, BASE_RULES).ok, true);
  assert.equal(validateAnswer('3+5', 9, 2, BASE_RULES).reason, 'wrong_value');
  assert.equal(validateAnswer('', 8, 2, BASE_RULES).reason, 'empty');
  assert.equal(validateAnswer('3+', 8, 2, BASE_RULES).reason, 'incomplete');
});

test('le scoring reste conforme à la formule actuelle', () => {
  assert.equal(scorePuzzle({ difficulty: 1, stars: 3, mode: 'classic' }), 23);
  assert.equal(scorePuzzle({ difficulty: 2, stars: 2, mode: 'big5', streak: 2 }), 41);
  assert.equal(scorePuzzle({ difficulty: 5, stars: 0, mode: 'classic' }), 0);
  assert.equal(scorePuzzle({ difficulty: 1, stars: 1, mode: 'freeskill', secondsLeft: 10 }), 15);
});

test('la progression Classic filtre les puzzles courts et garde l’ordre déterministe', () => {
  const entries = [
    puzzle(4, '3+5', 2, 1),
    puzzle(3, '3+5+7+3', 4, 1),
    puzzle(2, '3*5+7+3', 4, 1),
    puzzle(1, '3+5+7+3+5', 5, 2),
  ];

  assert.deepEqual(classicCurriculum(entries).map((entry) => entry.target), [2, 3, 1]);
  assert.equal(adjustLevel(2, 2, 0), 3);
  assert.equal(adjustLevel(3, 0, 1), 2);
});

test('Daily sélectionne le même puzzle pour une date UTC donnée', () => {
  const entries = [puzzle(15, '3+3+3+3+3', 5, 2)];
  const date = new Date('2026-10-31T12:00:00Z');
  assert.deepEqual(dailyPuzzle(entries, date), dailyPuzzle(entries, date));
});

test('webStorage conserve l’API historique et la sérialisation JSON', async () => {
  const values = new Map<string, string>();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  try {
    await webStorage.set('sample', { score: 12 });
    assert.deepEqual(await webStorage.get('sample'), { score: 12 });
    await webStorage.remove('sample');
    assert.equal(await webStorage.get('sample'), null);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  }
});

test('Rogue refuse need_7 et only_35 dans les deux ordres', () => {
  const needSeven = ROGUE_POOL.find((modifier) => modifier.id === 'need_7')!;
  const onlyThreeAndFive = ROGUE_POOL.find((modifier) => modifier.id === 'only_35')!;

  for (const [first, second] of [[needSeven, onlyThreeAndFive], [onlyThreeAndFive, needSeven]]) {
    const run = applyModifier(newRogueRun(), first);
    assert.equal(isModifierCompatible(run.rules, second), false);
    assert.equal(applyModifier(run, second), run);
    assert.equal(areRulesCompatible(run.rules), true);
  }
});

test('Rogue remplace le fallback Classic par une recherche déterministe valide', () => {
  const rules: Rules = { numbers: [7], operations: [], required: [7] };
  const selected = pickRoguePuzzle(rules, () => 0);

  assert.ok(selected);
  assert.deepEqual(selected, puzzle(7, '7', 1, 1));
  assert.equal(validateAnswer(selected.expr, selected.target, selected.operands, rules).ok, true);
});

test('le score Rogue est compté une seule fois dans le cumul de run', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const table = [puzzle(12, '3+3+3+3', 4, 1)];
  const store = createGameStore(createMemoryStorage());
  store.setState({
    session: {
      mode: 'rogue', rules: BASE_RULES, table, puzzle: table[0], optimalOperands: 4,
      input: '', index: 0, score: 0, level: 1, fails: 0, secondsLeft: 0, maxSeconds: 0,
      streak: 0, dailyDate: null, dailyTraining: false, dailySaving: false, hintsUsed: 0, prevBest: 0, prShown: false,
      rogue: newRogueRun(), feedback: null, draft: null,
    },
  });

  enterExpression(store, table[0].expr);
  const gained = store.getState().session?.feedback?.gained;
  const submitted = store.getState().session!;
  assert.equal(submitted.rogue!.score, gained);
  assert.equal(submitted.score, 0);
  store.getState().next();
  const session = store.getState().session!;

  assert.ok(typeof gained === 'number' && gained > 0);
  assert.equal(session.rogue!.score, gained);
  assert.equal(session.score, 0);

  enterExpression(store, session.puzzle.expr);
  const secondGain = store.getState().session!.feedback!.gained!;
  assert.ok(secondGain > 0);
  assert.equal(store.getState().session!.rogue!.score, gained + secondGain);
  assert.equal(store.getState().session!.score, 0);
  store.getState().next();
  assert.equal(store.getState().session!.rogue!.score, gained + secondGain);
});

test('BUG CARACTÉRISÉ : le meilleur score local antérieur bloque le premier envoi opt-in', () => {
  let submissions = 0;
  const leaderboard = {
    async submit() { submissions += 1; },
    async top() { return []; },
  };
  const store = createGameStore(createMemoryStorage(), leaderboard);
  const table = [puzzle(12, '3+3+3+3', 4, 1)];
  store.setState({
    hydrated: true,
    deviceId: 'device-test',
    pseudo: 'joueur',
    settings: { ...store.getState().settings, leaderboardOptIn: true },
    bestByMode: { classic: 5000 },
  });

  store.getState().start('classic', table);
  enterExpression(store, table[0].expr);

  assert.equal(store.getState().session?.feedback?.ok, true);
  assert.equal(submissions, 0);
});

test('Daily rejoué le même jour ne verse pas une seconde récompense', async () => {
  const storage = createMemoryStorage();
  const today = new Date('2026-10-31T12:00:00Z');
  let leaderboardSubmissions = 0;
  const leaderboard = { async submit() { leaderboardSubmissions += 1; }, async top() { return []; } };
  const store = createGameStore(storage, leaderboard, () => today);
  store.setState({ deviceId: 'daily-device', pseudo: 'joueur', settings: { ...store.getState().settings, leaderboardOptIn: true } });
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  store.getState().start('daily', table);
  const firstPuzzle = store.getState().session!.puzzle;

  enterExpression(store, firstPuzzle.expr);
  store.getState().submit();
  assert.equal(store.getState().session!.dailySaving, true);
  assert.equal(store.getState().session!.feedback, null);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getState().dailyDone, '2026-10-31');
  assert.equal(leaderboardSubmissions, 1);
  const rewarded = { xp: store.getState().xp, streak: store.getState().streakByMode.daily, stats: { ...store.getState().stats }, best: store.getState().bestByMode.daily };
  store.getState().next();

  assert.deepEqual(store.getState().session!.puzzle, firstPuzzle);
  assert.equal(store.getState().session!.dailyTraining, true);
  enterExpression(store, firstPuzzle.expr);
  assert.equal(store.getState().session!.feedback!.training, true);
  assert.equal(store.getState().session!.feedback!.gained, 0);
  assert.equal(store.getState().xp, rewarded.xp);
  assert.equal(store.getState().streakByMode.daily, rewarded.streak);
  assert.deepEqual(store.getState().stats, rewarded.stats);
  assert.equal(store.getState().bestByMode.daily, rewarded.best);
  assert.equal(store.getState().dailyDone, '2026-10-31');
  assert.equal(leaderboardSubmissions, 1);
  store.getState().next();
  const afterRepeatedNext = store.getState().session!;
  store.getState().next();
  assert.equal(store.getState().session, afterRepeatedNext);
});

test('Daily récompensé reste bloqué après sortie et rechargement du profil', async () => {
  const storage = createMemoryStorage();
  const today = new Date('2026-10-31T12:00:00Z');
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  const firstStore = createGameStore(storage, undefined, () => today);
  await firstStore.getState().hydrate();
  firstStore.getState().start('daily', table);
  enterExpression(firstStore, table[0].expr);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const rewardedXp = firstStore.getState().xp;
  firstStore.getState().quit();

  const reloadedStore = createGameStore(storage, undefined, () => today);
  await reloadedStore.getState().hydrate();
  reloadedStore.getState().start('daily', table);
  assert.equal(reloadedStore.getState().session!.dailyTraining, true);
  enterExpression(reloadedStore, table[0].expr);
  assert.equal(reloadedStore.getState().session!.feedback!.training, true);
  assert.equal(reloadedStore.getState().xp, rewardedXp);
});

test('une nouvelle session Daily pendant une sauvegarde ne réutilise pas son ancien feedback', async () => {
  let finishWrite = () => {};
  const storage: Storage = {
    async get<T>() { return null as T | null; },
    set() { return new Promise<void>((resolve) => { finishWrite = resolve; }); },
    async remove() {},
  };
  const today = new Date('2026-10-31T12:00:00Z');
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  const store = createGameStore(storage, undefined, () => today);
  store.getState().start('daily', table);
  enterExpression(store, table[0].expr);
  assert.equal(store.getState().session!.dailySaving, true);
  await Promise.resolve();

  store.getState().quit();
  store.getState().start('daily', table);
  assert.equal(store.getState().session!.dailyTraining, true);
  assert.equal(store.getState().session!.dailySaving, true);
  finishWrite();
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(store.getState().session!.dailySaving, false);
  assert.equal(store.getState().session!.dailyTraining, true);
  assert.equal(store.getState().session!.feedback, null);
  assert.ok(store.getState().xp > 0);
});

test('la réussite Daily fusionne XP, statistiques, records et réglages modifiés pendant la sauvegarde', async () => {
  const deferred = createDeferredFirstWriteStorage();
  const store = createGameStore(deferred.storage, undefined, () => new Date('2026-10-31T12:00:00Z'));
  const dailyTable = [puzzle(15, '3+3+3+3+3', 5, 2)];
  const classicTable = [puzzle(12, '3+3+3+3', 4, 1)];
  store.getState().start('daily', dailyTable);
  enterExpression(store, dailyTable[0].expr);
  await deferred.firstWriteStarted;

  store.getState().quit();
  store.getState().start('classic', classicTable);
  enterExpression(store, classicTable[0].expr);
  const classicGain = store.getState().session!.feedback!.gained!;
  store.getState().setSetting('language', 'en');
  assert.equal(store.getState().xp, classicGain);
  assert.equal(store.getState().stats.played, 1);
  assert.equal(store.getState().bestByMode.classic, classicGain);

  deferred.releaseFirstWrite();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));

  const dailyGain = scorePuzzle({ difficulty: 2, stars: 3, mode: 'daily' });
  assert.equal(store.getState().xp, classicGain + dailyGain);
  assert.equal(store.getState().stats.played, 2);
  assert.equal(store.getState().stats.perfect, 2);
  assert.equal(store.getState().bestByMode.classic, classicGain);
  assert.equal(store.getState().bestByMode.daily, dailyGain);
  assert.equal(store.getState().settings.language, 'en');
  assert.equal(store.getState().dailyDone, '2026-10-31');

  const restored = await loadSave(deferred.storage);
  assert.equal(restored.xp, classicGain + dailyGain);
  assert.equal(restored.stats.played, 2);
  assert.equal(restored.settings.language, 'en');
  assert.equal(restored.bestByMode.classic, classicGain);
  assert.equal(restored.bestByMode.daily, dailyGain);
});

test('une réinitialisation pendant la sauvegarde Daily annule la récompense en attente', async () => {
  const deferred = createDeferredFirstWriteStorage();
  const store = createGameStore(deferred.storage, undefined, () => new Date('2026-10-31T12:00:00Z'));
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  store.getState().start('daily', table);
  enterExpression(store, table[0].expr);
  await deferred.firstWriteStarted;

  store.getState().resetProgress();
  deferred.releaseFirstWrite();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));

  const state = store.getState();
  assert.equal(state.xp, 0);
  assert.deepEqual(state.stats, { played: 0, perfect: 0 });
  assert.deepEqual(state.bestByMode, {});
  assert.equal(state.dailyDone, null);
  assert.equal(state.session!.dailySaving, false);
  assert.equal(state.session!.feedback, null);

  const restored = await loadSave(deferred.storage);
  assert.equal(restored.xp, 0);
  assert.equal(restored.dailyDone, null);
  assert.deepEqual(restored.bestByMode, {});
});

test('Daily ouvre la récompense du nouveau jour UTC pendant une session active', async () => {
  const storage = createMemoryStorage();
  let now = new Date('2026-10-31T23:59:00Z');
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  const store = createGameStore(storage, undefined, () => now);
  store.getState().start('daily', table);
  enterExpression(store, table[0].expr);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getState().dailyDone, '2026-10-31');

  now = new Date('2026-11-01T00:01:00Z');
  store.getState().next();
  assert.equal(store.getState().session!.dailyDate, '2026-11-01');
  assert.equal(store.getState().session!.dailyTraining, false);
  assert.equal(store.getState().session!.feedback, null);
  enterExpression(store, table[0].expr);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getState().dailyDone, '2026-11-01');
  assert.equal(store.getState().xp > 0, true);
});

test('Daily n’accorde ni XP ni statistiques en cas d’échec de sauvegarde', async () => {
  let failNextWrite = true;
  const memory = createMemoryStorage();
  const storage: Storage = {
    get: (key) => memory.get(key),
    async set<T>(key: string, value: T) {
      if (failNextWrite) { failNextWrite = false; throw new Error('write failed'); }
      await memory.set(key, value);
    },
    remove: (key) => memory.remove(key),
  };
  const store = createGameStore(storage, undefined, () => new Date('2026-10-31T12:00:00Z'));
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  store.getState().start('daily', table);
  enterExpression(store, table[0].expr);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getState().session!.feedback!.reason, 'save_failed');
  assert.equal(store.getState().xp, 0);
  assert.equal(store.getState().dailyDone, null);
  assert.equal(store.getState().stats.played, 0);
  store.getState().clearSoftFeedback();
  store.getState().submit();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getState().dailyDone, '2026-10-31');
  assert.ok(store.getState().xp > 0);
});

test('les sauvegardes antérieures restent lisibles avec leurs valeurs conservées', async () => {
  const legacySave = {
    version: 1,
    xp: 240,
    classicProgress: 4,
    classicStars: { 2: 3 },
    bestByMode: { classic: 120 },
    streakByMode: { classic: 5 },
  };
  const restored = await loadSave(createMemoryStorage({ 'shortest:save:v3': legacySave }));
  assert.equal(restored.xp, 240);
  assert.equal(restored.classicProgress, 4);
  assert.deepEqual(restored.classicStars, { 2: 3 });
  assert.equal(restored.bestByMode.classic, 120);
  assert.equal(restored.streakByMode.classic, 5);
  assert.equal(restored.dailyDone, null);
  assert.deepEqual(restored.stats, { played: 0, perfect: 0 });
});

test('validateAnswer rejette les caractères non tokenisés', () => {
  const result = validateAnswer('3+5abc', 8, 2, BASE_RULES);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bad_token');
});

test('validation stricte couvre toute la chaîne et refuse les syntaxes étrangères', () => {
  for (const input of ['abc3+5', '3a+5', '3+5abc+', '3+5.0', '3/5', '3+5=8', '3+5²', '3+5\0']) {
    assert.equal(validateAnswer(input, 8, 2, BASE_RULES).reason, 'bad_token', input);
  }
  for (const input of ['3++5', '3+-5', '3**5', '3-+5', '+3', '-3', '*3', '3++']) {
    assert.equal(validateAnswer(input, 8, 2, BASE_RULES).reason, 'bad_token', input);
  }
});

test('validation stricte distingue opérandes, opérations, parenthèses et expressions incomplètes', () => {
  for (const input of ['3+2', '35', '03+5', '3+55']) {
    assert.equal(validateAnswer(input, 8, 2, BASE_RULES).reason, 'bad_token', input);
  }
  assert.equal(validateAnswer('3*5', 15, 2, { ...BASE_RULES, operations: ['+', '-'] }).reason, 'bad_token');
  for (const input of ['3+', '3-', '3*']) {
    assert.equal(validateAnswer(input, 8, 2, BASE_RULES).reason, 'incomplete', input);
  }
  for (const input of ['(3+5)', '3+(5)', '3+5)']) {
    assert.equal(validateAnswer(input, 8, 2, BASE_RULES).reason, 'has_parens', input);
  }
  assert.equal(validateAnswer(' \n\t', 8, 2, BASE_RULES).reason, 'empty');
});

test('validation conserve les espaces ignorés, les opérandes configurables et la précédence', () => {
  assert.equal(validateAnswer(' \t3 +\n 5 * 7 ', 38, 3, BASE_RULES).ok, true);
  assert.equal(validateAnswer('3 5+3', 38, 2, { ...BASE_RULES, numbers: [3, 35] }).ok, true);
  for (const [input, target] of [['7-5-3', -1], ['7-5*3', -8], ['7*5-3*3', 26]] as const) {
    assert.equal(validateAnswer(input, target, 4, BASE_RULES).ok, true, input);
  }
});

test('validation stricte conserve les trois contraintes Big Challenge', () => {
  for (const [required, input, target] of [[3, '5+7', 12], [5, '3+7', 10], [7, '3+5', 8]] as const) {
    const rules = { ...BASE_RULES, required: [required] };
    assert.equal(validateAnswer(input, target, 2, rules).reason, 'missing_required');
    assert.equal(validateAnswer('3+5*7', 38, 3, rules).ok, true);
  }
});

test('Rogue ne propose que des modificateurs compatibles avec les règles cumulées', () => {
  for (const id of ['need_7', 'only_35']) {
    const active = ROGUE_POOL.find((modifier) => modifier.id === id)!;
    const run = applyModifier(newRogueRun(), active);
    const choices = draftModifiers(() => 0, ROGUE_POOL.length, run.rules);
    assert.equal(choices.length, ROGUE_POOL.length - 1);
    assert.ok(choices.every((modifier) => isModifierCompatible(run.rules, modifier)));
    assert.ok(!choices.some((modifier) => modifier.id === (id === 'need_7' ? 'only_35' : 'need_7')));
  }
  const invalid: Rules = { numbers: [], operations: [], required: [7] };
  assert.deepEqual(draftModifiers(() => 0, 3, invalid), []);
  assert.equal(areRulesCompatible({ numbers: [3, 7], operations: [], required: [3, 7] }), false);
});

test('Rogue conserve les multiplicateurs, les bonus et la limite de vies', () => {
  let run = { ...newRogueRun(), lives: 1 };
  for (const id of ['double', 'heal', 'heal', 'heal', 'add_1', 'no_mult']) {
    run = applyModifier(run, ROGUE_POOL.find((modifier) => modifier.id === id)!);
  }
  assert.equal(run.lives, 3);
  assert.equal(run.scoreMult, 2 * 0.8 * 1.6);
  assert.deepEqual(run.rules.numbers, [1, 3, 5, 7]);
  assert.deepEqual(run.rules.operations, ['+', '-']);
  assert.equal(run.mods.length, 6);
  assert.deepEqual(BASE_RULES, { numbers: [3, 5, 7], operations: ['+', '-', '*'], required: [] });
});

test('les solutions Rogue respectent toutes les combinaisons admissibles du pool', () => {
  let admissibleCombinations = 0;
  for (let mask = 0; mask < (1 << ROGUE_POOL.length); mask++) {
    let run = newRogueRun();
    let compatible = true;
    for (let index = 0; index < ROGUE_POOL.length; index++) {
      if (!(mask & (1 << index))) continue;
      const modifier = ROGUE_POOL[index];
      if (!isModifierCompatible(run.rules, modifier)) { compatible = false; break; }
      run = applyModifier(run, modifier);
    }
    if (!compatible) continue;
    admissibleCombinations++;
    for (const randomValue of [0, 0.35, 0.999999]) {
      const selected = pickRoguePuzzle(run.rules, () => randomValue);
      assert.ok(selected, `combinaison ${mask}, tirage ${randomValue}`);
      assert.equal(validateAnswer(selected.expr, selected.target, selected.operands, run.rules).ok, true);
      assert.equal(countOperands(selected.expr), selected.operands);
      assert.ok(selected.operands <= ROGUE_SEARCH_LIMITS.maxOperands);
      if (selected.operands > 1) {
        assert.equal(solveOne(selected.target, run.rules, selected.operands - 1, ROGUE_SEARCH_LIMITS.magBound), null);
      }
    }
  }
  assert.equal(admissibleCombinations, 48);
});

test('Rogue signale explicitement une sélection impossible sans puzzle de remplacement', () => {
  assert.equal(pickRoguePuzzle({ numbers: [1], operations: [], required: [] }, () => 0), null);
  assert.equal(pickRoguePuzzle({ ...BASE_RULES, required: [99] }, () => { throw new Error('tirage interdit'); }), null);
});

function createRogueFixture(run: RogueRun, draft: RogueModifier[] | null = null) {
  const selected = pickRoguePuzzle(run.rules, () => 0);
  assert.ok(selected);
  const store = createGameStore(createMemoryStorage());
  store.setState({
    session: {
      mode: 'rogue', rules: run.rules, table: [], puzzle: selected, optimalOperands: selected.operands,
      input: '', index: 0, score: 0, level: 1, fails: 0, secondsLeft: 0, maxSeconds: 0,
      streak: 0, dailyDate: null, dailyTraining: false, dailySaving: false, hintsUsed: 0, prevBest: 0, prShown: false,
      rogue: run, feedback: null, draft,
    },
  });
  return store;
}

test('le store Rogue refuse un choix incompatible, absent du draft ou déjà consommé', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const needSeven = ROGUE_POOL.find((modifier) => modifier.id === 'need_7')!;
  const onlyThreeAndFive = ROGUE_POOL.find((modifier) => modifier.id === 'only_35')!;
  const heal = ROGUE_POOL.find((modifier) => modifier.id === 'heal')!;
  const store = createRogueFixture(applyModifier(newRogueRun(), needSeven), [onlyThreeAndFive, heal]);
  const before = store.getState().session;
  store.getState().chooseModifier(onlyThreeAndFive);
  store.getState().chooseModifier(needSeven);
  assert.equal(store.getState().session, before);

  store.getState().chooseModifier({ ...heal, apply: () => { throw new Error('objet non proposé'); } });
  const after = store.getState().session!;
  assert.equal(after.draft, null);
  assert.equal(validateAnswer(after.puzzle.expr, after.puzzle.target, after.optimalOperands, after.rules).ok, true);
  store.getState().chooseModifier(heal);
  assert.equal(store.getState().session, after);
});

test('le draft du store tient compte des règles déjà actives après trois réussites', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const needSeven = ROGUE_POOL.find((modifier) => modifier.id === 'need_7')!;
  const run = { ...applyModifier(newRogueRun(), needSeven), solved: 2 };
  const store = createRogueFixture(run);
  enterExpression(store, store.getState().session!.puzzle.expr);
  store.getState().next();
  const session = store.getState().session!;
  assert.equal(session.rogue!.solved, 3);
  assert.ok(session.draft && session.draft.length > 0);
  assert.ok(session.draft.every((modifier) => isModifierCompatible(run.rules, modifier)));
  assert.ok(!session.draft.some((modifier) => modifier.id === 'only_35'));
  store.getState().next();
  assert.equal(store.getState().session, session);
  store.getState().chooseModifier(session.draft[0]);
  const resumed = store.getState().session!;
  assert.equal(resumed.draft, null);
  assert.equal(resumed.rogue!.lives, 3);
  assert.equal(validateAnswer(resumed.puzzle.expr, resumed.puzzle.target, resumed.optimalOperands, resumed.rules).ok, true);
  store.getState().next();
  assert.equal(store.getState().session, resumed);
});

test('un échec de sélection après un choix arrête Rogue sans appliquer le modificateur', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const impossible: RogueModifier = {
    id: 'test_no_target', label: 'Test', kind: 'boon', scoreMult: 2, restoreLife: true,
    apply: () => ({ numbers: [1], operations: [], required: [] }),
  };
  const run = { ...newRogueRun(), lives: 1, score: 42 };
  const store = createRogueFixture(run, [impossible]);
  const before = store.getState().session!;
  store.getState().chooseModifier(impossible);
  const state = store.getState();
  assert.equal(state.rogueSelectionFailed, true);
  assert.equal(state.session!.rogue!.over, true);
  assert.equal(state.session!.puzzle, before.puzzle);
  assert.deepEqual(state.session!.rogue, { ...run, over: true });
  assert.equal(state.session!.rules, run.rules);
  assert.equal(state.session!.draft, null);
  state.press(before.puzzle.expr);
  state.submit();
  state.next();
  assert.equal(store.getState().session, state.session);
  assert.equal(store.getState().xp, 0);

  state.start('rogue', []);
  assert.equal(store.getState().rogueSelectionFailed, false);
  assert.equal(store.getState().session!.rogue!.over, false);
  state.quit();
  assert.equal(store.getState().rogueSelectionFailed, false);
  assert.equal(store.getState().session, null);
});

test('un pool sans choix admissible ne laisse pas un draft vide dans le store', () => {
  const store = createRogueFixture(newRogueRun());
  const session = store.getState().session!;
  const rules = { ...BASE_RULES, required: [99] };
  store.setState({ session: {
    ...session, rules, rogue: { ...session.rogue!, rules, solved: 2, score: 10 },
    feedback: { ok: true, gained: 10, optimal: session.puzzle.expr, target: session.puzzle.target },
  } });
  store.getState().next();
  const state = store.getState();
  assert.equal(state.rogueSelectionFailed, true);
  assert.equal(state.session!.draft, null);
  assert.equal(state.session!.rogue!.over, true);
  assert.equal(state.session!.rogue!.lives, 3);
  assert.equal(state.session!.rogue!.score, 10);
  assert.equal(state.session!.puzzle, session.puzzle);
});

test('solveOne retrouve les minima sur une petite grille exhaustive sans pruning actif', () => {
  const rules: Rules = { numbers: [1, 2], operations: ['+', '-', '*'], required: [] };
  for (let target = 1; target <= 12; target++) {
    const selected = solveOne(target, rules, 5, 100);
    assert.equal(selected?.operands ?? null, bruteForceMinimum(target, rules.numbers, 5));
  }
});

test('Classic, Big Challenge, Daily et Free Skill conservent un parcours valide', async (context) => {
  context.mock.method(Math, 'random', () => 0);
  for (const mode of ['classic', 'big3', 'big5', 'big7', 'daily', 'freeskill'] as const) {
    const name = mode.startsWith('big') ? mode : 'base';
    const entries = JSON.parse(readFileSync(new URL(`../data/puzzles.${name}.json`, import.meta.url), 'utf8')) as Puzzle[];
    const store = createGameStore(createMemoryStorage());
    store.getState().start(mode, entries);
    const first = store.getState().session!;
    assert.equal(first.mode, mode);
    assert.equal(first.rogue, null);
    assert.equal(store.getState().rogueSelectionFailed, false);
    if (mode === 'freeskill') {
      assert.equal(first.level, 2);
      assert.equal(first.secondsLeft, 53);
      store.getState().tick();
      assert.equal(store.getState().session!.secondsLeft, 52);
    }
    enterExpression(store, first.puzzle.expr);
    if (mode === 'daily') await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(store.getState().session!.feedback!.ok, true, mode);
    store.getState().next();
    const next = store.getState().session!;
    assert.equal(validateAnswer(next.puzzle.expr, next.puzzle.target, next.optimalOperands, next.rules).ok, true, mode);
    if (mode === 'classic') assert.equal(store.getState().classicProgress, 1);
  }
});

test('Rogue ignore next sans feedback et conserve le puzzle et les vies', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const store = createRogueFixture(newRogueRun());
  const before = store.getState();
  assert.equal(before.session!.feedback, null);
  before.next();
  assert.equal(store.getState(), before);
});

test('Rogue ignore une continuation après un feedback soft', (context) => {
  context.mock.method(Math, 'random', () => 0);
  for (const input of ['3+', '3+5abc']) {
    const store = createRogueFixture(newRogueRun());
    enterExpression(store, input);
    const before = store.getState();
    assert.equal(before.session!.feedback!.ok, false);
    assert.equal(before.session!.feedback!.soft, true);
    before.next();
    assert.equal(store.getState(), before, input);
    before.clearSoftFeedback();
    const retry = store.getState();
    assert.equal(retry.session!.feedback, null);
    retry.next();
    assert.equal(store.getState(), retry);
  }
});

test('Rogue refuse une défaite dont la raison ne termine pas le puzzle', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const store = createRogueFixture(newRogueRun());
  const session = store.getState().session!;
  store.setState({ session: {
    ...session,
    feedback: { ok: false, soft: false, reason: 'bad_token', optimal: session.puzzle.expr, target: session.puzzle.target },
  } });
  const before = store.getState();
  before.next();
  assert.equal(store.getState(), before);
});

test('un double next après une victoire Rogue ne compte la réussite qu’une fois', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const store = createRogueFixture(newRogueRun());
  const first = store.getState().session!;
  enterExpression(store, first.puzzle.expr);
  const gained = store.getState().session!.feedback!.gained!;
  assert.ok(gained > 0);
  store.getState().next();
  const advanced = store.getState();
  const session = advanced.session!;
  assert.equal(session.rogue!.solved, 1);
  assert.equal(session.rogue!.score, gained);
  assert.equal(session.rogue!.lives, 3);
  assert.equal(session.feedback, null);
  assert.notEqual(session.puzzle, first.puzzle);
  assert.equal(validateAnswer(session.puzzle.expr, session.puzzle.target, session.optimalOperands, session.rules).ok, true);
  advanced.next();
  assert.equal(store.getState(), advanced);
});

test('un double next après une défaite Rogue ne consomme qu’une vie', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const needSeven = ROGUE_POOL.find((modifier) => modifier.id === 'need_7')!;
  const cases = [
    { run: newRogueRun(), input: '3', reason: 'wrong_value' },
    { run: applyModifier(newRogueRun(), needSeven), input: '5', reason: 'missing_required' },
  ];
  for (const { run, input, reason } of cases) {
    const store = createRogueFixture(run);
    const first = store.getState().session!;
    enterExpression(store, input);
    assert.equal(store.getState().session!.feedback!.reason, reason);
    assert.equal(store.getState().session!.feedback!.soft, false);
    store.getState().next();
    const advanced = store.getState();
    const session = advanced.session!;
    assert.equal(session.rogue!.lives, 2);
    assert.equal(session.rogue!.over, false);
    assert.equal(session.rogue!.solved, 0);
    assert.equal(session.rogue!.score, 0);
    assert.equal(session.feedback, null);
    assert.notEqual(session.puzzle, first.puzzle);
    assert.equal(validateAnswer(session.puzzle.expr, session.puzzle.target, session.optimalOperands, session.rules).ok, true);
    advanced.next();
    assert.equal(store.getState(), advanced, reason);
  }
});

test('la dernière défaite Rogue termine la run une seule fois', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const store = createRogueFixture({ ...newRogueRun(), lives: 1, score: 42 });
  const first = store.getState().session!;
  enterExpression(store, '3');
  assert.equal(store.getState().session!.feedback!.reason, 'wrong_value');
  store.getState().next();
  const ended = store.getState();
  assert.equal(ended.session!.rogue!.lives, 0);
  assert.equal(ended.session!.rogue!.over, true);
  assert.equal(ended.session!.rogue!.score, 42);
  assert.equal(ended.bestByMode.rogue, 42);
  assert.equal(ended.session!.feedback, null);
  assert.equal(ended.session!.puzzle, first.puzzle);
  ended.next();
  assert.equal(store.getState(), ended);
});
