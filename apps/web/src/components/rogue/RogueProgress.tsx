import { Heart, Lightbulb } from "lucide-react";
import type { RogueView } from "../../rogue/controller";

/** Same segments as the mobile app: one per encounter of the act, then the boss. */
export function stageProgress(view: RogueView) {
  const { act, boss, index, survival } = view.phase;
  if (survival)
    return { done: 0, total: 0, label: `Survie · rencontre ${survival}` };
  const total = index + (view.encountersRemaining ?? 1);
  return boss
    ? {
        done: index,
        total,
        label: `Acte ${act} · boss, phase ${index + 1}/${total}`,
      }
    : {
        done: index,
        total: total + 1,
        label: `Acte ${act} · puzzle ${index + 1}/${total}`,
      };
}

export function RogueCounters({ view }: { view: RogueView }) {
  return (
    <div className="rogue-counters">
      <div aria-label={`${view.lives} vies restantes`}>
        <b>
          <Heart size={20} aria-hidden="true" className="rogue-heart" />
          {view.lives}
        </b>
        <small aria-hidden="true">Vies</small>
      </div>
      <div aria-label={`${view.hints} indices restants`}>
        <b>
          <Lightbulb size={20} aria-hidden="true" className="rogue-bulb" />
          {view.hints}
        </b>
        <small aria-hidden="true">Indices</small>
      </div>
      <div aria-label={`${view.score.toLocaleString("fr-FR")} points`}>
        <b className="rogue-score">{view.score.toLocaleString("fr-FR")}</b>
        <small aria-hidden="true">points</small>
      </div>
    </div>
  );
}

export function RogueSegments({ view }: { view: RogueView }) {
  const { done, total, label } = stageProgress(view);
  return (
    <div className="rogue-stage" role="group" aria-label={label}>
      {total > 0 && (
        <span className="rogue-segments" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={i < done ? "done" : i === done ? "current" : ""}
            />
          ))}
        </span>
      )}
      <span className="rogue-stage-label">{label}</span>
      <span className="rogue-stage-count">
        {view.officialVictory
          ? "Victoire officielle acquise"
          : `${Math.min(view.successes, view.total)}/${view.total} réussites`}
      </span>
    </div>
  );
}

export function RogueProgress({ view }: { view: RogueView }) {
  const playing = view.screen === "playing";
  return (
    <section
      className={playing ? "rogue-hud rogue-hud-live" : "rogue-hud"}
      aria-label="État de la run"
    >
      <RogueCounters view={view} />
      <RogueSegments view={view} />
    </section>
  );
}
