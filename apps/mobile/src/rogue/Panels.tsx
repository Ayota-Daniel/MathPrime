import { useEffect, useState } from "react";
import { Text, View, TextInput } from "react-native";
import { CARDS } from "@shortest/engine/rogue-v1";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { Button, Stars } from "../components/ui";
import { RogueInput } from "./RogueInput";
import {
  BOSS_NAMES,
  cardDescription,
  constraints,
  effectDuration,
  offerDescription,
} from "./presentation";
import { s } from "./styles";
type PanelProps = {
  view: RogueView;
  disabled: boolean;
  send: (action: RogueAction) => void;
};
const FAILURE: Record<string, string> = {
  timeout: "Temps écoulé.",
  "wrong-target": "La valeur ne correspond pas à la cible.",
  "active-rules-violated":
    "Une contrainte, un chiffre ou une opération n’est pas respecté.",
  "insufficient-stars": "Réponse correcte mais trop longue pour ce boss.",
};
export function NativeHome({ view, disabled, send }: PanelProps) {
  const [seed, setSeed] = useState("42");
  return (
    <>
      <View style={s.hero}>
        <Text style={s.kicker}>ROGUE V1</Text>
        <Text style={s.heroTitle}>Chaque choix compte.</Text>
        <Text style={s.heroText}>
          3 vies, 3 indices, 3 actes. Atteignez les cibles et construisez votre
          build pour vaincre les trois boss.
        </Text>
      </View>
      {view.hasSaved && (
        <View style={s.card}>
          <Text style={s.title}>Votre dernière run</Text>
          <Text style={s.body}>
            Graine {view.savedSummary?.seed} · {view.savedSummary?.score} points
          </Text>
          <Button
            label={
              view.savedSummary?.ended ? "Voir le dernier bilan" : "Continuer"
            }
            variant="primary"
            disabled={disabled}
            onPress={() => send({ type: "continue" })}
          />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.label}>Graine de run</Text>
        <TextInput
          accessibilityLabel="Graine de run"
          value={seed}
          onChangeText={setSeed}
          keyboardType="number-pad"
          maxLength={10}
          style={s.seed}
        />
        <Button
          label="Nouvelle run"
          variant="primary"
          disabled={
            disabled || !/^\d+$/.test(seed) || Number(seed) > 0xffffffff
          }
          onPress={() => send({ type: "new", seed: Number(seed) })}
        />
        <Text style={s.caption}>
          Le premier choix de carte arrive après deux puzzles. Sauvegarde
          automatique sur cet appareil ; le temps continue hors de l’application
          pendant un puzzle.
        </Text>
      </View>
    </>
  );
}

export function NativePuzzle({ view, disabled, send }: PanelProps) {
  const puzzle = view.puzzle!;
  const preparing = puzzle.state === "preparation";
  const [showRules, setShowRules] = useState(puzzle.introduction === "run");
  useEffect(() => {
    setShowRules(
      puzzle.state === "preparation" && puzzle.introduction === "run",
    );
  }, [puzzle.state, puzzle.introduction, view.stage]);
  return (
    <View style={[s.card, view.phase.boss && s.boss]}>
      <Text style={s.title}>
        {view.phase.boss
          ? BOSS_NAMES[view.phase.act - 1]
          : preparing
            ? puzzle.introduction === "run"
              ? "Prêt pour votre run ?"
              : "Prochaine épreuve"
            : "Atteignez la cible"}
      </Text>
      {preparing && view.phase.boss && puzzle.introduction === "boss" && (
        <Text style={s.body}>
          {view.phase.act === 1
            ? "Une solution optimale en phase 1 donne +8 s à la prochaine tentative de phase 2."
            : view.phase.act === 2
              ? "Des obligations d’opérations adaptées à votre build."
              : "Le build, la précision, puis une dernière phase sous pression."}
        </Text>
      )}
      {preparing && puzzle.introduction === "act" && (
        <Text style={s.body}>
          Acte {view.phase.act}. Vérifiez les contraintes de cette étape.
        </Text>
      )}
      {preparing && puzzle.introduction === "survival" && (
        <Text style={s.body}>
          Votre victoire est acquise. La survie ajoute progressivement de la
          pression.
        </Text>
      )}
      {preparing && puzzle.introduction === "changes" && (
        <Text style={s.body}>
          Votre build ou vos contraintes ont changé. Vérifiez-les avant de
          partir.
        </Text>
      )}
      {puzzle.state === "playing" ? (
        <>
          <Text style={s.caption}>CIBLE À ATTEINDRE</Text>
          <Text style={s.target}>{puzzle.target}</Text>
        </>
      ) : (
        <Text style={s.caption}>
          Cible masquée jusqu’au démarrage du chronomètre.
        </Text>
      )}
      <View style={s.rules}>
        <Text style={s.bold}>
          {puzzle.rules.numbers.join(" · ")} avec + − ×
        </Text>
        {constraints(puzzle).map((rule) => (
          <Text key={rule} style={s.rule}>
            • {rule}
          </Text>
        ))}
      </View>
      <Button
        label={showRules ? "Fermer les règles de base" : "Règles de base"}
        onPress={() => setShowRules(!showRules)}
      />
      {showRules && (
        <Text style={s.caption}>
          Chiffres réutilisables, sans parenthèses. Multiplication prioritaire.
          Visez une expression courte.
        </Text>
      )}
      {preparing ? (
        <>
          <Text style={s.body}>
            {puzzle.seconds.toLocaleString("fr-FR", {
              maximumFractionDigits: 2,
            })}{" "}
            secondes. Le temps commence au clic.
          </Text>
          <Button
            label={
              view.phase.boss ? "Affronter cette phase" : "Commencer le puzzle"
            }
            variant="primary"
            disabled={disabled}
            onPress={() => send({ type: "start" })}
          />
        </>
      ) : (
        <RogueInput
          key={`${view.seed}-${view.stage}`}
          view={view}
          busy={disabled}
          send={send}
        />
      )}
    </View>
  );
}

export function NativeResult({ view, disabled, send }: PanelProps) {
  const result = view.result!;
  const resultNext =
    view.afterResult === "ended"
      ? "Voir le bilan"
      : view.afterResult === "victory"
        ? "Célébrer la victoire"
        : "Rencontre suivante";
  return (
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>
        {result.success
          ? result.bossReward
            ? "Boss vaincu !"
            : "Cible atteinte !"
          : view.lives
            ? "Une nouvelle chance"
            : "Fin de parcours"}
      </Text>
      {!result.success && (
        <Text style={s.body}>
          {FAILURE[result.cause ?? ""] ?? "Tentative terminée."}
          {result.livesLost === 0
            ? " Votre assurance a protégé votre vie."
            : ""}
        </Text>
      )}
      <Text style={s.caption}>Cible {result.target}</Text>
      <Text selectable style={s.expression}>
        {result.expression?.replace(/\*/g, "×") ?? "Aucune réponse"}
        {result.value !== null ? ` = ${result.value}` : ""}
      </Text>
      <Stars value={result.stars} />
      <Text style={s.bold}>
        +{result.points} points · {result.elapsed.toFixed(1)} s
      </Text>
      <Text style={s.caption}>
        Minimum sous vos contraintes : {result.minimumOperands} chiffres dans
        les bornes du solveur. Aucune solution révélée.
      </Text>
      {result.bossReward !== null && (
        <Text style={s.note}>
          Récompense du boss : +{result.bossReward} points, déjà inclus.
        </Text>
      )}
      {view.nextSeconds !== 0 && (
        <Text style={s.body}>
          {view.nextSeconds > 0 ? "+" : ""}
          {view.nextSeconds} s au prochain puzzle.
        </Text>
      )}
      {result.expired.length > 0 && (
        <Text style={s.caption}>
          Cartes expirées : {result.expired.join(", ")}.
        </Text>
      )}
      <Button
        label={resultNext}
        variant="primary"
        disabled={disabled}
        onPress={() => send({ type: "next" })}
      />
    </View>
  );
}

export function NativeRewards({ view, disabled, send }: PanelProps) {
  return (
    <>
      <Text style={s.kicker}>
        {view.majorReward ? "RÉCOMPENSE MAJEURE" : "CHOIX TACTIQUE"}
      </Text>
      <Text style={s.title}>Quel risque vaut la peine ?</Text>
      {view.offers.map((offer, index) => {
        const card = offerDescription(offer, view.effects);
        return (
          <View
            key={offer.id}
            style={[
              s.card,
              {
                borderTopWidth: 4,
                borderTopColor:
                  offer.card[0] === "D"
                    ? "#615bc8"
                    : offer.card[0] === "T"
                      ? "#a76b25"
                      : "#a83c54",
              },
            ]}
          >
            <Text style={s.caption}>
              {card.operation} · {offer.card}
            </Text>
            <Text style={s.title}>{card.name}</Text>
            <Text style={s.gain}>{card.advantage}</Text>
            <Text style={s.body}>{card.drawback}</Text>
            <Text style={s.caption}>{card.duration}</Text>
            <Button
              label="Choisir cette carte"
              disabled={disabled}
              onPress={() => send({ type: "choose", index: index + 1 })}
            />
          </View>
        );
      })}
      {!view.offers.length && (
        <Text style={s.body}>
          Aucune offre admissible. Vous pouvez continuer.
        </Text>
      )}
      <Button
        label="Continuer sans carte"
        disabled={disabled}
        onPress={() => send({ type: "choose", index: 0 })}
      />
    </>
  );
}

export function NativeVictory({ view, disabled, send }: PanelProps) {
  return (
    <View style={s.hero}>
      <Text style={s.kicker}>VICTOIRE OFFICIELLE</Text>
      <Text style={s.heroTitle}>Vous avez bâti votre victoire.</Text>
      <Text style={s.heroText}>
        Les trois boss sont vaincus. Une défaite en survie ne retire jamais
        cette victoire.
      </Text>
      <Button
        label="Terminer victorieusement"
        variant="primary"
        disabled={disabled}
        onPress={() => send({ type: "finish" })}
      />
      <Button
        label="Continuer en survie"
        disabled={disabled}
        onPress={() => send({ type: "survival" })}
      />
    </View>
  );
}

export function NativeSummary({
  view,
  disabled,
  send,
  onMenu,
}: PanelProps & { onMenu: () => void }) {
  return (
    <View style={s.card}>
      <Text style={s.kicker}>BILAN · GRAINE {view.seed}</Text>
      <Text style={s.title}>
        {view.officialVictory
          ? "Victoire officielle conservée"
          : view.endCause === "abandoned"
            ? "Run abandonnée"
            : "Fin de la run"}
      </Text>
      <Text style={s.target}>{view.score}</Text>
      <Text style={s.body}>
        {view.successes} réussites · {view.failures} échecs ·{" "}
        {view.defeatedBosses.length}/3 boss
      </Text>
      {view.endCause === "generation-unavailable" && (
        <Text style={s.error}>
          Aucune cible admissible dans les bornes. Aucune contrainte supprimée.
        </Text>
      )}
      <Button
        label="Préparer une nouvelle run"
        variant="primary"
        disabled={disabled}
        onPress={() => send({ type: "home" })}
      />
      <Button label="Retour au menu" onPress={onMenu} />
    </View>
  );
}

export function NativeBuild({ view, disabled, send }: PanelProps) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Votre build</Text>
      {!view.effects.length && (
        <Text style={s.caption}>Aucune carte active.</Text>
      )}
      {view.effects.map((effect) => {
        const card = cardDescription(effect.id, effect.level);
        return (
          <View key={effect.id} style={s.effect}>
            <Text style={s.bold}>
              {card.name}
              {effect.level > 1 ? " II" : ""}
            </Text>
            <Text style={s.caption}>
              {effectDuration(effect.id, effect.remaining)}
              {effect.shieldUsed ? " · protection utilisée" : ""}
            </Text>
            <Text style={s.gain}>{card.advantage}</Text>
            <Text style={s.body}>{card.drawback}</Text>
          </View>
        );
      })}
    </View>
  );
}
