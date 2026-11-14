import { Generator } from "./generator";
import { inspectExpression, expressionValue } from "./math";
import { phaseAt } from "./model";
import type { Config, Phase, Puzzle, Run } from "./model";
import {
  expressionShape,
  meaningfulRepeat,
  RECENT_ENCOUNTERS,
} from "./difficulty";
import { relaxedRequirements } from "./constraint-impact";

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
function distribution(values: number[]) {
  return {
    minimum: values.length ? Math.min(...values) : null,
    mean: average(values),
    maximum: values.length ? Math.max(...values) : null,
    histogram: values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {}),
  };
}
function bucket() {
  return {
    puzzles: 0,
    repeatedTargets: 0,
    redundantRepeats: 0,
    recentRedundantRepeats: 0,
    sameRulesRepeats: 0,
    repeatedShapes: 0,
    operands: [] as number[],
    targets: [] as number[],
    candidates: [] as number[],
    rawCandidates: [] as number[],
    selectedCandidates: [] as number[],
    constraintCounts: [] as number[],
    digits: {} as Record<string, number>,
    operations: {} as Record<string, number>,
    constraints: {
      restrictive: 0,
      suspect: 0,
      unmeasured: 0,
      excludeEasyOptimum: 0,
    },
    cards: {} as Record<
      string,
      {
        puzzles: number;
        restrictive: number;
        suspect: number;
        unmeasured: number;
      }
    >,
    progressionFallbacks: 0,
    varietyRelaxations: {} as Record<string, number>,
    steps: {} as Record<
      string,
      { operands: number[]; constraints: number[]; puzzles: number }
    >,
  };
}
function summarize(value: ReturnType<typeof bucket>) {
  return {
    ...value,
    operands: distribution(value.operands),
    targets: distribution(value.targets),
    candidates: distribution(value.candidates),
    rawCandidates: distribution(value.rawCandidates),
    selectedCandidates: distribution(value.selectedCandidates),
    constraintCounts: distribution(value.constraintCounts),
    steps: Object.fromEntries(
      Object.entries(value.steps).map(([key, step]) => [
        key,
        {
          puzzles: step.puzzles,
          minimumOperands: distribution(step.operands),
          constraintCount: distribution(step.constraints),
        },
      ]),
    ),
  };
}
const count = (values: Record<string, number>, key: string) =>
  (values[key] = (values[key] ?? 0) + 1);
