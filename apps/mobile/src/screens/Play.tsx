import { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Delete, Check, RotateCcw, Lightbulb } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Mode, Session } from '@shortest/engine';
import { exprTokens, hintStarCeiling } from '@shortest/engine';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { C, num, fmt, Screen, Button, Key, StreakPill, Pill, Highlight, BackButton, Text } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ExpressionCells, ExpressionStatus, sym } from '../components/Expression';
import { FeedbackSheet, MODE_LABEL } from '../components/FeedbackSheet';

const OP_NAME: Record<string, string> = { '+': 'plus', '-': 'moins', '*': 'fois' };

function subtitle(mode: Mode, s: Session): string {
  if (mode === 'classic') return `niveau ${s.index + 1} sur 100`;
  if (mode === 'daily') {
    const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.dailyTraining ? `${day}, entraînement` : day;
  }
  if (mode === 'freeskill') return `difficulté ${s.level} sur 5, elle s'adapte`;
  return `puzzle ${s.index + 1}, points ×1,25`;
}

export function Play({ route, navigation }: NativeStackScreenProps<RootStack, 'Play'>) {
  const mode = route.params.mode as Mode;
  const niveau = route.params.niveau;
  const { session, start, press, del, clear, submit, next, tick, hint, clearSoftFeedback, quit } = useGame();

  useEffect(() => {
    if (mode === 'rogue') { navigation.replace('Rogue'); return; }
    start(mode, loadTable(mode), niveau === undefined ? undefined : niveau - 1);
    void audio.switchMusic('main');
  }, [mode, niveau, start, navigation]);

  // chrono Free Skill + bip sous 5 s
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0) void audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);

  if (!session || session.mode !== mode || mode === 'rogue') return <Screen><View /></Screen>;
  const s = session; const p = s.puzzle;
  const leave = () => { quit(); navigation.goBack(); };

  const total = exprTokens(p.expr).length;
  const ceiling = hintStarCeiling(s.hintsUsed, total);
  const score = s.score;
  const isBig = mode.startsWith('big');
  const allowHint = mode !== 'freeskill';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
        <BackButton label="Quitter la partie" onPress={leave} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.graphite }}>{MODE_LABEL[mode]}</Text>
          <Text numberOfLines={1} style={{ color: C.mine, fontSize: 13.5 }}>{subtitle(mode, s)}</Text>
        </View>
        {s.streak > 0 && <StreakPill value={s.streak} />}
        <Pill><Text style={[num, { fontWeight: '700', fontSize: 14, color: C.graphite }]}>{fmt(score)} pts</Text></Pill>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 18 }}>
        {mode === 'freeskill' && <View style={{ paddingTop: 12 }}><TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} /></View>}

        <View style={{ alignItems: 'center', paddingTop: 14 }}>
          <Text style={{ color: C.mine, fontSize: 14, fontWeight: '600' }}>Cible</Text>
          <View style={{ marginTop: 4 }} accessibilityLiveRegion="polite">
            <Highlight style={[num, { fontSize: 88, fontWeight: '900', color: C.graphite, letterSpacing: -3 }]}>{p.target}</Highlight>
          </View>
          {mode === 'classic' && (
            <View style={{ marginTop: 10 }}><Pill><Text style={{ fontWeight: '700', fontSize: 13, color: C.graphite }}>3 étoiles pour passer au niveau {s.index + 2}</Text></Pill></View>
          )}
          {isBig && s.rules.required.length > 0 && (
            <View style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2.5, borderColor: C.pen, borderRadius: 6, transform: [{ rotate: '-2.5deg' }] }}>
              <Text style={{ color: C.pen, fontSize: 18, fontWeight: '800' }}>Doit contenir un {s.rules.required.join(' et un ')}</Text>
            </View>
          )}
          <Text style={{ marginTop: 10, color: C.mine, fontSize: 13 }}>Sans parenthèses : × se calcule avant + et −.</Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <ExpressionCells input={s.input} optimal={s.optimalOperands} />
          <ExpressionStatus input={s.input} target={p.target} optimal={s.optimalOperands} required={s.rules.required} />
          {s.hintsUsed > 0 && (
            <Text style={{ marginTop: 8, fontSize: 14, color: C.graphite }}>
              <Text style={{ fontWeight: '700', color: C.pen }}>Indice : </Text>
              <Text style={[num, { fontWeight: '800' }]}>{exprTokens(p.expr).slice(0, s.hintsUsed).map(sym).join('')}…</Text>
              <Text style={{ color: C.mine }}> ({ceiling} étoile{ceiling > 1 ? 's' : ''} au mieux)</Text>
            </Text>
          )}
        </View>

        <View style={{ marginTop: 'auto', paddingTop: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {s.rules.numbers.map((n) => {
              const req = s.rules.required.includes(n);
              return <Key key={n} label={String(n)} kind="num" required={req} aria={req ? `${n}, chiffre obligatoire` : undefined} onPress={() => press(String(n))} />;
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {s.rules.operations.map((o) => <Key key={o} label={sym(o)} aria={OP_NAME[o]} kind="op" onPress={() => press(o)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {allowHint && <Button label="Indice" height={48} style={{ flex: 1 }} icon={<Lightbulb size={18} color={C.graphite} />} onPress={hint} disabled={s.hintsUsed >= total} />}
            <Button label="Effacer" height={48} style={{ flex: 1 }} icon={<Delete size={18} color={C.graphite} />} onPress={del} />
            <Button label="Vider" height={48} style={{ flex: 1 }} icon={<RotateCcw size={17} color={C.graphite} />} onPress={clear} />
          </View>
          <Button variant="ink" label={s.dailySaving ? 'Enregistrement…' : 'Valider'} height={58} icon={<Check size={20} strokeWidth={2.6} color={C.white} />} onPress={submit} disabled={!s.input || s.dailySaving} />
          {!allowHint && <Text style={{ textAlign: 'center', color: C.mine, fontSize: 12.5 }}>En chrono, pas d'indice : chaque seconde compte.</Text>}
          {mode === 'daily' && s.dailyTraining && <Text style={{ textAlign: 'center', color: C.mine, fontSize: 12.5 }}>Entraînement : le défi du jour est déjà récompensé.</Text>}
        </View>
      </ScrollView>

      {s.feedback && (
        <FeedbackSheet fb={s.feedback} input={s.input} mode={mode} difficulty={p.difficulty} streak={s.streak} level={s.index}
          onContinue={next} onRetry={clearSoftFeedback} onMenu={leave} />
      )}
    </Screen>
  );
}
