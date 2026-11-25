/** Niveaux Classique : grille de cases, étoiles, cadenas au-delà du niveau atteint. */
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { levelNumbers } from '@shortest/tokens';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { C, num, Screen, Button, BackButton, Text } from '../components/ui';

export { Help } from './Help';

const PAGE = 15;
const COLS = 5;
const GAP = 10;

export function Levels({ navigation }: NativeStackScreenProps<RootStack, 'Levels'>) {
  const current = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) => s.classicStars);
  const [page, setPage] = useState(Math.floor((current - 1) / PAGE));
  const first = page * PAGE + 1;
  // Taille des cases calculée en px : sur Android, `width: %` + `aspectRatio` donnait des lignes plus basses
  // que la première. Toutes les cases (ouvertes ou non) ont la même taille.
  const [gridWidth, setGridWidth] = useState(0);
  const cell = gridWidth > 0 ? Math.floor((gridWidth - 3 - GAP * (COLS - 1)) / COLS) : 0;
  const pager = (label: string, disabled: boolean, onPress: () => void, icon: React.ReactNode) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, backgroundColor: C.white, opacity: disabled ? 0.4 : 1 }}>
      {icon}
    </Pressable>
  );
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14 }}>
        <BackButton label="Retour" onPress={() => navigation.goBack()} />
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '900', color: C.ink }}>Classique</Text>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 21, color: C.graphite }}>Toute solution correcte termine le niveau. Seul ton meilleur résultat compte. Tu peux rejouer tous les niveaux ouverts.</Text>
        <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 16, paddingRight: 3, paddingBottom: 3 }}>
          {cell > 0 && levelNumbers(first, PAGE).map((n) => {
            const got = stars[n - 1] ?? 0;
            const open = n <= current;
            return open ? (
              <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Jouer au niveau ${n}, ${got} étoile${got > 1 ? 's' : ''} sur 3`}
                onPress={() => navigation.navigate('Play', { mode: 'classic', niveau: n })}
                style={{ width: cell, height: cell }}>
                <View style={{ position: 'absolute', top: 3, left: 3, right: -3, bottom: -3, backgroundColor: C.graphite, borderRadius: 6 }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, backgroundColor: n === current ? C.hl : C.white }}>
                  <Text style={[num, { fontSize: 20, fontWeight: '900', color: C.graphite }]}>{n}</Text>
                  <View style={{ height: 14, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, letterSpacing: 1, color: C.graphite }}>{'★'.repeat(got)}<Text style={{ color: C.ghost }}>{'★'.repeat(3 - got)}</Text></Text>
                  </View>
                </View>
              </Pressable>
            ) : (
              <View key={n} accessible accessibilityLabel={`Niveau ${n} verrouillé`}
                style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ghost, borderRadius: 6 }}>
                <Text style={[num, { fontSize: 20, fontWeight: '700', color: C.ghost }]}>{n}</Text>
                <View style={{ height: 14, justifyContent: 'center' }}><LockKeyhole size={12} color={C.ghost} /></View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          {pager('Page précédente', !page, () => setPage(page - 1), <ChevronLeft size={20} color={C.graphite} />)}
          <Text style={[num, { color: C.mine, fontSize: 14 }]}>{first}–{Math.min(first + PAGE - 1, 100)} sur 100</Text>
          {pager('Page suivante', first + PAGE > 100, () => setPage(page + 1), <ChevronRight size={20} color={C.graphite} />)}
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 24 }}>
          <Button variant="ink" label={`Jouer au niveau ${current}`} onPress={() => navigation.navigate('Play', { mode: 'classic' })} />
        </View>
      </ScrollView>
    </Screen>
  );
}
