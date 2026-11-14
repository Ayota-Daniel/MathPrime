import { CARDS } from "./cards";
import { phaseAt } from "./model";
import type { CardId } from "./model";
import { DurableSession } from "./saved-session";
import type { RogueSave, SessionEnvironment } from "./saved-session";

export const ROGUE_STORE_KEY = "shortest:rogue:store";
export const ROGUE_STORE_VERSION = 1;
export const MAX_ROGUE_ARCHIVES = 50;
export type ArchiveStatus =
  "interrupted" | "victory" | "defeat" | "abandoned" | "blocked";
export interface RunArchive {
  id: string;
  date: number;
  seed: number;
  score: number;
  acts: number[];
  successes: number;
  failures: number;
  bosses: number[];
  cards: { id: CardId; level: number }[];
  status: ArchiveStatus;
}
export interface RogueStore {
  version: 1;
  active: unknown;
  activeArchived: boolean;
  archives: RunArchive[];
}
export const ARCHIVE_STATUS_LABELS: Record<ArchiveStatus, string> = {
  interrupted: "Interrompue",
  victory: "Victoire",
  defeat: "Défaite",
  abandoned: "Abandonnée",
  blocked: "Génération indisponible",
};
export function isConcluded(save: RogueSave): boolean {
  return (
    save.checkpoint.screen === "ended" ||
    (save.checkpoint.lives === 0 && save.checkpoint.screen === "result")
  );
}
export function archiveRun(
  save: RogueSave,
  environment: SessionEnvironment,
  interrupted = false,
): RunArchive {
  const session = DurableSession.replay(save, environment, () => {});
  const run = session.game.run;
  const status: ArchiveStatus =
    interrupted && !isConcluded(save)
      ? "interrupted"
      : run.officialVictory
        ? "victory"
        : run.endCause === "generation-unavailable"
          ? "blocked"
          : run.endCause === "abandoned"
            ? "abandoned"
            : "defeat";
  const cards = new Map<CardId, number>();
  for (const attempt of session.game.attempts)
    for (const effect of [...attempt.effectsBefore, ...attempt.effectsAfter])
      cards.set(effect.id, Math.max(cards.get(effect.id) ?? 1, effect.level));
  for (const effect of run.effects)
    cards.set(effect.id, Math.max(cards.get(effect.id) ?? 1, effect.level));
  const acts = [
    ...new Set(
      session.game.attempts
        .map((attempt) => phaseAt(attempt.stage, run.config).act)
        .filter((act) => act <= 3),
    ),
  ];
  return {
    id: save.id,
    date:
      interrupted && !isConcluded(save) ? environment.civilNow() : save.savedAt,
    seed: save.seed,
    score: run.score,
    acts,
    successes: run.maxProgress,
    failures: session.game.attempts.filter(
      (attempt) => attempt.outcome === "failure",
    ).length,
    bosses: [...run.defeatedBosses],
    cards: [...cards].map(([id, level]) => ({ id, level })),
    status,
  };
}
export function appendArchives(
  archives: RunArchive[],
  added: RunArchive[],
): RunArchive[] {
  const result = [...archives];
  for (const archive of added) {
    const index = result.findIndex((item) => item.id === archive.id);
    if (index >= 0) result.splice(index, 1);
    result.unshift(archive);
  }
  return result.slice(0, MAX_ROGUE_ARCHIVES);
}
const count = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
function validArchive(value: unknown): value is RunArchive {
  if (!value || typeof value !== "object") return false;
  const entry = value as RunArchive;
  const acts = (values: unknown): values is number[] =>
    Array.isArray(values) &&
    values.length <= 3 &&
    new Set(values).size === values.length &&
    values.every((value) => [1, 2, 3].includes(value));
  return (
    typeof entry.id === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(entry.id) &&
    Number.isFinite(entry.date) &&
    entry.date >= 0 &&
    count(entry.seed) &&
    entry.seed <= 0xffffffff &&
    count(entry.score) &&
    count(entry.successes) &&
    count(entry.failures) &&
    acts(entry.acts) &&
    acts(entry.bosses) &&
    Object.prototype.hasOwnProperty.call(ARCHIVE_STATUS_LABELS, entry.status) &&
    Array.isArray(entry.cards) &&
    entry.cards.length <= 12 &&
    new Set(entry.cards.map((card) => card?.id)).size === entry.cards.length &&
    entry.cards.every(
      (card) =>
        card &&
        Object.prototype.hasOwnProperty.call(CARDS, card.id) &&
        [1, 2].includes(card.level),
    ) &&
    Object.keys(entry).sort().join(",") ===
      "acts,bosses,cards,date,failures,id,score,seed,status,successes"
  );
}
export function parseRogueStore(raw: unknown): RogueStore {
  if (!raw || typeof raw !== "object") throw new Error("invalid-rogue-store");
  const store = raw as RogueStore;
  if (
    store.version !== ROGUE_STORE_VERSION ||
    typeof store.activeArchived !== "boolean" ||
    !Object.prototype.hasOwnProperty.call(store, "active") ||
    !Array.isArray(store.archives) ||
    store.archives.length > MAX_ROGUE_ARCHIVES ||
    !store.archives.every(validArchive) ||
    new Set(store.archives.map((entry) => entry.id)).size !==
      store.archives.length ||
    Object.keys(store).sort().join(",") !==
      "active,activeArchived,archives,version" ||
    JSON.stringify(store).length > 3_200_000
  )
    throw new Error("invalid-rogue-store");
  return store;
}
