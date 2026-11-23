import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, CircleHelp, History, RotateCcw } from "lucide-react";
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

const darkPanelClasses =
  "rogue-dark-surface rounded-rogue-panel border border-rogue-line bg-rogue-surface p-7 text-rogue-ink max-[700px]:px-4 max-[700px]:py-5";

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
    <section aria-label="Historique des runs" className={darkPanelClasses}>
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
function RogueTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const lastStep = EXPRESSION_TUTORIAL.length - 1;
  const finished = step === lastStep;
  function restart() {
    setStep(0);
    setRound(round + 1);
  }
  return (
    <section className="rogue-lesson" aria-labelledby="lesson-title">
      <h1 id="lesson-title">Comment jouer</h1>
      <p className="rogue-lesson-count">
        Didacticiel du pavé · Étape {Math.min(step + 1, lastStep)} sur{" "}
        {lastStep}
      </p>
      <progress aria-label="Étapes terminées" value={step} max={lastStep} />
      <p role="status" className="rogue-lesson-instruction">
        {EXPRESSION_TUTORIAL[step]}
      </p>
      {finished ? (
        <Button
          autoFocus
          variant="primary"
          className="w-full"
          onClick={onClose}
        >
          C’est compris
        </Button>
      ) : (
        <RogueExpressionInput
          key={round}
          rules={DEFAULT_CONFIG.rules}
          busy={false}
          onEdit={(text) =>
            setStep((current) => advanceTutorial(current, text))
          }
          onSubmit={(text) =>
            setStep((current) => advanceTutorial(current, text, true))
          }
        />
      )}
      <div className="rogue-lesson-footer">
        <p>Entraînement libre, sans chronomètre ni perte de vie.</p>
        <Button icon={<RotateCcw size={16} />} onClick={restart}>
          Rejouer le didacticiel
        </Button>
      </div>
    </section>
  );
}

export function RogueExtras({
  children,
  entries,
  busy,
  onDelete,
}: {
  children: ReactNode;
  entries: RunArchive[];
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const [panel, setPanel] = useState<"history" | "tutorial" | null>(null);
  const opener = useRef<"history" | "tutorial">("tutorial");
  function close() {
    setPanel(null);
    requestAnimationFrame(() =>
      document.getElementById(`open-${opener.current}`)?.focus(),
    );
  }
  function open(next: "history" | "tutorial") {
    opener.current = next;
    setPanel(next);
  }
  if (panel) {
    return (
      <div className="rogue-extras rogue-reading">
        <Button
          className="rogue-back"
          autoFocus={panel === "history"}
          icon={<ArrowLeft size={18} />}
          onClick={close}
        >
          Retour à Rogue
        </Button>
        {panel === "history" ? (
          <RogueHistory entries={entries} busy={busy} onDelete={onDelete} />
        ) : (
          <RogueTutorial onClose={close} />
        )}
      </div>
    );
  }
  return (
    <>
      <nav className="rogue-home-tools" aria-label="Aide et historique Rogue">
        <Button
          id="open-tutorial"
          icon={<CircleHelp size={18} />}
          onClick={() => open("tutorial")}
        >
          Didacticiel du pavé
        </Button>
        <Button
          id="open-history"
          icon={<History size={17} />}
          onClick={() => open("history")}
        >
          Historique des runs ({entries.length})
        </Button>
      </nav>
      {children}
    </>
  );
}
