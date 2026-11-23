import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Star } from "lucide-react-native";
import { rogue } from "@shortest/tokens";
import { audio } from "../audio";

const c = rogue.colors;
export function Button({
  label,
  variant = "ghost",
  onPress,
  disabled,
  compact = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  variant?: "primary" | "ghost";
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const primary = variant === "primary";
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
        compact && styles.compact,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          primary && styles.primaryLabel,
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
        comfortable && { minHeight: 72 },
        kind === "op" && styles.operator,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.digit,
          disabled && styles.disabledLabel,
          comfortable && { fontSize: 44, lineHeight: 52 },
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
const styles = StyleSheet.create({
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
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.ivory,
    borderWidth: 1,
    borderColor: c.gold,
  },
  operator: { backgroundColor: c.operator, borderColor: c.operator },
  digit: {
    color: c.aubergine,
    fontFamily: rogue.font.display,
    fontSize: 28,
    lineHeight: 36,
  },
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
});
