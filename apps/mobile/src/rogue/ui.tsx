import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Flag, Heart, Lightbulb, Star } from "lucide-react-native";
import { rogue } from "@shortest/tokens";
import { audio } from "../audio";
import { RC as c, themed } from "../theme";

export function Button({
  label,
  variant = "ghost",
  onPress,
  disabled,
  compact = false,
  accessibilityLabel,
  accessibilityHint,
  wide = false,
}: {
  label: string;
  /** Largeur minimale de cible tactile (44 px) pour un bouton court. */
  wide?: boolean;
  /** `danger` : action irréversible (abandon), `hint` : indice, `solidDanger` : confirmation d'abandon. */
  variant?: "primary" | "ghost" | "danger" | "solidDanger" | "hint";
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const primary = variant === "primary";
  const danger = variant === "danger";
  const solidDanger = variant === "solidDanger";
  const hint = variant === "hint";
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        void audio.play("select");
        onPress();
      }}
      android_ripple={{ color: "#ffffff33" }}
      style={[
        styles.button,
        primary && styles.primary,
        primary && comfortable && { minHeight: 56 },
        danger && styles.danger,
        solidDanger && styles.solidDanger,
        hint && styles.hint,
        compact && styles.compact,
        wide && { minWidth: rogue.touch },
        disabled && styles.disabled,
      ]}
    >
      {danger && !disabled && <Flag size={17} color={c.danger} />}
      <Text
        style={[
          styles.label,
          primary && styles.primaryLabel,
          danger && styles.dangerLabel,
          solidDanger && styles.solidDangerLabel,
          hint && styles.hintLabel,
          disabled && styles.disabledLabel,
          primary && comfortable && { fontSize: 24 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Tile({
  label,
  kind,
  onPress,
  disabled,
}: {
  label: string;
  kind: "num" | "op";
  onPress: () => void;
  disabled?: boolean;
}) {
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        void audio.play("select");
        onPress();
      }}
      android_ripple={{ color: "#4a1c3233" }}
      style={[
        styles.tile,
        comfortable && { minHeight: kind === "op" ? 56 : 64 },
        kind === "op" && styles.operator,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.digit,
          disabled && styles.disabledLabel,
          comfortable && { fontSize: 32, lineHeight: 40 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Stars({ value }: { value: number }) {
  return (
    <View accessibilityLabel={`${value} étoiles sur 3`} style={styles.row}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={30}
          color={c.gold}
          fill={n <= value ? c.gold : "transparent"}
        />
      ))}
    </View>
  );
}
const styles = themed(() => StyleSheet.create({
  button: {
    minHeight: rogue.touch,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: rogue.radius.control,
    backgroundColor: c.panel,
  },
  primary: {
    backgroundColor: c.coral,
    borderColor: c.coralPressed,
    borderBottomWidth: 4,
  },
  compact: { paddingVertical: 4, paddingHorizontal: 6 },
  danger: {
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: c.danger,
    backgroundColor: c.dangerSurface,
  },
  dangerLabel: { color: c.dangerText, fontFamily: rogue.font.display, fontSize: 16 },
  solidDanger: { minHeight: 50, borderWidth: 0, backgroundColor: c.dangerSolid },
  solidDangerLabel: { color: "#FFFFFF", fontFamily: rogue.font.display, fontSize: 15 },
  hint: { borderColor: c.gold, backgroundColor: "transparent" },
  hintLabel: { color: c.gold, fontFamily: rogue.font.display },
  label: {
    color: c.ivory,
    fontFamily: rogue.font.strong,
    fontSize: 13,
    textAlign: "center",
  },
  primaryLabel: {
    color: c.coralInk,
    fontFamily: rogue.font.display,
    fontSize: 18,
  },
  disabled: {
    backgroundColor: c.night,
    borderColor: c.border,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderStyle: "dashed",
  },
  disabledLabel: { color: c.muted },
  tile: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: rogue.radius.panel,
    backgroundColor: c.ivory,
  },
  operator: { backgroundColor: c.operator, borderColor: c.operator },
  digit: {
    color: c.aubergine,
    fontFamily: rogue.font.display,
    fontSize: 28,
    lineHeight: 36,
  },
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
  counter: {
    flex: 1,
    minHeight: 64,
    borderRadius: rogue.radius.panel,
    backgroundColor: c.raised,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  counterValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  counterNumber: { color: c.ivory, fontFamily: rogue.font.display, fontSize: 22, lineHeight: 28 },
  counterLabel: { color: c.muted, fontFamily: rogue.font.strong, fontSize: 12 },
  segment: { width: 22, height: 6, borderRadius: 3 },
  shade: {
    flex: 1,
    backgroundColor: "rgba(5,7,10,0.72)",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: rogue.radius.hero,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 8,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogTitle: { color: c.ivory, fontFamily: rogue.font.display, fontSize: 21, lineHeight: 27 },
  dialogText: { color: c.muted, fontFamily: rogue.font.body, fontSize: 15, lineHeight: 21 },
}));

/** Compteurs du run : une icône et un nombre, lisibles même avec beaucoup de vies ou d'indices. */
export function Counters({ lives, hints, score }: { lives: number; hints: number; score: number }) {
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  const tile = [styles.counter, !comfortable && { minHeight: 52 }];
  return (
    <View style={[styles.row, { gap: 8 }]}>
      <View style={tile} accessible accessibilityLabel={`${lives} vie${lives > 1 ? "s" : ""}`}>
        <View style={styles.counterValue}>
          <Heart size={20} color={c.danger} fill={c.danger} />
          <Text style={styles.counterNumber}>{lives}</Text>
        </View>
        <Text style={styles.counterLabel}>Vies</Text>
      </View>
      <View style={tile} accessible accessibilityLabel={`${hints} indice${hints > 1 ? "s" : ""}`}>
        <View style={styles.counterValue}>
          <Lightbulb size={20} color={c.gold} />
          <Text style={styles.counterNumber}>{hints}</Text>
        </View>
        <Text style={styles.counterLabel}>Indices</Text>
      </View>
      <View style={tile} accessible accessibilityLabel={`${score} points`}>
        <Text style={[styles.counterNumber, { color: c.coral }]}>{score}</Text>
        <Text style={styles.counterLabel}>points</Text>
      </View>
    </View>
  );
}

/** Avancement dans l'étape : segments faits (couleur d'action), en cours (clair), à venir (contour). */
export function Segments({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {Array.from({ length: Math.max(0, total) }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < done
              ? { backgroundColor: c.coral }
              : i === done
                ? { backgroundColor: c.ivory }
                : { borderWidth: 1.5, borderColor: c.border },
          ]}
        />
      ))}
      <Text style={[styles.counterLabel, { marginLeft: total > 0 ? 6 : 0, flexShrink: 1 }]}>{label}</Text>
    </View>
  );
}

/** Dialogue de confirmation aux couleurs de la page Rogue (remplace l'alerte système). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Annuler",
  danger = false,
  icon,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.shade}>
        <View accessibilityRole="alert" accessibilityViewIsModal style={styles.dialog}>
          {(danger || icon) && (
            <View
              style={[
                styles.dialogIcon,
                danger
                  ? { borderColor: c.danger, backgroundColor: c.dangerSurface }
                  : { borderColor: c.border, backgroundColor: c.raised },
              ]}
            >
              {icon ?? <Flag size={22} color={c.dangerText} />}
            </View>
          )}
          <Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogText}>{message}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} variant={danger ? "solidDanger" : "primary"} onPress={onConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
