import { Generator } from '../generator';
import { expressionValue, inspectExpression } from '../math';
import { starsFor } from '../cards';
import { DEFAULT_CONFIG, phaseAt } from '../model';
import type { Effect, Puzzle, Run } from '../model';
import { newRun, transition } from '../run';

export interface Clock {
  now(): number;
  schedule(callback: () => void, milliseconds: number): unknown;
  cancel(handle: unknown): void;
}
export type SessionFormat = 'short' | 'full';
export type Screen = 'preparation' | 'playing' | 'result' | 'reward' | 'victory' | 'ended';
export interface Attempt {
  stage: number;
  puzzle: Puzzle;
  effectsBefore: Effect[];
  effectsAfter: Effect[];
  elapsedSeconds: number;
  expression: string | null;
  value: number | null;
  hints: string[];
  stars: number;
  points: number;
  livesLost: number;
  cause: string | null;
  outcome: 'prepared' | 'playing' | 'success' | 'failure' | 'abandoned';
}
export const SESSION_VERSION = 'rogue-v1-r2.1';

/** Terminal-independent controller. All elapsed time and deadline callbacks use the injected clock. */
export class PlaytestSession {
  run: Run;
  screen: Screen = 'preparation';
  message = '';
  readonly attempts: Attempt[] = [];
  readonly seed: number;
  private readonly generator = new Generator();
  private readonly beganAt: number;
  private endedAt: number | null = null;
  private syncedAt = 0;
  private deadline: unknown;
  private timerGeneration = 0;
  private pendingAttempt: Attempt | null = null;
  private readonly initialConfig;

