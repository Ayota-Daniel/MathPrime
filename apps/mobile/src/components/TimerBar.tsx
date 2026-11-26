/** Chrono Free Skill dessiné comme une règle graduée (surligneur qui recule, rouge sous 20 %). */
import { View } from 'react-native';
import { C, num, Text } from './ui';

export function TimerBar({ secondsLeft, maxSeconds }: { secondsLeft: number; maxSeconds: number }) {
  const frac = maxSeconds > 0 ? Math.max(0, secondsLeft / maxSeconds) : 0;
  const low = frac <= 0.2;
  const ticks = Math.max(1, maxSeconds);
  return (
    <View accessible accessibilityLabel={`Temps restant : ${secondsLeft} secondes sur ${maxSeconds}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Text style={{ color: C.mine, fontSize: 13.5, fontWeight: '600' }}>Temps restant</Text>
        <Text style={[num, { fontSize: 22, fontWeight: '900', color: low ? C.pen : C.graphite }]}>{secondsLeft} s</Text>
      </View>
      <View style={{ height: 30, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 4, backgroundColor: C.white, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${frac * 100}%`, backgroundColor: low ? C.pen : C.hl, opacity: low ? 0.85 : 1 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row' }}>
          {Array.from({ length: ticks }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: i % 5 === 0 ? 16 : 9, borderLeftWidth: i === 0 ? 0 : i % 5 === 0 ? 1.5 : 1, borderColor: C.graphite }} />
          ))}
        </View>
      </View>
      <Text style={{ color: C.mine, fontSize: 12.5, marginTop: 6 }}>Le temps restant s'ajoute à tes points.</Text>
    </View>
  );
}
