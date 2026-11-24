import { useEffect, useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Timer, Swords, Star, ChevronRight } from 'lucide-react-native';
import { featuredInfo } from '@shortest/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dailyPuzzle, dateKey, xpForRank } from '@shortest/engine';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { TabBar } from '../components/TabBar';
import { C, num, fmt, Screen, Sheet, PressSheet, Button, Highlight, Pill, StreakPill, Text } from '../components/ui';

const base = loadTable('classic');

/**
 * Ligne de mode (Free Skill, Rogue). La mise en page est sur une View intérieure et l'état pressé vient de
 * onPressIn/onPressOut : avec NativeWind, un `style` en fonction sur Pressable est ignoré sur Android.
 */
function ModeRow({ title, sub, icon, first, onPress }: { title: string; sub: string; icon: ReactNode; first: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? C.inkSoft : 'transparent' },
        !first && { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }]}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.graphite }}>{title}</Text>
          <Text style={{ color: C.mine, fontSize: 13.5 }}>{sub}</Text>
        </View>
        <ChevronRight size={18} color={C.graphite} />
      </View>
    </Pressable>
  );
}

export function Home({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  useEffect(() => { void audio.switchMusic('main'); }, []);
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const progress = useGame((s) => s.classicProgress);
  const best = useGame((s) => s.bestByMode);
  const stars = useGame((s) => Object.values(s.classicStars).reduce((sum, v) => sum + v, 0));
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
          {dailyDone && <Text style={{ fontWeight: '700', color: C.ink, fontSize: 15, marginBottom: 12 }}>Fait aujourd'hui. Tu peux rejouer pour t'entraîner.</Text>}
          <Button variant={dailyDone ? 'line' : 'ink'} label={dailyDone ? "S'entraîner sur le défi" : 'Jouer le défi'} onPress={() => go('daily')} />
        </Sheet>

        <Sheet inner={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800', color: C.graphite }}>Classique</Text>
            <Text style={[num, { color: C.mine, fontSize: 14, fontWeight: '600' }]}>niveau {progress + 1} / 100</Text>
          </View>
          <View style={{ height: 14, justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, flexDirection: 'row' }}>
              {Array.from({ length: 20 }).map((_, i) => <View key={i} style={{ flex: 1, borderLeftWidth: 1, borderColor: C.graphite, height: i % 5 === 0 ? 8 : 5 }} />)}
            </View>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, backgroundColor: C.ink, borderRadius: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Star size={15} fill={C.hl} color={C.graphite} />
              <Text style={{ color: C.mine, fontSize: 13.5 }}>{stars} étoiles sur 300</Text>
            </View>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => navigation.navigate('Levels')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: C.ink, fontSize: 14, fontWeight: '700' }}>Tous les niveaux</Text>
              <ChevronRight size={16} color={C.ink} />
            </Pressable>
          </View>
          <Button variant="ink" label={progress > 0 ? `Reprendre au niveau ${progress + 1}` : 'Commencer'} onPress={() => go('classic')} />
        </Sheet>

        <Sheet inner={{ paddingHorizontal: 0 }}>
          {[
            { mode: 'freeskill', title: 'Free Skill', sub: 'Chrono, la difficulté suit ton niveau', icon: <Timer size={26} color={C.ink} /> },
            { mode: 'rogue', title: 'Rogue', sub: featuredInfo('rogue', 1).detail, icon: <Swords size={26} color={C.pen} /> },
          ].map((r, i) => (
            <ModeRow key={r.mode} {...r} first={i === 0}
              onPress={() => { void audio.play('select'); if (r.mode === 'rogue') navigation.navigate('Rogue'); else go(r.mode); }} />
          ))}
        </Sheet>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '800', color: C.graphite }}>Big Challenge</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => navigation.navigate('BigChallenge')}>
              <Text style={{ color: C.mine, fontSize: 13.5 }}>un chiffre imposé</Text>
            </Pressable>
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
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Help')}>
          <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }}>Comment jouer ?</Text>
        </Pressable>
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
