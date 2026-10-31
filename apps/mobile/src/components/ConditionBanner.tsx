import { View, Text } from 'react-native';
import { Target, Calendar, Zap, Swords, Shield, type LucideIcon } from 'lucide-react-native';
import { bigColor } from '../theme';
import type { Mode, Rules, RogueModifier } from '@shortest/engine';
import { MAX_LIVES } from '@shortest/engine';

const META: Record<Mode, { label: string; color: string; icon: LucideIcon }> = {
  classic: { label: 'Classique', color: '#5B5BD6', icon: Target }, daily: { label: 'Daily', color: '#179C6B', icon: Calendar },
  freeskill: { label: 'Free Skill', color: '#E8A317', icon: Zap }, rogue: { label: 'Rogue', color: '#E5484D', icon: Swords },
  big3: { label: 'Big Challenge 3', color: bigColor[3], icon: Shield }, big5: { label: 'Big Challenge 5', color: bigColor[5], icon: Shield }, big7: { label: 'Big Challenge 7', color: bigColor[7], icon: Shield },
};
const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');

/** Identité du mode + Big Challenge + contraintes, bien en avant. */
export function ConditionBanner({ mode, rules, lives, mods }: { mode: Mode; rules: Rules; lives?: number; mods?: RogueModifier[] }) {
  const m = META[mode]; const isBig = mode.startsWith('big'); const Icon = m.icon;
  return (
    <View className="rounded-mode p-[12px] flex-row items-center gap-[12px] border" style={{ borderColor: m.color, backgroundColor: `${m.color}12` }}>
      <View className="w-[36px] h-[36px] rounded-[11px] items-center justify-center" style={{ backgroundColor: m.color }}>
        <Icon size={19} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-[15px]" style={{ color: m.color }}>{m.label}</Text>
        <Text className="text-[12px] text-mut">
          {isBig ? `DOIT contenir un ${rules.required.join(', ')} · ` : ''}chiffres {rules.numbers.join(' ')} · ops {rules.operations.map(sym).join(' ')}
        </Text>
      </View>
      {mode === 'rogue' && typeof lives === 'number' && (
        <View className="flex-row gap-[3px]">
          {Array.from({ length: MAX_LIVES }).map((_, i) => <Text key={i} className="text-[16px]" style={{ color: i < lives ? '#E5484D' : '#D5DCE4' }}>♥</Text>)}
        </View>
      )}
    </View>
  );
}
