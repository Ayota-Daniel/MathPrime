import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, rogue } from '@shortest/tokens';
import { audio } from '../audio';

type ActionProps = {
  label: string;
  variant?: 'primary' | 'ghost';
  onPress: () => void;
  disabled?: boolean;
};
export function Button({
  label,
  variant = 'ghost',
  onPress,
  disabled = false,
}: ActionProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[
        styles.action,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
      android_ripple={{ color: '#eac9b7' }}
      onPress={() => {
        void audio.play('select');
        onPress();
      }}
    >
      <Text style={[styles.label, disabled && { color: colors.mut }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Tile({
  label,
  kind,
  onPress,
}: {
  label: string;
  kind: 'num' | 'op';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[
        styles.tile,
        { backgroundColor: kind === 'num' ? colors.num : colors.op },
      ]}
      android_ripple={{ color: '#d9bfa8' }}
      onPress={() => {
        void audio.play('select');
        onPress();
      }}
    >
      <Text style={styles.digit}>{label}</Text>
    </Pressable>
  );
}
export function Stars({ value }: { value: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${value} étoiles sur 3`}
      style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}
    >
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={34}
          color={n <= value ? '#A76C00' : colors.mut}
          fill={n <= value ? '#FFD269' : 'transparent'}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
  },
  primary: {
    backgroundColor: colors.pri,
    borderColor: colors.priDark,
    borderBottomWidth: 3,
  },
  disabled: {
    backgroundColor: colors.num,
    borderColor: colors.line,
    borderBottomWidth: 1,
  },
  label: {
    color: colors.actionInk,
    fontFamily: rogue.font.strong,
    fontSize: 16,
    textAlign: 'center',
  },
  tile: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  digit: {
    fontSize: 33,
    lineHeight: 41,
    fontFamily: rogue.font.display,
    color: colors.ink,
  },
});
