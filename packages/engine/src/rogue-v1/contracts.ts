import type { Config } from "./model";
import type { GenerationProfile } from "./difficulty";

export const LEGACY_ROGUE_RULESET = "rogue-v1-r3.2.2-1";
export const ROGUE_RULESET = "rogue-v1-r4.2-1";
// Both contracts retain these numerical rules. Only generation changes in R4.2.
// Future default changes must not rewrite either historical contract.
const CONTRACT_CONFIG: Config = {
  lives: 3,
  hints: 3,
  ordinaryPerAct: 3,
  bossPhases: [2, 2, 3],
  seconds: [95, 105, 115, 125, 135],
  minimumSeconds: 60,
  maximumSeconds: 180,
  maxLengthInflation: 2,
  minimumTargets: 2,
  scoreBase: 100,
  bossRewards: [150, 250, 500],
  hintPenalty: 0.15,
  scoreBounds: [0.5, 2.5],
  search: {
    maxOperands: 6,
    magnitude: 500,
    maxTarget: 150,
    maxStates: 350000,
  },
  rules: {
    numbers: [3, 5, 7],
    operations: ["+", "-", "*"],
    minimumOccurrences: {},
    requireSubtraction: false,
    maxMultiplications: null,
  },
};
export function supportedRuleset(value: unknown): value is string {
  return value === LEGACY_ROGUE_RULESET || value === ROGUE_RULESET;
}
export function rulesContract(ruleset: string): {
  generation: GenerationProfile;
  config: Config;
} {
  if (!supportedRuleset(ruleset)) throw new Error("unsupported-ruleset");
  return {
    generation: ruleset === LEGACY_ROGUE_RULESET ? "legacy" : "r4.2",
    config: JSON.parse(JSON.stringify(CONTRACT_CONFIG)) as Config,
  };
}
