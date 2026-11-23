import { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import {
  evaluate,
  operandCount,
  exprTokens,
  hintStarCeiling,
  type Mode,
} from '@shortest/engine';
import { colors, formatCalculation, modeNames, rogue } from '@shortest/tokens';
import { useGame } from '../store';
import { loadTable } from '../data';
import { audio } from '../audio';
import { Button, Tile } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { GameText as Text, g } from '../components/GameScreen';
import { Back } from './Guide';

function valueOf(input: string) {
  try {
    return !input || /[+*\-]$/.test(input) ? '—' : evaluate(input);
  } catch {
    return '—';
  }
}
export function Play({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Play'>) {
  const mode = route.params.mode as Mode;
  const level = route.params.niveau;
  const {
    session: s,
    start,
    press,
    del,
    clear,
    submit,
    next,
    tick,
    hint,
    clearSoftFeedback,
    quit,
  } = useGame();
  useEffect(() => {
    if (mode === 'rogue') {
      navigation.replace('Rogue');
      return;
    }
    start(mode, loadTable(mode), level === undefined ? undefined : level - 1);
    void audio.switchMusic('main');
  }, [mode, level, start, navigation]);
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const timer = setInterval(() => {
      const now = useGame.getState().session;
      if (now && !now.feedback && now.secondsLeft <= 5 && now.secondsLeft > 0)
        void audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, tick]);
  if (!s || s.mode !== mode || mode === 'rogue') return null;
  const tokens = exprTokens(s.puzzle.expr);
  return (
    <ScrollView contentContainerStyle={[g.wrap, { gap: 8 }]}>
      <Back
        label={
          mode === 'classic'
            ? 'Niveaux'
            : mode.startsWith('big')
              ? 'Big Challenge'
              : 'Accueil'
        }
        go={() => {
          quit();
          if (mode === 'classic') navigation.popTo('Levels');
          else navigation.goBack();
        }}
      />
      <Text style={g.title}>{modeNames[mode]}</Text>
      <Text style={g.sub}>
        {mode === 'classic'
          ? `Niveau ${s.index + 1} / 100`
          : mode === 'daily'
            ? s.dailyDate
            : mode === 'freeskill'
              ? `Difficulté ${s.level} / 5`
              : `Chiffre ${s.rules.required.join(', ')} obligatoire`}
      </Text>
      {s.feedback ? (
        <FeedbackSheet
          fb={s.feedback}
          input={s.input}
          onContinue={next}
          onRetry={clearSoftFeedback}
        />
      ) : (
        <>
          <View style={g.strip}>
            <Text
              style={{ textAlign: 'center', fontFamily: rogue.font.strong }}
            >
              Sans parenthèses · La multiplication est prioritaire
            </Text>
          </View>
          <View style={[g.blue, { padding: 10, gap: 0 }]}>
            <Text style={[g.light, { textAlign: 'center' }]}>Cible</Text>
            <Text style={g.value}>{s.puzzle.target}</Text>
            {mode === 'freeskill' ? (
              <TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} />
            ) : (
              <Text style={[g.light, { textAlign: 'center' }]}>
                Minimum · {s.optimalOperands} chiffres
              </Text>
            )}
          </View>
          <Text
            style={{
              textAlign: 'center',
              fontFamily: rogue.font.display,
              fontSize: s.input ? 28 : 18,
              minHeight: 40,
              borderBottomWidth: 3,
              borderColor: colors.pri,
            }}
          >
            {s.input ? formatCalculation(s.input) : 'Construis ton expression…'}
          </Text>
          <View style={g.between}>
            <Text>Résultat · {valueOf(s.input)}</Text>
            <Text>{operandCount(s.input)} chiffres</Text>
          </View>
          <View style={g.row}>
            {s.rules.numbers.map((n) => (
              <Tile
                key={n}
                kind="num"
                label={String(n)}
                onPress={() => press(String(n))}
              />
            ))}
          </View>
          <View style={g.row}>
            {s.rules.operations.map((op) => (
              <Tile
                key={op}
                kind="op"
                label={formatCalculation(op)}
                onPress={() => press(op)}
              />
            ))}
          </View>
          <View style={g.between}>
            <Button label="Vider" onPress={clear} />
            <Button label="Effacer" onPress={del} />
            <Button
              label="Indice"
              onPress={hint}
              disabled={s.hintsUsed >= tokens.length}
            />
          </View>
          {s.hintsUsed > 0 && (
            <Text style={g.sub}>
              Indice ·{' '}
              {formatCalculation(tokens.slice(0, s.hintsUsed).join(''))}… ·
              maximum {hintStarCeiling(s.hintsUsed, tokens.length)}★
            </Text>
          )}
          <Button
            label={s.dailySaving ? 'Enregistrement…' : 'Valider'}
            variant="primary"
            disabled={!s.input || s.dailySaving}
            onPress={submit}
          />
          <Text style={g.sub}>
            Score · {s.score}
            {mode === 'freeskill' && ` · Série ${s.streak}`}
            {mode === 'daily' &&
              s.dailyTraining &&
              ' · Entraînement sans nouvelle récompense'}
          </Text>
        </>
      )}
    </ScrollView>
  );
}
