import { useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Backdrop } from "../components/GameScreen";
import { StatusBar } from "expo-status-bar";
import { rogue } from "@shortest/tokens";
import { RC } from "../theme";
import { RogueDetails } from "../rogue/Details";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStack } from "../../App";
import type { RogueAction, RogueView } from "@shortest/engine/rogue-v1/controller";
import { Button, ConfirmDialog, Counters, Segments } from "../rogue/ui";
import { useRogue } from "../rogue/useRogue";
import {
  NativeHome,
  NativePuzzle,
  NativeResult,
  NativeRewards,
  NativeVictory,
  NativeSummary,
  NativeBuild,
} from "../rogue/Panels";
import { NativeExtras, NativeDiagnostics } from "../rogue/Extras";
import { s } from "../rogue/styles";
import { NativePlaytestExport } from "../rogue/PlaytestExport";

type Confirm = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

/** Position dans l'acte, pour la barre de segments. */
function stageProgress(view: RogueView) {
  const { act, boss, index, survival } = view.phase;
  if (survival) return { done: 0, total: 0, label: `Survie · rencontre ${survival}` };
  const total = index + (view.encountersRemaining ?? 1);
  return boss
    ? { done: index, total, label: `Acte ${act} · boss, phase ${index + 1}/${total}` }
    : { done: index, total: total + 1, label: `Acte ${act} · puzzle ${index + 1}/${total}` };
}

