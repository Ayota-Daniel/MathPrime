/** Feuille de résultat : réussite (étoiles, détail des points) ou échec (écart, solution). */
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Trophy, Check } from 'lucide-react-native';
import { exprTokens, type Feedback, type Mode } from '@shortest/engine';
import { C, num, fmt, Button, Stars, Text } from './ui';
import { liveValue, sym, isOp } from './Expression';
import { audio } from '../audio';

export const MODE_LABEL: Record<Mode, string> = {
  classic: 'Classique', daily: 'Défi du jour', freeskill: 'Free Skill', rogue: 'Rogue',
  big3: 'Big Challenge 3', big5: 'Big Challenge 5', big7: 'Big Challenge 7',
};
const SOFT_REASON: Record<string, { title: string; hint: string }> = {
  empty: { title: 'Rien à valider', hint: 'Tape une expression avec les touches.' },
  incomplete: { title: 'Expression incomplète', hint: 'Elle se termine par un signe : ajoute un chiffre.' },
  has_parens: { title: 'Pas de parenthèses', hint: '× se calcule avant + et −, sans parenthèses.' },
  bad_token: { title: 'Symbole non autorisé', hint: 'Utilise seulement les chiffres et les signes proposés, un chiffre à la fois.' },
  save_failed: { title: 'Sauvegarde impossible', hint: "Ta réponse n'a pas pu être enregistrée. Valide à nouveau." },
};
const dec = (n: number) => n.toLocaleString('fr-FR');

/** Expression figée en cases (réponse du joueur ou solution). */
function Chain({ expr, result, strike }: { expr: string; result: number | string; strike?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3, alignSelf: 'flex-start' }}>
      {exprTokens(expr).map((t, i) => isOp(t)
        ? <Text key={i} style={[num, { width: 20, textAlign: 'center', fontSize: 20, fontWeight: '800', color: C.ink }]}>{sym(t)}</Text>
        : (
          <View key={i} style={{ width: 34, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 4, backgroundColor: C.white }}>
            <Text style={[num, { fontSize: 22, fontWeight: '800', color: C.graphite }]}>{t}</Text>
          </View>
        ))}
      <Text style={[num, { marginLeft: 8, fontSize: 20, fontWeight: '800', color: C.graphite }]}>= {result}</Text>
      {strike && <View pointerEvents="none" style={{ position: 'absolute', left: -6, right: -6, top: '50%', height: 2.6, borderRadius: 2, backgroundColor: C.pen, transform: [{ rotate: '-3deg' }] }} />}
    </View>
  );
}

const Caption = ({ children }: { children: ReactNode }) => <Text style={{ color: C.mine, fontSize: 13.5, marginBottom: 6 }}>{children}</Text>;
const Hand = ({ children, color, size }: { children: ReactNode; color: string; size: number }) =>
  <Text accessibilityRole="header" style={{ fontSize: size, fontWeight: '900', color, letterSpacing: -0.3 }}>{children}</Text>;
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontSize: strong ? 17 : 15, fontWeight: strong ? '800' : '400', color: C.graphite }}>{label}</Text>
      <Text style={[num, { fontSize: strong ? 17 : 15, fontWeight: strong ? '800' : '400', color: C.graphite }]}>{value}</Text>
    </View>
  );
}

