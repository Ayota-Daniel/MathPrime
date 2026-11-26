import { clamp } from './model';
import type { CardId, Config, Difficulty, Effect, Phase, Resources, Rules } from './model';

export interface Card {
  id: CardId;
  name: string;
  description: string;
  advantage: string;
  drawback: string;
  duration: number | null;
  expiresOn: 'attempt' | 'success' | 'run';
  appearance: 'tactical' | 'major' | 'both';
  maxStacks: number;
  maxLevel: number;
  compatibility: string;
  score: number;
  seconds: number;
  timeFactor: number;
}
const card = (definition: Omit<Card, 'description' | 'maxStacks' | 'maxLevel' | 'compatibility' | 'score' | 'seconds' | 'timeFactor'> & Partial<Card>): Card => ({
  description: `${definition.advantage} / ${definition.drawback}`,
  maxStacks: 1, maxLevel: definition.id.startsWith('D') ? 2 : 1,
  compatibility: 'Coûts payables, aucune instance identique, règles solvables et réserve active ≤ 6.',
  score: 0, seconds: 0, timeFactor: 1, ...definition,
});
export const CARDS: Record<CardId, Card> = {
  D1: card({ id: 'D1', name: 'Serment du 7', advantage: '+20 % score', drawback: 'Au moins un 7', duration: null, expiresOn: 'run', appearance: 'major', score: 0.20 }),
  D2: card({ id: 'D2', name: 'Budget de multiplications', advantage: '+25 % score', drawback: 'Budget × adaptatif, inflation ≤ 2 opérandes et au moins une solution optimale exclue', duration: null, expiresOn: 'run', appearance: 'major', score: 0.25 }),
  D3: card({ id: 'D3', name: 'Perfectionniste', advantage: '+35 % si optimal', drawback: '−20 % sinon', duration: null, expiresOn: 'run', appearance: 'major' }),
  D4: card({ id: 'D4', name: 'Équilibre fragile', advantage: '+8 s au suivant si optimal', drawback: '−8 s au suivant sinon', duration: null, expiresOn: 'run', appearance: 'major' }),
  T1: card({ id: 'T1', name: 'Précipitation', advantage: '+30 % score', drawback: '−15 % temps', duration: 3, expiresOn: 'attempt', appearance: 'both', score: 0.30, timeFactor: 0.85 }),
  T2: card({ id: 'T2', name: 'Temps emprunté', advantage: '+15 s', drawback: '−25 % score', duration: 2, expiresOn: 'attempt', appearance: 'both', score: -0.25, seconds: 15 }),
  T3: card({ id: 'T3', name: 'Serment de soustraction', advantage: '+25 % score', drawback: 'Soustraction obligatoire', duration: 3, expiresOn: 'attempt', appearance: 'both', score: 0.25 }),
  T4: card({ id: 'T4', name: 'Assurance à crédit', advantage: 'Protège une perte de vie', drawback: '−15 % score pendant 3 tentatives, même après utilisation', duration: 3, expiresOn: 'attempt', appearance: 'both', score: -0.15 }),
  T5: card({ id: 'T5', name: 'Lucidité coûteuse', advantage: '+1 indice immédiat', drawback: '−10 s sur 2 tentatives', duration: 2, expiresOn: 'attempt', appearance: 'both', seconds: -10 }),
  E1: card({ id: 'E1', name: 'Pacte de sang', advantage: '+40 % sur 3 réussites', drawback: '−1 vie immédiate, sans assurance', duration: 3, expiresOn: 'success', appearance: 'both', score: 0.40 }),
  E2: card({ id: 'E2', name: 'Soin amer', advantage: '+1 vie immédiate', drawback: '−20 % score sur 3 tentatives', duration: 3, expiresOn: 'attempt', appearance: 'both', score: -0.20 }),
  E3: card({ id: 'E3', name: "Échange d'urgence", advantage: '+12 s sur 3 tentatives', drawback: '−1 indice immédiat', duration: 3, expiresOn: 'attempt', appearance: 'both', seconds: 12 }),
};
export const MAJOR_UPGRADES = {
  D1: { advantage: '+30 % score', drawback: 'Au moins deux occurrences de 7' },
  D2: { advantage: '+35 % score', drawback: 'Budget réduit de 1, mêmes filtres de longueur et de pertinence' },
  D3: { advantage: '+45 % si optimal', drawback: '−30 % sinon' },
  D4: { advantage: '+12 s au suivant si optimal', drawback: '−12 s au suivant sinon' },
};
export const BALANCE = {
  maximumEffects: 6, maximumPurchases: 3,
  perfectionOptimal: 0.35, perfectionOther: -0.20, perfectionUpgrade: 0.10,
  fragileSeconds: 8, fragileUpgrade: 4, durableUpgradeScore: 0.10,
  rhythmSeconds: 8, architectTimeFactor: 0.85,
  survivalSecondsPerEncounter: 2, maximumSurvivalTimePenalty: 40,
};
export function multiplicationBudget(difficulty: Difficulty): number {
  return difficulty <= 2 ? 1 : difficulty <= 4 ? 2 : 3;
}
export function eligibility(id: CardId, resources: Resources, config: Config): string[] {
  const errors: string[] = [];
  if (resources.effects.some(e => e.id === id)) errors.push('already-active');
  if (resources.effects.length >= BALANCE.maximumEffects) errors.push('active-effect-limit');
  if (id === 'D1' && (config.rules.minimumOccurrences[7] ?? 0) >= 1) errors.push('requirement-already-active');
  if (id === 'D2' && config.rules.maxMultiplications !== null) errors.push('budget-already-active');
  if (id === 'T3' && config.rules.requireSubtraction) errors.push('subtraction-already-active');
  if (id === 'T5' && resources.hints >= config.hints) errors.push('hints-full');
  if (id === 'E1' && resources.lives <= 1) errors.push('unpayable-life');
  if (id === 'E2' && resources.lives >= config.lives) errors.push('lives-full');
  if (id === 'E3' && resources.hints <= 0) errors.push('unpayable-hint');
  return errors;
}
export function acquire(id: CardId, resources: Resources, config: Config): Resources {
  const errors = eligibility(id, resources, config);
  if (errors.length) throw new Error(errors.join(','));
  return {
    lives: resources.lives + Number(id === 'E2') - Number(id === 'E1'),
    hints: resources.hints + Number(id === 'T5') - Number(id === 'E3'),
    effects: [...resources.effects, { id, remaining: CARDS[id].duration, level: 1, shieldUsed: false }],
  };
}
export function expire(effects: Effect[], success: boolean): Effect[] {
  return effects.map(effect => {
    const decrement = effect.remaining !== null && (CARDS[effect.id].expiresOn === 'attempt' || success);
    return { ...effect, remaining: decrement ? effect.remaining! - 1 : effect.remaining };
  }).filter(effect => effect.remaining === null || effect.remaining > 0);
}
export function buildRules(config: Config, effects: Effect[], phase: Phase): Rules {
  const rules: Rules = { ...config.rules, numbers: [...config.rules.numbers], operations: [...config.rules.operations], minimumOccurrences: { ...config.rules.minimumOccurrences } };
  for (const effect of effects) {
    if (effect.id === 'D1') rules.minimumOccurrences[7] = Math.max(rules.minimumOccurrences[7] ?? 0, effect.level);
    if (effect.id === 'T3') rules.requireSubtraction = true;
    if (effect.id === 'D2') rules.maxMultiplications = Math.min(rules.maxMultiplications ?? Infinity, Math.max(0, multiplicationBudget(phase.difficulty) - effect.level + 1));
  }
  return rules;
}
/** Adaptive variants add a new obligation instead of repeating an existing one. */
export function additionalRule(rules: Rules, difficulty: Difficulty): Rules {
  const next = { ...rules, minimumOccurrences: { ...rules.minimumOccurrences } };
  if (!rules.requireSubtraction && rules.operations.includes('-')) next.requireSubtraction = true;
  else if (rules.operations.includes('*') && rules.maxMultiplications === null) next.maxMultiplications = multiplicationBudget(difficulty);
  else {
    const digit = [...rules.numbers].sort((a, b) => a - b)[0];
    if (digit !== undefined) next.minimumOccurrences[digit] = (next.minimumOccurrences[digit] ?? 0) + 1;
  }
  return next;
}
export interface RuleVariant { name: string; rules: Rules; }
export function bossRuleVariants(rules: Rules, phase: Phase): RuleVariant[] {
  if (!phase.boss) return [{ name: phase.survival > 3 ? 'survival-obligation' : 'ordinary',
    rules: phase.survival > 3 ? additionalRule(rules, phase.difficulty) : rules }];
  if (phase.act === 3 && phase.index < 2) return [{ name: phase.index === 0 ? 'build' : 'precision', rules }];
  const variants: RuleVariant[] = [];
  if (phase.act !== 1 && !rules.requireSubtraction && rules.operations.includes('-')) {
    variants.push({ name: 'subtraction', rules: { ...rules, requireSubtraction: true } });
  }
  if (phase.act !== 1 && rules.operations.includes('*') && rules.maxMultiplications === null) {
    variants.push({ name: 'multiplication-budget', rules: { ...rules, maxMultiplications: multiplicationBudget(phase.difficulty) } });
  }
  const digits = [...new Set(rules.numbers)].sort((a, b) => a - b);
  for (const digit of digits) variants.push({ name: `occurrence-${digit}`, rules: {
    ...rules, minimumOccurrences: { ...rules.minimumOccurrences, [digit]: (rules.minimumOccurrences[digit] ?? 0) + 1 },
  } });
  if (variants.length) {
    const shift = phase.index % variants.length;
    return [...variants.slice(shift), ...variants.slice(0, shift)];
  }
  return [];
}
export function bossRules(rules: Rules, phase: Phase): Rules {
  return bossRuleVariants(rules, phase)[0]?.rules ?? additionalRule(rules, phase.difficulty);
}
export function puzzleSeconds(
  config: Config,
  effects: Effect[],
  phase: Phase,
  carry: number,
): number {
  const seconds = effects.reduce((sum, e) => sum + CARDS[e.id].seconds, carry);
  const factor = effects.reduce(
    (product, e) => product * CARDS[e.id].timeFactor,
    1,
  );
  const bossFactor =
    phase.boss && phase.act === 3 && phase.index >= 2
      ? BALANCE.architectTimeFactor
      : 1;
  const survivalPenalty = Math.min(
    BALANCE.maximumSurvivalTimePenalty,
    Math.max(0, phase.survival - 1) * BALANCE.survivalSecondsPerEncounter,
  );
  return clamp(
    (config.seconds[phase.difficulty - 1] + seconds - survivalPenalty) *
      factor *
      bossFactor,
    config.minimumSeconds,
    config.maximumSeconds,
  );
}
export function scoreCoefficient(effects: Effect[], optimal: boolean, config: Config): number {
  // Integer percentage points keep score rounding independent of effect iteration order.
  const percentage = effects.reduce((sum, effect) => {
    if (effect.id === 'D3') return sum + Math.round(100 * (
      (optimal ? BALANCE.perfectionOptimal : BALANCE.perfectionOther)
      + (effect.level - 1) * BALANCE.perfectionUpgrade * (optimal ? 1 : -1)));
    const upgrade = ['D1', 'D2'].includes(effect.id) ? (effect.level - 1) * BALANCE.durableUpgradeScore : 0;
    return sum + Math.round(100 * (CARDS[effect.id].score + upgrade));
  }, 0);
  return clamp(1 + percentage / 100, ...config.scoreBounds);
}
export function starsFor(operands: number, optimal: number): number {
  return operands <= optimal ? 3 : operands === optimal + 1 ? 2 : 1;
}
export function puzzleScore(config: Config, effects: Effect[], stars: number, hints: number, difficulty: Difficulty): number {
  const quality = [0, 0.40, 0.67, 1][stars] ?? 0;
  return Math.round(config.scoreBase * difficulty * quality * scoreCoefficient(effects, stars === 3, config)
    * Math.max(0, 1 - hints * config.hintPenalty));
}
