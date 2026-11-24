import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import type { RootStack } from '../../App';
import type { Mode } from '@shortest/engine';
import { xpForRank } from '@shortest/engine';
import { useGame } from '../store';
import { TabBar } from '../components/TabBar';
import { C, num, fmt, Screen, Sheet, PressSheet, Title, Text } from '../components/ui';

const ROWS: { mode: Mode; label: string; unit?: string }[] = [
  { mode: 'classic', label: 'Classique' }, { mode: 'daily', label: 'Défi du jour', unit: ' j' },
  { mode: 'freeskill', label: 'Free Skill' }, { mode: 'rogue', label: 'Rogue' },
  { mode: 'big3', label: 'Big 3' }, { mode: 'big5', label: 'Big 5' }, { mode: 'big7', label: 'Big 7' },
];

export function Stats() {
  const best = useGame((s) => s.bestByMode);
  const bestStreak = useGame((s) => s.bestStreakByMode);
  const stats = useGame((s) => s.stats);
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const lo = xpForRank(rank); const hi = xpForRank(rank + 1);
  const frac = hi > lo ? Math.min(1, (xp - lo) / (hi - lo)) : 0;
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const progress = useGame((s) => s.classicProgress);
  const classicStars = useGame((s) => Object.values(s.classicStars).reduce((sum, v) => sum + v, 0));
  const rate = stats.played ? `${Math.round((stats.perfect / stats.played) * 100)} %` : '—';

  return (
    <Screen bottomInset={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 16 }}>
        <Title>Statistiques</Title>
        <Sheet inner={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.graphite }}>Rang {rank}</Text>
            <Text style={[num, { color: C.mine, fontSize: 14, fontWeight: '600' }]}>{fmt(xp)} XP</Text>
          </View>
          <View style={{ marginTop: 10, height: 12, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 3, overflow: 'hidden', backgroundColor: C.paper }}>
            <View style={{ height: '100%', width: `${frac * 100}%`, backgroundColor: C.ink }} />
          </View>
          <Text style={{ color: C.mine, fontSize: 13.5, marginTop: 8 }}>Encore {fmt(Math.max(0, hi - xp))} XP pour le rang {rank + 1}</Text>
        </Sheet>

        <PressSheet label={`Classique, niveau ${progress + 1} sur 100, voir les niveaux`} onPress={() => nav.navigate('Levels')}
          inner={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.graphite }}>Classique, niveau {progress + 1} / 100</Text>
            <Text style={{ color: C.mine, fontSize: 13.5 }}>{classicStars} étoiles sur 300</Text>
          </View>
          <ChevronRight size={18} color={C.graphite} />
        </PressSheet>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[[fmt(stats.played), 'puzzles réussis'], [fmt(stats.perfect), 'optimaux'], [rate, 'taux optimal']].map(([v, k]) => (
            <Sheet key={k} style={{ flex: 1 }} inner={{ padding: 12, flex: 1 }}>
              <Text style={[num, { fontSize: 22, fontWeight: '900', color: C.graphite }]}>{v}</Text>
              <Text style={{ color: C.mine, fontSize: 12.5 }}>{k}</Text>
            </Sheet>
          ))}
        </View>

        <Sheet inner={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
            <Text style={{ flex: 1, color: C.mine, fontSize: 13, fontWeight: '700' }}>Mode</Text>
            <Text style={{ width: 110, textAlign: 'right', color: C.mine, fontSize: 13, fontWeight: '700' }}>Record</Text>
            <Text style={{ width: 76, textAlign: 'right', color: C.mine, fontSize: 13, fontWeight: '700' }}>Série max</Text>
          </View>
          {ROWS.map(({ mode, label, unit }) => {
            const b = best[mode] ?? 0;
            return (
              <View key={mode} accessible accessibilityLabel={`${label} : ${b > 0 ? `record ${b}` : 'pas encore joué'}, série max ${bestStreak[mode] ?? 0}`}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }}>
                <Text style={{ flex: 1, fontSize: 15, color: C.graphite }}>{label}</Text>
                {b > 0
                  ? <Text style={[num, { width: 110, textAlign: 'right', fontSize: 15, fontWeight: '800', color: C.graphite }]}>{fmt(b)}</Text>
                  : <Text style={{ width: 110, textAlign: 'right', fontSize: 13.5, color: C.mine }}>pas encore joué</Text>}
                <Text style={[num, { width: 76, textAlign: 'right', fontSize: 15, color: C.graphite }]}>{bestStreak[mode] ?? 0}{unit ?? ''}</Text>
              </View>
            );
          })}
        </Sheet>
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
