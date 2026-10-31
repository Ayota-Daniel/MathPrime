import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BASE_RULES,
  ROGUE_POOL,
  adjustLevel,
  applyModifier,
  classicCurriculum,
  dailyPuzzle,
  difficultyForOperands,
  evaluate,
  newRogueRun,
  scorePuzzle,
  validateAnswer,
  type Puzzle,
  type RogueRun,
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

test('BUG CARACTÉRISÉ : need_7 + only_35 rend Rogue insoluble', () => {
  let run: RogueRun = newRogueRun();
  const needSeven = ROGUE_POOL.find((modifier) => modifier.id === 'need_7');
  const onlyThreeAndFive = ROGUE_POOL.find((modifier) => modifier.id === 'only_35');
  assert.ok(needSeven && onlyThreeAndFive);

  run = applyModifier(run, needSeven);
  run = applyModifier(run, onlyThreeAndFive);
  assert.deepEqual(run.rules.required, [7]);
  assert.deepEqual(run.rules.numbers, [3, 5]);
  assert.equal(run.rules.numbers.includes(7), false);
  assert.equal(solveOne(38, run.rules), null);
});

test('BUG CARACTÉRISÉ : le fallback Rogue affiche un puzzle incompatible avec ses règles', () => {
  const onlyThreeAndFive = ROGUE_POOL.find((modifier) => modifier.id === 'only_35')!;
  const run: RogueRun = {
    ...newRogueRun(),
    rules: { numbers: [3, 7], operations: ['+'], required: [7] },
  };
  const table = [puzzle(12, '3+3+3+3', 4, 1)];
  const store = createGameStore(createMemoryStorage());

  store.setState({
    session: {
      mode: 'rogue', rules: run.rules, table, puzzle: table[0], optimalOperands: 4,
      input: '', index: 0, score: 0, level: 1, fails: 0, secondsLeft: 0, maxSeconds: 0,
      streak: 0, hintsUsed: 0, prevBest: 0, prShown: false,
      rogue: run, feedback: null, draft: [onlyThreeAndFive],
    },
  });

  store.getState().chooseModifier(onlyThreeAndFive);
  const session = store.getState().session!;

  assert.equal(session.puzzle.expr, table[0].expr);
  assert.equal(validateAnswer(session.puzzle.expr, session.puzzle.target, session.optimalOperands, session.rules).reason, 'missing_required');
});

test('BUG CARACTÉRISÉ : le score Rogue affiché additionne deux cumuls', () => {
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

test('BUG CARACTÉRISÉ : validateAnswer ignore les caractères non tokenisés', () => {
  const result = validateAnswer('3+5abc', 8, 2, BASE_RULES);
  assert.equal(result.ok, true);
});
