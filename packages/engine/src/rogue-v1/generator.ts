import { compareOptimalSolutions } from "./constraint-impact";
import {
  minimumOperands,
  progressionVariants,
  variedChoices,
} from "./difficulty";
import type { GenerationProfile, RecentEncounter } from "./difficulty";
import { buildRules, bossRuleVariants, puzzleSeconds } from "./cards";
import { solveRules } from "./math";
import type { SearchResult } from "./math";
import type {
  Config,
  Effect,
  ObligationDiagnostic,
  Phase,
  Puzzle,
  Rules,
  Solution,
} from "./model";

export interface Pool {
  candidates: { target: number; solution: Solution }[];
  rules: Rules;
  diagnostics: string[];
  states: number;
  variant?: string;
  rawCandidates?: number;
  progressionFallback?: boolean;
}
/** Cache belongs to a simulation/session; no global mutable state or system clock. */
export class Generator {
  private cache = new Map<string, SearchResult>();
  private readonly pools = new Map<string, Pool>();
  constructor(readonly profile: GenerationProfile = "legacy") {}
  maximumSearchStates = 0;
  searches = 0;
  cacheHits = 0;
  states = 0;
  clear(): void {
    this.cache.clear();
    this.pools.clear();
  }
  private search(rules: Rules, config: Config): SearchResult {
    const key = JSON.stringify([rules, config.search]);
    const cached = this.cache.get(key);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    const result = solveRules(rules, config.search);
    this.searches++;
    this.states += result.states;
    this.maximumSearchStates = Math.max(
      this.maximumSearchStates,
      result.states,
    );
    if (this.cache.size >= 128) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }
  pool(config: Config, effects: Effect[], phase: Phase): Pool {
    if (this.profile === "legacy")
      return this.legacyPool(config, effects, phase);
    const key = JSON.stringify([
      config,
      effects.map(({ id, level }) => [id, level]),
      phase.act,
      phase.boss,
      phase.difficulty,
      phase.survival ? 0 : phase.index,
      phase.survival > 3,
    ]);
    const cached = this.pools.get(key);
    if (cached) return cached;
    const result = this.progressivePool(config, effects, phase);
    if (this.pools.size >= 128) this.pools.clear();
    this.pools.set(key, result);
    return result;
  }
  private legacyPool(config: Config, effects: Effect[], phase: Phase): Pool {
    const variants = bossRuleVariants(
      buildRules(config, effects, phase),
      phase,
    );
    const refusals: string[] = [];
    for (const variant of variants) {
      const pool = this.poolForRules(config, phase, variant.rules);
      if (pool.candidates.length >= config.minimumTargets)
        return {
          ...pool,
          variant: variant.name,
          diagnostics: [...refusals, ...pool.diagnostics],
        };
      refusals.push(`variant-rejected:${variant.name}`, ...pool.diagnostics);
    }
    return {
      candidates: [],
      rules: buildRules(config, effects, phase),
      diagnostics: [...refusals, "no-admissible-variant"],
      states: 0,
    };
  }
  private progressivePool(
    config: Config,
    effects: Effect[],
    phase: Phase,
  ): Pool {
    const base = buildRules(config, effects, phase);
    const reference = this.search(base, config);
    for (const variant of progressionVariants(base, phase)) {
      const raw = this.poolForRules(config, phase, variant.rules);
      if (raw.candidates.length < config.minimumTargets) continue;
      const candidates = raw.candidates.filter(({ target, solution }) => {
        if (solution.operands < minimumOperands(phase)) return false;
        const before = reference.solutions.get(target);
        if (
          !before ||
          solution.operands - before.operands > config.maxLengthInflation
        )
          return false;
        if (
          JSON.stringify(base) !== JSON.stringify(variant.rules) &&
          !this.changesOptimum(config, base, variant.rules, target)
        )
          return false;
        return this.cardObligationsMatter(
          config,
          effects,
          variant.rules,
          target,
        );
      });
      if (candidates.length >= config.minimumTargets)
        return {
          ...raw,
          candidates,
          variant: variant.name,
          rawCandidates: raw.candidates.length,
          diagnostics: [...raw.diagnostics, "progressive-pool"],
        };
    }
    const fallback = this.legacyPool(config, effects, phase);
    return {
      ...fallback,
      rawCandidates: fallback.candidates.length,
      progressionFallback: true,
      diagnostics: [...fallback.diagnostics, "progression-preference-relaxed"],
    };
  }
  private cardObligationsMatter(
    config: Config,
    effects: Effect[],
    rules: Rules,
    target: number,
  ): boolean {
    return effects
      .filter((effect) => effect.id === "D1" || effect.id === "T3")
      .every((effect) => {
        const relaxed = {
          ...rules,
          minimumOccurrences: { ...rules.minimumOccurrences },
        };
        if (effect.id === "D1") delete relaxed.minimumOccurrences[7];
        else relaxed.requireSubtraction = false;
        return this.changesOptimum(config, relaxed, rules, target);
      });
  }
  private changesOptimum(
    config: Config,
    before: Rules,
    after: Rules,
    target: number,
  ): boolean {
    return (
      this.constraintImpact(config, before, after, target).status ===
      "restrictive"
    );
  }
  constraintImpact(
    config: Config,
    before: Rules,
    after: Rules,
    target: number,
  ) {
    return compareOptimalSolutions(before, after, target, (rules) =>
      this.search(rules, config),
    );
  }
  private poolForRules(config: Config, phase: Phase, rules: Rules): Pool {
    const result = this.search(rules, config);
    if (!result.complete || result.errors.length)
      return {
        candidates: [],
        rules,
        diagnostics: result.errors,
        states: result.states,
      };
    const diagnostics: string[] = [];
    const unrestricted =
      rules.maxMultiplications === null
        ? null
        : this.search({ ...rules, maxMultiplications: null }, config);
    if (
      unrestricted &&
      (!unrestricted.complete || unrestricted.errors.length)
    ) {
      return {
        candidates: [],
        rules,
        diagnostics: ["unrestricted-comparison-incomplete"],
        states: result.states,
      };
    }
    let insignificant = 0;
    let inflated = 0;
    const candidates = [...result.solutions]
      .filter(([target, solution]) => {
        if (
          solution.operands <
          Math.min(phase.difficulty + 1, config.search.maxOperands)
        )
          return false;
        if (unrestricted) {
          const baseline = unrestricted.solutions.get(target);
          if (
            !baseline ||
            solution.operands - baseline.operands > config.maxLengthInflation
          ) {
            inflated++;
            return false;
          }
          if (
            (unrestricted.optimalMaximumMultiplications.get(target) ?? 0) <=
            rules.maxMultiplications!
          ) {
            insignificant++;
            return false;
          }
        }
        return true;
      })
      .map(([target, solution]) => ({ target, solution }))
      .sort((a, b) => a.target - b.target);
    if (inflated) diagnostics.push(`length-inflation-rejected:${inflated}`);
    if (insignificant)
      diagnostics.push(`insignificant-budget-rejected:${insignificant}`);
    if (candidates.length < config.minimumTargets)
      diagnostics.push(
        `insufficient-targets:${candidates.length}/${config.minimumTargets}`,
      );
    return { candidates, rules, diagnostics, states: result.states };
  }
  /** Compare all bounded optima via a search of expressions violating the obligation.
   * Historical diagnostic is read-only; R4.2 also uses proven impacts in its pool preference.
   */
  obligationDiagnostics(
    config: Config,
    rules: Rules,
    target: number,
    effects: Effect[],
  ): ObligationDiagnostic[] {
    return effects
      .filter((effect) => effect.id === "D1" || effect.id === "T3")
      .map((effect) => {
        const card = effect.id as "D1" | "T3";
        if (card === "D1" && rules.minimumOccurrences[7] !== 1) {
          const relaxed = {
            ...rules,
            minimumOccurrences: { ...rules.minimumOccurrences },
          };
          delete relaxed.minimumOccurrences[7];
          if (
            this.profile === "r4.2" &&
            this.changesOptimum(config, relaxed, rules, target)
          )
            return {
              card,
              status: "restrictive",
              baselineOperands: this.search(relaxed, config).solutions.get(
                target,
              )?.operands,
            };
          return {
            card,
            status: "unmeasured",
            reason: "multiple-sevens-or-boss-obligation",
          };
        }
        const baselineRules = {
          ...rules,
          minimumOccurrences: { ...rules.minimumOccurrences },
        };
        if (card === "D1") delete baselineRules.minimumOccurrences[7];
        else baselineRules.requireSubtraction = false;
        const violatingRules: Rules =
          card === "D1"
            ? {
                ...baselineRules,
                numbers: rules.numbers.filter((digit) => digit !== 7),
              }
            : {
                ...baselineRules,
                operations: rules.operations.filter(
                  (operation) => operation !== "-",
                ),
              };
        const baseline = this.search(baselineRules, config);
        const violating = this.search(violatingRules, config);
        const minimum = baseline.solutions.get(target)?.operands;
        if (
          !baseline.complete ||
          !violating.complete ||
          baseline.errors.length ||
          violating.errors.length ||
          minimum === undefined
        ) {
          return {
            card,
            status: "unmeasured",
            reason: "comparison-unavailable",
          };
        }
        return {
          card,
          baselineOperands: minimum,
          status:
            violating.solutions.get(target)?.operands === minimum
              ? "restrictive"
              : "already-satisfied-by-all-optima",
        };
      });
  }
  generate(
    config: Config,
    effects: Effect[],
    phase: Phase,
    randomValue: number,
    carry: number,
    previous: number | null,
    recent: RecentEncounter[] = [],
  ): { puzzle: Puzzle | null; diagnostics: string[] } {
    const pool = this.pool(config, effects, phase);
    if (pool.candidates.length < config.minimumTargets)
      return { puzzle: null, diagnostics: pool.diagnostics };
    const history =
      this.profile === "r4.2"
        ? variedChoices(
            pool.candidates,
            previous,
            recent,
            config.minimumTargets,
            config.search.magnitude,
            pool.rules,
          )
        : {
            choices: pool.candidates.filter(
              (candidate) => candidate.target !== previous,
            ),
            notes: [],
          };
    const choices = history.choices;
    if (!choices.length)
      return {
        puzzle: null,
        diagnostics: [...pool.diagnostics, "no-new-target"],
      };
    const selected =
      choices[
        Math.min(choices.length - 1, Math.floor(randomValue * choices.length))
      ];
    const seconds = puzzleSeconds(config, effects, phase, carry);
    const obligations =
      Object.values(pool.rules.minimumOccurrences).reduce(
        (sum, n) => sum + n,
        0,
      ) +
      Number(pool.rules.requireSubtraction) +
      Number(pool.rules.maxMultiplications !== null);
    const estimatedCost = selected.solution.operands * 5 + obligations * 4;
    return {
      puzzle: {
        ...selected.solution,
        target: selected.target,
        rules: pool.rules,
        difficulty: phase.difficulty,
        seconds,
        minimumStars:
          (phase.boss && phase.act === 3 && phase.index >= 1) ||
          (this.profile === "r4.2" &&
            phase.act === 3 &&
            !phase.boss &&
            phase.index === 2)
            ? 2
            : 1,
        obligationDiagnostics: this.obligationDiagnostics(
          config,
          pool.rules,
          selected.target,
          effects,
        ),
        ...(this.profile === "r4.2"
          ? {
              generation: {
                profile: this.profile,
                rawCandidates: pool.rawCandidates ?? pool.candidates.length,
                selectedCandidates: choices.length,
                progressionFallback: Boolean(pool.progressionFallback),
                notes: history.notes,
              },
            }
          : {}),
        variant: pool.variant ?? "ordinary",
        estimatedCost,
        warnings:
          estimatedCost > seconds ? ["heuristic-cost-exceeds-time"] : [],
        candidateCount: pool.candidates.length,
      },
      diagnostics: [...pool.diagnostics, ...history.notes],
    };
  }
}
