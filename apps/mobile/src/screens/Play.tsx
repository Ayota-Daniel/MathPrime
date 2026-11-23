import { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Delete, Check, RotateCcw, Lightbulb } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Mode, Session } from '@shortest/engine';
import { exprTokens, hintStarCeiling, MAX_LIVES } from '@shortest/engine';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { C, num, fmt, Screen, Button, Key, Hearts, StreakPill, Pill, Highlight, BackButton, PressSheet, Sheet } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ExpressionCells, ExpressionStatus, sym } from '../components/Expression';
import { FeedbackSheet, MODE_LABEL } from '../components/FeedbackSheet';

const OP_NAME: Record<string, string> = { '+': 'plus', '-': 'moins', '*': 'fois' };
const dec = (n: number) => n.toLocaleString('fr-FR');

function subtitle(mode: Mode, s: Session): string {
  if (mode === 'classic') return `niveau ${s.index + 1} sur 100`;
  if (mode === 'daily') return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (mode === 'freeskill') return `difficulté ${s.level} sur 5, elle s'adapte`;
  if (mode === 'rogue') return `puzzle ${(s.rogue?.solved ?? 0) + 1}`;
  return `puzzle ${s.index + 1}, points ×1,25`;
}

export function Play({ route, navigation }: NativeStackScreenProps<RootStack, 'Play'>) {
  const mode = route.params.mode as Mode;
  const { session, start, press, del, clear, submit, next, tick, hint, chooseModifier, clearSoftFeedback, quit } = useGame();

  useEffect(() => { start(mode, loadTable(mode)); void audio.switchMusic(mode === 'rogue' ? 'rogue' : 'main'); }, [mode, start]);

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

  if (!session) return <Screen><View /></Screen>;
  const s = session; const p = s.puzzle;
  const leave = () => { quit(); navigation.goBack(); };

  if (s.rogue?.over) return <RogueEnd s={s} onReplay={() => start('rogue', loadTable('rogue'))} onMenu={leave} />;
  if (s.draft) return <RogueDraft s={s} onPick={(m) => chooseModifier(m)} />;

  const total = exprTokens(p.expr).length;
  const ceiling = hintStarCeiling(s.hintsUsed, total);
  const score = s.rogue ? s.rogue.score : s.score;
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
        {s.rogue ? <Hearts lives={s.rogue.lives} max={MAX_LIVES} /> : s.streak > 0 && <StreakPill value={s.streak} />}
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
          {s.rogue && s.rogue.mods.length > 0 && (
            <View accessibilityLabel="Règles actives" style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {s.rogue.mods.map((m) => <Pill key={m.id} color={m.kind === 'bane' ? C.pen : C.graphite}>{m.label}</Pill>)}
            </View>
          )}
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
          <Button variant="ink" label="Valider" height={58} icon={<Check size={20} strokeWidth={2.6} color={C.white} />} onPress={submit} disabled={!s.input} />
          {!allowHint && <Text style={{ textAlign: 'center', color: C.mine, fontSize: 12.5 }}>En chrono, pas d'indice : chaque seconde compte.</Text>}
        </View>
      </ScrollView>

      {s.feedback && (
        <FeedbackSheet fb={s.feedback} input={s.input} mode={mode} difficulty={p.difficulty} streak={s.streak} level={s.index}
          onContinue={next} onRetry={clearSoftFeedback} onMenu={leave} />
      )}
    </Screen>
  );
}

