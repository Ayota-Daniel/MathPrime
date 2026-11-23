import { useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import {
  Alert,
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
import { RogueDetails } from "../rogue/Details";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStack } from "../../App";
import type { RogueAction } from "@shortest/engine/rogue-v1/controller";
import { Button } from "../rogue/ui";
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

export function Rogue({
  navigation,
}: NativeStackScreenProps<RootStack, "Rogue">) {
  const { view, controller, busy, error, send: perform } = useRogue();
  const [details, setDetails] = useState(false);
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
      Alert.alert(
        "Remplacer la session ?",
        "La run actuelle sera archivée avant son remplacement. Une partie inachevée sera marquée interrompue.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Remplacer",
            style: "destructive",
            onPress: () => {
              void replaceRun(action.seed);
            },
          },
        ],
      );
    } else void perform(action);
  }
  function abandon() {
    Alert.alert(
      "Abandonner cette run ?",
      "Le bilan sera conservé. La partie ne pourra plus être reprise.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: () => {
            void perform({ type: "abandon" });
          },
        },
      ],
    );
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
    Alert.alert(
      "Revenir au menu ?",
      current.current.view.storageError
        ? "Seul un état déjà enregistré pourra être repris. L’action en erreur ne peut pas être garantie."
        : "Votre progression est sauvegardée. Le temps continue pendant un puzzle, y compris hors de l’application.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Revenir au menu",
          onPress: () => {
            controller.suspend();
            navigation.goBack();
          },
        },
      ],
    );
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
        <Text accessibilityRole="header" style={[s.brand, inRun && s.onNight]}>
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
        <View style={[s.hud, compact && s.compactHud]}>
          <View style={s.between}>
            <Text style={[s.bold, playing && !comfortable && { fontSize: 12 }]}>
              ♥ {view.lives}/3 ◇ {view.hints} indices
            </Text>
            <Text style={[s.bold, playing && !comfortable && { fontSize: 12 }]}>
              {view.score} pts
            </Text>
          </View>
          <Text style={s.caption}>
            {view.phase.survival
              ? `Survie · rencontre ${view.phase.survival}`
              : `Acte ${view.phase.act} · ${view.phase.boss ? `Boss, phase ${view.phase.index + 1}` : `Puzzle ${view.phase.index + 1}/3`}`}{" "}
            · {view.successes}/{view.total} réussites
          </Text>
          {!playing &&
            view.encountersRemaining !== null &&
            ["preparation", "playing"].includes(view.screen) && (
              <Text style={s.caption}>
                {view.encountersRemaining}{" "}
                {view.phase.boss
                  ? "phase(s) à réussir"
                  : "épreuve(s) avant le boss"}
              </Text>
            )}
          {!compact && (
            <Text style={s.timer}>
              {view.officialVictory
                ? "Victoire officielle acquise"
                : "Chronomètre en pause"}
            </Text>
          )}
          {(!compact || (playing && comfortable)) && (
            <View style={s.between}>
              {[1, 2, 3].map((act) => (
                <Text
                  key={act}
                  style={[s.caption, view.phase.act === act && s.rule]}
                >
                  Acte {act}
                  {view.defeatedBosses.includes(act)
                    ? " · acquis"
                    : view.phase.act === act
                      ? " · actuel"
                      : ""}
                </Text>
              ))}
            </View>
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
              color={rogue.colors.gold}
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
              disabled={busy}
              onPress={abandon}
            />
          )}
          {!playing && (
            <Text
              style={[s.caption, !inRun && { color: rogue.colors.mutedLight }]}
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
    </SafeAreaView>
  );
}
