import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Timer, Heart } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dailyPuzzle, dateKey, xpForRank } from '@shortest/engine';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { TabBar } from '../components/TabBar';
import { C, num, fmt, Screen, Sheet, PressSheet, Button, Highlight, Pill, StreakPill } from '../components/ui';

const base = loadTable('classic');

export function Home({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  useEffect(() => { void audio.switchMusic('main'); }, []);
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const progress = useGame((s) => s.classicProgress);
  const best = useGame((s) => s.bestByMode);
  const dailyDone = useGame((s) => s.dailyDone) === dateKey();
  const streak = useGame((s) => Math.max(0, ...Object.values(s.streakByMode)));

  const daily = dailyPuzzle(base);
  const lo = xpForRank(rank); const hi = xpForRank(rank + 1);
  const rankFrac = hi > lo ? Math.min(1, (xp - lo) / (hi - lo)) : 0;
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const go = (mode: string) => navigation.navigate('Play', { mode });

  return (
    <Screen bottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -0.3 }}>MathPrime</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {streak > 0 && <StreakPill value={streak} />}
          <Pressable accessibilityRole="button" accessibilityLabel={`Rang ${rank}, voir mes statistiques`} onPress={() => navigation.navigate('Stats')}>
            <Pill>
              <Text style={{ fontWeight: '700', fontSize: 14, color: C.graphite }}>Rang {rank}</Text>
              <View style={{ width: 34, height: 6, borderRadius: 2, backgroundColor: C.grid, overflow: 'hidden' }}>
                <View style={{ width: `${rankFrac * 100}%`, height: '100%', backgroundColor: C.ink }} />
              </View>
            </Pill>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 18 }}>
        <Sheet style={{ marginTop: 8 }} inner={{ padding: 18 }}>
          <Text style={{ color: C.mine, fontSize: 14, fontWeight: '600' }}>Défi du {today}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6, marginBottom: 14 }}>
            <Highlight style={[num, { fontSize: 68, fontWeight: '900', color: C.graphite, letterSpacing: -2 }]}>{daily.target}</Highlight>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: C.graphite }}>
              Atteins {daily.target} avec 3, 5 et 7. La solution la plus courte tient en {daily.operands} chiffres.
            </Text>
          </View>
          {dailyDone
            ? <Text style={{ fontWeight: '700', color: C.ink, fontSize: 15 }}>Fait aujourd'hui. Reviens demain pour un nouveau défi.</Text>
            : <Button variant="ink" label="Jouer le défi" onPress={() => go('daily')} />}
        </Sheet>

        <PressSheet label={progress > 0 ? 'Reprendre Classique' : 'Commencer Classique'} onPress={() => go('classic')} inner={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.graphite }}>{progress > 0 ? 'Reprendre Classique' : 'Commencer Classique'}</Text>
            <Text style={[num, { color: C.mine, fontSize: 14, fontWeight: '600' }]}>niveau {progress + 1} / 100</Text>
          </View>
          <View style={{ height: 14, justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, flexDirection: 'row' }}>
              {Array.from({ length: 20 }).map((_, i) => <View key={i} style={{ flex: 1, borderLeftWidth: 1, borderColor: C.graphite, height: i % 5 === 0 ? 8 : 5 }} />)}
            </View>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, backgroundColor: C.ink, borderRadius: 1 }} />
          </View>
        </PressSheet>

        <Sheet inner={{ paddingHorizontal: 0 }}>
          {[
            { mode: 'freeskill', title: 'Free Skill', sub: 'Chrono, la difficulté suit ton niveau', icon: <Timer size={26} color={C.ink} /> },
            { mode: 'rogue', title: 'Rogue-like', sub: '3 vies, une règle à choisir tous les 3 puzzles', icon: <Heart size={26} color={C.pen} /> },
          ].map((r, i) => (
            <Pressable key={r.mode} accessibilityRole="button" accessibilityLabel={r.title} onPress={() => { void audio.play('select'); go(r.mode); }}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? C.inkSoft : 'transparent' },
                i > 0 && { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }]}>
              {r.icon}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.graphite }}>{r.title}</Text>
                <Text style={{ color: C.mine, fontSize: 13.5 }}>{r.sub}</Text>
              </View>
            </Pressable>
          ))}
        </Sheet>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '800', color: C.graphite }}>Big Challenge</Text>
            <Text style={{ color: C.mine, fontSize: 13.5 }}>un chiffre imposé</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([3, 5, 7] as const).map((n) => {
              const rec = best[`big${n}`] ?? 0;
              return (
                <PressSheet key={n} label={`Big Challenge ${n}`} style={{ flex: 1 }} onPress={() => go(`big${n}`)}
                  inner={{ minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Text style={[num, { fontSize: 34, fontWeight: '900', color: C.graphite }]}>{n}</Text>
                  <Text style={{ color: C.mine, fontSize: 12 }}>{rec > 0 ? `record ${fmt(rec)}` : 'pas encore joué'}</Text>
                </PressSheet>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
