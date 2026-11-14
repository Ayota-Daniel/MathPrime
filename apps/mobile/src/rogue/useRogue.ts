import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RogueController } from "@shortest/engine/rogue-v1/controller";
import type { RogueAction } from "@shortest/engine/rogue-v1/controller";
import { createNativeRogueStorage } from "./adapter";

const adapter = createNativeRogueStorage(AsyncStorage);
export function useRogue() {
  const [controller] = useState(
    () =>
      new RogueController(
        {
          now: () =>
            (
              globalThis as unknown as { performance: { now(): number } }
            ).performance.now(),
          schedule: (callback, ms) => setTimeout(callback, ms),
          cancel: (handle) =>
            clearTimeout(handle as ReturnType<typeof setTimeout>),
        },
        adapter,
      ),
  );
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  useEffect(() => {
    controller.attach();
    void controller.hydrate();
    const timer = setInterval(controller.refresh, 250);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void controller.wake();
      else controller.suspend();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      controller.dispose();
    };
  }, [controller]);
  async function send(action: RogueAction) {
    if (locked.current || !view.hydrated) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const confirmedReplacement = action.type === "new" && action.replace;
      const revision =
        action.type === "abandon" || confirmedReplacement
          ? controller.getSnapshot().revision
          : view.revision;
      await controller.dispatch(action, revision);
    } catch {
      setError(
        "Cette action a échoué. Réessayez ou revenez au menu pour reprendre la sauvegarde.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { view, controller, busy, error, send };
}
