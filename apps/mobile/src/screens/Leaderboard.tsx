import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { COMPETITION_MESSAGES, type Mode, type LbEntry } from '@shortest/engine';
import { useGame } from '../store';
import { useCompetition } from '../competition';
import { competitionApi, isCompetitionConfigured } from '../leaderboard';
import { Button } from '../components/ui';

const MODES: Mode[] = ['classic', 'big3', 'big5', 'big7', 'freeskill', 'rogue', 'daily'];
const LABELS: Record<Mode, string> = { classic: 'Classique', big3: 'Big 3', big5: 'Big 5', big7: 'Big 7', freeskill: 'Free Skill', rogue: 'Rogue', daily: 'Daily' };
export function Leaderboard({ navigation }: NativeStackScreenProps<RootStack, 'Leaderboard'>) {
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
    const load = view === 'local' ? game.fetchLeaderboard(mode)
      : game.settings.leaderboardOptIn && competitionApi ? competitionApi.top() : Promise.resolve([]);
    void load.then((value) => { if (active) setRows(value); }).catch(() => { if (active) { setRows([]); setError(true); } });
    return () => { active = false; };
  }, [view, mode, game.fetchLeaderboard, game.settings.leaderboardOptIn, competition.confirmedBest]);
  return <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 18, gap: 14 }}>
    <Button label="‹ Retour" onPress={() => navigation.goBack()} />
    <Text className="font-bold text-[22px]">Leaderboard</Text>
    <View className="flex-row gap-[8px]"><Button label="Cet appareil" onPress={() => setView('local')} /><Button label="Daily vérifié" onPress={() => setView('verified')} /></View>
    {view === 'local' ? <>
      <Text>Records locaux non vérifiés. Aucun record historique n'est transféré au classement compétitif.</Text>
      <Text>Ton record local : {game.bestByMode[mode] ?? 0}</Text>
      <View className="flex-row flex-wrap gap-[8px]">{MODES.map((m) => <Button key={m} label={`${m === mode ? '• ' : ''}${LABELS[m]}`} onPress={() => setMode(m)} />)}</View>
      {game.localLeaderboardError && <Text>Le dernier record n'a pas pu être enregistré dans ce classement.</Text>}
    </> : <>
      <Text>Daily uniquement. Les autres modes restent locaux. Le serveur contrôle le défi, les indices et la récompense.</Text>
      {!isCompetitionConfigured && <Text>Service compétitif non configuré. Le jeu local reste disponible.</Text>}
      {!game.settings.leaderboardOptIn && <View className="bg-card border border-line rounded-card p-[16px] gap-[10px]">
        <Text>Participer crée une identité anonyme Supabase. Ton pseudo et ton score vérifié sont publics. Aucun compte traditionnel n'est demandé.</Text>
        <TextInput accessibilityLabel="Pseudo" value={draft} onChangeText={setDraft} maxLength={16} placeholder="ton pseudo" className="border border-line rounded-[10px] p-[10px]" />
        <Button label="Activer la participation" disabled={!draft.trim()} onPress={() => { game.setPseudo(draft.trim()); game.setSetting('leaderboardOptIn', true); }} />
      </View>}
      {isCompetitionConfigured && game.settings.leaderboardOptIn && <View className="bg-card border border-line rounded-card p-[16px] gap-[10px]">
        <Text accessibilityLiveRegion="polite">{COMPETITION_MESSAGES[competition.status]}</Text>
        <Text>Meilleur score confirmé : {competition.confirmedBest}</Text>
        <Button label="Ouvrir le Daily compétitif" disabled={busy || !!competition.pending} onPress={() => { setExpression(''); void competition.start(); }} />
        {competition.pending && <Button label="Réessayer la synchronisation" disabled={busy} onPress={() => void competition.retry()} />}
        {challenge && !challenge.rewarded && <>
          <Text>Cible {challenge.target} · {challenge.day} UTC</Text>
          <Text>{challenge.hints > 0 ? `Indice : ${challenge.hint}…` : 'Aucun indice demandé'}</Text>
          <TextInput accessibilityLabel="Expression compétitive" value={expression} onChangeText={setExpression} maxLength={256} placeholder="3+5*7" className="border border-line rounded-[10px] p-[10px]" />
          <Button label="Indice serveur" disabled={busy || !!competition.pending} onPress={() => void competition.hint()} />
          <Button variant="primary" label="Valider" disabled={busy || !!competition.pending || !expression} onPress={() => void competition.answer(expression)} />
        </>}
        {challenge?.rewarded && <Text>Défi déjà récompensé aujourd'hui. Le Daily local reste rejouable pour s'entraîner.</Text>}
      </View>}
    </>}
    <View className="bg-card border border-line rounded-card p-[16px] gap-[10px]">
      {error ? <Text>Classement indisponible. Réessaie plus tard.</Text> : rows === null ? <Text>Chargement…</Text> : rows.length === 0 ? <Text>Aucun score dans ce classement.</Text>
        : rows.map((row, index) => <View key={row.id + row.mode} className="flex-row justify-between"><Text>{index + 1}. {row.pseudo}</Text><Text>{row.score}</Text></View>)}
    </View>
  </ScrollView>;
}
