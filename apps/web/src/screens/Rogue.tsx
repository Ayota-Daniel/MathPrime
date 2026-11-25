import type { CSSProperties } from "react";
import { rogue, rogueThemeById } from "@shortest/tokens";
import { useGame } from "../store/game";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flag as FlagIcon, LoaderCircle, LogOut, Swords } from "lucide-react";
import type { WebAction } from "../rogue/controller";
import { useRogueSession } from "../rogue/useRogueSession";
import { ActiveEffects, RogueRewards } from "../components/rogue/RogueCards";
import { RogueExtras, RogueDiagnostics } from "../components/rogue/RogueExtras";
import { RogueProgress } from "../components/rogue/RogueProgress";
import { RoguePuzzle } from "../components/rogue/RoguePuzzle";
import {
  RogueResult,
  RogueSummary,
  RogueVictory,
  RogueWelcome,
} from "../components/rogue/RoguePanels";
import { Button } from "../components/ui";
import { audio } from "../lib/audio";
import "../rogue/rogue.css";
import { RoguePlaytestExport } from "../components/rogue/RoguePlaytestExport";

/** Variables `--r-*` de la page Rogue choisie dans les réglages (Ardoise par défaut). */
function rogueVars(id: string): CSSProperties {
  const colors = { ...rogue.colors, ...rogueThemeById(id).colors };
  return {
    ...Object.fromEntries(Object.entries(colors).map(([name, color]) => [`--r-${name}`, color])),
    "--r-controlRadius": `${rogue.radius.control}px`,
    "--r-heroRadius": `${rogue.radius.hero}px`,
    "--r-motion": `${rogue.transitionMs}ms`,
  } as CSSProperties;
}

export function Rogue() {
  const { view, busy, send: perform, controller, error } = useRogueSession();
  const navigate = useNavigate();
  const rogueTheme = useGame((s) => s.settings.rogueTheme);
  const theme = useMemo(() => rogueVars(rogueTheme), [rogueTheme]);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [replacement, setReplacement] = useState<Extract<WebAction, { type: "new" }> | null>(null);
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
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      container.current
        ?.querySelector<HTMLElement>(
          view.screen === "playing" ? "#rogue-expression" : "#rogue-title",
        )
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
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
      setReplacement(action);
    else perform(action);
  }
  async function confirm() {
    setDeciding(true);
    try {
      if (replacement !== null)
        await controller.dispatch(
          { type: "new", seed: replacement.seed, replace: true },
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
  const playtestExport = import.meta.env?.DEV && view.hasSaved && (
    <RoguePlaytestExport
      report={controller.exportPlaytest}
      disabled={busy || Boolean(view.storageError)}
    />
  );
  return (
    <div
      className={`rogue-web ${hasRun ? "rogue-in-run" : "rogue-at-home"}`}
      style={theme}
    >
      <header className="rogue-header">
        <Link to="/" className="rogue-brand">
          <span className="rogue-brand-symbol">
            {hasRun ? (
              <ArrowLeft size={21} aria-hidden="true" />
            ) : (
              <Swords size={22} aria-hidden="true" />
            )}
          </span>
          <span>{hasRun ? "Rogue" : "MathPrime"}</span>
        </Link>
        {controller.isActive() ? (
          <button
            className="rogue-exit rogue-danger"
            onClick={() => setConfirmAbandon(true)}
            disabled={busy}
          >
            <FlagIcon size={16} aria-hidden="true" />
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
        {(error ||
          (view.message && !view.diagnostics.length) ||
          view.storageError) && (
          <p className="rogue-error" role="alert">
            {error || view.message || view.storageError}
          </p>
        )}
        {view.storageError && (
          <Button onClick={() => perform({ type: "retry" })} disabled={busy}>
            Réessayer la sauvegarde
          </Button>
        )}
        <RogueDiagnostics errors={view.diagnostics} />
        {view.storageNotice && <p role="status">{view.storageNotice}</p>}
        <div
          className={
            hasRun
              ? `rogue-game-grid${view.screen === "reward" ? " rogue-draft-layout" : ""}${view.screen === "playing" ? " rogue-playing-layout" : ""}`
              : ""
          }
        >
          <div className="rogue-main-panel">
            {view.screen === "home" && view.hydrated && (
              <RogueExtras
                entries={view.history}
                busy={busy || Boolean(view.storageError)}
                onDelete={(id) => send({ type: "delete-archive", id })}
              >
                <RogueWelcome
                  view={view}
                  busy={busy || !view.hydrated || Boolean(view.storageError)}
                  send={send}
                />
                {playtestExport}
              </RogueExtras>
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
          {hasRun && view.screen !== "playing" && (
            <aside className="rogue-sidebar">
              <ActiveEffects
                effects={view.effects}
                rules={view.puzzle?.rules}
              />
            </aside>
          )}
        </div>
        {view.screen === "ended" && playtestExport}
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
        {(() => {
          const leaving = replacement === null && blocker.status === "blocked";
          return (
            <span className={`rogue-dialog-icon${leaving ? "" : " danger"}`} aria-hidden="true">
              {leaving ? <LogOut size={22} /> : <FlagIcon size={22} />}
            </span>
          );
        })()}
        <h2 id="rogue-dialog-title">
          {replacement !== null
            ? "Remplacer la session enregistrée ?"
            : blocker.status === "blocked"
              ? "Revenir au menu ?"
              : "Abandonner cette run ?"}
        </h2>
        <p>
          {replacement !== null
            ? "L’ancienne run sera archivée avant son remplacement. Une partie inachevée sera marquée interrompue."
            : blocker.status === "blocked"
              ? view.storageError
                ? "Seul un état déjà enregistré pourra être repris. L’action en erreur ne peut pas être garantie."
                : "Votre progression est sauvegardée. Vous pourrez continuer sur cet appareil."
              : "La run sera terminée et son bilan conservé."}{" "}
          Le temps continue pendant un puzzle, y compris hors de cet écran.
        </p>
        {view.storageError && <p role="alert">{view.storageError}</p>}
        <div className="rogue-dialog-actions">
        <Button autoFocus disabled={deciding} onClick={cancelAbandon}>
          {replacement === null && blocker.status !== "blocked" ? "Continuer" : "Annuler"}
        </Button>
        <Button
          variant={replacement === null && blocker.status === "blocked" ? "primary" : "ghost"}
          className={replacement === null && blocker.status === "blocked" ? "" : "rogue-danger-solid"}
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
              : "Abandonner"}
        </Button>
        </div>
      </dialog>
    </div>
  );
}
