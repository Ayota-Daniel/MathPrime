import { useEffect, useState } from "react";
import { Text, View, TextInput, useWindowDimensions } from "react-native";
import { NativeDiagnostics } from "./Extras";
import {
  CARDS,
  presentCard,
  offeredMultiplicationLimit,
} from "@shortest/engine/rogue-v1";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { Button, Stars } from "./ui";
import { RogueInput } from "./RogueInput";
import {
  BOSS_NAMES,
  constraints,
  effectDuration,
  offerDescription,
} from "./presentation";
import { s } from "./styles";
import { Swords, Trophy } from "lucide-react-native";
import type { Offer } from "@shortest/engine/rogue-v1";
import { rogue } from "@shortest/tokens";
import { RC } from "../theme";
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
            {__DEV__ && `Graine ${view.savedSummary?.seed} · `} {view.savedSummary?.score} points
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
        {__DEV__ && <><Text style={s.label}>Graine de run</Text>
        <TextInput
          accessibilityLabel="Graine de run"
          value={seed}
          onChangeText={setSeed}
          keyboardType="number-pad"
          maxLength={10}
          style={s.seed}
        /></>}
        <Button
          label="Nouvelle run"
          variant="primary"
          disabled={
            disabled || (__DEV__ && (!/^\d+$/.test(seed) || Number(seed) > 0xffffffff))
          }
          onPress={() => send({ type: "new", seed: __DEV__ ? Number(seed) : undefined })}
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

export function NativePuzzle({
  view,
  disabled,
  send,
  onHint,
}: PanelProps & { onHint: () => void }) {
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  const puzzle = view.puzzle!;
  const preparing = puzzle.state === "preparation";
  const [showRules, setShowRules] = useState(puzzle.introduction === "run");
  useEffect(() => {
    setShowRules(
      puzzle.state === "preparation" && puzzle.introduction === "run",
    );
  }, [puzzle.state, puzzle.introduction, view.stage]);
  if (!preparing) {
    const frac = puzzle.seconds > 0 ? Math.max(0, Math.min(1, view.remaining / puzzle.seconds)) : 0;
    const critical = view.remaining <= 5;
    const chips = compactConstraints(view);
    return (
      <View style={{ gap: comfortable ? 12 : 8 }}>
        <View style={s.targetCard}>
          <Text style={s.label}>CIBLE</Text>
          <Text style={[s.liveTarget, comfortable && { fontSize: 64, lineHeight: 70 }]}>
            {puzzle.target}
          </Text>
          <View
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`${view.remaining} secondes restantes`}
            style={s.timeRow}
          >
            <View style={s.timeTrack}>
              <View
                style={[
                  s.timeFill,
                  { width: `${frac * 100}%` },
                  critical && { backgroundColor: RC.error },
                ]}
              />
            </View>
            <Text style={[s.liveTime, critical && { color: RC.error }]}>
              {view.remaining} s
            </Text>
          </View>
        </View>
        <View style={s.chips}>
          <Text style={s.chip}>Sans parenthèses</Text>
          <Text style={s.chip}>× avant + et −</Text>
          {chips.map((label) => (
            <Text key={label} style={[s.chip, s.chipRule]}>
              {label}
            </Text>
          ))}
        </View>
        <RogueInput
          key={`${view.seed}-${view.stage}`}
          view={view}
          busy={disabled}
          send={send}
          onHint={onHint}
        />
      </View>
    );
  }
  return (
    <View style={[s.card, view.phase.boss && s.boss]}>
      {view.phase.boss && <Swords size={40} color={RC.gold} />}
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
      <Text style={s.caption}>
        Cible masquée jusqu’au démarrage du chronomètre.
      </Text>
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
    </View>
  );
}

