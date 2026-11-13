import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RogueWebController } from "./controller";
import type { WebAction } from "./controller";

export function useRogueSession() {
  const [controller] = useState(
    () =>
      new RogueWebController({
        now: () => performance.now(),
        schedule: (callback, milliseconds) =>
          window.setTimeout(callback, milliseconds),
        cancel: (handle) => window.clearTimeout(handle as number),
      }),
  );
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => {
    const interval = window.setInterval(controller.refresh, 250);
    window.addEventListener("focus", controller.refresh);
    document.addEventListener("visibilitychange", controller.refresh);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(pending.current);
      window.removeEventListener("focus", controller.refresh);
      document.removeEventListener("visibilitychange", controller.refresh);
      controller.dispose();
    };
  }, [controller]);
  function send(action: WebAction) {
    if (busyRef.current) return;
    setError("");
    busyRef.current = true;
    setBusy(true);
    const revision = view.revision;
    // Let the browser paint the disabled/loading state before bounded generation/draft searches.
    pending.current = window.setTimeout(() => {
      try {
        controller.dispatch(action, revision);
      } catch {
        setError(
          "Cette action a rencontré une erreur. Abandonnez puis relancez une run si le problème persiste.",
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    }, 20);
  }
  return { view, busy, send, controller, error };
}
