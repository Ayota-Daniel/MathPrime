import { DEFAULT_CONFIG, phaseAt } from "./model";
import type { Clock } from "./playtest/session";
import { PlaytestSession } from "./playtest/session";

export const ROGUE_SAVE_KEY = "shortest:rogue:session";
export const ROGUE_SAVE_VERSION = 2;
export const ROGUE_RULESET = "rogue-v1-r3.2.2-1";
export interface JournalEntry {
  at: number;
  command: string;
}
export interface RogueSave {
  version: 2;
  ruleset: string;
  id: string;
  seed: number;
  savedAt: number;
  timeline: number;
  clockAdjusted: boolean;
  journal: JournalEntry[];
  checkpoint: ReturnType<DurableSession["checkpoint"]>;
}
export interface SessionEnvironment {
  clock: Clock;
  civilNow(): number;
  newId(): string;
}

/** A deterministic journal contains decisions and elapsed time, never solver witnesses. */
export class DurableSession {
  readonly game: PlaytestSession;
  readonly id: string;
  readonly seed: number;
  private replaying = true;
  private replayTime = 0;
  private commandAt: number | null = null;
  private baseTime = 0;
  private bootTime: number;
  private journal: JournalEntry[] = [];
  clockAdjusted = false;

  constructor(
    seed: number,
    private readonly env: SessionEnvironment,
    changed: () => void,
    id = env.newId(),
  ) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new Error("invalid-session-id");
    this.id = id;
    this.seed = seed;
    this.bootTime = env.clock.now();
    const clock: Clock = {
      now: () => this.time(),
      schedule: (callback, ms) =>
        this.replaying ? undefined : env.clock.schedule(callback, ms),
      cancel: (handle) => {
        if (handle !== undefined) env.clock.cancel(handle);
      },
    };
    this.game = new PlaytestSession("full", seed, clock, () => {
      this.append("temps"); // Reproduces the automatic timeout when the journal is replayed.
      changed();
    });
    this.replaying = false;
  }
  private time(): number {
    if (this.commandAt !== null) return this.commandAt;
    return this.replaying
      ? this.replayTime
      : this.baseTime + Math.max(0, this.env.clock.now() - this.bootTime);
  }
  private append(command: string): void {
    if (this.journal.length >= 20_000) throw new Error("journal-limit");
    this.journal.push({ at: this.time(), command });
  }
  command(command: string): void {
    const canonical = command.startsWith("soumettre ")
      ? "soumettre " +
        command
          .slice(10)
          .replace(/\s/g, "")
          .replace(/×/g, "*")
          .replace(/−/g, "-")
      : command;
    const recordable =
      /^(demarrer|suivant|indice|temps|terminer|survie|quitter|choisir [0-3]|soumettre [1-9](?:[+*\-][1-9])*)$/.test(
        canonical,
      );
    this.commandAt = this.time();
    try {
      this.append(recordable ? canonical : "temps");
      this.game.command(command);
    } finally {
      this.commandAt = null;
    }
  }
  pause(): void {
    this.game.pauseTimer();
  }
  resume(): void {
    if (this.game.screen === "playing" && this.journal.length >= 19_998)
      throw new Error("save-too-large");
    this.game.resumeTimer();
  }
  capture(): RogueSave {
    if (this.game.screen === "playing") this.command("temps");
    this.pause();
    const snapshot: RogueSave = {
      version: ROGUE_SAVE_VERSION,
      ruleset: ROGUE_RULESET,
      id: this.id,
      seed: this.seed,
      savedAt: this.env.civilNow(),
      timeline: this.time(),
      clockAdjusted: this.clockAdjusted,
      journal: this.journal.map((entry) => ({ ...entry })),
      checkpoint: this.checkpoint(),
    };
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > 3_000_000) throw new Error("save-too-large");
    return JSON.parse(serialized) as RogueSave;
  }
  checkpoint() {
    const run = this.game.run;
    const attempt = this.game.attempts[this.game.attempts.length - 1];
    return {
      configuration: DEFAULT_CONFIG,
      screen: this.game.screen,
      stage: run.stage,
      phase: phaseAt(run.stage, run.config),
      seedState: run.seed,
      lives: run.lives,
      hints: run.hints,
      score: run.score,
      effects: run.effects,
      offers: run.offers,
      purchases: run.purchases,
      defeatedBosses: run.defeatedBosses,
      officialVictory: run.officialVictory,
      progress: run.maxProgress,
      endCause: run.endCause,
      nextSeconds: run.nextSeconds,
      puzzle: run.current
        ? {
            target: run.current.target,
            rules: run.current.rules,
            seconds: run.current.seconds,
            minimumStars: run.current.minimumStars,
          }
        : null,
      elapsed: run.elapsed,
      attempt: attempt
        ? {
            expression: attempt.expression,
            value: attempt.value,
            stars: attempt.stars,
            outcome: attempt.outcome,
            cause: attempt.cause,
            points: attempt.points,
            hints: attempt.hints,
          }
        : null,
    };
  }
  static replay(
    save: RogueSave,
    env: SessionEnvironment,
    changed: () => void,
  ): DurableSession {
    const session = new DurableSession(save.seed, env, changed, save.id);
    session.replaying = true;
    for (const entry of save.journal) {
      session.replayTime = entry.at;
      session.game.command(entry.command);
    }
    session.replayTime = save.timeline;
    if (canonical(session.checkpoint()) !== canonical(save.checkpoint))
      throw new Error("checkpoint-mismatch");
    session.journal = save.journal.map((entry) => ({ ...entry }));
    session.clockAdjusted = save.clockAdjusted;
    session.baseTime = save.timeline;
    session.bootTime = env.clock.now();
    session.replaying = false;
    return session;
  }
  static restore(
    save: RogueSave,
    env: SessionEnvironment,
    changed: () => void,
  ): DurableSession {
    const session = DurableSession.replay(save, env, changed);
    const offline = env.civilNow() - save.savedAt;
    if (session.game.screen === "playing") {
      const penalty =
        offline < 0 ? session.game.remainingSeconds() * 1000 + 1 : offline;
      session.clockAdjusted ||= offline < 0;
      session.baseTime += Math.max(0, penalty);
      session.command("temps");
    }
    // No real timer is armed until the restored state has been durably committed.
    return session;
  }
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_, entry) =>
    typeof entry === "number" ? Math.round(entry * 1e6) / 1e6 : entry,
  );
}
function jsonData(value: unknown, depth = 0): boolean {
  if (depth > 14) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value))
    return value.every((item) => jsonData(item, depth + 1));
  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  return Object.values(value).every((item) => jsonData(item, depth + 1));
}
export type SaveValidation =
  | { status: "valid"; save: RogueSave; migrated: boolean }
  | { status: "invalid" | "incompatible"; reason: string };
