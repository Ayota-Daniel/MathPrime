import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import {
  EMPTY_HUMAN_FEEDBACK,
  HUMAN_DIFFICULTIES,
  HUMAN_REASONS,
} from "@shortest/engine/rogue-v1";
import type {
  HumanFeedback,
  HumanPlaytestReport,
} from "@shortest/engine/rogue-v1";
import { Button } from "../components/ui";
import { s } from "./styles";

function Choices({
  title,
  values,
  selected,
  disabled,
  choose,
}: {
  title: string;
  values: Record<string, string>;
  selected: string;
  disabled: boolean;
  choose: (key: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.body}>{title}</Text>
      {Object.entries(values).map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === key, disabled }}
          disabled={disabled}
          onPress={() => choose(key)}
          style={{ padding: 12 }}
        >
          <Text style={s.body}>
            {selected === key ? "◉" : "○"} {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function NativePlaytestExport({
  report,
  disabled,
}: {
  report: (feedback: HumanFeedback) => HumanPlaytestReport;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_HUMAN_FEEDBACK);
  const [error, setError] = useState("");
  async function exportReport() {
    try {
      await Share.share({
        title: "Mesures Rogue",
        message: JSON.stringify(report(feedback), null, 2),
      });
      setError("");
    } catch {
      setError("Export indisponible. Vérifiez la sauvegarde locale.");
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Button
        label="Mesures de playtest (facultatif)"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <View style={s.card}>
          <Text style={s.caption}>
            Session enregistrée uniquement. Exportez avant de la remplacer :
            l’historique conserve seulement les résumés. Aucune information
            personnelle. Aucun envoi automatique : choisissez vous-même une
            destination dans la fenêtre Android.
          </Text>
          <Choices
            title="Difficulté ressentie"
            values={HUMAN_DIFFICULTIES}
            selected={feedback.difficulty}
            disabled={disabled}
            choose={(difficulty) =>
              setFeedback({
                ...feedback,
                difficulty: difficulty as HumanFeedback["difficulty"],
              })
            }
          />
          <Choices
            title="Motif de difficulté ou d’abandon"
            values={HUMAN_REASONS}
            selected={feedback.reason}
            disabled={disabled}
            choose={(reason) =>
              setFeedback({
                ...feedback,
                reason: reason as HumanFeedback["reason"],
              })
            }
          />
          <Button
            label="Exporter les mesures JSON"
            disabled={disabled}
            onPress={() => {
              void exportReport();
            }}
          />
          {error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
