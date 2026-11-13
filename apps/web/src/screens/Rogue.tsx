import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, Swords, X } from "lucide-react";
import type { WebAction } from "../rogue/controller";
import { useRogueSession } from "../rogue/useRogueSession";
import { ActiveEffects, RogueRewards } from "../components/rogue/RogueCards";
import { RoguePuzzle } from "../components/rogue/RoguePuzzle";
import {
  RogueProgress,
  RogueResult,
  RogueSummary,
  RogueVictory,
  RogueWelcome,
} from "../components/rogue/RoguePanels";
import { Button } from "../components/ui";
import { audio } from "../lib/audio";
import "../rogue/rogue.css";

export function Rogue() {
  const { view, busy, send: perform, controller, error } = useRogueSession();
  const navigate = useNavigate();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [replacement, setReplacement] = useState<number | null>(null);
  const [deciding, setDeciding] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLElement>(null);
  const shouldBlock = useCallback(() => controller.isActive(), [controller]);
  const blocker = useBlocker({
    shouldBlockFn: shouldBlock,
    enableBeforeUnload: false,
    withResolver: true,
  });
  const showConfirmation =
    confirmAbandon || replacement !== null || blocker.status === "blocked";
  useEffect(() => {
    if (showConfirmation && !dialog.current?.open) dialog.current?.showModal();
    else if (!showConfirmation && dialog.current?.open) dialog.current.close();
  }, [showConfirmation]);
  useEffect(() => {
    container.current?.querySelector<HTMLElement>("#rogue-title")?.focus();
  }, [view.screen, view.stage]);
  useEffect(() => {
    audio.switchMusic("rogue");
  }, []);
  function cancelAbandon() {
    setConfirmAbandon(false);
    setReplacement(null);
    if (blocker.status === "blocked") blocker.reset();
  }
  function send(action: WebAction) {
    if (
      action.type === "new" &&
      (view.hasSaved || view.storageNotice || controller.isActive())
    )
      setReplacement(action.seed);
    else perform(action);
  }
  async function confirm() {
    setDeciding(true);
    try {
      if (replacement !== null)
        await controller.dispatch(
          { type: "new", seed: replacement, replace: true },
          controller.getSnapshot().revision,
        );
      else if (blocker.status === "blocked") {
        controller.suspend();
        blocker.proceed();
      } else
        await controller.dispatch(
          { type: "abandon" },
          controller.getSnapshot().revision,
        );
      if (!controller.getSnapshot().storageError) {
        setConfirmAbandon(false);
        setReplacement(null);
      }
    } finally {
      setDeciding(false);
    }
  }
  const hasRun = view.screen !== "home";
  return (
    <div className="rogue-web">
      <header className="rogue-header">
        <Link to="/" className="rogue-brand">
          <span className="rogue-brand-symbol">
            <Swords size={19} aria-hidden="true" />
          </span>
          <span>
            Shortest<small>MathPrime · Rogue</small>
          </span>
        </Link>
        {controller.isActive() ? (
          <button
            className="rogue-exit"
            onClick={() => setConfirmAbandon(true)}
            disabled={busy}
          >
            <X size={16} aria-hidden="true" />
            Abandonner
          </button>
        ) : (
          <Link to="/" className="rogue-exit">
            <ArrowLeft size={16} aria-hidden="true" />
            Menu
          </Link>
        )}
      </header>
      <main
        ref={container}
        className={`rogue-main${view.phase.boss && ["preparation", "playing"].includes(view.screen) ? " rogue-boss" : ""}`}
        aria-busy={busy || !view.hydrated}
      >
        {hasRun && <RogueProgress view={view} />}
        {(busy || !view.hydrated) && (
          <p className="rogue-loading" role="status">
            <LoaderCircle size={15} aria-hidden="true" />
            Préparation en cours…
          </p>
        )}
        {(error || view.message || view.storageError) && (
          <p className="rogue-error" role="alert">
            {error || view.message || view.storageError}
          </p>
        )}
        {view.storageError && (
          <Button onClick={() => perform({ type: "retry" })} disabled={busy}>
            Réessayer la sauvegarde
          </Button>
        )}
        {view.storageNotice && <p role="status">{view.storageNotice}</p>}
        <div
          className={
            hasRun
              ? `rogue-game-grid${view.screen === "reward" ? " rogue-draft-layout" : ""}`
              : ""
          }
        >
          <div className="rogue-main-panel">
            {view.screen === "home" && (
              <RogueWelcome
                view={view}
                busy={busy || !view.hydrated || Boolean(view.storageError)}
                send={send}
              />
            )}
            {(view.screen === "preparation" || view.screen === "playing") &&
              view.puzzle && (
                <RoguePuzzle
                  view={view}
                  busy={busy || Boolean(view.storageError)}
                  send={send}
                />
              )}
            {view.screen === "result" && (
              <RogueResult
                view={view}
                busy={busy || Boolean(view.storageError)}
                send={send}
              />
            )}
            {view.screen === "reward" && (
              <RogueRewards
                view={view}
                busy={busy || Boolean(view.storageError)}
                choose={(index) => send({ type: "choose", index })}
              />
            )}
            {view.screen === "victory" && (
              <RogueVictory
                busy={busy || Boolean(view.storageError)}
                send={send}
              />
            )}
            {view.screen === "ended" && (
              <RogueSummary
                view={view}
                busy={busy || Boolean(view.storageError)}
                send={send}
                onMenu={() => {
                  void navigate({ to: "/" });
                }}
              />
            )}
          </div>
          {hasRun && (
            <aside className="rogue-sidebar">
              <ActiveEffects effects={view.effects} />
              <div className="rogue-side-note">
                <span>Visez juste. Puis plus court.</span>
                <p>
                  Les étoiles récompensent la longueur de votre réponse sous les
                  contraintes actives. Aucun bonus général de vitesse.
                </p>
              </div>
            </aside>
          )}
        </div>
      </main>
      <footer className="rogue-footer">
        Rogue V1 · Sauvegarde automatique locale · Aucune synchronisation cloud
      </footer>
      <dialog
        ref={dialog}
        className="rogue-dialog"
        aria-labelledby="rogue-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          cancelAbandon();
        }}
      >
        <h2 id="rogue-dialog-title">
          {replacement !== null
            ? "Remplacer la session enregistrée ?"
            : blocker.status === "blocked"
              ? "Revenir au menu ?"
              : "Abandonner cette run ?"}
        </h2>
        <p>
          {replacement !== null
            ? "L’ancienne session sera remplacée par une nouvelle run."
            : blocker.status === "blocked"
              ? view.storageError
                ? "Seul un état déjà enregistré pourra être repris. L’action en erreur ne peut pas être garantie."
                : "Votre progression est sauvegardée. Vous pourrez continuer sur cet appareil."
              : "La run sera terminée et son bilan conservé."}{" "}
          Le temps continue pendant un puzzle, y compris hors de cet écran.
        </p>
        {view.storageError && <p role="alert">{view.storageError}</p>}
        <Button autoFocus disabled={deciding} onClick={cancelAbandon}>
          Annuler
        </Button>
        <Button
          variant="primary"
          disabled={deciding}
          onClick={() => {
            void confirm();
          }}
        >
          {replacement !== null
            ? "Remplacer et démarrer"
            : blocker.status === "blocked"
              ? view.storageError
                ? "Quitter cet écran"
                : "Quitter et conserver"
              : "Confirmer l’abandon"}
        </Button>
      </dialog>
    </div>
  );
}
