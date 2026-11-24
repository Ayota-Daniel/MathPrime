/** Expression saisie case par case, version native (cf. web Expression.tsx). */
import type { ReactNode } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { evaluate, exprTokens } from '@shortest/engine';
import { C, num, Text } from './ui';

export const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
export const isOp = (t: string) => t === '+' || t === '-' || t === '*';
/** Élément lisible : symbole pour un opérateur, nombre tel quel. */
export const say = (t: string) => (isOp(t) ? sym(t) : t);

/** Valeur courante de l'expression, ou null si elle est incomplète. */
export function liveValue(input: string): number | null {
  if (!input || /[+\-*]$/.test(input)) return null;
  try { return evaluate(input); } catch { return null; }
}

/**
 * Cases pleines pour les chiffres tapés, cases fantômes en pointillé jusqu'à la longueur optimale,
 * trait rouge « optimal » après le N-ième chiffre.
 * Avec `onSelect`, chaque élément se touche pour être sélectionné (puis remplacé ou retiré au clavier).
 */
export function ExpressionCells({ input, optimal, selected = null, onSelect }: { input: string; optimal: number; selected?: number | null; onSelect?: (at: number) => void }) {
  const tokens = exprTokens(input);
  const operands = tokens.filter((t) => !isOp(t)).length;
  const sm = Math.max(operands, optimal) > 6;
  const cw = sm ? 32 : 40; const ch = sm ? 40 : 48; const fs = sm ? 20 : 26; const ow = sm ? 18 : 24;

  const items: ReactNode[] = [];
  const marker = (
    <View key="optimal" style={{ width: 2, alignSelf: 'stretch', marginVertical: -8, backgroundColor: C.pen }}>
      <Text style={{ position: 'absolute', top: -22, right: 2, width: 80, textAlign: 'right', fontSize: 13, fontWeight: '700', fontStyle: 'italic', color: C.pen }}>optimal</Text>
    </View>
  );
  let seen = 0;
  const tap = (i: number, t: string, child: ReactNode) => (
    <Pressable key={`${isOp(t) ? 'o' : 'n'}${i}`} disabled={!onSelect} onPress={() => onSelect?.(i)} hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
      accessibilityRole={onSelect ? 'button' : undefined} accessibilityState={{ selected: selected === i }}
      accessibilityLabel={onSelect ? `${say(t)}, ${selected === i ? 'sélectionné' : 'toucher pour modifier'}` : undefined}>
      {child}
    </Pressable>
  );
  tokens.forEach((t, i) => {
    const on = selected === i;
    if (isOp(t)) {
      items.push(tap(i, t,
        <View style={{ width: ow, height: ch, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: on ? C.hl : 'transparent', borderWidth: on ? 2 : 0, borderColor: C.ink }}>
          <Text style={[num, { fontSize: fs - 2, fontWeight: '800', color: C.ink }]}>{sym(t)}</Text>
        </View>));
    } else {
      seen += 1;
      const w = Math.max(cw, t.length * (fs * 0.62) + 14);
      items.push(tap(i, t,
        <View style={{ minWidth: w, height: ch, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.hl : C.white, borderWidth: on ? 2.5 : 1.5, borderColor: on ? C.ink : C.graphite, borderRadius: 4 }}>
          <Text style={[num, { fontSize: fs, fontWeight: '800', color: C.graphite }]}>{t}</Text>
        </View>));
      if (seen === optimal) items.push(marker);
    }
  });
  let missing = optimal - operands;
  let needOp = tokens.length > 0 && !isOp(tokens[tokens.length - 1]);
  let g = 0;
  while (missing > 0) {
    if (needOp) items.push(<View key={`go${g}`} style={{ width: ow }} />);
    items.push(<View key={`gc${g}`} style={{ width: cw, height: ch, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ghost, borderRadius: 4 }} />);
    needOp = true; missing -= 1; g += 1;
    if (missing === 0) items.push(marker);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 28, paddingBottom: 8, paddingHorizontal: 4 }}>
      <View accessible={!onSelect} accessibilityLiveRegion="polite" accessibilityLabel={input ? `Ton expression : ${tokens.map(say).join(' ')}` : 'Expression vide'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {items}
      </View>
    </ScrollView>
  );
}

/** Ligne sous l'expression : valeur, écart à la cible, compteur de chiffres, contrainte manquante. */
export function ExpressionStatus({ input, target, optimal, required }: { input: string; target: number; optimal: number; required: number[] }) {
  const nums = exprTokens(input).filter((t) => !isOp(t)).map(Number);
  const value = liveValue(input);
  const diff = value === null ? null : value - target;
  const missingReq = required.filter((r) => !nums.includes(r));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
      <Text style={{ fontSize: 15, color: C.graphite, flexShrink: 1 }}>
        vaut <Text style={[num, { fontSize: 17, fontWeight: '800' }]}>{value ?? '—'}</Text>{' '}
        {diff !== null && <Text style={{ color: C.mine }}>{diff === 0 ? '(pile la cible)' : diff > 0 ? `(${diff} de trop)` : `(il manque ${-diff})`}</Text>}
      </Text>
      {missingReq.length > 0 && input
        ? <Text style={{ fontSize: 15, fontWeight: '700', color: C.pen }}>le {missingReq.join(' et le ')} manque encore</Text>
        : <Text style={[num, { fontSize: 15, fontWeight: '700', color: nums.length > optimal ? C.pen : C.mine }]}>{nums.length} / {optimal} chiffres</Text>}
    </View>
  );
}