function compactConstraints(view: RogueView): string[] {
  const puzzle = view.puzzle!;
  const rules = puzzle.rules;
  const labels = Object.entries(rules.minimumOccurrences)
    .filter(([, count]) => count > 0)
    .map(([digit, count]) => `${digit} : au moins ${count}`);
  if (rules.requireSubtraction) labels.push("Soustraction requise");
  if (rules.maxMultiplications !== null)
    labels.push(`× : maximum ${rules.maxMultiplications}`);
  if (puzzle.minimumStars > 1)
    labels.push(`Minimum ${puzzle.minimumStars} étoiles`);
  return labels;
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
      {result.bossReward !== null && (
        <>
          <Text style={s.kicker}>JALON ATTEINT</Text>
          <Trophy size={44} color={RC.gold} />
          <Text style={s.heroTitle}>Acte {view.phase.act} terminé</Text>
        </>
      )}
      <Text accessibilityRole="header" style={s.title}>
        {result.success
          ? result.bossReward
            ? "Boss vaincu !"
            : "Cible atteinte !"
          : view.lives
            ? "Une nouvelle chance"
            : "Fin de parcours"}
      </Text>
      <NativeDiagnostics errors={result.diagnostics} />
      {!result.success && (
        <Text style={s.body}>
          {!result.diagnostics.length &&
            (FAILURE[result.cause ?? ""] ?? "Tentative terminée.")}
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
      {result.bossReward !== null && (
        <Text style={s.body}>
          Ce boss reste dans votre bilan.{" "}
          {view.phase.act < 3
            ? `Prochaine étape : acte ${view.phase.act + 1}.`
            : "Les trois boss sont vaincus."}
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
    <View style={{ gap: 8 }}>
      <Text style={s.kicker}>
        {view.majorReward ? "RÉCOMPENSE MAJEURE" : "CHOIX TACTIQUE"}
      </Text>
      <Text style={s.title}>Quel risque vaut la peine ?</Text>
      {view.offers.map((offer, index) => (
        <NativeOffer
          key={offer.id}
          offer={offer}
          index={index}
          view={view}
          disabled={disabled}
          send={send}
        />
      ))}
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
    </View>
  );
}
function NativeOffer({
  offer,
  index,
  view,
  disabled,
  send,
}: PanelProps & { offer: Offer; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const card = offerDescription(offer, view.effects);
  return (
    <View
      style={[
        s.offer,
        {
          borderLeftWidth: 4,
          borderLeftColor:
            offer.card[0] === "D"
              ? RC.operator
              : offer.card[0] === "T"
                ? RC.gold
                : RC.coral,
        },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.caption}>
            {card.operation} · {offer.card} · Niveau {card.level}
          </Text>
          <Text style={s.offerTitle}>{card.name}</Text>
          <Text style={s.gain}>{card.advantage}</Text>
          <Text style={s.caption}>{card.drawback}</Text>
          {offer.card === "D2" && (
            <Text style={s.rule}>
              Prochaine épreuve : maximum{" "}
              {offeredMultiplicationLimit(view.phase.difficulty, card.level)}{" "}
              multiplication(s).
            </Text>
          )}
          <Text style={s.caption}>{card.duration}</Text>
        </View>
        <View style={{ width: 88, gap: 6 }}>
          <Button
            label="Choisir"
            accessibilityLabel="Choisir cette carte"
            variant="primary"
            compact
            disabled={disabled}
            onPress={() => send({ type: "choose", index: index + 1 })}
          />
          {card.advanced && (
            <Button
              label={expanded ? "Réduire" : "Détails"}
              accessibilityLabel={`Aide avancée · ${card.name}`}
              compact
              onPress={() => setExpanded(!expanded)}
            />
          )}
        </View>
      </View>
      {expanded && <Text style={s.body}>{card.advanced}</Text>}
    </View>
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
      <Text style={s.kicker}>BILAN{__DEV__ && ` · GRAINE ${view.seed}`}</Text>
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
        const card = presentCard(effect.id, effect.level, view.puzzle?.rules);
        return (
          <View key={effect.id} style={s.effect}>
            <Text style={s.bold}>
              {card.name} · Niveau {effect.level}
            </Text>
            <Text style={s.caption}>
              {effectDuration(effect.id, effect.remaining)}
              {effect.shieldUsed ? " · protection utilisée" : ""}
            </Text>
            <Text style={s.gain}>{card.advantage}</Text>
            <Text style={s.body}>{card.drawback}</Text>
            {card.currentLimit && (
              <Text style={s.bold}>{card.currentLimit}</Text>
            )}
            {card.advanced && <CardHelp text={card.advanced} />}
          </View>
        );
      })}
    </View>
  );
}

function CardHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={open ? "Masquer l’aide avancée" : "Aide avancée"}
        onPress={() => setOpen(!open)}
      />
      {open && <Text style={s.caption}>{text}</Text>}
    </>
  );
}
