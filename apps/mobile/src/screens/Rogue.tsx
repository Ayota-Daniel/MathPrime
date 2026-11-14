import { useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStack } from "../../App";
import type { RogueAction } from "@shortest/engine/rogue-v1/controller";
import { Button } from "../components/ui";
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
import { s } from "../rogue/styles";

export function Rogue({
  navigation,
}: NativeStackScreenProps<RootStack, "Rogue">) {
  const { view, controller, busy, error, send: perform } = useRogue();
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
        "La sauvegarde actuelle sera remplacée par une nouvelle run.",
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
    if (view.screen !== "playing") Keyboard.dismiss();
    const frame = requestAnimationFrame(() => {
      content.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [view.screen, view.stage]);
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.brand}>
          MathPrime · Rogue
        </Text>
        <View style={{ minWidth: 70 }}>
          <Button label="Menu" onPress={back} disabled={busy} />
        </View>
      </View>
      {view.screen !== "home" && (
        <View style={s.hud}>
          <View style={s.between}>
            <Text style={s.bold}>
              ♥ {view.lives}/3 ◇ {view.hints} indices
            </Text>
            <Text style={s.bold}>{view.score} pts</Text>
          </View>
          <Text style={s.caption}>
            {view.phase.survival
              ? `Survie · rencontre ${view.phase.survival}`
              : `Acte ${view.phase.act} · ${view.phase.boss ? `Boss, phase ${view.phase.index + 1}` : `Puzzle ${view.phase.index + 1}/3`}`}{" "}
            · {view.successes}/{view.total} réussites
          </Text>
          {view.encountersRemaining !== null &&
            ["preparation", "playing"].includes(view.screen) && (
              <Text style={s.caption}>
                {view.encountersRemaining}{" "}
                {view.phase.boss
                  ? "phase(s) à réussir"
                  : "épreuve(s) avant le boss"}
              </Text>
            )}
          <Text
            style={[
              s.timer,
              view.remaining <= 5 && view.screen === "playing"
                ? { color: "#aa314b" }
                : null,
            ]}
          >
            {view.screen === "playing"
              ? `${view.remaining} s restantes`
              : view.officialVictory
                ? "Victoire officielle acquise"
                : "Chronomètre en pause"}
          </Text>
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
          contentContainerStyle={s.content}
        >
          {(!view.hydrated || busy) && (
            <ActivityIndicator
              color="#514fc4"
              accessibilityLabel="Chargement de la session"
            />
          )}
          {(error || view.storageError || view.message) && (
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
          {view.storageNotice && (
            <Text style={s.note}>{view.storageNotice}</Text>
          )}
          {view.screen === "home" && (
            <NativeHome view={view} disabled={disabled} send={send} />
          )}
          {["preparation", "playing"].includes(view.screen) && view.puzzle && (
            <NativePuzzle view={view} disabled={disabled} send={send} />
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
          {view.screen !== "home" && (
            <NativeBuild view={view} disabled={disabled} send={send} />
          )}
          {controller.isActive() && (
            <Button
              label="Abandonner la run"
              disabled={busy}
              onPress={abandon}
            />
          )}
          <Text style={s.caption}>
            Sauvegarde locale · Aucun classement Rogue · Temps hors application
            compté pendant le puzzle
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
