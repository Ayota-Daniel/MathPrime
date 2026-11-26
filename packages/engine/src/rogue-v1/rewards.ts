import { acquire, BALANCE, CARDS, eligibility } from './cards';
import { phaseAt, random, totalStages } from './model';
import type { CardId, Effect, Offer, Resources, Run } from './model';
import type { Generator } from './generator';

export function applyOffer(run: Run, offer: Offer): Resources {
  let resources: Resources = { lives: run.lives, hints: run.hints, effects: run.effects.map(effect => ({ ...effect })) };
  if (offer.kind === 'upgrade') {
    const effect = resources.effects.find(effect => effect.id === offer.card);
    if (!effect || effect.level >= CARDS[offer.card].maxLevel) throw new Error('invalid-upgrade');
    effect.level++;
    return resources;
  }
  if (offer.kind === 'replace') resources.effects = resources.effects.filter(effect => effect.id !== offer.replaces);
  resources = acquire(offer.card, resources, run.config);
  return resources;
}
/** Check every remaining phase, including temporary expirations due to retries.
 * Each assumed successful phase advances success-duration effects; failures only advance attempt effects.
 * This is a preflight for the current build, never a promise about future unchosen cards.
 */
export function futureErrors(run: Run, effects: Effect[], generator: Generator): string[] {
  const end = Math.max(totalStages(run.config) + 4, run.stage + 4);
  for (let stage = run.stage; stage < end; stage++) {
    const successes = stage - run.stage;
    for (let failures = 0; failures <= 3; failures++) {
      const future = effects.map(effect => {
        const elapsed = CARDS[effect.id].expiresOn === 'success' ? successes : successes + failures;
        return { ...effect, remaining: effect.remaining === null ? null : effect.remaining - elapsed };
      }).filter(effect => effect.remaining === null || effect.remaining > 0);
      const pool = generator.pool(run.config, future, phaseAt(stage, run.config));
      if (pool.candidates.length < run.config.minimumTargets || pool.diagnostics.some(error => error.includes('incomplete') || error.includes('exhausted'))) {
        return [`future-stage:${stage}`, ...pool.diagnostics];
      }
    }
  }
  return [];
}
export function draft(run: Run, major: boolean, generator: Generator): { offers: Offer[]; seed: number; rejected: { id: string; reasons: string[] }[] } {
  const candidates: Offer[] = [];
  const rejected: { id: string; reasons: string[] }[] = [];
  for (const definition of Object.values(CARDS)) {
    const id = definition.id;
    if (!major && definition.appearance === 'major') continue;
    const active = run.effects.find(effect => effect.id === id);
    const offer: Offer = { id, card: id, kind: 'add' };
    let errors: string[] = [];
    if (major && active && active.level < definition.maxLevel) {
      offer.id = `${id}:upgrade`;
      offer.kind = 'upgrade';
    } else {
      errors = eligibility(id, run, run.config);
      if (major && !active && errors.length === 1 && errors[0] === 'active-effect-limit') {
        const replace = run.effects.find(effect => effect.remaining === null);
        if (replace) {
          offer.id = `${id}:replace:${replace.id}`;
          offer.kind = 'replace';
          offer.replaces = replace.id;
          errors = eligibility(id, { ...run, effects: run.effects.filter(effect => effect.id !== replace.id) }, run.config);
        }
      }
    }
    if ((run.purchases[id] ?? 0) >= BALANCE.maximumPurchases) errors.push('purchase-limit');
    if (!errors.length) errors = futureErrors(run, applyOffer(run, offer).effects, generator);
    if (errors.length) rejected.push({ id: offer.id, reasons: errors });
    else candidates.push(offer);
  }
  let seed = run.seed;
  for (let i = candidates.length - 1; i > 0; i--) {
    const [value, next] = random(seed);
    seed = next;
    const j = Math.floor(value * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return { offers: candidates.slice(0, 3), seed, rejected };
}
