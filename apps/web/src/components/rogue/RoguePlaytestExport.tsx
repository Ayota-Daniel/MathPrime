import { useState } from "react";
import {
  EMPTY_HUMAN_FEEDBACK,
  HUMAN_DIFFICULTIES,
  HUMAN_REASONS,
} from "@shortest/engine/rogue-v1";
import type {
  HumanFeedback,
  HumanPlaytestReport,
} from "@shortest/engine/rogue-v1";
import { Button } from "../ui";

export function RoguePlaytestExport({
  report,
  disabled,
}: {
  report: (feedback: HumanFeedback) => HumanPlaytestReport;
  disabled: boolean;
}) {
  const [feedback, setFeedback] = useState(EMPTY_HUMAN_FEEDBACK);
  const [error, setError] = useState("");
  function download() {
    try {
      const data = JSON.stringify(report(feedback), null, 2);
      const url = URL.createObjectURL(
        new Blob([data], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "mathprime-rogue-playtest.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
    } catch {
      setError("Export indisponible. Vérifiez la sauvegarde locale.");
    }
  }
  return (
    <details className="rogue-side-note">
      <summary>Mesures de playtest (facultatif)</summary>
      <p>
        Session enregistrée uniquement. Exportez avant de la remplacer :
        l’historique conserve seulement les résumés. Aucun envoi automatique,
        aucune information personnelle.
      </p>
      <label>
        {" "}
        Difficulté ressentie{" "}
        <select
          value={feedback.difficulty}
          disabled={disabled}
          onChange={(event) =>
            setFeedback({
              ...feedback,
              difficulty: event.target.value as HumanFeedback["difficulty"],
            })
          }
        >
          {Object.entries(HUMAN_DIFFICULTIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        {" "}
        Motif de difficulté ou d’abandon{" "}
        <select
          value={feedback.reason}
          disabled={disabled}
          onChange={(event) =>
            setFeedback({
              ...feedback,
              reason: event.target.value as HumanFeedback["reason"],
            })
          }
        >
          {Object.entries(HUMAN_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Button onClick={download} disabled={disabled}>
        Télécharger les mesures JSON
      </Button>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
