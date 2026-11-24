import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { COMPETITION_MESSAGES, type Mode, type LbEntry } from '@shortest/engine';
import { modeNames } from '@shortest/tokens';
import { useGame } from '../store';
import { useCompetition } from '../competition';
import { competitionApi, isCompetitionConfigured } from '../leaderboard';
import { TabBar } from '../components/TabBar';
import { C, num, fmt, Screen, Sheet, Title, Button, Highlight, Text } from '../components/ui';

const MODES: Mode[] = ['classic', 'big3', 'big5', 'big7', 'freeskill', 'rogue', 'daily'];
const field = { height: 44, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, paddingHorizontal: 12, backgroundColor: C.white, color: C.graphite, fontFamily: 'RecursiveRegular' } as const;

/** Segmented control à la règle : un onglet actif à l'encre. */
function Segments<T extends string>({ items, value, onChange, label }: { items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, overflow: 'hidden', backgroundColor: C.white }}>
      {items.map(([key, text], i) => {
        const on = value === key;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(key)}
            style={{ flexGrow: 1, minWidth: '25%', height: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent', borderLeftWidth: i > 0 ? 1.5 : 0, borderColor: C.graphite }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? C.white : C.mine }}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Leaderboard() {
  const game = useGame();
  const competition = useCompetition();
  const [view, setView] = useState<'local' | 'verified'>('local');
  const [mode, setMode] = useState<Mode>('classic');
  const [rows, setRows] = useState<LbEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState(game.pseudo);
  const [expression, setExpression] = useState('');
  const challenge = competition.reply?.challenge;
  const busy = competition.status === 'syncing';

  useEffect(() => { void competition.hydrate().catch(() => {}); }, [competition.hydrate]);
  useEffect(() => {
    let active = true;
    setRows(null); setError(false);
    const load = view === 'local'
      ? game.fetchLeaderboard(mode)
      : game.settings.leaderboardOptIn && competitionApi ? competitionApi.top() : Promise.resolve([]);
    void load.then((value) => { if (active) setRows(value); }).catch(() => { if (active) { setRows([]); setError(true); } });
    return () => { active = false; };
  }, [view, mode, game.fetchLeaderboard, game.settings.leaderboardOptIn, competition.confirmedBest]);

  const meIdx = rows ? rows.findIndex((r) => r.id === game.deviceId) : -1;

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 14 }}>
        <Title>Classement</Title>
        <Segments label="Classement" value={view} onChange={setView} items={[['local', 'Cet appareil'], ['verified', 'Daily vérifié']] as const} />

        {view === 'local' ? (
          <>
            <Text style={{ color: C.mine, fontSize: 13.5, lineHeight: 19 }}>Records locaux non vérifiés. Aucun record historique n'est transféré au classement compétitif.</Text>
            <Segments label="Mode" value={mode} onChange={setMode} items={MODES.map((m) => [m, modeNames[m]] as const)} />
            <Text style={{ fontSize: 14.5, color: C.graphite }}>Ton record local : <Text style={[num, { fontWeight: '800' }]}>{fmt(game.bestByMode[mode] ?? 0)}</Text></Text>
            {game.localLeaderboardError && <Text style={{ color: C.pen, fontWeight: '700' }}>Le dernier record n'a pas pu être enregistré dans ce classement.</Text>}
          </>
        ) : (
          <>
            <Text style={{ color: C.mine, fontSize: 13.5, lineHeight: 19 }}>Daily uniquement. Les autres modes restent locaux. Le serveur contrôle le défi, les indices et la récompense.</Text>
            {!isCompetitionConfigured && <Text style={{ fontSize: 14.5, color: C.graphite }}>Service compétitif non configuré. Le jeu local reste disponible.</Text>}
            {!game.settings.leaderboardOptIn && (
              <Sheet inner={{ padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 15, lineHeight: 20, color: C.graphite }}>Participer crée une identité anonyme Supabase. Ton pseudo et ton score vérifié sont publics. Aucun compte traditionnel n'est demandé.</Text>
                <TextInput value={draft} onChangeText={setDraft} maxLength={16} placeholder="ton pseudo" placeholderTextColor={C.ghost} accessibilityLabel="Pseudo" style={field} />
                <Button variant="ink" label="Activer la participation" disabled={!draft.trim()} onPress={() => { game.setPseudo(draft.trim()); game.setSetting('leaderboardOptIn', true); }} />
              </Sheet>
            )}
            {isCompetitionConfigured && game.settings.leaderboardOptIn && (
              <Sheet inner={{ padding: 16, gap: 12 }}>
                <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: C.graphite }}>{COMPETITION_MESSAGES[competition.status]}</Text>
                <Text style={{ fontSize: 14.5, color: C.graphite }}>Meilleur score confirmé : <Text style={[num, { fontWeight: '800' }]}>{fmt(competition.confirmedBest)}</Text></Text>
                <Button variant="ink" label="Ouvrir le Daily compétitif" disabled={busy || !!competition.pending} onPress={() => { setExpression(''); void competition.start(); }} />
                {competition.pending && <Button label="Réessayer la synchronisation" disabled={busy} onPress={() => void competition.retry()} />}
                {challenge && !challenge.rewarded && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: C.mine, fontSize: 14, fontWeight: '600' }}>Cible</Text>
                      <Highlight style={[num, { fontSize: 40, fontWeight: '900', color: C.graphite }]}>{challenge.target}</Highlight>
                      <Text style={{ marginLeft: 'auto', color: C.mine, fontSize: 13 }}>{challenge.day} UTC</Text>
                    </View>
                    <Text style={{ fontSize: 14.5, color: C.graphite }}>
                      {challenge.hints > 0 ? <><Text style={{ fontWeight: '700', color: C.pen }}>Indice : </Text><Text style={[num, { fontWeight: '800' }]}>{challenge.hint}…</Text></> : 'Aucun indice demandé'}
                    </Text>
                    <TextInput value={expression} onChangeText={setExpression} maxLength={256} placeholder="3+5*7" placeholderTextColor={C.ghost}
                      accessibilityLabel="Expression compétitive" autoCapitalize="none" autoCorrect={false} style={[field, { fontSize: 18 }]} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Button label="Indice serveur" style={{ flex: 1 }} disabled={busy || !!competition.pending} onPress={() => void competition.hint()} />
                      <Button variant="ink" label="Valider" style={{ flex: 1 }} disabled={busy || !!competition.pending || !expression} onPress={() => void competition.answer(expression)} />
                    </View>
                  </>
                )}
                {challenge?.rewarded && <Text style={{ fontSize: 14.5, color: C.graphite }}>Défi déjà récompensé aujourd'hui. Le Daily local reste rejouable pour s'entraîner.</Text>}
              </Sheet>
            )}
          </>
        )}

        <Sheet inner={{ paddingVertical: 4, overflow: 'hidden' }}>
          {error ? <Text style={{ color: C.pen, fontSize: 14, padding: 16 }}>Classement indisponible. Réessaie plus tard.</Text>
            : rows === null ? <Text style={{ color: C.mine, fontSize: 14, padding: 16 }}>Chargement…</Text>
            : rows.length === 0 ? <Text style={{ color: C.mine, fontSize: 14, padding: 16 }}>Aucun score dans ce classement.</Text>
            : rows.map((r, i) => {
              const me = i === meIdx;
              return (
                <View key={r.id + r.mode} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: me ? C.hl : 'transparent' },
                  i > 0 && { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }]}>
                  <Text style={[num, { width: 28, fontWeight: '800', fontSize: 15, color: C.graphite }]}>{i + 1}</Text>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: me ? '800' : '400', color: C.graphite }}>{me ? `Toi, ${r.pseudo}` : r.pseudo}</Text>
                  <Text style={[num, { fontWeight: '800', fontSize: 15, color: C.graphite }]}>{fmt(r.score)}</Text>
                </View>
              );
            })}
        </Sheet>
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
