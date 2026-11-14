import type { Rules } from "./model";
import type { SearchResult } from "./math";

export type OptimalImpact = {
  status: "restrictive" | "already-satisfied-by-all-optima" | "unmeasured";
  baselineOperands?: number;
};
export function compareOptimalSolutions(
  before: Rules,
  after: Rules,
  target: number,
  search: (rules: Rules) => SearchResult,
): OptimalImpact {
  const baseline = search(before);
  const witness = baseline.solutions.get(target);
  if (!baseline.complete || baseline.errors.length || !witness)
    return { status: "unmeasured" };
  const result = (status: OptimalImpact["status"]): OptimalImpact => ({
    status,
    baselineOperands: witness.operands,
  });
  let unknown = false;
  function excluded(violating: SearchResult): boolean {
    if (!violating.complete || violating.errors.length) unknown = true;
    return (
      violating.complete &&
      !violating.errors.length &&
      violating.solutions.get(target)?.operands === witness!.operands
    );
  }
  for (const [digit, count] of Object.entries(after.minimumOccurrences)) {
    if (count <= (before.minimumOccurrences[Number(digit)] ?? 0)) continue;
    if ((witness.expression.match(new RegExp(digit, "g")) ?? []).length < count)
      return result("restrictive");
    if (count === 1) {
      if (
        excluded(
          search({
            ...before,
            numbers: before.numbers.filter((value) => value !== Number(digit)),
          }),
        )
      )
        return result("restrictive");
    } else unknown = true;
  }
  if (
    after.requireSubtraction &&
    !before.requireSubtraction &&
    excluded(
      search({
        ...before,
        operations: before.operations.filter((operation) => operation !== "-"),
      }),
    )
  )
    return result("restrictive");
  if (
    after.maxMultiplications !== null &&
    (before.maxMultiplications === null ||
      after.maxMultiplications < before.maxMultiplications) &&
    (baseline.optimalMaximumMultiplications.get(target) ?? 0) >
      after.maxMultiplications
  )
    return result("restrictive");
  return result(unknown ? "unmeasured" : "already-satisfied-by-all-optima");
}
export function relaxedRequirements(
  rules: Rules,
): { name: string; before: Rules }[] {
  const requirements: { name: string; before: Rules }[] = [];
  for (const [digit, count] of Object.entries(rules.minimumOccurrences))
    if (count > 0) {
      const minimumOccurrences = { ...rules.minimumOccurrences };
      delete minimumOccurrences[Number(digit)];
      requirements.push({
        name: `digit-${digit}-${count}`,
        before: { ...rules, minimumOccurrences },
      });
    }
  if (rules.requireSubtraction)
    requirements.push({
      name: "subtraction",
      before: { ...rules, requireSubtraction: false },
    });
  if (rules.maxMultiplications !== null)
    requirements.push({
      name: "multiplication-budget",
      before: { ...rules, maxMultiplications: null },
    });
  return requirements;
}
