import { CARDS, MAJOR_UPGRADES } from '../cards';
import type { CardId, Effect, Puzzle, Run } from '../model';
import { phaseAt } from '../model';
import type { PlaytestSession } from './session';

const BOSSES = ['Gardien du rythme', 'Maître des opérations', 'Architecte des nombres'];
const FAILURE_LABELS: Record<string, string> = {
  timeout: 'temps écoulé',
  'active-rules-violated': 'chiffres, opérations, obligations ou bornes non respectés',
  'wrong-target': 'la valeur calculée ne correspond pas à la cible',
  'insufficient-stars': 'réponse correcte mais trop longue pour la précision exigée par le boss',
};
function benefit(id: CardId, level: number): { advantage: string; drawback: string } {
  return level > 1 && id in MAJOR_UPGRADES ? MAJOR_UPGRADES[id as keyof typeof MAJOR_UPGRADES] : CARDS[id];
}
export function renderEffects(effects: Effect[]): string {
  if (!effects.length) return 'Effets actifs : aucun.';
  return 'Effets actifs :\n' + effects.map(effect => {
    const definition = CARDS[effect.id];
    const terms = benefit(effect.id, effect.level);
    const duration = effect.remaining === null ? 'jusqu’à la fin de run'
      : `${effect.remaining} ${definition.expiresOn === 'success' ? 'réussite(s)' : 'tentative(s)'}`;
    return `  ${effect.id} ${definition.name} niv.${effect.level} — ${duration}${effect.shieldUsed ? ', protection consommée' : ''}\n    ${terms.advantage} / ${terms.drawback}`;
  }).join('\n');
}
export function renderRules(puzzle: Puzzle): string {
  const rules = puzzle.rules;
  const obligations = Object.entries(rules.minimumOccurrences).map(([digit, count]) => `au moins ${count} occurrence(s) du ${digit}`);
  if (rules.requireSubtraction) obligations.push('au moins une soustraction');
  if (rules.maxMultiplications !== null) obligations.push(`maximum ${rules.maxMultiplications} multiplication(s)`);
  return `Cible : ${puzzle.target}\nChiffres : ${rules.numbers.join(', ')} (répétition autorisée). Opérations : ${rules.operations.map(op => op === '*' ? '×' : op === '-' ? '−' : op).join(', ')}.\n` +
    `Sans parenthèses ; priorité à la multiplication.\nContraintes : ${obligations.join(' ; ') || 'aucune obligation supplémentaire'}.\n` +
    `Précision exigée : ${puzzle.minimumStars} étoile(s) minimum. Temps alloué : ${puzzle.seconds.toFixed(2)} s.\n` +
    `Bornes de validation : totaux de termes et termes multiplicatifs ≤ 500 en valeur absolue.\n` +
    (puzzle.warnings.length ? 'Observation : coût heuristique supérieur au temps ; ce n’est pas une mesure humaine validée.\n' : '');
}
function phaseLabel(run: Run): string {
  const phase = phaseAt(run.stage, run.config);
  if (phase.survival) return `Survie — épreuve ${phase.survival} ; victoire officielle conservée.`;
  if (phase.boss) return `Acte ${phase.act} — Boss ${phase.act} : ${BOSSES[phase.act - 1]}, phase ${phase.index + 1}/${run.config.bossPhases[phase.act - 1]}`;
  return `Acte ${phase.act} — ordinaire ${phase.index + 1}/${run.config.ordinaryPerAct} ; ${run.config.ordinaryPerAct - phase.index} réussite(s) avant le boss.`;
}
function bossIntroduction(run: Run): string {
  const phase = phaseAt(run.stage, run.config);
  if (!phase.boss) return '';
  const introductions = [
    'Rythme : une solution optimale en phase 1 donne +8 s à la prochaine tentative de phase 2.',
    'Opérations : chaque phase ajoute une obligation mathématique compatible avec le build.',
    'Architecte : build actuel, puis au moins 2 étoiles, puis obligation supplémentaire et pression temporelle.',
  ];
  return `${introductions[phase.act - 1]}\nVariante actuelle : ${run.current?.variant}.\n`;
}
function renderOffers(run: Run): string {
  const reward = [...run.events].reverse().find(event => event.type === 'reward');
  const major = reward && (reward.detail as { major: boolean }).major;
  const offers = run.offers.map((offer, index) => {
    const active = run.effects.find(effect => effect.id === offer.card);
    const terms = benefit(offer.card, offer.kind === 'upgrade' ? (active?.level ?? 1) + 1 : 1);
    const definition = CARDS[offer.card];
    const duration = definition.duration === null ? 'fin de run' : `${definition.duration} ${definition.expiresOn === 'success' ? 'réussites' : 'tentatives'}`;
    const operation = offer.kind === 'upgrade' ? 'améliore' : offer.kind === 'replace' ? `remplace précisément ${offer.replaces} (${CARDS[offer.replaces!].name}) par` : 'ajoute';
    return `${index + 1}. ${operation} ${offer.card} — ${definition.name}\n   Avantage : ${terms.advantage}\n   Coût/contrepartie : ${terms.drawback}\n   Durée : ${duration}`;
  });
  return `Récompense ${major ? 'MAJEURE' : 'TACTIQUE'}\n${offers.join('\n') || 'Aucune offre admissible.'}\nchoisir 1..3, ou choisir 0 pour refuser.`;
}
export function renderSession(session: PlaytestSession): string {
  const run = session.run;
  const header = `\nMathPrime Rogue V1 — ${session.format === 'short' ? 'TEST COURT EXPÉRIMENTAL' : 'RUN COMPLÈTE'} — graine ${session.seed}\n` +
    `Vies ${run.lives}/${run.config.lives} | Indices ${run.hints}/${run.config.hints} | Score ${run.score}\n`;
  let content = '';
  if (session.screen === 'preparation' || session.screen === 'playing') {
    content = `${phaseLabel(run)}\n${bossIntroduction(run)}${renderRules(run.current!)}`;
    content += session.screen === 'preparation' ? 'PRÉPARATION : le temps ne passe pas. Tapez demarrer quand vous êtes prêt.'
      : `EN JEU — ${session.remainingSeconds().toFixed(1)} s restantes. Réponse définitive : soumettre EXPR.`;
  } else if (session.screen === 'result') {
    const attempt = session.attempts[session.attempts.length - 1];
    const expired = attempt.effectsBefore.filter(effect => !attempt.effectsAfter.some(active => active.id === effect.id));
    content = `${attempt.outcome === 'success' ? 'RÉUSSITE' : 'ÉCHEC'}${attempt.cause ? ` — ${FAILURE_LABELS[attempt.cause] ?? 'réponse ou contraintes incorrectes'}` : ''}\n` +
      `Réponse : ${attempt.expression ?? '(aucune)'}${attempt.value !== null ? ` = ${attempt.value}` : ''}\n` +
      `Étoiles : ${attempt.stars}/3 ; minimum connu dans les bornes : ${attempt.puzzle.operands} opérandes.\n` +
      `Témoin valide : ${attempt.puzzle.expression}\nTemps consacré : ${attempt.elapsedSeconds.toFixed(2)} s ; indices utilisés : ${attempt.hints.length}.\n` +
      `Points gagnés : ${attempt.points} (bonus de boss inclus, si gagné). Vies perdues : ${attempt.livesLost}.\n` +
      `Effets expirés : ${expired.map(effect => effect.id).join(', ') || 'aucun'}. Bonus/malus différé : ${run.nextSeconds > 0 ? '+' : ''}${run.nextSeconds} s.\n`;
    const bossWon = run.events.find(event => event.type === 'boss-defeated' && event.stage === run.stage && attempt.outcome === 'success');
    if (bossWon) content += `Boss vaincu : récompense de ${(bossWon.detail as { points: number }).points} points.\n`;
    content += 'Chronomètre arrêté. Tapez suivant.';
  } else if (session.screen === 'reward') content = renderOffers(run);
  else if (session.screen === 'victory') content = 'VICTOIRE OFFICIELLE ! terminer pour finir, ou survie pour continuer. Le temps ne passe pas.';
  else content = `SESSION TERMINÉE — ${run.endCause}\nVictoire officielle : ${run.officialVictory ? 'oui, conservée' : 'non'} ; boss vaincus : ${run.defeatedBosses.join(', ') || 'aucun'}.`;
  return header + content + '\n' + renderEffects(run.effects) + (session.message ? '\n' + session.message : '') + '\n';
}
