import { useEffect } from 'react';
import { View } from 'react-native';
import { GameText as Text, g } from './GameScreen';
import { formatCalculation } from '@shortest/tokens';
import { Stars, Button } from './ui';
import { audio } from '../audio';
import type { Feedback } from '@shortest/engine';

const REASON: Record<string, string> = {
  incomplete: 'Expression incomplète',
  has_parens: 'Parenthèses interdites',
  bad_token: 'Symbole non autorisé',
  missing_required: 'Contrainte non respectée',
  timeout: 'Temps écoulé',
  save_failed: 'Sauvegarde impossible',
};
/** Feuille de feedback mobile. Joue le son succès/échec à l'apparition. */
export function FeedbackSheet({
  fb,
  input,
  onContinue,
  onRetry,
}: {
  fb: Feedback;
  input: string;
  onContinue: () => void;
  onRetry: () => void;
}) {
  useEffect(() => {
    void audio.play(
      fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail',
    );
    if (!fb.pr) return;
    const recordCue = setTimeout(() => void audio.play('record'), 260);
    return () => clearTimeout(recordCue);
  }, [fb]);
  const stars = fb.stars ?? 0;
  return (
    <View style={{ gap: 12, paddingVertical: 18 }}>
      {fb.pr && (
        <View
          className="mb-[12px] rounded-[14px] py-[10px] items-center"
          style={{ backgroundColor: '#E8A317' }}
        >
          <Text className="text-ink font-bold">Nouveau record personnel !</Text>
        </View>
      )}
      {fb.ok ? (
        <>
          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-bold text-ok">
              {stars === 3 ? '✓ Optimal !' : '✓ Correct'}
            </Text>
            <Text className="text-[13px] text-gold font-bold">
              {fb.training ? 'Entraînement · sans récompense' : `+${fb.gained}`}
            </Text>
          </View>
          <View className="my-[12px]">
            <Stars value={stars} />
          </View>
          <Text
            style={[g.light, g.blue, { fontSize: 22, textAlign: 'center' }]}
          >
            {formatCalculation(input)} = {fb.target}
            {stars < 3
              ? ` · plus court : ${formatCalculation(fb.optimal)}`
              : ''}
            {fb.canAdvance === false ? ' · 3★ requis pour débloquer' : ''}
          </Text>
          <View className="mt-[12px]">
            <Button
              variant="primary"
              label={
                fb.canAdvance === false ? 'Rejouer ce niveau' : 'Continuer'
              }
              onPress={onContinue}
            />
          </View>
        </>
      ) : (
        <>
          <Text className="text-[18px] font-bold text-err">
            ✕ {REASON[fb.reason ?? ''] ?? `Ce n'est pas ${fb.target}`}
          </Text>
          <Text className="text-mut text-[13px] mt-[2px]">
            {fb.soft
              ? 'réessaie — la série ne tombe que sur une vraie réponse fausse.'
              : `cible ${fb.target} · une solution : ${formatCalculation(fb.optimal)}`}
          </Text>
          <View className="mt-[12px]">
            <Button
              variant="primary"
              label={fb.soft ? 'Réessayer' : 'Continuer'}
              onPress={fb.soft ? onRetry : onContinue}
            />
          </View>
        </>
      )}
    </View>
  );
}
