import { useState } from "react";
import {
  ArrowRight,
  Check,
  Flag,
  Heart,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { CARDS } from "@shortest/engine/rogue-v1";
import type { CardId } from "@shortest/engine/rogue-v1";
import type { RogueView, WebAction } from "../../rogue/controller";
import { Button } from "../ui";
import { Stars } from "../Stars";
import { RogueCard } from "./RogueCards";
import { RogueDiagnostics } from "./RogueExtras";
import { BOSS_NAMES } from "./RoguePuzzle";

type Actions = {
  view: RogueView;
  busy: boolean;
  send: (action: WebAction) => void;
};
export function RogueWelcome({
  busy,
  send,
  view,
}: Omit<Actions, "view"> & { view?: RogueView }) {
  const [seed, setSeed] = useState("42");
  return (
    <>
      <section className="rogue-hero" aria-labelledby="rogue-title">
        <span className="rogue-kicker">
          <Swords size={17} aria-hidden="true" />
          Rogue V1
        </span>
        <h1 id="rogue-title" tabIndex={-1}>
          Le calcul est simple.
          <br />
          <em>Le choix, un peu moins.</em>
        </h1>
        <p>
          Atteignez les cibles, construisez votre build et défiez trois boss.
          Chaque carte offre un avantage… avec sa contrepartie.
        </p>
        <div className="rogue-hero-facts">
          <span>
            <Heart size={17} aria-hidden="true" />3 vies
          </span>
          <span>
            <Lightbulb size={17} aria-hidden="true" />3 indices
          </span>
          <span>
            <Flag size={17} aria-hidden="true" />3 actes
          </span>
        </div>
        {view?.hasSaved && (
          <div className="rogue-resume">
            <p>
              Graine {view.savedSummary?.seed} · {view.savedSummary?.score}{" "}
              points
            </p>
            <Button
              disabled={busy}
              variant="primary"
              onClick={() => send({ type: "continue" })}
            >
              {view.savedSummary?.ended ? "Voir le dernier bilan" : "Continuer"}
            </Button>
          </div>
        )}
        <div className="rogue-start-row">
          <Button
            variant="primary"
            disabled={busy || !/^\d+$/.test(seed) || Number(seed) > 0xffffffff}
            onClick={() => send({ type: "new", seed: Number(seed) })}
            icon={<ArrowRight size={18} />}
          >
            Nouvelle run
          </Button>
          <label>
            Graine de run
            <input
              aria-label="Graine de run"
              inputMode="numeric"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              maxLength={10}
            />
          </label>
        </div>
        <div className="rogue-hero-glyph" aria-hidden="true">
          7<span>×</span>
        </div>
      </section>
      <section className="rogue-how" aria-label="Le parcours d’une run">
        <div>
          <b>01</b>
          <h2>Résolvez</h2>
          <p>
            3, 5, 7 et +, −, ×. Répétez les chiffres, sans parenthèses. Visez
            une expression courte.
          </p>
        </div>
        <div>
          <b>02</b>
          <h2>Composez votre build</h2>
          <p>
            Un choix tactique par acte et une récompense majeure après les deux
            premiers boss.
          </p>
        </div>
        <div>
          <b>03</b>
          <h2>Allez au bout</h2>
          <p>
            16 épreuves réussies pour la victoire. Puis, si vous le souhaitez,
            continuez en survie.
          </p>
        </div>
      </section>
      <div className="rogue-section-heading">
        <h2>Un aperçu de votre arsenal</h2>
        <span>12 cartes, de vrais compromis</span>
      </div>
      <div className="rogue-draft-grid">
        {(["D1", "T1", "T4"] as CardId[]).map((id) => (
          <RogueCard key={id} id={id} />
        ))}
      </div>
      <details className="rogue-catalog">
        <summary>Explorer les 12 cartes</summary>
        <div className="rogue-draft-grid">
          {(Object.keys(CARDS) as CardId[]).map((id) => (
            <RogueCard key={id} id={id} />
          ))}
        </div>
      </details>
      <p className="rogue-footnote">
        Sauvegarde automatique sur cet appareil. Le temps continue hors de
        l’application pendant un puzzle. Le premier choix de carte arrive après
        deux puzzles.
      </p>
    </>
  );
}
export function RogueProgress({ view }: { view: RogueView }) {
  return (
    <section className="rogue-hud" aria-label="État de la run">
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
      <div className="rogue-acts">
        {[1, 2, 3].map((act) => (
          <div
            key={act}
            className={
              view.defeatedBosses.includes(act)
                ? "complete"
                : view.phase.act === act
                  ? "current"
                  : ""
            }
          >
            <span>
              {view.defeatedBosses.includes(act) ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                act
              )}
            </span>
            Acte {act}
            <Swords size={13} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="rogue-progress-copy">
        <span>
          {view.officialVictory
            ? "Victoire officielle acquise"
            : `${Math.min(view.successes, view.total)} / ${view.total} épreuves réussies`}
        </span>
        {view.screen === "playing" ? (
          <span
            role="timer"
            aria-label={`${view.remaining} secondes restantes`}
          >
            {view.remaining} s restantes
          </span>
        ) : (
          view.phase.survival > 0 && (
            <span>Survie +{Math.max(0, view.successes - view.total)}</span>
          )
        )}
      </div>
    </section>
  );
}
const CAUSES: Record<string, string> = {
  timeout: "Le chronomètre est arrivé à zéro.",
  "wrong-target": "Votre expression n’atteint pas la cible.",
  "active-rules-violated":
    "Un chiffre, une opération, une obligation ou une borne de calcul n’a pas été respecté.",
  "insufficient-stars":
    "Votre réponse est correcte, mais trop longue pour la précision exigée par ce boss.",
};
export function RogueResult({ view, busy, send }: Actions) {
  const result = view.result!;
  return (
    <section
      className={`rogue-result ${result.success ? "rogue-success" : "rogue-failure"}`}
      aria-labelledby="rogue-title"
    >
      <div className="rogue-result-symbol">
        {result.success ? (
          <Check size={32} aria-hidden="true" />
        ) : (
          <Heart size={30} aria-hidden="true" />
        )}
      </div>
      <span className="rogue-kicker">
        {result.bossReward
          ? "Boss vaincu"
          : result.success
            ? "Cible atteinte"
            : result.livesLost
              ? "Une vie perdue"
              : "Votre assurance vous protège"}
      </span>
      <h1 id="rogue-title" tabIndex={-1}>
        {result.bossReward
          ? "Un cap de franchi."
          : result.success
            ? "Bien joué."
            : view.lives === 0
              ? "Fin de parcours."
              : "Une nouvelle chance."}
      </h1>
      {!result.success && (
        <p>
          {!result.diagnostics.length &&
            (CAUSES[result.cause ?? ""] ?? "Cette tentative est terminée.")}
          {view.lives === 0 && " Vous avez épuisé vos vies."}
        </p>
      )}
      <RogueDiagnostics errors={result.diagnostics} />
      <div className="rogue-result-expression">
        <span>Cible {result.target}</span>
        <strong>
          {result.expression?.replace(/\*/g, "×").replace(/-/g, "−") ??
            "Aucune réponse soumise"}
        </strong>
        {result.value !== null && <small>= {result.value}</small>}
      </div>
      <div aria-label={`${result.stars} étoiles sur 3`} className="rogue-stars">
        <Stars value={result.stars} size={32} />
      </div>
      <dl className="rogue-result-stats">
        <div>
          <dt>Points gagnés</dt>
          <dd>+{result.points}</dd>
        </div>
        <div>
          <dt>Temps consacré</dt>
          <dd>
            {result.elapsed.toLocaleString("fr-FR", {
              maximumFractionDigits: 1,
            })}{" "}
            s
          </dd>
        </div>
        <div>
          <dt>Minimum trouvé</dt>
          <dd>{result.minimumOperands} chiffres</dd>
        </div>
      </dl>
      <p className="rogue-footnote">
        Minimum connu sous vos contraintes et dans les bornes du solveur. La
        solution n’est pas révélée.
      </p>
      {result.bossReward !== null && (
        <p className="rogue-boss-reward">
          <Trophy size={16} aria-hidden="true" />+{result.bossReward} points de
          victoire de boss, déjà inclus ci-dessus.
        </p>
      )}
      {view.nextSeconds !== 0 && (
        <p>
          {view.nextSeconds > 0 ? "+" : ""}
          {view.nextSeconds} secondes sur le prochain puzzle.
        </p>
      )}
      {result.expired.length > 0 && (
        <p>
          Cartes expirées :{" "}
          {result.expired.map((id) => CARDS[id as CardId].name).join(", ")}.
        </p>
      )}
      <Button
        variant="primary"
        className="w-full"
        disabled={busy}
        onClick={() => send({ type: "next" })}
      >
        {view.afterResult === "ended"
          ? "Voir le bilan"
          : view.afterResult === "victory"
            ? "Célébrer la victoire"
            : result.bossReward
              ? "Découvrir la suite"
              : "Rencontre suivante"}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
export function RogueVictory({ busy, send }: Omit<Actions, "view">) {
  return (
    <section className="rogue-victory" aria-labelledby="rogue-title">
      <div className="rogue-victory-icon">
        <Trophy size={48} aria-hidden="true" />
      </div>
      <span className="rogue-kicker">Trois boss. Une victoire officielle.</span>
      <h1 id="rogue-title" tabIndex={-1}>
        Vous avez bâti
        <br />
        votre victoire.
      </h1>
      <p>
        Les 16 épreuves sont derrière vous. Terminez ici ou poussez votre build
        plus loin : une défaite en survie ne retire jamais cette victoire.
      </p>
      <Button
        variant="primary"
        disabled={busy}
        onClick={() => send({ type: "finish" })}
      >
        Terminer victorieusement
      </Button>
      <Button
        disabled={busy}
        onClick={() => send({ type: "survival" })}
        icon={<Swords size={18} />}
      >
        Continuer en survie
      </Button>
    </section>
  );
}
export function RogueSummary({
  view,
  busy,
  send,
  onMenu,
}: Actions & { onMenu: () => void }) {
  const blocked = view.endCause === "generation-unavailable";
  const abandoned = view.endCause === "abandoned";
  return (
    <section className="rogue-summary" aria-labelledby="rogue-title">
      <span className="rogue-kicker">Bilan de run · graine {view.seed}</span>
      <h1 id="rogue-title" tabIndex={-1}>
        {view.officialVictory
          ? "Victoire, pour de bon."
          : blocked
            ? "Rencontre indisponible."
            : abandoned
              ? "Votre run s’arrête ici."
              : "Jusqu’à la prochaine run."}
      </h1>
      {view.officialVictory && (
        <p className="rogue-official">
          <ShieldCheck size={18} aria-hidden="true" />
          Victoire officielle conservée.
        </p>
      )}
      {blocked ? (
        <p role="alert">
          Aucune cible admissible n’a été trouvée dans les bornes du moteur. La
          run s’est arrêtée sans modifier ses contraintes.
        </p>
      ) : (
        <p>
          {abandoned
            ? "Abandon volontaire."
            : view.officialVictory
              ? "Vos choix ont fait la différence."
              : "Toutes vos vies ont été utilisées."}{" "}
          Le score de cette run reste local.
        </p>
      )}
      <div className="rogue-final-score">
        <strong>{view.score.toLocaleString("fr-FR")}</strong>
        <span>points de run</span>
      </div>
      <dl className="rogue-result-stats">
        <div>
          <dt>Réussites</dt>
          <dd>{view.successes}</dd>
        </div>
        <div>
          <dt>Échecs</dt>
          <dd>{view.failures}</dd>
        </div>
        <div>
          <dt>Boss vaincus</dt>
          <dd>{view.defeatedBosses.length} / 3</dd>
        </div>
      </dl>
      <ol className="rogue-boss-list">
        {BOSS_NAMES.map((name, index) => (
          <li
            key={name}
            className={
              view.defeatedBosses.includes(index + 1) ? "complete" : ""
            }
          >
            {view.defeatedBosses.includes(index + 1) ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Swords size={16} aria-hidden="true" />
            )}
            {name}
          </li>
        ))}
      </ol>
      <Button
        variant="primary"
        disabled={busy}
        onClick={() => send({ type: "home" })}
        icon={<RotateCcw size={17} />}
      >
        Préparer une nouvelle run
      </Button>
      <Button disabled={busy} onClick={onMenu}>
        Retour au menu
      </Button>
    </section>
  );
}