export function FeedbackSheet({ fb, input, mode, difficulty, streak, level, onContinue, onRetry, onMenu }: {
  fb: Feedback; input: string; mode: Mode; difficulty: number; streak: number; level: number;
  onContinue: () => void; onRetry: () => void; onMenu: () => void;
}) {
  useEffect(() => {
    void audio.play(fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail');
    if (fb.pr) setTimeout(() => void audio.play('record'), 260);
  }, [fb]);

  const stars = fb.stars ?? 0;
  const ops = fb.operands ?? exprTokens(input).filter((t) => !isOp(t)).length;
  const optimalOps = fb.optimalOperands ?? exprTokens(fb.optimal).filter((t) => !isOp(t)).length;

  let body: ReactNode;
  if (fb.ok) {
    const prevStreak = Math.max(0, streak - 1);
    const streakMult = 1 + Math.min(0.5, prevStreak * 0.05);
    const nextLabel = fb.canAdvance === false ? 'Rejouer ce niveau' : mode === 'classic' ? `Passer au niveau ${level + 2}` : mode === 'daily' ? "Continuer à s'entraîner" : 'Puzzle suivant';
    const lines = [
      <Line key="d" label={`Difficulté ${difficulty}`} value="sur 5" />,
      <Line key="s" label={stars === 3 ? 'Solution optimale' : `${stars} étoile${stars > 1 ? 's' : ''}`} value={`×${dec(stars === 3 ? 1.5 : stars === 2 ? 1 : 0.6)}`} />,
      prevStreak > 0 ? <Line key="r" label={`Série de ${prevStreak}`} value={`×${dec(streakMult)}`} /> : null,
      <Line key="g" label="Gagné" value={`+${fmt(fb.gained ?? 0)}`} strong />,
    ].filter(Boolean);
    body = (
      <>
        {fb.pr && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.hl, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Trophy size={20} color={C.graphite} />
            <Text style={{ fontWeight: '800', fontSize: 15, color: C.graphite, flexShrink: 1 }}>Nouveau record personnel en {MODE_LABEL[mode]}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Check size={32} strokeWidth={3.4} color={C.ink} />
            <Hand color={C.ink} size={34}>{stars === 3 ? 'Optimal' : 'Correct'}</Hand>
          </View>
          <Stars value={stars} />
        </View>
        <View>
          <Caption>Ta réponse, {ops} chiffres. {stars === 3 ? 'Impossible de faire plus court.' : `La plus courte en a ${optimalOps}.`}</Caption>
          <Chain expr={input} result={fb.target} />
          {stars < 3 && <View style={{ marginTop: 8 }}><Chain expr={fb.optimal} result={fb.target} /></View>}
          {fb.canAdvance === false && <Text style={{ color: C.pen, fontWeight: '700', fontSize: 13.5, marginTop: 8 }}>Il faut 3 étoiles pour débloquer le niveau suivant.</Text>}
        </View>
        {fb.training
          ? <Text style={{ color: C.mine, fontSize: 14.5 }}>Entraînement : le défi du jour est déjà récompensé, pas de nouveaux points.</Text>
          : (
            <View style={{ borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 2 }}>
              {lines.map((l, i) => <View key={i} style={i > 0 ? { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash } : undefined}>{l}</View>)}
            </View>
          )}
        <Button variant="ink" label={nextLabel} height={58} onPress={onContinue} />
      </>
    );
  } else if (fb.soft) {
    const r = SOFT_REASON[fb.reason ?? ''] ?? { title: 'Expression invalide', hint: 'Corrige-la et valide à nouveau.' };
    body = (
      <>
        <View>
          <Hand color={C.pen} size={30}>{r.title}</Hand>
          <Text style={{ marginTop: 6, fontSize: 15.5, lineHeight: 21, color: C.graphite }}>{r.hint}{fb.reason === 'save_failed' ? '' : ' Ta série continue.'}</Text>
        </View>
        <Button variant="ink" label={fb.reason === 'save_failed' ? 'Réessayer' : 'Corriger'} height={58} onPress={onRetry} />
      </>
    );
  } else {
    const v = liveValue(input);
    const diff = v === null ? null : v - fb.target;
    const title = fb.reason === 'timeout' ? 'Temps écoulé' : fb.reason === 'missing_required' ? 'Contrainte oubliée' : `Ce n'est pas ${fb.target}`;
    const detail = fb.reason === 'timeout' ? 'Le chrono est arrivé à zéro.'
      : fb.reason === 'missing_required' ? 'Ton expression ne contient pas le chiffre imposé.'
      : diff !== null ? `Ton expression vaut ${v}, soit ${Math.abs(diff)} ${diff > 0 ? 'de trop' : 'de moins'}.` : '';
    const cont = mode === 'rogue' ? 'Continuer, une vie en moins' : mode === 'classic' ? 'Réessayer le niveau' : 'Puzzle suivant';
    body = (
      <>
        <View>
          <Hand color={C.pen} size={32}>{title}</Hand>
          <Text style={{ marginTop: 6, fontSize: 15.5, lineHeight: 21, color: C.graphite }}>{detail} {streak === 0 ? 'Ta série repart de zéro.' : ''}</Text>
        </View>
        {input && v !== null && <View><Caption>Ta réponse</Caption><Chain expr={input} result={v} strike /></View>}
        <View><Caption>Une solution en {optimalOps} chiffres</Caption><Chain expr={fb.optimal} result={fb.target} /></View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="Menu" height={58} style={{ flex: 1 }} onPress={onMenu} />
          <Button variant="ink" label={cont} height={58} style={{ flex: 1.6 }} onPress={onContinue} />
        </View>
      </>
    );
  }

  const failed = !fb.ok && !fb.soft;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(35,41,58,0.28)' }}>
      <View accessibilityViewIsModal accessibilityLabel={fb.ok ? 'Résultat' : 'Réponse incorrecte'}
        style={{ backgroundColor: C.white, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: failed ? 2 : 1.5, borderColor: failed ? C.pen : C.graphite,
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 16 }}>
        {body}
      </View>
    </View>
  );
}
