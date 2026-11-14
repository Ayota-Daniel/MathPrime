import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  ARCHIVE_STATUS_LABELS,
  CARDS,
  DEFAULT_CONFIG,
  EXPRESSION_TUTORIAL,
  advanceTutorial,
  describeViolation,
} from "@shortest/engine/rogue-v1";
import type { RuleViolation, RunArchive } from "@shortest/engine/rogue-v1";
import { Button } from "../components/ui";
import { NativeExpressionInput } from "./RogueInput";
import { s } from "./styles";

export function NativeDiagnostics({ errors }: { errors: RuleViolation[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!errors.length) return null;
  return (
    <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
      <Text style={s.error}>{describeViolation(errors[0])}</Text>
      {errors.length > 1 && (
        <Button
          label={
            expanded
              ? "Masquer les autres erreurs"
              : `Autres règles non respectées (${errors.length - 1})`
          }
          onPress={() => setExpanded(!expanded)}
        />
      )}
      {expanded &&
        errors.slice(1).map((error, index) => (
          <Text key={index} style={s.body}>
            {describeViolation(error)}
          </Text>
        ))}
    </View>
  );
}
function NativeHistory({
  entries,
  disabled,
  onDelete,
}: {
  entries: RunArchive[];
  disabled: boolean;
  onDelete: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.title}>Historique des runs</Text>
      <Text style={s.caption}>
        Les 50 dernières runs de cet appareil. Les plus anciennes sont
        remplacées lorsque cette limite est atteinte.
      </Text>
      {!entries.length && <Text style={s.body}>Aucune run archivée.</Text>}
      {entries.map((entry) => (
        <View key={entry.id} style={s.card}>
          <Text style={s.bold}>
            {ARCHIVE_STATUS_LABELS[entry.status]} · Graine {entry.seed} ·{" "}
            {entry.score} points
          </Text>
          <Text style={s.caption}>
            {new Date(entry.date).toLocaleString("fr-FR")}
          </Text>
          <Button
            label={
              selected === entry.id
                ? "Réduire le résumé"
                : `Consulter la run ${entry.seed}`
            }
            onPress={() => setSelected(selected === entry.id ? null : entry.id)}
          />
          {selected === entry.id && (
            <>
              <Text style={s.body}>
                Actes : {entry.acts.join(", ") || "aucun"} · {entry.successes}{" "}
                réussites · {entry.failures} échecs · {entry.bosses.length}/3
                boss
              </Text>
              <Text style={s.body}>
                Boss vaincus : {entry.bosses.join(", ") || "aucun"}
              </Text>
              <Text style={s.body}>
                Cartes :{" "}
                {entry.cards
                  .map(
                    (card) => `${CARDS[card.id].name} (niveau ${card.level})`,
                  )
                  .join(", ") || "aucune"}
              </Text>
              <Button
                label="Supprimer cette archive"
                disabled={disabled}
                onPress={() =>
                  Alert.alert(
                    "Supprimer cette archive ?",
                    `Supprimer définitivement le résumé de graine ${entry.seed} ? La session active et les autres archives seront conservées.`,
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Supprimer",
                        style: "destructive",
                        onPress: () => onDelete(entry.id),
                      },
                    ],
                  )
                }
              />
            </>
          )}
        </View>
      ))}
    </View>
  );
}
function NativeTutorial() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  return (
    <View style={s.card}>
      <Text style={s.title}>Didacticiel du pavé</Text>
      <Text style={s.caption}>
        Aucun chronomètre, aucune vie ni sauvegarde de run modifiée.
      </Text>
      <Text style={s.body} accessibilityLiveRegion="polite">
        {EXPRESSION_TUTORIAL[step]}
      </Text>
      {step < 5 && (
        <NativeExpressionInput
          key={round}
          rules={DEFAULT_CONFIG.rules}
          busy={false}
          practice
          onEdit={(text) =>
            setStep((current) => advanceTutorial(current, text))
          }
          onSubmit={(text) =>
            setStep((current) => advanceTutorial(current, text, true))
          }
        />
      )}
      <Button
        label="Rejouer le didacticiel"
        onPress={() => {
          setStep(0);
          setRound(round + 1);
        }}
      />
    </View>
  );
}
export function NativeExtras({
  entries,
  disabled,
  onDelete,
}: {
  entries: RunArchive[];
  disabled: boolean;
  onDelete: (id: string) => void;
}) {
  const [panel, setPanel] = useState<"history" | "tutorial" | null>(null);
  return (
    <View style={{ gap: 16 }}>
      <Button
        label={`Historique des runs (${entries.length})`}
        onPress={() => setPanel(panel === "history" ? null : "history")}
      />
      <Button
        label="Didacticiel du pavé"
        onPress={() => setPanel(panel === "tutorial" ? null : "tutorial")}
      />
      {panel === "history" && (
        <NativeHistory
          entries={entries}
          disabled={disabled}
          onDelete={onDelete}
        />
      )}
      {panel === "tutorial" && <NativeTutorial />}
    </View>
  );
}
