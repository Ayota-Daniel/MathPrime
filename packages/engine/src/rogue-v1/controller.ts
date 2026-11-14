import { archiveRun, appendArchives, isConcluded } from "./run-history";
import type { RunArchive } from "./run-history";
import {
  answerViolations,
  expressionViolations,
  describeViolation,
} from "./diagnostics";
import type { RuleViolation } from "./diagnostics";
import { phaseAt, totalStages } from "./index";
import type { Effect, Offer, Phase, Rules, Run } from "./index";
import { DurableSession, validateRogueSave } from "./saved-session";
import type { RogueSave, SessionEnvironment } from "./saved-session";
import { RogueSaveRepository } from "./save-repository";
import type { RogueStorage } from "./save-repository";
import type { Clock, Screen } from "./playtest/session";

export type RogueAction =
  | { type: "new"; seed: number; replace?: boolean }
  | {
      type:
        | "start"
        | "next"
        | "hint"
        | "finish"
        | "survival"
        | "abandon"
        | "home"
        | "continue"
        | "retry";
    }
  | { type: "submit"; expression: string }
  | { type: "choose"; index: number }
  | { type: "delete-archive"; id: string };
export type RogueIntroduction =
  "run" | "act" | "boss" | "survival" | "changes" | null;
export interface RoguePuzzleRulesView {
  rules: Rules;
  seconds: number;
  minimumStars: number;
  introduction: RogueIntroduction;
}
export type RoguePuzzleView = RoguePuzzleRulesView &
  (
    | { state: "preparation"; target?: never }
    | { state: "playing"; target: number }
  );
export interface RogueResultView {
  diagnostics: RuleViolation[];
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
  history: RunArchive[];
  diagnostics: RuleViolation[];
  revision: number;
  hydrated: boolean;
  hasSaved: boolean;
  savedSummary: { score: number; seed: number; ended: boolean } | null;
  storageError: string;
  storageNotice: string;
  screen: Screen | "home";
  seed: number;
  stage: number;
  total: number;
  encountersRemaining: number | null;
  phase: Phase;
  score: number;
  lives: number;
  hints: number;
  effects: Effect[];
  offers: Offer[];
  majorReward: boolean;
  remaining: number;
  puzzle: RoguePuzzleView | null;
  result: RogueResultView | null;
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
  history: [],
  diagnostics: [],
  revision: 0,
  hydrated: true,
  hasSaved: false,
  savedSummary: null,
  storageError: "",
  storageNotice: "",
  screen: "home",
  seed: 42,
  stage: 0,
  total: 16,
  encountersRemaining: 3,
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
export class RogueController {
  private durable: DurableSession | null = null;
  private get session() {
    return this.durable?.game ?? null;
  }
  private repository: RogueSaveRepository | null;
  private saved: RogueSave | null = null;
  private history: RunArchive[] = [];
  private pendingArchive: RunArchive | null = null;
  private pendingDeletion: string | null = null;
  private inputDiagnostics: RuleViolation[] = [];
  private memoryArchivedId: string | null = null;
  private storageError = "";
  private pendingWrite = false;
  private committedView: RogueView | null = null;
  private storageNotice = "";
  private hydrated = false;
  private suspended = false;
  private connected = true;
  private queue: Promise<void> = Promise.resolve();
  private initialization: Promise<void> | null = null;
  private readonly environment: SessionEnvironment;
  private listeners = new Set<() => void>();
  private view: RogueView = EMPTY_VIEW;
  private revision = 0;
  private message = "";

