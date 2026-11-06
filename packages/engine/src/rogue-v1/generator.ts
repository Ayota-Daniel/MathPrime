import { buildRules, bossRuleVariants, puzzleSeconds } from './cards';
import { solveRules } from './math';
import type { SearchResult } from './math';
import type { Config, Effect, Phase, Puzzle, Rules, Solution } from './model';

export interface Pool {
  candidates: { target: number; solution: Solution }[];
  rules: Rules;
  diagnostics: string[];
  states: number;
  variant?: string;
}
/** Cache belongs to a simulation/session; no global mutable state or system clock. */
export class Generator {
  private cache = new Map<string, SearchResult>();
  searches = 0;
  cacheHits = 0;
  states = 0;
  clear(): void { this.cache.clear(); }
  private search(rules: Rules, config: Config): SearchResult {
    const key = JSON.stringify([rules, config.search]);
    const cached = this.cache.get(key);
    if (cached) { this.cacheHits++; return cached; }
    const result = solveRules(rules, config.search);
    this.searches++;
    this.states += result.states;
    if (this.cache.size >= 128) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }
  pool(config: Config, effects: Effect[], phase: Phase): Pool {
    const variants = bossRuleVariants(buildRules(config, effects, phase), phase);
    const refusals: string[] = [];
    for (const variant of variants) {
      const pool = this.poolForRules(config, phase, variant.rules);
      if (pool.candidates.length >= config.minimumTargets) return { ...pool, variant: variant.name,
        diagnostics: [...refusals, ...pool.diagnostics] };
      refusals.push(`variant-rejected:${variant.name}`, ...pool.diagnostics);
    }
    return { candidates: [], rules: buildRules(config, effects, phase), diagnostics: [...refusals, 'no-admissible-variant'], states: 0 };
  }
  private poolForRules(config: Config, phase: Phase, rules: Rules): Pool {
    const result = this.search(rules, config);
    if (!result.complete || result.errors.length) return { candidates: [], rules, diagnostics: result.errors, states: result.states };
    const diagnostics: string[] = [];
    const unrestricted = rules.maxMultiplications === null ? null : this.search({ ...rules, maxMultiplications: null }, config);
    if (unrestricted && (!unrestricted.complete || unrestricted.errors.length)) {
      return { candidates: [], rules, diagnostics: ['unrestricted-comparison-incomplete'], states: result.states };
    }
    let insignificant = 0;
    let inflated = 0;
    const candidates = [...result.solutions].filter(([target, solution]) => {
      if (solution.operands < Math.min(phase.difficulty + 1, config.search.maxOperands)) return false;
      if (unrestricted) {
        const baseline = unrestricted.solutions.get(target);
        if (!baseline || solution.operands - baseline.operands > config.maxLengthInflation) { inflated++; return false; }
        if ((unrestricted.optimalMaximumMultiplications.get(target) ?? 0) <= rules.maxMultiplications!) { insignificant++; return false; }
      }
      return true;
    }).map(([target, solution]) => ({ target, solution })).sort((a, b) => a.target - b.target);
    if (inflated) diagnostics.push(`length-inflation-rejected:${inflated}`);
    if (insignificant) diagnostics.push(`insignificant-budget-rejected:${insignificant}`);
    if (candidates.length < config.minimumTargets) diagnostics.push(`insufficient-targets:${candidates.length}/${config.minimumTargets}`);
    return { candidates, rules, diagnostics, states: result.states };
  }
  generate(config: Config, effects: Effect[], phase: Phase, randomValue: number, carry: number, previous: number | null): { puzzle: Puzzle | null; diagnostics: string[] } {
    const pool = this.pool(config, effects, phase);
    if (pool.candidates.length < config.minimumTargets) return { puzzle: null, diagnostics: pool.diagnostics };
    const choices = pool.candidates.filter(candidate => candidate.target !== previous);
    if (!choices.length) return { puzzle: null, diagnostics: [...pool.diagnostics, 'no-new-target'] };
    const selected = choices[Math.min(choices.length - 1, Math.floor(randomValue * choices.length))];
    const seconds = puzzleSeconds(config, effects, phase, carry);
    const obligations = Object.values(pool.rules.minimumOccurrences).reduce((sum, n) => sum + n, 0)
      + Number(pool.rules.requireSubtraction) + Number(pool.rules.maxMultiplications !== null);
    const estimatedCost = selected.solution.operands * 5 + obligations * 4;
    return { puzzle: {
      ...selected.solution, target: selected.target, rules: pool.rules, difficulty: phase.difficulty,
      seconds, minimumStars: phase.boss && phase.act === 3 && phase.index >= 1 ? 2 : 1,
      variant: pool.variant ?? 'ordinary', estimatedCost, warnings: estimatedCost > seconds ? ['heuristic-cost-exceeds-time'] : [], candidateCount: pool.candidates.length,
    }, diagnostics: pool.diagnostics };
  }
}