type ActMetrics = ReturnType<typeof bucket>;
type ObservedPuzzle = Puzzle & { effects: { id: string }[] };
type Example = {
  seedIndex: number;
  stage: number;
  target: number;
  expression: string;
  minimumOperands: number;
  rules: Puzzle["rules"];
};
function repetitions(
  act: ActMetrics,
  puzzle: Puzzle,
  seen: Puzzle[],
  earlier: Puzzle[],
  magnitude: number,
) {
  const sameTarget = (values: Puzzle[]) =>
    values.filter((item) => item.target === puzzle.target);
  const redundant = (values: Puzzle[]) =>
    sameTarget(values).some(
      (item) => !meaningfulRepeat(item, puzzle.rules, magnitude),
    );
  if (sameTarget(earlier).length) act.repeatedTargets++;
  if (redundant(earlier)) act.redundantRepeats++;
  if (redundant(seen.slice(-RECENT_ENCOUNTERS))) act.recentRedundantRepeats++;
  if (
    sameTarget(earlier).some(
      (item) => JSON.stringify(item.rules) === JSON.stringify(puzzle.rules),
    )
  )
    act.sameRulesRepeats++;
  if (
    earlier.some(
      (item) =>
        expressionShape(item.expression) === expressionShape(puzzle.expression),
    )
  )
    act.repeatedShapes++;
  return {
    repeated: Number(sameTarget(seen).length > 0),
    redundant: Number(redundant(seen)),
  };
}
function provePuzzle(
  analyzer: Generator,
  puzzle: Puzzle,
  config: Config,
  seed: number,
  stage: number,
) {
  const minimum = analyzer.constraintImpact(
    config,
    puzzle.rules,
    puzzle.rules,
    puzzle.target,
  );
  if (
    !inspectExpression(
      puzzle.expression,
      puzzle.rules,
      config.search.magnitude,
    ) ||
    expressionValue(puzzle.expression) !== puzzle.target ||
    minimum.baselineOperands !== puzzle.operands
  )
    throw new Error(`Unproved puzzle in run ${seed}, stage ${stage}`);
}
function measureRequirements(
  act: ActMetrics,
  puzzle: Puzzle,
  config: Config,
  analyzer: Generator,
) {
  const requirements = relaxedRequirements(puzzle.rules);
  for (const requirement of requirements) {
    const impact = analyzer.constraintImpact(
      config,
      requirement.before,
      puzzle.rules,
      puzzle.target,
    );
    const status =
      impact.status === "already-satisfied-by-all-optima"
        ? "suspect"
        : impact.status;
    act.constraints[status]++;
    if (status === "restrictive" && (impact.baselineOperands ?? Infinity) <= 3)
      act.constraints.excludeEasyOptimum++;
  }
  return requirements.length;
}
function measureCards(act: ActMetrics, puzzle: ObservedPuzzle) {
  for (const effect of puzzle.effects) {
    const card = act.cards[effect.id] ?? {
      puzzles: 0,
      restrictive: 0,
      suspect: 0,
      unmeasured: 0,
    };
    card.puzzles++;
    const impact = puzzle.obligationDiagnostics.find(
      (diagnostic) => diagnostic.card === effect.id,
    );
    if (impact)
      card[
        impact.status === "already-satisfied-by-all-optima"
          ? "suspect"
          : impact.status
      ]++;
    act.cards[effect.id] = card;
  }
}
function measurePuzzle(
  act: ActMetrics,
  puzzle: Puzzle,
  phase: Phase,
  requirements: number,
) {
  act.puzzles++;
  act.operands.push(puzzle.operands);
  act.targets.push(puzzle.target);
  act.candidates.push(puzzle.candidateCount);
  act.rawCandidates.push(
    puzzle.generation?.rawCandidates ?? puzzle.candidateCount,
  );
  act.selectedCandidates.push(
    puzzle.generation?.selectedCandidates ?? puzzle.candidateCount,
  );
  act.constraintCounts.push(requirements);
  for (const digit of puzzle.expression.match(/[1-9]/g) ?? [])
    count(act.digits, digit);
  for (const operation of puzzle.expression.match(/[+*\-]/g) ?? [])
    count(act.operations, operation);
  if (puzzle.generation?.progressionFallback) act.progressionFallbacks++;
  for (const note of puzzle.generation?.notes ?? [])
    count(act.varietyRelaxations, note);
  const step = `${phase.boss ? "boss" : "ordinary"}-${phase.index + 1}`;
  const row = act.steps[step] ?? { operands: [], constraints: [], puzzles: 0 };
  row.operands.push(puzzle.operands);
  row.constraints.push(requirements);
  row.puzzles++;
  act.steps[step] = row;
}
function analyzeRun(
  run: Run,
  seedIndex: number,
  acts: ActMetrics[],
  analyzer: Generator,
  examples: Example[],
) {
  const seen: Puzzle[] = [];
  const seenInAct = new Map<number, Puzzle[]>();
  let repeatsAcrossRun = 0;
  let redundantAcrossRun = 0;
  for (const event of run.events) {
    if (event.type !== "puzzle") continue;
    const puzzle = event.detail as ObservedPuzzle;
    const phase = phaseAt(event.stage, run.config);
    const act = acts[phase.act - 1];
    const earlier = seenInAct.get(phase.act) ?? [];
    const repeated = repetitions(
      act,
      puzzle,
      seen,
      earlier,
      run.config.search.magnitude,
    );
    repeatsAcrossRun += repeated.repeated;
    redundantAcrossRun += repeated.redundant;
    seen.push(puzzle);
    earlier.push(puzzle);
    seenInAct.set(phase.act, earlier);
    provePuzzle(analyzer, puzzle, run.config, seedIndex, event.stage);
    const requirements = measureRequirements(act, puzzle, run.config, analyzer);
    measureCards(act, puzzle);
    measurePuzzle(act, puzzle, phase, requirements);
    if (seedIndex < 2 && phase.act <= 3 && phase.index === 0)
      examples.push({
        seedIndex,
        stage: event.stage,
        target: puzzle.target,
        expression: puzzle.expression,
        minimumOperands: puzzle.operands,
        rules: puzzle.rules,
      });
  }
  return {
    repeatsAcrossRun,
    redundantAcrossRun,
    solvabilityChecks: seen.length,
  };
}
export function analyzeDifficulty(runs: Run[]) {
  const acts = [bucket(), bucket(), bucket(), bucket()];
  const analyzer = new Generator("legacy");
  const examples: Example[] = [];
  const totals = {
    repeatsAcrossRun: 0,
    redundantAcrossRun: 0,
    solvabilityChecks: 0,
  };
  runs.forEach((run, seedIndex) => {
    const result = analyzeRun(run, seedIndex, acts, analyzer, examples);
    totals.repeatsAcrossRun += result.repeatsAcrossRun;
    totals.redundantAcrossRun += result.redundantAcrossRun;
    totals.solvabilityChecks += result.solvabilityChecks;
  });
  return {
    ...totals,
    acts: acts.map(summarize),
    examples,
    analysisSearches: analyzer.searches,
    analysisStates: analyzer.states,
  };
}
