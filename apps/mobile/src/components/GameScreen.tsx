import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cahier, CAHIER_GRID } from '@shortest/tokens';

/** Recursive (OFL), instances statiques : texte, contrôles, titres et nombres. */
export const gameFonts = {
  RecursiveRegular: require('../../../../packages/tokens/assets/fonts/Recursive_400Regular.ttf'),
  RecursiveBold: require('../../../../packages/tokens/assets/fonts/Recursive_700Bold.ttf'),
  RecursiveExtraBold: require('../../../../packages/tokens/assets/fonts/Recursive_800ExtraBold.ttf'),
  RecursiveBlack: require('../../../../packages/tokens/assets/fonts/Recursive_900Black.ttf'),
};

/** Quadrillage 26 px : papier clair, ou page d'encre (`dark`) pour le run Rogue. */
export function Backdrop({ dark = false }: { dark?: boolean }) {
  const id = dark ? 'grid-dark' : 'grid-paper';
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={CAHIER_GRID} height={CAHIER_GRID} patternUnits="userSpaceOnUse">
            <Path d={`M ${CAHIER_GRID} 0 L 0 0 0 ${CAHIER_GRID}`} fill="none"
              stroke={dark ? 'rgba(255,255,255,0.07)' : cahier.grid} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Conteneur des écrans hors Rogue : papier quadrillé dans les marges de sécurité. */
export function GameScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cahier.paper }}>
      <Backdrop />
      {children}
    </SafeAreaView>
  );
}
