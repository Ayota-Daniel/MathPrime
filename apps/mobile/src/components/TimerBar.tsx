import { View, Text } from 'react-native';
import { timeColor } from '../theme';
/** Barre de temps : fraction restante + COULEUR vert→jaune→rouge + SECONDES en repère. */
export function TimerBar({ secondsLeft, maxSeconds }: { secondsLeft: number; maxSeconds: number }) {
  const frac = maxSeconds > 0 ? secondsLeft / maxSeconds : 0;
  const color = timeColor(frac);
  return (
    <View className="flex-row items-center gap-[10px]">
      <View className="flex-1 h-[8px] rounded-full bg-line overflow-hidden">
        <View style={{ width: `${frac * 100}%`, height: '100%', backgroundColor: color }} />
      </View>
      <Text className="font-bold text-[14px]" style={{ color, minWidth: 34, textAlign: 'right' }}>{secondsLeft}s</Text>
    </View>
  );
}
