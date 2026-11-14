import { useState } from "react";
import {
  ARCHIVE_STATUS_LABELS,
  CARDS,
  DEFAULT_CONFIG,
  EXPRESSION_TUTORIAL,
  advanceTutorial,
  describeViolation,
} from "@shortest/engine/rogue-v1";
import type { RuleViolation, RunArchive } from "@shortest/engine/rogue-v1";
import { Button } from "../ui";
import { RogueExpressionInput } from "./RoguePuzzle";

export function RogueDiagnostics({ errors }: { errors: RuleViolation[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="rogue-error">
      <p>{describeViolation(errors[0])}</p>
      {errors.length > 1 && (
        <details>
          <summary>Autres règles non respectées ({errors.length - 1})</summary>
          <ul>
            {errors.slice(1).map((error, index) => (
              <li key={index}>{describeViolation(error)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
export function RogueHistory({
  entries,
  busy,
  onDelete,
}: {
  entries: RunArchive[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <section aria-label="Historique des runs" className="rogue-puzzle-panel">
      <h2>Historique des runs</h2>
      <p>
        Les 50 dernières runs sont conservées sur cet appareil. Les plus
        anciennes sont remplacées lorsque cette limite est atteinte.
      </p>
      {!entries.length && <p>Aucune run archivée.</p>}
      {entries.map((entry) => (
        <details key={entry.id} className="rogue-active-card">
          <summary>
            {ARCHIVE_STATUS_LABELS[entry.status]} · Graine {entry.seed} ·{" "}
            {entry.score} points ·{" "}
            {new Date(entry.date).toLocaleString("fr-FR")}
          </summary>
          <p>
            Actes : {entry.acts.join(", ") || "aucun"} · {entry.successes}{" "}
            réussites · {entry.failures} échecs · {entry.bosses.length}/3 boss
          </p>
          <p>Boss vaincus : {entry.bosses.join(", ") || "aucun"}</p>
          <p>
            Cartes :{" "}
            {entry.cards
              .map((card) => `${CARDS[card.id].name} (niveau ${card.level})`)
              .join(", ") || "aucune"}
          </p>
          <Button disabled={busy} onClick={() => setPending(entry.id)}>
            Supprimer cette archive
          </Button>
          {pending === entry.id && (
            <div role="alertdialog" aria-label="Supprimer cette archive ?">
              <p>
                Supprimer définitivement cette archive de graine {entry.seed} ?
                La session active et les autres archives seront conservées.
              </p>
              <Button
                autoFocus
                disabled={busy}
                onClick={() => setPending(null)}
              >
                Annuler
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  onDelete(entry.id);
                  setPending(null);
                }}
              >
                Confirmer la suppression
              </Button>
            </div>
          )}
        </details>
      ))}
    </section>
  );
}
function RogueTutorial() {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  return (
    <section aria-label="Didacticiel du pavé" className="rogue-puzzle-panel">
      <h2>Didacticiel du pavé</h2>
      <p>Aucun chronomètre, aucune vie ni sauvegarde de run modifiée.</p>
      <p role="status">{EXPRESSION_TUTORIAL[step]}</p>
      {step < 5 && (
        <RogueExpressionInput
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
        onClick={() => {
          setStep(0);
          setRound(round + 1);
        }}
      >
        Rejouer le didacticiel
      </Button>
    </section>
  );
}
export function RogueExtras({
  entries,
  busy,
  onDelete,
}: {
  entries: RunArchive[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [panel, setPanel] = useState<"history" | "tutorial" | null>(null);
  return (
    <div className="rogue-extras">
      <div className="rogue-input-tools">
        <Button
          onClick={() => setPanel(panel === "history" ? null : "history")}
        >
          Historique des runs ({entries.length})
        </Button>
        <Button
          onClick={() => setPanel(panel === "tutorial" ? null : "tutorial")}
        >
          Didacticiel du pavé
        </Button>
      </div>
      {panel === "history" && (
        <RogueHistory entries={entries} busy={busy} onDelete={onDelete} />
      )}
      {panel === "tutorial" && <RogueTutorial />}
    </div>
  );
}
