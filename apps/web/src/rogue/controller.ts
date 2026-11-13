import { phaseAt, totalStages } from "@shortest/engine/rogue-v1";
import type {
  Effect,
  Offer,
  Phase,
  Rules,
  Run,
} from "@shortest/engine/rogue-v1";
import { PlaytestSession } from "@shortest/engine/rogue-v1/session";
import type { Clock, Screen } from "@shortest/engine/rogue-v1/session";

export type WebAction =
  | { type: "new"; seed: number }
  | {
      type:
        "start" | "next" | "hint" | "finish" | "survival" | "abandon" | "home";
    }
  | { type: "submit"; expression: string }
  | { type: "choose"; index: number };
export interface WebPuzzle {
  target: number;
  rules: Rules;
  seconds: number;
  minimumStars: number;
}
export interface WebResult {
  target: number;
  bossReward: number | null;
  expression: string | null;
  value: number | null;
  stars: number;
  minimumOperands: number;
  points: number;
  elapsed: number;
  cause: string | null;
  success: boolean;
  livesLost: number;
  expired: string[];
}
export interface RogueView {
  revision: number;
  screen: Screen | "home";
  seed: number;
  stage: number;
  total: number;
  phase: Phase;
  score: number;
  lives: number;
  hints: number;
  effects: Effect[];
  offers: Offer[];
  majorReward: boolean;
  remaining: number;
  puzzle: WebPuzzle | null;
  result: WebResult | null;
  afterResult: Run["status"] | null;
  hintMessages: string[];
  message: string;
  officialVictory: boolean;
  defeatedBosses: number[];
  successes: number;
  failures: number;
  endCause: string | null;
  nextSeconds: number;
}
const EMPTY_VIEW: RogueView = {
  revision: 0,
  screen: "home",
  seed: 42,
  stage: 0,
  total: 16,
  phase: { act: 1, boss: false, index: 0, difficulty: 1, survival: 0 },
  score: 0,
  lives: 3,
  hints: 3,
  effects: [],
  offers: [],
  majorReward: false,
  remaining: 0,
  puzzle: null,
  result: null,
  afterResult: null,
  hintMessages: [],
  message: "",
  officialVictory: false,
  defeatedBosses: [],
  successes: 0,
  failures: 0,
  endCause: null,
  nextSeconds: 0,
};

/** A projection of the existing session, never a second rules engine. Witnesses stay outside React. */
export class RogueWebController {
  private session: PlaytestSession | null = null;
  private listeners = new Set<() => void>();
  private view: RogueView = EMPTY_VIEW;
  private revision = 0;
  private message = "";

  constructor(private readonly clock: Clock) {}
  getSnapshot = (): RogueView => this.view;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  isActive = (): boolean =>
    Boolean(this.session && this.session.screen !== "ended");

  dispatch(action: WebAction, expectedRevision: number): void {
    if (expectedRevision !== this.revision) return;
    this.message = "";
    if (action.type === "new") {
      if (this.isActive()) return;
      if (
        !Number.isInteger(action.seed) ||
        action.seed < 0 ||
        action.seed > 0xffffffff
      ) {
        this.message =
          "Choisissez une graine entière entre 0 et 4 294 967 295.";
      } else {
        this.session = new PlaytestSession(
          "full",
          action.seed,
          this.clock,
          () => {
            this.message = "";
            this.publish(true);
          },
        );
      }
    } else if (action.type === "home") {
      if (this.isActive()) return;
      this.session = null;
    } else if (this.session) {
      this.apply(action);
    }
    this.publish(true);
  }
  private apply(action: WebAction): void {
    if (!this.session || action.type === "new" || action.type === "home")
      return;
    const commands = {
      start: "demarrer",
      next: "suivant",
      hint: "indice",
      finish: "terminer",
      survival: "survie",
      abandon: "quitter",
    };
    const command =
      action.type === "submit"
        ? `soumettre ${action.expression}`
        : action.type === "choose"
          ? `choisir ${action.index}`
          : commands[action.type];
    this.session.command(command);
    // Hint text has its own persistent list. Other messages describe invalid syntax/choices.
    if (!["hint", "choose"].includes(action.type))
      this.message = this.session.message;
  }
  refresh = (): void => {
    if (!this.session || this.session.screen !== "playing") return;
    if (this.session.remainingSeconds() <= 0) {
      this.session.command("temps");
      this.message = "";
      this.publish(true);
    } else if (
      Math.ceil(this.session.remainingSeconds()) !== this.view.remaining
    )
      this.publish(false);
  };
  dispose(): void {
    this.session?.command("quitter");
    this.publish(true);
  }
  private publish(invalidate: boolean): void {
    if (invalidate) this.revision++;
    this.view = this.project();
    this.listeners.forEach((listener) => listener());
  }
  private project(): RogueView {
    const session = this.session;
    if (!session)
      return { ...EMPTY_VIEW, revision: this.revision, message: this.message };
    const run = session.run;
    const attempt = session.attempts[session.attempts.length - 1];
    const puzzle = run.current;
    const reward = [...run.events]
      .reverse()
      .find((event) => event.type === "reward");
    return {
      revision: this.revision,
      screen: session.screen,
      seed: session.seed,
      stage: run.stage,
      phase: phaseAt(attempt?.stage ?? run.stage, run.config),
      total: totalStages(run.config),
      score: run.score,
      lives: run.lives,
      hints: run.hints,
      effects: run.effects,
      offers: run.offers,
      majorReward: Boolean(
        reward && (reward.detail as { major: boolean }).major,
      ),
      remaining: Math.ceil(session.remainingSeconds()),
      puzzle: puzzle
        ? {
            target: puzzle.target,
            rules: puzzle.rules,
            seconds: puzzle.seconds,
            minimumStars: puzzle.minimumStars,
          }
        : null,
      afterResult: session.screen === "result" ? run.status : null,
      result:
        session.screen === "result" && attempt
          ? {
              target: attempt.puzzle.target,
              bossReward:
                attempt.outcome === "success"
                  ? ((
                      run.events.find(
                        (event) =>
                          event.type === "boss-defeated" &&
                          event.stage === run.stage,
                      )?.detail as { points: number } | undefined
                    )?.points ?? null)
                  : null,
              expression: attempt.expression,
              value: attempt.value,
              stars: attempt.stars,
              minimumOperands: attempt.puzzle.operands,
              points: attempt.points,
              elapsed: attempt.elapsedSeconds,
              cause: attempt.cause,
              success: attempt.outcome === "success",
              livesLost: attempt.livesLost,
              expired: attempt.effectsBefore
                .filter(
                  (effect) =>
                    !attempt.effectsAfter.some(
                      (active) => active.id === effect.id,
                    ),
                )
                .map((effect) => effect.id),
            }
          : null,
      hintMessages: attempt?.hints ?? [],
      message: this.message,
      officialVictory: run.officialVictory,
      defeatedBosses: run.defeatedBosses,
      successes: run.maxProgress,
      failures: session.attempts.filter((item) => item.outcome === "failure")
        .length,
      endCause: run.endCause,
      nextSeconds: run.nextSeconds,
    };
  }
}