  constructor(readonly format: SessionFormat, seed: number, private readonly clock: Clock, private readonly changed: () => void = () => {}) {
    this.seed = seed >>> 0;
    this.run = newRun(seed, DEFAULT_CONFIG);
    this.initialConfig = this.run.config;
    this.beganAt = clock.now();
    this.prepare();
  }
  private prepare(): void {
    this.run = transition(this.run, { type: 'start' }, this.generator);
    if (this.run.status === 'blocked') {
      this.end('generation-unavailable');
      return;
    }
    this.screen = 'preparation';
    this.pendingAttempt = {
      stage: this.run.stage, puzzle: this.run.current!, effectsBefore: this.run.effects.map(effect => ({ ...effect })),
      effectsAfter: [], elapsedSeconds: 0, expression: null, value: null, hints: [], stars: 0,
      points: 0, livesLost: 0, cause: null, outcome: 'prepared',
    };
    this.attempts.push(this.pendingAttempt);
  }
  remainingSeconds(): number {
    if (!this.run.current) return 0;
    const pending = this.screen === 'playing' ? Math.max(0, this.clock.now() - this.syncedAt) / 1000 : 0;
    return Math.max(0, this.run.current.seconds - this.run.elapsed - pending);
  }
  pauseTimer(): void { this.cancelDeadline(); }
  resumeTimer(): void {
    this.cancelDeadline();
    if (this.screen === 'playing') this.armDeadline();
  }
  private cancelDeadline(): void {
    this.timerGeneration++;
    if (this.deadline !== undefined) this.clock.cancel(this.deadline);
    this.deadline = undefined;
  }
  private armDeadline(): void {
    const generation = this.timerGeneration;
    this.deadline = this.clock.schedule(() => {
      if (generation !== this.timerGeneration || this.screen !== 'playing') return;
      this.synchronize();
      if (this.screen === 'playing') this.armDeadline();
      else this.changed();
    }, this.remainingSeconds() * 1000);
  }
  private synchronize(): void {
    if (this.screen !== 'playing') return;
    const now = this.clock.now();
    const seconds = Math.max(0, now - this.syncedAt) / 1000;
    this.syncedAt = now;
    const previous = this.run;
    this.run = transition(this.run, { type: 'advance', seconds }, this.generator);
    this.pendingAttempt!.elapsedSeconds = this.run.elapsed;
    if (this.run.status !== 'playing') this.recordResult(previous);
  }
  private recordResult(previous: Run): void {
    this.cancelDeadline();
    const attempt = this.pendingAttempt!;
    const events = this.run.events.slice(previous.events.length);
    const success = events.find(event => event.type === 'success');
    const failure = events.find(event => event.type === 'failure');
    attempt.outcome = success ? 'success' : 'failure';
    attempt.cause = failure ? (failure.detail as { cause: string }).cause : null;
    attempt.stars = success ? (success.detail as { stars: number }).stars : 0;
    attempt.points = this.run.score - previous.score;
    attempt.livesLost = previous.lives - this.run.lives;
    attempt.effectsAfter = this.run.effects.map(effect => ({ ...effect }));
    this.screen = 'result';
    this.message = '';
  }
  private end(cause: string): void {
    if (this.run.status === 'ended' && this.run.endCause) cause = this.run.endCause;
    this.cancelDeadline();
    this.message = '';
    if (this.pendingAttempt && ['prepared', 'playing'].includes(this.pendingAttempt.outcome)) {
      this.pendingAttempt.outcome = 'abandoned';
      this.pendingAttempt.effectsAfter = this.run.effects.map(effect => ({ ...effect }));
    }
    this.run = { ...this.run, status: 'ended', endCause: cause };
    this.screen = 'ended';
    this.endedAt = this.clock.now();
  }
  private afterResult(): void {
    if (this.run.status === 'ended' || this.run.status === 'blocked') { this.end(this.run.endCause!); return; }
    if (this.format === 'short' && this.run.defeatedBosses.includes(1)) { this.end('short-completed'); return; }
    if (this.run.status === 'reward') this.screen = 'reward';
    else if (this.run.status === 'victory') this.screen = 'victory';
    else this.prepare();
  }
  command(input: string): void {
    const wasPlaying = this.screen === 'playing';
    this.synchronize();
    if (input.trim() === 'quitter' && this.screen !== 'ended') { this.end('abandoned'); return; }
    if (wasPlaying && this.screen !== 'playing') return;
    if (this.screen === 'ended') return;
    this.message = '';
    const [command = '', ...words] = input.trim().split(/\s+/);
    const argument = words.join(' ');

    if (command === 'aide' && !argument) { this.message = HELP; return; }
    if (command === 'effets' && !argument) { this.message = 'Les effets actifs sont affichés ci-dessous.'; return; }
    if (command === 'temps' && !argument) { this.message = `Temps restant : ${this.remainingSeconds().toFixed(1)} s.`; return; }
    if (this.screen === 'preparation' && command === 'demarrer' && !argument) {
      this.screen = 'playing';
      this.pendingAttempt!.outcome = 'playing';
      this.syncedAt = this.clock.now();
      this.armDeadline();
      return;
    }
    if (this.screen === 'playing' && command === 'soumettre') { this.submit(argument); return; }
    if (this.screen === 'playing' && command === 'indice' && !argument) {
      if (this.run.hints === 0) { this.message = 'Aucun indice disponible.'; return; }
      this.run = transition(this.run, { type: 'hint' }, this.generator);
      this.message = (this.run.events[this.run.events.length - 1].detail as { information: string }).information;
      this.pendingAttempt!.hints.push(this.message);
      return;
    }
    if (this.screen === 'result' && command === 'suivant' && !argument) { this.afterResult(); return; }
    if (this.screen === 'reward' && command === 'choisir') { this.choose(argument); return; }
    if (this.screen === 'victory' && ['terminer', 'survie'].includes(command) && !argument) {
      this.run = transition(this.run, { type: command === 'terminer' ? 'finish' : 'continue' }, this.generator);
      if (command === 'terminer') this.end('victory-finished');
      else this.prepare();
      return;
    }
    this.message = 'Commande invalide pour cet écran. Tapez aide. Aucune réponse soumise.';
  }
  private submit(argument: string): void {
    const expression = argument.replace(/\s/g, '').replace(/×/g, '*').replace(/−/g, '-');
    if (!/^[1-9](?:[+*\-][1-9])*$/.test(expression)) {
      this.message = 'Syntaxe invalide : soumettre 3+5*7 (chiffres isolés, sans parenthèses). Aucune réponse soumise.';
      return;
    }
    this.pendingAttempt!.expression = expression;
    this.pendingAttempt!.value = expressionValue(expression);
    const previous = this.run;
    const puzzle = previous.current!;
    const inspected = inspectExpression(expression, puzzle.rules, previous.config.search.magnitude);
    this.run = transition(this.run, { type: 'submit', expression }, this.generator);
    this.recordResult(previous);
    if (this.pendingAttempt!.outcome === 'failure') {
      this.pendingAttempt!.cause = !inspected ? 'active-rules-violated'
        : this.pendingAttempt!.value !== puzzle.target ? 'wrong-target'
        : starsFor(inspected.operands, puzzle.operands) < puzzle.minimumStars ? 'insufficient-stars'
        : 'incorrect-terminal-answer';
    }
  }
  private choose(argument: string): void {
    const index = Number(argument);
    if (!/^[0-3]$/.test(argument) || (index !== 0 && !this.run.offers[index - 1])) {
      this.message = 'Choix invalide : choisir 0 pour refuser, ou le numéro d’une offre.';
      return;
    }
    this.run = transition(this.run, { type: 'choose', offer: index === 0 ? null : this.run.offers[index - 1].id }, this.generator);
    this.prepare();
    this.message = index === 0 ? 'Récompenses refusées.' : 'Choix appliqué ; ressources et effets actualisés.';
  }
  report() {
    const concealWitness = this.pendingAttempt && ['prepared', 'playing'].includes(this.pendingAttempt.outcome);
    const lastPuzzleEvent = this.run.events.map(event => event.type).lastIndexOf('puzzle');
    function withoutWitness(puzzle: Puzzle) {
      const { expression, ...visible } = puzzle;
      return { ...visible, witnessWithheld: true };
    }
    return {
      schemaVersion: 1, engineVersion: SESSION_VERSION, seed: this.seed, format: this.format, config: this.initialConfig,
      durationSeconds: ((this.endedAt ?? this.clock.now()) - this.beganAt) / 1000,
      outcome: this.screen !== 'ended' ? 'in-progress' : this.run.endCause,
      officialVictory: this.run.officialVictory, score: this.run.score, lives: this.run.lives, hints: this.run.hints,
      bossReached: [...new Set(this.attempts.map(attempt => phaseAt(attempt.stage, this.run.config)).filter(phase => phase.boss).map(phase => phase.act))],
      defeatedBosses: this.run.defeatedBosses,
      attempts: this.attempts.map(attempt => concealWitness && attempt === this.pendingAttempt
        ? { ...attempt, puzzle: withoutWitness(attempt.puzzle) } : attempt),
      events: this.run.events.map((event, index) => concealWitness && index === lastPuzzleEvent
        ? { ...event, detail: withoutWitness(event.detail as Puzzle) } : event),
    };
  }
}
export const HELP = `Commandes :
  demarrer       Commencer l’épreuve préparée et son chronomètre.
  soumettre EXPR Réponse DÉFINITIVE : une erreur peut coûter une vie.
  indice         Aide partielle, consomme 1 indice et −15 % au score du puzzle.
  effets / temps Consulter les effets ou le temps (le chronomètre continue).
  suivant        Quitter le résultat et préparer la suite.
  choisir 1..3   Prendre une offre ; choisir 0 pour les refuser.
  terminer       Garder la victoire finale et terminer.
  survie         Continuer après la victoire officielle.
  aide / quitter Aide ou abandon propre avec rapport local.
Règles : 3, 5, 7 répétés ; +, -, * (ou −, ×), sans parenthèses, multiplication prioritaire.
Une expression seule n’est pas soumise ; utilisez soumettre. Les erreurs de syntaxe ne coûtent pas de vie, mais le temps continue.`;
