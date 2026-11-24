import { Modal, ScrollView, Text, View } from "react-native";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { NativeBuild } from "./Panels";
import { constraints, BOSS_NAMES } from "./presentation";
import { Button } from "./ui";
import { s } from "./styles";

/** Presentation only: opening this panel never dispatches a pause action. */
export function RogueDetails({
  visible,
  close,
  view,
  disabled,
  send,
  abandon,
}: {
  visible: boolean;
  close: () => void;
  view: RogueView;
  disabled: boolean;
  send: (action: RogueAction) => void;
  abandon: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={s.modalShade}>
        <View style={s.modalCard} accessibilityViewIsModal>
          <View style={s.between}>
            <Text style={[s.title, { flex: 1 }]}>Règles et build</Text>
            <Button label="Fermer" onPress={close} />
          </View>
          <ScrollView
            removeClippedSubviews={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <Text style={s.note}>
              Le chronomètre continue pendant la consultation.
            </Text>
            {view.phase.boss && (
              <Text style={s.bold}>{BOSS_NAMES[view.phase.act - 1]}</Text>
            )}
            <Text style={s.body}>
              Chiffres réutilisables, sans parenthèses. Multiplication
              prioritaire. Touchez l’expression pour placer le curseur. Les
              flèches le déplacent ; Sélectionner étend le segment à corriger.
              Effacer retire la sélection ou le chiffre précédent ; Vider efface
              toute l’expression.
            </Text>
            {view.puzzle &&
              constraints(view.puzzle).map((rule) => (
                <Text key={rule} style={s.rule}>
                  {rule}
                </Text>
              ))}
            <Text style={s.caption}>
              Chaque indice réduit de 15 % le score de ce puzzle.
            </Text>
            {view.hintMessages.map((message) => (
              <Text
                key={message}
                accessibilityLiveRegion="polite"
                style={s.note}
              >
                {message}
              </Text>
            ))}
            <NativeBuild view={view} disabled={disabled} send={send} />
            <Button
              label="Abandonner la run"
              variant="danger"
              onPress={abandon}
              disabled={disabled}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