export function Rogue({
  navigation,
}: NativeStackScreenProps<RootStack, "Rogue">) {
  const { view, controller, busy, error, send: perform } = useRogue();
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const playing = view.screen === "playing";
  const inRun = view.screen !== "home";
  const compact = playing || view.screen === "reward";
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  const content = useRef<ComponentRef<typeof ScrollView>>(null);
  const current = useRef({ busy, view });
  current.current = { busy, view };
  const disabled = busy || !view.hydrated || Boolean(view.storageError);
  async function replaceRun(value: number) {
    await perform({ type: "new", seed: value, replace: true });
  }
  function send(action: RogueAction) {
    if (
      action.type === "new" &&
      (view.hasSaved || view.storageNotice || controller.isActive())
    ) {
      setConfirm({
        title: "Remplacer la session ?",
        message:
          "La run actuelle sera archivée avant son remplacement. Une partie inachevée sera marquée interrompue.",
        confirmLabel: "Remplacer",
        danger: true,
        onConfirm: () => {
          void replaceRun(action.seed);
        },
      });
    } else void perform(action);
  }
  function abandon() {
    const ask = () =>
      setConfirm({
        title: "Abandonner cette run ?",
        message:
          "Le bilan sera conservé, mais la partie ne pourra plus être reprise.",
        confirmLabel: "Abandonner",
        cancelLabel: "Continuer",
        danger: true,
        onConfirm: () => {
          void perform({ type: "abandon" });
        },
      });
    // Depuis la fenêtre Détails : la fermer d'abord (iOS ne superpose pas deux modales).
    if (details) {
      setDetails(false);
      setTimeout(ask, Platform.OS === "ios" ? 350 : 0);
    } else ask();
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => listener.remove();
  }, [controller, navigation]);
  function back() {
    if (current.current.busy) return;
    if (!controller.isActive()) {
      navigation.goBack();
      return;
    }
    setConfirm({
      title: "Revenir au menu ?",
      message: current.current.view.storageError
        ? "Seul un état déjà enregistré pourra être repris. L’action en erreur ne peut pas être garantie."
        : "Votre progression est sauvegardée. Le temps continue pendant un puzzle, y compris hors de l’application.",
      confirmLabel: "Menu",
      onConfirm: () => {
        controller.suspend();
        navigation.goBack();
      },
    });
  }
  useEffect(() => {
    setDetails(false);
    if (view.screen !== "playing") Keyboard.dismiss();
    const frame = requestAnimationFrame(() => {
      content.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [view.screen, view.stage]);
  return (
    <SafeAreaView style={[s.safe, inRun && s.night]} edges={["top", "bottom"]}>
      <Backdrop dark={inRun} />
      <StatusBar style={inRun ? "light" : "dark"} />
      <View style={s.header}>
        <Text accessibilityRole="header" style={[s.brand, inRun && s.onNight, { flex: 1 }]}>
          {playing ? "Rogue" : "MathPrime · Rogue"}
        </Text>
        {playing && (
          <Button label="Détails" compact onPress={() => setDetails(true)} />
        )}
        <View style={{ minWidth: 64 }}>
          <Button label="Menu" compact onPress={back} disabled={busy} />
        </View>
      </View>
      {view.screen !== "home" && (
        <View style={[s.hud, { gap: comfortable ? 12 : 8 }]}>
          <Counters lives={view.lives} hints={view.hints} score={view.score} />
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Segments {...stageProgress(view)} />
            </View>
            <Text style={s.caption}>
              {view.successes}/{view.total} réussites
            </Text>
          </View>
          {!playing && (
            <Text style={s.timer}>
              {view.officialVictory
                ? "Victoire officielle acquise"
                : "Chronomètre en pause"}
            </Text>
          )}
        </View>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={content}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={playing ? s.compactContent : s.content}
        >
          {(!view.hydrated || busy) && (
            <ActivityIndicator
              color={RC.gold}
              accessibilityLabel="Chargement de la session"
            />
          )}
          {(error ||
            view.storageError ||
            (view.message && !view.diagnostics.length)) && (
            <Text accessibilityRole="alert" style={s.error}>
              {error || view.storageError || view.message}
            </Text>
          )}
          {view.storageError && (
            <Button
              label="Réessayer la sauvegarde"
              onPress={() => {
                void perform({ type: "retry" });
              }}
              disabled={busy}
            />
          )}
          <NativeDiagnostics errors={view.diagnostics} />
          {view.storageNotice && (
            <Text style={s.note}>{view.storageNotice}</Text>
          )}
          {view.screen === "home" && (
            <>
              <NativeExtras
                entries={view.history}
                disabled={disabled}
                onDelete={(id) => send({ type: "delete-archive", id })}
              />
              <NativeHome view={view} disabled={disabled} send={send} />
            </>
          )}
          {["preparation", "playing"].includes(view.screen) && view.puzzle && (
            <NativePuzzle
              view={view}
              disabled={disabled}
              send={send}
              onHint={() => {
                send({ type: "hint" });
                setDetails(true);
              }}
            />
          )}
          {view.screen === "result" && (
            <NativeResult view={view} disabled={disabled} send={send} />
          )}
          {view.screen === "reward" && (
            <NativeRewards view={view} disabled={disabled} send={send} />
          )}
          {view.screen === "victory" && (
            <NativeVictory view={view} disabled={disabled} send={send} />
          )}
          {view.screen === "ended" && (
            <NativeSummary
              view={view}
              disabled={disabled}
              send={send}
              onMenu={back}
            />
          )}
          {view.hasSaved && ["home", "ended"].includes(view.screen) && (
            <NativePlaytestExport
              report={controller.exportPlaytest}
              disabled={disabled}
            />
          )}
          {view.screen !== "home" && !playing && (
            <NativeBuild view={view} disabled={disabled} send={send} />
          )}
          {controller.isActive() && !playing && (
            <Button
              label="Abandonner la run"
              variant="danger"
              disabled={busy}
              onPress={abandon}
            />
          )}
          {!playing && (
            <Text
              style={[s.caption, !inRun && { color: RC.mutedLight }]}
            >
              Sauvegarde locale · Aucun classement Rogue · Temps hors
              application compté pendant le puzzle
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <RogueDetails
        visible={details}
        close={() => setDetails(false)}
        view={view}
        disabled={disabled}
        send={send}
        abandon={abandon}
      />
      <ConfirmDialog
        visible={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        cancelLabel={confirm?.cancelLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm?.onConfirm;
          setConfirm(null);
          action?.();
        }}
      />
    </SafeAreaView>
  );
}
