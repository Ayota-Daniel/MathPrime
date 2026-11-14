import { bossRuleVariants, multiplicationBudget } from "./cards";
import { inspectExpression } from "./math";
import type { Phase, Puzzle, Rules, Solution } from "./model";

export type GenerationProfile = "legacy" | "r4.2";
export type RecentEncounter = Pick<
  Puzzle,
  "target" | "rules" | "expression" | "operands"
>;
export const RECENT_ENCOUNTERS = 6;
export function expressionShape(expression: string): string {
  return expression.replace(/[1-9]/g, "n");
}
export function minimumOperands(phase: Phase): number {
  if (phase.survival) return 6;
  if (phase.boss) return Math.min(5, phase.act + 2);
  if (phase.act === 1) return phase.index === 2 ? 3 : 2;
  return phase.act + 1 + Number(phase.index > 0);
}
function singles(base: Rules, phase: Phase) {
  const variants: { name: string; rules: Rules }[] = [];
  if (!base.requireSubtraction && base.operations.includes("-"))
    variants.push({
      name: "subtraction",
      rules: { ...base, requireSubtraction: true },
    });
  if (base.maxMultiplications === null && base.operations.includes("*"))
    variants.push({
      name: "multiplication-budget",
      rules: {
        ...base,
        maxMultiplications: multiplicationBudget(phase.difficulty),
      },
    });
  for (const digit of base.numbers)
    if (!(base.minimumOccurrences[digit] > 0))
      variants.push({
        name: `occurrence-${digit}`,
        rules: {
          ...base,
          minimumOccurrences: { ...base.minimumOccurrences, [digit]: 1 },
        },
      });
  return variants;
}
export function progressionVariants(base: Rules, phase: Phase) {
  if (phase.act === 1 || phase.survival)
    return bossRuleVariants(base, phase).filter(
      (variant) =>
        !(base.minimumOccurrences[7] > 0 && variant.name === "occurrence-7"),
    );
  if (!phase.boss && phase.act === 2 && phase.index === 0)
    return [{ name: "build", rules: base }];
  const variants = singles(base, phase);
  // Introduce an occurrence before the tighter multiplication budget.
  const preference =
    !phase.boss && phase.index > 0 ? 3 - phase.index : phase.index;
  const offset = preference % (variants.length || 1);
  const ordered = [...variants.slice(offset), ...variants.slice(0, offset)];
  if (phase.act === 3 && (phase.boss || phase.index > 0)) {
    const pairs = ordered.flatMap((first) =>
      singles(first.rules, phase)
        .filter((second) => second.name !== first.name)
        .map((second) => ({
          name: `${first.name}+${second.name}`,
          rules: second.rules,
        })),
    );
    return [...pairs, ...ordered];
  }
  return ordered.length ? ordered : [{ name: "build", rules: base }];
}
export function variedChoices(
  candidates: { target: number; solution: Solution }[],
  previous: number | null,
  recent: RecentEncounter[],
  minimumTargets: number,
  magnitude: number,
  rules: Rules,
) {
  const notes: string[] = [];
  let choices = candidates.filter((candidate) => candidate.target !== previous);
  const unseen = choices.filter((candidate) =>
    recent
      .filter((item) => item.target === candidate.target)
      .every((item) => meaningfulRepeat(item, rules, magnitude)),
  );
  if (unseen.length >= minimumTargets) choices = unseen;
  else notes.push("recent-target-preference-relaxed");
  const shapes = new Set(
    recent.slice(-3).map((item) => expressionShape(item.expression)),
  );
  const different = choices.filter(
    (candidate) => !shapes.has(expressionShape(candidate.solution.expression)),
  );
  if (different.length >= minimumTargets) choices = different;
  else if (shapes.size) notes.push("recent-shape-preference-relaxed");
  return { choices, notes };
}
export function meaningfulRepeat(
  previous: RecentEncounter,
  rules: Rules,
  magnitude: number,
): boolean {
  return inspectExpression(previous.expression, rules, magnitude) === null;
}