/* ---------------- Rogue : choix de règle ---------------- */
function RogueDraft({ s, onPick }: { s: Session; onPick: (m: NonNullable<Session['draft']>[number]) => void }) {
  const run = s.rogue!;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.graphite }}>Rogue-like</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Hearts lives={run.lives} max={MAX_LIVES} />
          <Pill><Text style={[num, { fontWeight: '700', fontSize: 14, color: C.graphite }]}>{fmt(run.score)} pts</Text></Pill>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Text accessibilityRole="header" style={{ marginTop: 18, fontSize: 32, fontWeight: '900', color: C.ink }}>Puzzle {run.solved} réussi</Text>
        <Text style={{ marginTop: 8, fontSize: 15.5, lineHeight: 21, color: C.graphite }}>Choisis une règle pour la suite du run. Plus elle te gêne, plus elle multiplie tes points.</Text>
        <View style={{ marginTop: 20, gap: 16 }}>
          {s.draft!.map((m) => {
            const bane = m.kind === 'bane';
            return (
              <PressSheet key={m.id} label={`${bane ? 'Malus' : 'Bonus'} : ${m.label}, points ×${dec(m.scoreMult)}`} onPress={() => onPick(m)}
                inner={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderWidth: 2, borderRadius: 4, borderColor: bane ? C.pen : C.ink, transform: [{ rotate: '-2deg' }] }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: bane ? C.pen : C.ink }}>{bane ? 'Malus' : 'Bonus'}</Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 8, color: C.graphite }}>{m.label}</Text>
                  {m.restoreLife && <Text style={{ color: C.mine, fontSize: 13.5, marginTop: 2 }}>Tu récupères une vie.</Text>}
                </View>
                <Text style={[num, { fontSize: 28, fontWeight: '900', minWidth: 70, textAlign: 'right', color: bane ? C.pen : m.scoreMult > 1 ? C.ink : C.mine }]}>×{dec(m.scoreMult)}</Text>
              </PressSheet>
            );
          })}
        </View>
        {run.mods.length > 0 && (
          <View style={{ marginTop: 'auto', paddingTop: 20 }}>
            <Text style={{ color: C.mine, fontSize: 13.5, fontWeight: '600', marginBottom: 8 }}>Déjà en jeu</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {run.mods.map((m) => <Pill key={m.id} color={m.kind === 'bane' ? C.pen : C.graphite}>{`${m.label} ×${dec(m.scoreMult)}`}</Pill>)}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/* ---------------- Rogue : fin de run ---------------- */
function RogueEnd({ s, onReplay, onMenu }: { s: Session; onReplay: () => void; onMenu: () => void }) {
  const run = s.rogue!;
  const record = run.score > s.prevBest;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ paddingTop: 48, alignItems: 'center' }}>
          <Text accessibilityRole="header" style={{ fontSize: 34, fontWeight: '900', color: C.pen }}>Plus de vies</Text>
          <Text style={{ marginTop: 6, fontSize: 15.5, color: C.graphite }}>
            {run.solved > 0 ? `Tu as tenu ${run.solved} puzzle${run.solved > 1 ? 's' : ''}.` : 'Aucun puzzle réussi cette fois.'}
          </Text>
          <View style={{ marginTop: 20 }}>
            <Highlight style={[num, { fontSize: 80, fontWeight: '900', color: C.graphite, letterSpacing: -3 }]}>{fmt(run.score)}</Highlight>
          </View>
          <Text style={{ color: C.mine, fontSize: 14, marginTop: 6 }}>
            {record ? 'points, nouveau record' : s.prevBest > 0 ? `points, ton record est à ${fmt(s.prevBest)}` : 'points'}
          </Text>
        </View>
        {run.mods.length > 0 && (
          <Sheet style={{ marginTop: 28 }} inner={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
              <Text style={{ flex: 1, fontWeight: '800', fontSize: 15, color: C.graphite }}>Règles prises pendant le run</Text>
              <Text style={[num, { color: C.mine, fontSize: 13 }]}>mult.</Text>
            </View>
            {run.mods.map((m, i) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.graphite, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[num, { fontSize: 13, fontWeight: '800', color: C.graphite }]}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 15, color: C.graphite }}>{m.label}</Text>
                <Text style={[num, { fontSize: 15, color: m.kind === 'bane' ? C.pen : C.graphite }]}>×{dec(m.scoreMult)}</Text>
              </View>
            ))}
          </Sheet>
        )}
        <View style={{ marginTop: 'auto', paddingTop: 24, flexDirection: 'row', gap: 12 }}>
          <Button label="Menu" height={58} style={{ flex: 1 }} onPress={onMenu} />
          <Button variant="ink" label="Nouveau run" height={58} style={{ flex: 1.6 }} onPress={onReplay} />
        </View>
      </ScrollView>
    </Screen>
  );
}
