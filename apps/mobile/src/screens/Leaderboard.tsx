import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Globe, Smartphone } from 'lucide-react-native';
import type { Mode, LbEntry } from '@shortest/engine';
import { useGame } from '../store';
import { isGlobalLeaderboard } from '../leaderboard';
import { TabBar } from '../components/TabBar';
import { C, num, fmt, Screen, Sheet, Title, Button } from '../components/ui';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'classic', label: 'Classique' }, { mode: 'daily', label: 'Jour' },
  { mode: 'freeskill', label: 'Free Skill' }, { mode: 'rogue', label: 'Rogue' },
];
const TOP = 8;

function Row({ rank, name, score, me }: { rank: string; name: string; score: string; me?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: me ? C.hl : 'transparent' }}>
      <Text style={[num, { width: 28, fontWeight: '800', fontSize: 15, color: C.graphite }]}>{rank}</Text>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: me ? '800' : '400', color: C.graphite }}>{name}</Text>
      <Text style={[num, { fontWeight: '800', fontSize: 15, color: C.graphite }]}>{score}</Text>
    </View>
  );
}

export function Leaderboard() {
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

  const meIdx = rows ? rows.findIndex((r) => r.id === deviceId) : -1;
  const shown = rows ? rows.slice(0, TOP) : [];
  const gap = meIdx >= TOP ? meIdx - TOP : 0;
  const Scope = isGlobalLeaderboard ? Globe : Smartphone;

  return (
    <Screen bottomInset={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title>Classement</Title>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Scope size={16} color={C.mine} />
            <Text style={{ color: C.mine, fontSize: 13, fontWeight: '700' }}>{isGlobalLeaderboard ? 'Mondial' : 'Cet appareil'}</Text>
          </View>
        </View>

        {!optIn && (
          <Sheet inner={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, lineHeight: 20, color: C.graphite }}>Pour apparaître dans le classement, choisis un pseudo. Seul ce pseudo est publié : pas de compte, pas de donnée personnelle.</Text>
            <TextInput value={draft} onChangeText={setDraft} maxLength={16} placeholder="ton pseudo" placeholderTextColor={C.ghost} accessibilityLabel="Pseudo"
              style={[num, { height: 44, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, paddingHorizontal: 12, backgroundColor: C.white, color: C.graphite }]} />
            <Button variant="ink" label="Publier mes scores" disabled={!draft.trim()} onPress={() => { setPseudo(draft.trim()); setSetting('leaderboardOptIn', true); }} />
          </Sheet>
        )}

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, overflow: 'hidden', backgroundColor: C.white }}>
          {MODES.map(({ mode: m, label }, i) => {
            const on = mode === m;
            return (
              <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setMode(m)}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent', borderLeftWidth: i > 0 ? 1.5 : 0, borderColor: C.graphite }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? C.white : C.mine }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Sheet inner={{ paddingVertical: 4, overflow: 'hidden' }}>
          {rows === null ? <Text style={{ color: C.mine, fontSize: 14, padding: 16 }}>Chargement…</Text>
            : rows.length === 0 ? <Text style={{ color: C.mine, fontSize: 14, padding: 16 }}>Aucun score pour ce mode. Joue une partie pour ouvrir le classement.</Text>
            : (
              <>
                {shown.map((r, i) => (
                  <View key={r.id + r.mode} style={i > 0 ? { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash } : undefined}>
                    <Row rank={String(i + 1)} name={r.id === deviceId ? `Toi, ${r.pseudo}` : r.pseudo} score={fmt(r.score)} me={r.id === deviceId} />
                  </View>
                ))}
                {gap > 0 && (
                  <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash, paddingVertical: 10, paddingHorizontal: 16 }}>
                    <Text style={{ color: C.mine, fontSize: 15 }}>… {gap} joueur{gap > 1 ? 's' : ''} entre vous</Text>
                  </View>
                )}
              </>
            )}
        </Sheet>

        {rows && meIdx >= TOP && (
          <View style={{ borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, overflow: 'hidden' }}>
            <Row rank={String(meIdx + 1)} name={`Toi, ${rows[meIdx].pseudo}`} score={fmt(rows[meIdx].score)} me />
          </View>
        )}
        {optIn && <Text style={{ color: C.mine, fontSize: 13 }}>Tu publies en tant que « {pseudo} ». Tu peux arrêter dans Réglages.</Text>}
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
