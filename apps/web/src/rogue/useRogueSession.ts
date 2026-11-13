import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RogueWebController } from "./controller";
import type { WebAction } from "./controller";
import { rogueWebStorage } from "./storage";

export function useRogueSession() {
  const [controller] = useState(
    () =>
      new RogueWebController(
        {
          now: () => performance.now(),
          schedule: (callback, milliseconds) =>
            window.setTimeout(callback, milliseconds),
          cancel: (handle) => window.clearTimeout(handle as number),
        },
        rogueWebStorage,
      ),
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
    controller.attach();
    void controller.hydrate();
    const interval = window.setInterval(controller.refresh, 250);
    const visibility = () => {
      if (document.hidden) controller.suspend();
      else void controller.wake();
    };
    const focus = () => {
      void controller.wake();
    };
    const pageHide = () => controller.suspend();
    window.addEventListener("focus", focus);
    window.addEventListener("blur", controller.suspend);
    window.addEventListener("pagehide", pageHide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(pending.current);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", controller.suspend);
      window.removeEventListener("pagehide", pageHide);
      document.removeEventListener("visibilitychange", visibility);
      controller.dispose();
    };
  }, [controller]);
  function send(action: WebAction) {
    if (busyRef.current || !view.hydrated) return;
    setError("");
    busyRef.current = true;
    setBusy(true);
    const revision = view.revision;
    // Let the browser paint the disabled/loading state before bounded generation/draft searches.
    pending.current = window.setTimeout(async () => {
      try {
        await controller.dispatch(action, revision);
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