export function validateRogueSave(input: unknown): SaveValidation {
  if (!jsonData(input) || !input || typeof input !== "object")
    return { status: "invalid", reason: "format" };
  const raw = input as Record<string, unknown>;
  if (!Number.isInteger(raw.version))
    return { status: "invalid", reason: "version" };
  if (raw.version !== 1 && raw.version !== 2)
    return { status: "incompatible", reason: "version" };
  // A version-one envelope is migratable only when its replay contract is explicit.
  const migrated = raw.version === 1;
  if (typeof raw.ruleset !== "string")
    return { status: migrated ? "incompatible" : "invalid", reason: "ruleset" };
  if (raw.ruleset !== ROGUE_RULESET)
    return { status: "incompatible", reason: "ruleset" };
  const save = {
    ...raw,
    version: 2,
    ruleset: migrated ? ROGUE_RULESET : raw.ruleset,
    clockAdjusted: migrated ? false : raw.clockAdjusted,
  } as unknown as RogueSave;
  const allowed = [
    "version",
    "ruleset",
    "id",
    "seed",
    "savedAt",
    "timeline",
    "clockAdjusted",
    "journal",
    "checkpoint",
  ];
  if (
    Object.keys(raw).some((key) => !allowed.includes(key)) ||
    JSON.stringify(raw).length > 3_000_000 ||
    typeof save.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(save.id) ||
    !Number.isInteger(save.seed) ||
    save.seed < 0 ||
    save.seed > 0xffffffff ||
    !Number.isFinite(save.savedAt) ||
    save.savedAt < 0 ||
    !Number.isFinite(save.timeline) ||
    save.timeline < 0 ||
    typeof save.clockAdjusted !== "boolean" ||
    !Array.isArray(save.journal) ||
    save.journal.length > 20_000
  )
    return { status: "invalid", reason: "fields" };
  if (save.ruleset !== ROGUE_RULESET)
    return { status: "incompatible", reason: "ruleset" };
  let previous = 0;
  for (const entry of save.journal) {
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !== "at,command" ||
      !Number.isFinite(entry.at) ||
      entry.at < previous ||
      entry.at > save.timeline ||
      typeof entry.command !== "string" ||
      entry.command.length > 180 ||
      !/^(demarrer|suivant|indice|temps|terminer|survie|quitter|choisir [0-3]|soumettre [1-9+*\-×− ]+)$/.test(
        entry.command,
      )
    )
      return { status: "invalid", reason: "journal" };
    previous = entry.at;
  }
  try {
    DurableSession.replay(
      save,
      {
        clock: { now: () => 0, schedule: () => undefined, cancel: () => {} },
        civilNow: () => save.savedAt,
        newId: () => save.id,
      },
      () => {},
    );
    return { status: "valid", save, migrated };
  } catch {
    return { status: "invalid", reason: "replay" };
  }
}
