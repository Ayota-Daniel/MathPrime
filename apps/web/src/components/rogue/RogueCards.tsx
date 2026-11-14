import {
  ArrowUpRight,
  Heart,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  Hash,
  Crosshair,
  Scale,
  Minus,
  Lightbulb,
  Repeat2,
} from "lucide-react";
import {
  CARDS,
  presentCard,
  offeredMultiplicationLimit,
} from "@shortest/engine/rogue-v1";
import type { CardId, Effect, Offer, Rules } from "@shortest/engine/rogue-v1";
import { Button } from "../ui";
import type { RogueView } from "../../rogue/controller";

const ICONS = {
  D1: Hash,
  D2: Swords,
  D3: Crosshair,
  D4: Scale,
  T1: Timer,
  T2: Timer,
  T3: Minus,
  T4: ShieldCheck,
  T5: Lightbulb,
  E1: Heart,
  E2: Heart,
  E3: Repeat2,
};
function duration(id: CardId, remaining = CARDS[id].duration): string {
  if (remaining === null) return "Pour toute la run";
  const unit = CARDS[id].expiresOn === "success" ? "réussite" : "tentative";
  return `${remaining} ${unit}${remaining === 1 ? "" : "s"}`;
}
export function RogueCard({
  id,
  level = 1,
  operation,
  nextLimit,
  busy,
  onSelect,
}: {
  id: CardId;
  level?: number;
  operation?: string;
  nextLimit?: number;
  busy?: boolean;
  onSelect?: () => void;
}) {
  const card = CARDS[id];
  const terms = presentCard(id, level);
  const Icon = ICONS[id];
  const family = id[0] === "D" ? "durable" : id[0] === "T" ? "tempo" : "pact";
  return (
    <article className={`rogue-card rogue-card-${family}`}>
      <div className="rogue-card-top">
        <span className="rogue-card-icon">
          <Icon size={22} aria-hidden="true" />
        </span>
        <span className="rogue-eyebrow">
          {id} ·{" "}
          {family === "durable"
            ? "Durable"
            : family === "tempo"
              ? "Temporaire"
              : "Échange"}
        </span>
      </div>
      {operation && <p className="rogue-operation">{operation}</p>}
      <h3>
        {card.name}
        <span className="rogue-level"> · Niveau {level}</span>
      </h3>
      <p className="rogue-card-gain">
        <ArrowUpRight size={16} aria-hidden="true" />
        {terms.advantage}
      </p>
      <p className="rogue-card-cost">{terms.drawback}</p>
      {nextLimit !== undefined && (
        <p>Prochaine épreuve : maximum {nextLimit} multiplication(s).</p>
      )}
      {terms.advanced && (
        <details>
          <summary>Aide avancée</summary>
          <p>{terms.advanced}</p>
        </details>
      )}
      <p className="rogue-card-duration">
        <Timer size={13} aria-hidden="true" />
        {duration(id)}
      </p>
      {onSelect && (
        <Button disabled={busy} onClick={onSelect} className="w-full mt-auto">
          Choisir cette carte
        </Button>
      )}
    </article>
  );
}
function offerOperation(offer: Offer): string {
  if (offer.kind === "upgrade") return "Améliorer votre carte";
  if (offer.kind === "replace" && offer.replaces)
    return `Remplace ${CARDS[offer.replaces].name} (${offer.replaces})`;
  return "Ajouter à votre build";
}
export function RogueRewards({
  view,
  busy,
  choose,
}: {
  view: RogueView;
  busy: boolean;
  choose: (index: number) => void;
}) {
  return (
    <section className="rogue-rewards" aria-labelledby="rogue-title">
      <span className="rogue-kicker">
        <Sparkles size={16} aria-hidden="true" />
        {view.majorReward ? "Récompense majeure" : "Choix tactique"}
      </span>
      <h1 id="rogue-title" tabIndex={-1}>
        {view.majorReward
          ? "Un nouveau cap pour votre run."
          : "Quel risque vaut la peine ?"}
      </h1>
      <p className="rogue-lead">
        Une carte, un avantage, une contrepartie. Votre choix s’applique dès la
        prochaine rencontre.
      </p>
      <div className="rogue-draft-grid">
        {view.offers.map((offer, index) => (
          <RogueCard
            key={offer.id}
            id={offer.card}
            level={
              offer.kind === "upgrade"
                ? (view.effects.find((effect) => effect.id === offer.card)
                    ?.level ?? 1) + 1
                : 1
            }
            operation={offerOperation(offer)}
            nextLimit={
              offer.card === "D2"
                ? offeredMultiplicationLimit(
                    view.phase.difficulty,
                    offer.kind === "upgrade"
                      ? (view.effects.find((effect) => effect.id === "D2")
                          ?.level ?? 1) + 1
                      : 1,
                  )
                : undefined
            }
            busy={busy}
            onSelect={() => choose(index + 1)}
          />
        ))}
      </div>
      {!view.offers.length && (
        <p role="status">
          Aucune carte admissible pour votre build. Vous pouvez continuer.
        </p>
      )}
      <Button disabled={busy} onClick={() => choose(0)}>
        Continuer sans carte
      </Button>
      <p className="rogue-footnote">
        Le chronomètre est arrêté pendant ce choix.
      </p>
    </section>
  );
}
export function ActiveEffects({
  effects,
  rules,
}: {
  effects: Effect[];
  rules?: Rules;
}) {
  return (
    <section className="rogue-effects" aria-label="Cartes actives">
      <div className="rogue-section-heading">
        <h2>Votre build</h2>
        <span>
          {effects.length} carte{effects.length > 1 ? "s" : ""}
        </span>
      </div>
      {!effects.length && (
        <p className="rogue-muted">
          Aucune carte active pour cette étape de la run.
        </p>
      )}
      {effects.map((effect) => {
        const Icon = ICONS[effect.id];
        const terms = presentCard(effect.id, effect.level, rules);
        return (
          <details key={effect.id} className="rogue-active-card">
            <summary>
              <Icon size={17} aria-hidden="true" />
              <span>
                {CARDS[effect.id].name}
                {` · Niveau ${effect.level}`}
                <small>
                  {duration(effect.id, effect.remaining)} {terms.currentLimit}
                  {effect.shieldUsed ? " · protection utilisée" : ""}
                </small>
              </span>
            </summary>
            <p className="rogue-card-gain">{terms.advantage}</p>
            <p>{terms.drawback}</p>
            {terms.advanced && (
              <details>
                <summary>Aide avancée</summary>
                <p>{terms.advanced}</p>
              </details>
            )}
          </details>
        );
      })}
    </section>
  );
}
