import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { audio } from '../audio';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <View className={`bg-card border border-line rounded-card p-[18px] ${className}`}>{children}</View>
);

export const Chip = ({ children, color = '#5B5BD6', bg = '#EEF0FF' }: { children: ReactNode; color?: string; bg?: string }) => (
  <View className="px-[10px] py-[4px] rounded-full" style={{ backgroundColor: bg }}>
    <Text className="text-[12px] font-semibold" style={{ color }}>{children}</Text>
  </View>
);

export function Button({ label, variant = 'ghost', onPress, disabled }:
  { label: string; variant?: 'primary' | 'ghost'; onPress: () => void; disabled?: boolean }) {
  const primary = variant === 'primary';
  return (
    <Pressable disabled={disabled} onPress={() => { void audio.play('select'); onPress(); }}
      className={`rounded-tile py-[14px] items-center justify-center active:opacity-80 border
        ${primary ? 'bg-pri border-pri' : 'bg-card border-line'} ${disabled ? 'opacity-50' : ''}`}
      // ombre 3D (équivalent natif du btn-3d web)
      style={primary ? { shadowColor: '#4646B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 } : undefined}>
      <Text className={`font-semibold text-[15px] ${primary ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

export function Tile({ label, kind, onPress }: { label: string; kind: 'num' | 'op'; onPress: () => void }) {
  return (
    <Pressable onPress={() => { void audio.play('select'); onPress(); }}
      className={`flex-1 rounded-tile py-[16px] items-center border border-line active:opacity-70 ${kind === 'num' ? 'bg-num' : 'bg-op'}`}>
      <Text className="font-bold text-[22px]" style={{ color: kind === 'num' ? '#4646B8' : '#B5651d' }}>{label}</Text>
    </Pressable>
  );
}

export const Stars = ({ value }: { value: number }) => (
  <View className="flex-row gap-[6px]">
    {[1, 2, 3].map((i) => <Text key={i} className="text-[26px]" style={{ color: i <= value ? '#E8A317' : '#D5DCE4' }}>★</Text>)}
  </View>
);
