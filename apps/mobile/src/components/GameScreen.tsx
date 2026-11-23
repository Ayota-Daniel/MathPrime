import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, rogue } from '@shortest/tokens';

const paper = require('../../../../packages/tokens/assets/backgrounds/paper-portrait.png');
const night = require('../../../../packages/tokens/assets/backgrounds/night-portrait.png');
export const gameFonts = {
  NunitoRegular: require('../../../../packages/tokens/assets/fonts/Nunito_400Regular.ttf'),
  NunitoBold: require('../../../../packages/tokens/assets/fonts/Nunito_700Bold.ttf'),
  NunitoExtraBold: require('../../../../packages/tokens/assets/fonts/Nunito_800ExtraBold.ttf'),
};
export function Backdrop({ dark = false }: { dark?: boolean }) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        accessible={false}
        source={dark ? night : paper}
        resizeMode="stretch"
        fadeDuration={0}
        style={{ width: '100%', height: '100%', opacity: dark ? 0.85 : 0.75 }}
      />
    </View>
  );
}
export function GameScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop />
      {children}
    </SafeAreaView>
  );
}
export function GameText({
  className = '',
  style,
  ...props
}: TextProps & { className?: string }) {
  const fontFamily = className.includes('font-bold')
    ? rogue.font.display
    : className.includes('font-semibold')
      ? rogue.font.strong
      : rogue.font.body;
  const hasTone = /text-(ink|mut|white|pri|ok|err|gold)\b/.test(className);
  return (
    <Text
      {...props}
      className={className}
      style={[{ fontFamily }, !hasTone && { color: colors.ink }, style]}
    />
  );
}
export const g = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    width: '100%',
    maxWidth: 730,
    alignSelf: 'center',
  },
  title: {
    color: colors.ink,
    fontFamily: rogue.font.display,
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 36,
  },
  sub: {
    color: colors.mut,
    fontFamily: rogue.font.body,
    textAlign: 'center',
    fontSize: 15,
  },
  back: {
    minHeight: 40,
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
  },
  strip: {
    backgroundColor: colors.num,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  blue: {
    backgroundColor: colors.panel,
    padding: 18,
    borderRadius: 22,
    gap: 6,
  },
  light: { color: colors.onNight, fontFamily: rogue.font.strong },
  value: {
    fontFamily: rogue.font.display,
    fontSize: 58,
    lineHeight: 67,
    textAlign: 'center',
    color: colors.onNight,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
