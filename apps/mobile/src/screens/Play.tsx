import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import type { Mode } from '@shortest/engine';
import { evaluate, operandCount, exprTokens } from '@shortest/engine';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { TopBar } from '../components/TopBar';
import { Card, Button, Tile, Chip } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ConditionBanner } from '../components/ConditionBanner';
import { FeedbackSheet } from '../components/FeedbackSheet';

const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
const liveValue = (input: string): string => { try { return /[+\-*]$|^$/.test(input) ? '—' : String(evaluate(input)); } catch { return '—'; } };

export function Play({ route, navigation }: NativeStackScreenProps<RootStack, 'Play'>) {
  const mode = route.params.mode as Mode;
  const { session, start, press, del, clear, submit, next, tick, hint, chooseModifier, clearSoftFeedback, quit } = useGame();

  useEffect(() => { start(mode, loadTable(mode)); void audio.switchMusic(mode === 'rogue' ? 'rogue' : 'main'); }, [mode, start]);

  // timer Free Skill + bip "tick" sous 5 s
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0) void audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);

  if (!session) return null;
  const s = session; const p = s.puzzle;

  if (s.rogue?.over) {
    return (
      <View className="flex-1 bg-bg">
        <TopBar streakMode="rogue" />
        <View className="flex-1 items-center justify-center p-[18px] gap-[6px]">
          <Text className="font-bold text-[22px]">Run terminé</Text>
          <Text className="text-mut">Survécu à {s.rogue.solved} puzzles.</Text>
          <Text className="font-bold text-[60px] text-gold">{s.rogue.score}</Text>
          <View className="w-[220px] mt-[18px]"><Button variant="primary" label="Rejouer" onPress={() => start('rogue', loadTable('rogue'))} /></View>
          <Pressable className="mt-[10px]" onPress={() => { quit(); navigation.goBack(); }}><Text className="text-pri font-semibold">Menu</Text></Pressable>
        </View>
      </View>
    );
  }

  if (s.draft) {
    return (
      <View className="flex-1 bg-bg">
        <TopBar streakMode="rogue" />
        <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
          <Text className="font-bold text-[22px]">Choisis une contrainte</Text>
          <Text className="text-mut text-[13.5px]">Elle s'applique à la suite. Les malus rapportent plus.</Text>
          {s.draft.map((m) => (
            <Pressable key={m.id} onPress={() => { void audio.play('select'); chooseModifier(m); }}
              className="border border-line rounded-[16px] p-[16px] flex-row items-center gap-[12px] active:opacity-80">
              <View className="w-[38px] h-[38px] rounded-[11px] items-center justify-center" style={{ backgroundColor: m.kind === 'boon' ? '#179C6B' : '#E5484D' }}>
                <Text className="text-white font-bold">{m.kind === 'boon' ? '+' : '×'}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold">{m.label}</Text>
                <Text className="text-mut text-[12px]">{m.kind === 'boon' ? 'Avantage' : 'Malus'} · score ×{m.scoreMult}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const fb = s.feedback;
  return (
    <View className="flex-1 bg-bg">
      <TopBar streakMode={mode} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        <Pressable onPress={() => { quit(); navigation.goBack(); }}><Text className="text-mut font-semibold">‹ Quitter</Text></Pressable>

        <ConditionBanner mode={mode} rules={s.rules} lives={s.rogue?.lives} mods={s.rogue?.mods} />
        {mode === 'freeskill' && <TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} />}

        <Card>
          <View className="items-center gap-[4px] pb-[14px] pt-[8px]">
            <Text className="text-mut text-[12px] font-semibold">CIBLE</Text>
            <Text className="font-bold text-[60px]">{p.target}</Text>
            <View className="flex-row gap-[6px] mt-[4px]">
              <Chip>Niveau {p.difficulty}</Chip>
              <Chip bg="#FBEFE0" color="#B5651d">optimal · {s.optimalOperands}</Chip>
            </View>
          </View>

          <View className="min-h-[40px] items-center justify-center border-b border-dashed border-line py-[6px]">
            <Text className="font-bold text-[24px]">{s.input || <Text className="text-[#AEBccB] text-[15px]">touche les tuiles…</Text>}</Text>
          </View>
          <View className="flex-row justify-between mt-[8px]">
            <Text className="text-[13px] text-mut">vaut <Text className="text-ink font-bold">{liveValue(s.input)}</Text></Text>
            <Text className="text-[13px] text-mut">{s.input ? `${operandCount(s.input)} chiffre(s)` : ''}</Text>
          </View>

          <View className="flex-row gap-[10px] mt-[14px]">
            {s.rules.numbers.map((n) => <Tile key={n} label={String(n)} kind="num" onPress={() => press(String(n))} />)}
          </View>
          <View className="flex-row gap-[10px] mt-[10px]">
            {s.rules.operations.map((o) => <Tile key={o} label={sym(o)} kind="op" onPress={() => press(o)} />)}
          </View>

          {s.hintsUsed > 0 && (
            <Text className="mt-[10px] text-center text-[13px] text-mut">
              indice : <Text className="font-bold text-ink">{exprTokens(s.puzzle.expr).slice(0, s.hintsUsed).join('')}…</Text>
            </Text>
          )}
          <View className="flex-row gap-[10px] mt-[10px]">
            <View className="flex-1"><Button label="Effacer" onPress={del} /></View>
            <View className="flex-1"><Button label="Vider" onPress={clear} /></View>
            <View className="flex-1"><Button label="Indice" onPress={hint} disabled={s.hintsUsed >= exprTokens(s.puzzle.expr).length} /></View>
          </View>
          <View className="mt-[10px]"><Button variant="primary" label="Valider" onPress={submit} disabled={!s.input} /></View>
        </Card>

        <Text className="text-center text-mut text-[13px]">Score : <Text className="text-ink font-bold">{s.rogue ? s.rogue.score + s.score : s.score}</Text>{mode === 'freeskill' ? ` · niveau ${s.level}` : ''}</Text>
      </ScrollView>

      {fb && <FeedbackSheet fb={fb} input={s.input} onContinue={next} onRetry={clearSoftFeedback} />}
    </View>
  );
}
