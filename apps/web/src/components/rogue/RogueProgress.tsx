import { Check, Flag, Heart, Lightbulb, Trophy } from "lucide-react";
import type { RogueView } from "../../rogue/controller";

export function RogueResources({ view }: { view: RogueView }) {
  return (
    <div className="rogue-resources">
      <span aria-label={`${view.lives} vies restantes`}>
        <Heart size={17} aria-hidden="true" /> <b>{view.lives}</b>
        <small>/ 3 vies</small>
      </span>
      <span aria-label={`${view.hints} indices restants`}>
        <Lightbulb size={17} aria-hidden="true" />
        <b>{view.hints}</b>
        <small>indices</small>
      </span>
      <span className="rogue-score">
        <Trophy size={16} aria-hidden="true" />
        <b>{view.score.toLocaleString("fr-FR")}</b>
        <small>pts</small>
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
      <ol className="rogue-acts" aria-label="Progression des boss">
        {[1, 2, 3].map((act) => {
          const complete = view.defeatedBosses.includes(act);
          const current = !complete && view.phase.act === act;
          return (
            <li
              key={act}
              className={complete ? "complete" : ""}
              aria-current={current ? "step" : undefined}
            >
              <span className="rogue-act-marker" aria-hidden="true">
                {complete ? (
                  <Check size={16} />
                ) : act === 3 ? (
                  <Flag size={14} />
                ) : null}
              </span>
              {act === 3 ? "Finale" : `Boss ${act}`}
              {complete && <span className="sr-only"> vaincu</span>}
            </li>
          );
        })}
      </ol>
      {!playing && <RogueResources view={view} />}
      <div className="rogue-progress-copy">
        <span>
          {view.officialVictory
            ? "Victoire officielle acquise"
            : `${Math.min(view.successes, view.total)} / ${view.total} épreuves réussies`}
        </span>
        {view.puzzle?.state === "playing" && (
          <span className="rogue-mobile-target">
            Cible {view.puzzle.target} · {view.remaining} s
          </span>
        )}
        {view.phase.survival > 0 && (
          <span>Survie +{Math.max(0, view.successes - view.total)}</span>
        )}
      </div>
    </section>
  );
}
