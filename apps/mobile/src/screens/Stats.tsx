import { View, Text, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import type { Mode } from '@shortest/engine';
import { useGame } from '../store';

const LABELS: Record<Mode, string> = { classic: 'Classique', daily: 'Daily', freeskill: 'Free Skill', rogue: 'Rogue', big3: 'Big 3', big5: 'Big 5', big7: 'Big 7' };
const ORDER: Mode[] = ['classic', 'daily', 'freeskill', 'rogue', 'big3', 'big5', 'big7'];

export function Stats({ navigation }: NativeStackScreenProps<RootStack, 'Stats'>) {
  const best = useGame((s) => s.bestByMode);
  const bestStreak = useGame((s) => s.bestStreakByMode);
  const stats = useGame((s) => s.stats);
  const xp = useGame((s) => s.xp); const rank = useGame((s) => s.rank());
  const cp = useGame((s) => s.classicProgress);
  const cells: [string, string | number][] = [['XP', xp], ['Rang', rank], ['Niv. Classique', cp + 1], ['Parties', stats.played], ['Parfaits', stats.perfect], ['Taux 3★', stats.played ? `${Math.round((stats.perfect / stats.played) * 100)}%` : '—']];
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 18, gap: 14 }}>
      <Pressable onPress={() => navigation.goBack()}><Text className="text-mut font-semibold">‹ Retour</Text></Pressable>
      <Text className="font-bold text-[22px]">Statistiques</Text>
      <View className="flex-row flex-wrap gap-[10px]">
        {cells.map(([k, v]) => (
          <View key={k} className="bg-card border border-line rounded-[14px] p-[12px] items-center" style={{ width: '31%' }}>
            <Text className="font-bold text-[20px]">{v}</Text><Text className="text-mut text-[11px]">{k}</Text>
          </View>
        ))}
      </View>
      <Text className="font-semibold text-[13.5px]">Meilleur score par mode</Text>
      <View className="bg-card border border-line rounded-card px-[16px]">
        {ORDER.map((m) => (
          <View key={m} className="flex-row items-center justify-between py-[12px] border-b border-line">
            <Text className="text-[14px]">{LABELS[m]}</Text>
            <View className="flex-row gap-[14px]"><Text className="font-bold">{best[m] ?? 0}</Text><Text className="text-mut text-[12px]">série {bestStreak[m] ?? 0}</Text></View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
