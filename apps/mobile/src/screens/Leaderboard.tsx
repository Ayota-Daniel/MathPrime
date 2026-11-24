import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import type { Mode, LbEntry } from '@shortest/engine';
import { useGame } from '../store';
import { isGlobalLeaderboard } from '../leaderboard';
import { Button } from '../components/ui';

const MODES: Mode[] = ['classic', 'freeskill', 'rogue', 'daily'];
const LABELS: Record<string, string> = { classic: 'Classique', freeskill: 'Free Skill', rogue: 'Rogue', daily: 'Daily' };

export function Leaderboard({ navigation }: NativeStackScreenProps<RootStack, 'Leaderboard'>) {
  const fetchLb = useGame((s) => s.fetchLeaderboard);
  const optIn = useGame((s) => s.settings.leaderboardOptIn);
  const pseudo = useGame((s) => s.pseudo);
  const deviceId = useGame((s) => s.deviceId);
  const setPseudo = useGame((s) => s.setPseudo);
  const setSetting = useGame((s) => s.setSetting);
  const [mode, setMode] = useState<Mode>('classic');
  const [rows, setRows] = useState<LbEntry[] | null>(null);
  const [draft, setDraft] = useState(pseudo);

  useEffect(() => { setRows(null); void fetchLb(mode).then(setRows); }, [mode, fetchLb, optIn]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 18, gap: 14 }}>
      <Pressable onPress={() => navigation.goBack()}><Text className="text-mut font-semibold">‹ Retour</Text></Pressable>
      <Text className="font-bold text-[22px]">Leaderboard <Text className="text-mut text-[12px]">{isGlobalLeaderboard ? '· mondial' : '· local'}</Text></Text>

      {!optIn && (
        <View className="bg-card border border-line rounded-card p-[16px] gap-[10px]">
          <Text className="text-[14px]">Partager tes performances ? Seul un pseudo est publié (aucun compte, aucune donnée perso).</Text>
          <TextInput value={draft} onChangeText={setDraft} maxLength={16} placeholder="ton pseudo" className="border border-line rounded-[10px] px-[12px] py-[10px]" />
          <Button variant="primary" label="Activer le partage" onPress={() => { setPseudo(draft.trim() || 'anon'); setSetting('leaderboardOptIn', true); }} />
        </View>
      )}

      <View className="flex-row flex-wrap gap-[8px]">
        {MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} className={`px-[12px] py-[7px] rounded-full border ${mode === m ? 'bg-pri border-pri' : 'bg-card border-line'}`}>
            <Text className={`text-[13px] font-semibold ${mode === m ? 'text-white' : 'text-mut'}`}>{LABELS[m]}</Text>
          </Pressable>
        ))}
      </View>

      <View className="bg-card border border-line rounded-card px-[16px]">
        {rows === null ? <Text className="text-mut text-[13px] py-[14px]">Chargement…</Text>
          : rows.length === 0 ? <Text className="text-mut text-[13px] py-[14px]">Aucun score — sois le premier.</Text>
          : rows.map((r, i) => (
            <View key={r.id + r.mode} className="flex-row items-center justify-between py-[11px] border-b border-line">
              <View className="flex-row items-center gap-[10px]">
                <Text className="text-mut w-[22px]">{i + 1}</Text>
                <Text style={r.id === deviceId ? { fontWeight: '700' } : undefined}>{r.pseudo}{r.id === deviceId ? ' (toi)' : ''}</Text>
              </View>
              <Text className="font-bold">{r.score}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}
