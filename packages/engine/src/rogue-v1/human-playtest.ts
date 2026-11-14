import { phaseAt } from "./model";
import { DurableSession } from "./saved-session";
import type { RogueSave } from "./saved-session";

export const HUMAN_DIFFICULTIES = {
  unspecified: "Non précisé",
  easy: "Facile",
  balanced: "Adapté",
  hard: "Difficile",
  excessive: "Trop difficile",
};
export const HUMAN_REASONS = {
  unspecified: "Non précisé",
  time: "Temps",
  rules: "Contraintes",
  length: "Longueur des expressions",
  repetition: "Répétitions",
  other: "Autre",
};
export interface HumanFeedback {
  difficulty: keyof typeof HUMAN_DIFFICULTIES;
  reason: keyof typeof HUMAN_REASONS;
}
export const EMPTY_HUMAN_FEEDBACK: HumanFeedback = {
  difficulty: "unspecified",
  reason: "unspecified",
};
export function humanPlaytestReport(
  save: RogueSave,
  now: number,
  feedback: HumanFeedback,
) {
  if (
    !Object.prototype.hasOwnProperty.call(
      HUMAN_DIFFICULTIES,
      feedback.difficulty,
    ) ||
    !Object.prototype.hasOwnProperty.call(HUMAN_REASONS, feedback.reason)
  )
    throw new Error("invalid-feedback");
  const session = DurableSession.restore(
    save,
    {
      clock: { now: () => 0, schedule: () => undefined, cancel: () => {} },
      civilNow: () => now,
      newId: () => save.id,
    },
    () => {},
  );
  const game = session.game;
  const selected = game.attempts.slice(-200);
  return {
    schemaVersion: 1,
    ruleset: save.ruleset,
    seed: save.seed,
    state: game.screen,
    actReached: Math.min(
      3,
      Math.max(
        1,
        ...game.attempts.map(
          (attempt) => phaseAt(attempt.stage, game.run.config).act,
        ),
      ),
    ),
    successes: game.run.maxProgress,
    failures: game.attempts.filter((attempt) => attempt.outcome === "failure")
      .length,
    encountersPrepared: game.attempts.length,
    answersSubmitted: game.attempts.filter(
      (attempt) => attempt.expression !== null,
    ).length,
    hintsUsed: game.attempts.reduce(
      (sum, attempt) => sum + attempt.hints.length,
      0,
    ),
    playingSeconds: game.attempts.reduce(
      (sum, attempt) => sum + attempt.elapsedSeconds,
      0,
    ),
    officialVictory: game.run.officialVictory,
    endCause: game.run.endCause,
    feedback: { difficulty: feedback.difficulty, reason: feedback.reason },
    omittedEncounters: Math.max(0, game.attempts.length - selected.length),
    encounters: selected.map((attempt) => {
      const phase = phaseAt(attempt.stage, game.run.config);
      return {
        stage: attempt.stage,
        act: phase.survival ? null : phase.act,
        boss: phase.boss,
        phase: phase.index + 1,
        survival: phase.survival,
        outcome: attempt.outcome,
        cause: attempt.cause,
        seconds: attempt.elapsedSeconds,
        allottedSeconds: attempt.puzzle.seconds,
        hints: attempt.hints.length,
        rules: JSON.parse(
          JSON.stringify(attempt.puzzle.rules),
        ) as typeof attempt.puzzle.rules,
        minimumStars: attempt.puzzle.minimumStars,
        cards: attempt.effectsBefore.map(({ id, level, remaining }) => ({
          id,
          level,
          remaining,
        })),
      };
    }),
    note: "Mesures locales dérivées du journal. Les derniers 200 rencontres au maximum sont détaillés ; les totaux couvrent toute la session. Pas de nom, identifiant de profil, date, expression ou solution. Aucun envoi automatique.",
  };
}
export type HumanPlaytestReport = ReturnType<typeof humanPlaytestReport>;