  constructor(
    clock: Clock,
    adapter?: RogueStorage,
    environment?: Partial<Omit<SessionEnvironment, "clock">>,
  ) {
    this.repository = adapter ? new RogueSaveRepository(adapter) : null;
    this.environment = {
      clock,
      civilNow: environment?.civilNow ?? Date.now,
      newId:
        environment?.newId ??
        (() => `rogue-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    };
    this.hydrated = !adapter;
    this.view = { ...EMPTY_VIEW, hydrated: this.hydrated };
  }
  attach(): void {
    this.connected = true;
    if (this.durable && this.suspended) void this.wake();
  }
  hydrate(): Promise<void> {
    if (!this.initialization)
      this.initialization = this.enqueue(async () => {
        if (!this.repository) return;
        try {
          const raw = await this.repository.load();
          if (raw !== null) {
            const result = validateRogueSave(raw);
            if (result.status === "valid") {
              this.saved = result.save;
              if (
                result.migrated ||
                (isConcluded(result.save) && !this.repository.activeArchived())
              ) {
                await this.repository.write(
                  result.save,
                  isConcluded(result.save)
                    ? [archiveRun(result.save, this.environment)]
                    : [],
                );
                if (result.migrated)
                  this.storageNotice = "Ancienne sauvegarde migrée.";
              }
            } else
              this.storageNotice =
                result.status === "incompatible"
                  ? "Sauvegarde Rogue incompatible avec les nouvelles durées (minimum 60 s). Elle est conservée ; une nouvelle run peut la remplacer avec confirmation."
                  : "Sauvegarde Rogue invalide : aucune progression restaurée.";
          }
        } catch {
          this.storageError =
            "Impossible de lire la sauvegarde Rogue. Réessayez avant de jouer.";
        }
        this.history = this.repository.history();
        this.hydrated = true;
        this.committedView = this.project();
        this.publish(true);
      });
    return this.initialization;
  }
  private enqueue(work: () => Promise<void>): Promise<void> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => {});
    return operation;
  }
  private onTimeout = (): void => {
    this.message = "";
    if (!this.repository) {
      this.archiveMemoryConclusion();
      this.publish(true);
      return;
    }
    this.durable?.pause();
    this.pendingWrite = true;
    void this.enqueue(() => this.commit());
  };
  private async commit(): Promise<void> {
    if (!this.durable || !this.repository) return;
    this.pendingWrite = true;
    try {
      const snapshot = this.durable.capture();
      const summaries = this.pendingArchive ? [this.pendingArchive] : [];
      if (isConcluded(snapshot))
        summaries.push(archiveRun(snapshot, this.environment));
      await this.repository.write(snapshot, summaries);
      this.pendingArchive = null;
      this.history = this.repository.history();
      this.saved = snapshot;
      this.storageError = "";
      this.committedView = this.project();
      if (this.connected && !this.suspended) this.durable.resume();
    } catch (error) {
      this.durable.pause();
      this.storageError =
        (error as Error).message === "save-conflict"
          ? "Cette sauvegarde a changé dans une autre fenêtre. Rechargez avant de continuer."
          : (error as Error).message === "save-too-large"
            ? "Cette session dépasse la capacité de sauvegarde. Revenez au menu pour démarrer une nouvelle run ; la dernière sauvegarde valide est conservée."
            : "Sauvegarde impossible. La partie est bloquée pour éviter une progression non enregistrée. Réessayez.";
    }
    this.pendingWrite = false;
    this.publish(true);
  }
  suspend = (): void => {
    this.suspended = true;
    this.durable?.pause();
  };
  wake = (): Promise<void> =>
    this.enqueue(async () => {
      if (!this.connected) return;
      if (!this.suspended) {
        this.refresh();
        return;
      }
      this.suspended = false;
      if (!this.durable || this.storageError) return;
      if (!this.saved) {
        this.durable.resume();
        this.refresh();
        return;
      }
      this.durable.pause();
      try {
        this.durable = DurableSession.restore(
          this.saved,
          this.environment,
          this.onTimeout,
        );
        if (this.durable.clockAdjusted)
          this.storageNotice =
            "Horloge civile reculée : le puzzle en cours a expiré par sécurité, une seule fois.";
        await this.commit();
      } catch {
        this.storageError =
          "Reprise impossible. La sauvegarde est conservée ; rechargez pour réessayer.";
        this.publish(true);
      }
    });
  getSnapshot = (): RogueView => this.view;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  isActive = (): boolean =>
    this.storageError && this.committedView
      ? !["home", "ended"].includes(this.committedView.screen)
      : Boolean(this.session && this.session.screen !== "ended");

  dispatch(action: RogueAction, expectedRevision: number): Promise<void> {
    if (!this.connected) return Promise.resolve();
    if (!this.repository) {
      if (expectedRevision === this.revision) {
        this.execute(action);
        this.publish(true);
      }
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      if (expectedRevision !== this.revision || !this.hydrated) return;
      if (this.storageError && action.type !== "retry") return;
      if (action.type === "delete-archive" && this.view.screen === "home") {
        this.pendingDeletion = action.id;
        await this.deleteArchive();
        return;
      }
      if (action.type === "retry") {
        if (this.pendingDeletion) {
          await this.deleteArchive();
          return;
        }
        if (this.durable) await this.commit();
        else {
          this.initialization = null;
          this.storageError = "";
          void this.hydrate();
        }
        return;
      }
      this.durable?.pause();
      try {
        this.execute(action);
      } catch {
        this.storageError =
          "Cette action n’a pas pu être enregistrée. La dernière sauvegarde valide est conservée ; revenez au menu pour reprendre ou remplacer la session.";
        this.publish(true);
        return;
      }
      if (this.durable) await this.commit();
      else {
        this.committedView = this.project();
        this.publish(true);
      }
    });
  }
  private async deleteArchive(): Promise<void> {
    try {
      await this.repository!.deleteArchive(this.pendingDeletion!);
      this.history = this.repository!.history();
      this.pendingDeletion = null;
      this.storageError = "";
      this.committedView = this.project();
    } catch {
      this.storageError =
        "Suppression impossible. L’historique est conservé ; réessayez ou rechargez.";
    }
    this.publish(true);
  }
  private execute(action: RogueAction): void {
    this.message = "";
    this.inputDiagnostics = [];
    if (action.type === "new") {
      if (
        (this.isActive() || this.saved || this.storageNotice) &&
        !action.replace
      ) {
        this.message = "Confirmez le remplacement de la session existante.";
        return;
      }
      if (
        !Number.isInteger(action.seed) ||
        action.seed < 0 ||
        action.seed > 0xffffffff
      ) {
        this.message =
          "Choisissez une graine entière entre 0 et 4 294 967 295.";
        return;
      }
      const previous = this.durable?.capture() ?? this.saved;
      if (
        previous &&
        (this.repository
          ? !this.repository.activeArchived()
          : previous.id !== this.memoryArchivedId)
      ) {
        const archive = archiveRun(previous, this.environment, true);
        if (this.repository) this.pendingArchive = archive;
        else this.history = appendArchives(this.history, [archive]);
      }
      this.durable?.pause();
      this.durable = new DurableSession(
        action.seed,
        this.environment,
        this.onTimeout,
      );
      this.storageNotice = "";
      this.suspended = false;
    } else if (action.type === "continue") {
      if (this.saved && !this.isActive()) {
        this.durable = DurableSession.restore(
          this.saved,
          this.environment,
          this.onTimeout,
        );
        this.suspended = false;
        if (this.durable.clockAdjusted)
          this.storageNotice =
            "Horloge civile reculée : le puzzle en cours a expiré par sécurité, une seule fois.";
      }
    } else if (action.type === "delete-archive") {
      this.history = this.history.filter((entry) => entry.id !== action.id);
    } else if (action.type === "home") {
      if (this.isActive()) return;
      this.durable = null;
    } else this.apply(action);
    if (!this.repository) this.archiveMemoryConclusion();
    if (!this.repository && this.connected) this.durable?.resume();
  }
  private archiveMemoryConclusion(): void {
    if (
      !this.durable ||
      !["ended", "result"].includes(this.durable.game.screen)
    )
      return;
    const snapshot = this.durable.capture();
    if (!isConcluded(snapshot) || snapshot.id === this.memoryArchivedId) return;
    this.history = appendArchives(this.history, [
      archiveRun(snapshot, this.environment),
    ]);
    this.memoryArchivedId = snapshot.id;
  }
  private apply(action: RogueAction): void {
    if (
      !this.session ||
      action.type === "new" ||
      action.type === "home" ||
      action.type === "continue" ||
      action.type === "retry" ||
      action.type === "delete-archive"
    )
      return;
    if (action.type === "submit" && action.expression.length > 150) {
      this.durable!.command("temps");
      this.message = "Expression trop longue : 150 caractères maximum.";
      return;
    }
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
    this.durable!.command(command);
    if (
      action.type === "submit" &&
      this.session.screen === "playing" &&
      this.session.run.current
    ) {
      const expression = action.expression
        .replace(/\s/g, "")
        .replace(/×/g, "*")
        .replace(/−/g, "-");
      this.inputDiagnostics = expressionViolations(
        expression,
        this.session.run.current.rules,
        this.session.run.config.search.magnitude,
      );
    }
    // Hint text has its own persistent list. Other messages describe invalid syntax/choices.
    if (!["hint", "choose"].includes(action.type))
      this.message = this.inputDiagnostics.length
        ? describeViolation(this.inputDiagnostics[0])
        : this.session.message;
  }
  refresh = (): void => {
    if (
      !this.session ||
      this.suspended ||
      this.pendingWrite ||
      this.storageError ||
      this.session.screen !== "playing"
    )
      return;
    if (this.session.remainingSeconds() <= 0) {
      this.durable!.command("temps");
      this.message = "";
      if (this.repository) {
        this.durable?.pause();
        void this.enqueue(() => this.commit());
      } else {
        this.archiveMemoryConclusion();
        this.publish(true);
      }
    } else if (
      Math.ceil(this.session.remainingSeconds()) !== this.view.remaining
    )
      this.publish(false);
  };
  dispose(): void {
    this.connected = false;
    this.suspend();
    this.publish(true);
  }
  private publish(invalidate: boolean): void {
    if (invalidate) this.revision++;
    this.view =
      (this.pendingWrite || this.storageError) && this.committedView
        ? {
            ...this.committedView,
            revision: this.revision,
            storageError: this.storageError,
            storageNotice: this.storageNotice,
          }
        : this.project();
    this.listeners.forEach((listener) => listener());
  }
  private project(): RogueView {
    const session = this.session;
    const persistence = {
      history: JSON.parse(JSON.stringify(this.history)) as RunArchive[],
      diagnostics: this.inputDiagnostics,
      hydrated: this.hydrated,
      hasSaved: Boolean(this.saved),
      savedSummary: this.saved
        ? {
            score: this.saved.checkpoint.score,
            seed: this.saved.seed,
            ended: this.saved.checkpoint.screen === "ended",
          }
        : null,
      storageError: this.storageError,
      storageNotice: this.storageNotice,
    };
    if (!session)
      return {
        ...EMPTY_VIEW,
        ...persistence,
        revision: this.revision,
        message: this.message,
      };
    const run = session.run;
    const attempt = session.attempts[session.attempts.length - 1];
    const phase = phaseAt(attempt?.stage ?? run.stage, run.config);
    const reward = [...run.events]
      .reverse()
      .find((event) => event.type === "reward");
    return {
      ...persistence,
      revision: this.revision,
      screen: session.screen,
      seed: session.seed,
      stage: run.stage,
      phase,
      encountersRemaining: phase.survival
        ? null
        : (phase.boss
            ? run.config.bossPhases[phase.act - 1]
            : run.config.ordinaryPerAct) - phase.index,
      total: totalStages(run.config),
      score: run.score,
      lives: run.lives,
      hints: run.hints,
      effects: run.effects.map((effect) => ({ ...effect })),
      offers: run.offers.map((offer) => ({ ...offer })),
      majorReward: Boolean(
        reward && (reward.detail as { major: boolean }).major,
      ),
      remaining:
        session.screen === "playing"
          ? Math.ceil(session.remainingSeconds())
          : 0,
      puzzle: this.projectPuzzle(),
      afterResult: session.screen === "result" ? run.status : null,
      result:
        session.screen === "result" && attempt
          ? {
              diagnostics:
                attempt.outcome === "failure" &&
                attempt.expression &&
                attempt.cause !== "timeout"
                  ? answerViolations(
                      attempt.expression,
                      attempt.puzzle.rules,
                      run.config.search.magnitude,
                      attempt.puzzle.target,
                      attempt.puzzle.operands,
                      attempt.puzzle.minimumStars,
                    )
                  : [],
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
      hintMessages: [...(attempt?.hints ?? [])],
      message: this.message,
      officialVictory: run.officialVictory,
      defeatedBosses: [...run.defeatedBosses],
      successes: run.maxProgress,
      failures: session.attempts.filter((item) => item.outcome === "failure")
        .length,
      endCause: run.endCause,
      nextSeconds: run.nextSeconds,
    };
  }
  private projectPuzzle(): RoguePuzzleView | null {
    const session = this.session;
    const puzzle = session?.run.current;
    if (
      !session ||
      !puzzle ||
      !["preparation", "playing"].includes(session.screen)
    )
      return null;
    const visible: RoguePuzzleRulesView = {
      rules: JSON.parse(JSON.stringify(puzzle.rules)) as Rules,
      seconds: puzzle.seconds,
      minimumStars: puzzle.minimumStars,
      introduction: this.introduction(),
    };
    return session.screen === "playing"
      ? { ...visible, state: "playing", target: puzzle.target }
      : { ...visible, state: "preparation" };
  }
  private introduction(): RogueIntroduction {
    const session = this.session!;
    const previous = session.attempts[session.attempts.length - 2];
    if (!previous) return "run";
    const phase = phaseAt(session.run.stage, session.run.config);
    const before = phaseAt(previous.stage, session.run.config);
    if (phase.survival && !before.survival) return "survival";
    if (phase.act !== before.act) return "act";
    if (phase.boss && !before.boss) return "boss";
    const build = (effects: Effect[]) =>
      effects.map(({ id, level }) => [id, level]);
    const changed =
      JSON.stringify(previous.puzzle.rules) !==
        JSON.stringify(session.run.current!.rules) ||
      JSON.stringify(build(previous.effectsBefore)) !==
        JSON.stringify(build(session.run.effects));
    return changed ? "changes" : null;
  }
}
