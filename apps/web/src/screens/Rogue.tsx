import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, Swords, X } from "lucide-react";
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
  const { view, busy, send, controller, error } = useRogueSession();
  const navigate = useNavigate();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLElement>(null);
  const shouldBlock = useCallback(() => controller.isActive(), [controller]);
  const blocker = useBlocker({
    shouldBlockFn: shouldBlock,
    enableBeforeUnload: shouldBlock,
    withResolver: true,
  });
  const showConfirmation = confirmAbandon || blocker.status === "blocked";
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
    if (blocker.status === "blocked") blocker.reset();
  }
  function abandon() {
    controller.dispatch({ type: "abandon" }, controller.getSnapshot().revision);
    setConfirmAbandon(false);
    if (blocker.status === "blocked") blocker.proceed();
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
        aria-busy={busy}
      >
        {hasRun && <RogueProgress view={view} />}
        {busy && (
          <p className="rogue-loading" role="status">
            <LoaderCircle size={15} aria-hidden="true" />
            Préparation en cours…
          </p>
        )}
        {(error || view.message) && (
          <p className="rogue-error" role="alert">
            {error || view.message}
          </p>
        )}
        <div
          className={
            hasRun
              ? `rogue-game-grid${view.screen === "reward" ? " rogue-draft-layout" : ""}`
              : ""
          }
        >
          <div className="rogue-main-panel">
            {view.screen === "home" && <RogueWelcome busy={busy} send={send} />}
            {(view.screen === "preparation" || view.screen === "playing") &&
              view.puzzle && (
                <RoguePuzzle view={view} busy={busy} send={send} />
              )}
            {view.screen === "result" && (
              <RogueResult view={view} busy={busy} send={send} />
            )}
            {view.screen === "reward" && (
              <RogueRewards
                view={view}
                busy={busy}
                choose={(index) => send({ type: "choose", index })}
              />
            )}
            {view.screen === "victory" && (
              <RogueVictory busy={busy} send={send} />
            )}
            {view.screen === "ended" && (
              <RogueSummary
                view={view}
                busy={busy}
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
        Rogue V1 · Progression et score locaux · Session non sauvegardée
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
        <h2 id="rogue-dialog-title">Abandonner cette run ?</h2>
        <p>
          Votre progression ne pourra pas être reprise.
          {view.officialVictory
            ? " Votre victoire officielle reste acquise dans le bilan."
            : ""}{" "}
          Le chronomètre continue tant que le puzzle est en jeu.
        </p>
        <Button autoFocus onClick={cancelAbandon}>
          Continuer la run
        </Button>
        <Button variant="primary" onClick={abandon}>
          Confirmer l’abandon
        </Button>
      </dialog>
    </div>
  );
}
