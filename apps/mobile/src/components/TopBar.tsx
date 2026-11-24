import { View, Text } from 'react-native';
import { useGame } from '../store';
import type { Mode } from '@shortest/engine';
export function TopBar({ streakMode }: { streakMode?: Mode }) {
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const streak = useGame((s) => (streakMode ? s.streakByMode[streakMode] ?? 0 : 0));
  return (
    <View className="flex-row items-center justify-between px-[18px] py-[14px] border-b border-line bg-card">
      <Text className="font-bold text-[17px]">◆ Shortest</Text>
      <View className="flex-row gap-[8px]">
        <Text className="text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg">🏆 {xp}</Text>
        <Text className="text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg">🔥 {streak}</Text>
        <Text className="text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg">Rang {rank}</Text>
      </View>
    </View>
  );
}
