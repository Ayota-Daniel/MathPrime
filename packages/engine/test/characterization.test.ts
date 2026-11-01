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

test('BUG CARACTÉRISÉ : le score Rogue affiché additionne deux cumuls', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const table = [puzzle(12, '3+3+3+3', 4, 1)];
  const store = createGameStore(createMemoryStorage());
  store.setState({
    session: {
      mode: 'rogue', rules: BASE_RULES, table, puzzle: table[0], optimalOperands: 4,
      input: '', index: 0, score: 0, level: 1, fails: 0, secondsLeft: 0, maxSeconds: 0,
      streak: 0, hintsUsed: 0, prevBest: 0, prShown: false,
      rogue: newRogueRun(), feedback: null, draft: null,
    },
  });

  enterExpression(store, table[0].expr);
  const gained = store.getState().session?.feedback?.gained;
  store.getState().next();
  const session = store.getState().session!;

  assert.ok(typeof gained === 'number' && gained > 0);
  assert.equal(session.rogue!.score, gained);
  assert.equal(session.score, gained);
  assert.equal(session.rogue!.score + session.score, gained * 2);
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

test('BUG CARACTÉRISÉ : le puzzle Daily est rejouable après validation', () => {
  const store = createGameStore(createMemoryStorage());
  const table = [puzzle(15, '3+3+3+3+3', 5, 2)];
  store.getState().start('daily', table);
  const firstPuzzle = store.getState().session!.puzzle;

  enterExpression(store, firstPuzzle.expr);
  assert.equal(store.getState().dailyDone !== null, true);
  store.getState().next();

  assert.deepEqual(store.getState().session!.puzzle, firstPuzzle);
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
      streak: 0, hintsUsed: 0, prevBest: 0, prShown: false,
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
    ...session, rules, rogue: { ...session.rogue!, rules, solved: 2 },
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

test('Classic, Big Challenge, Daily et Free Skill conservent un parcours valide', (context) => {
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
    assert.equal(store.getState().session!.feedback!.ok, true, mode);
    store.getState().next();
    const next = store.getState().session!;
    assert.equal(validateAnswer(next.puzzle.expr, next.puzzle.target, next.optimalOperands, next.rules).ok, true, mode);
    if (mode === 'classic') assert.equal(store.getState().classicProgress, 1);
  }
});
