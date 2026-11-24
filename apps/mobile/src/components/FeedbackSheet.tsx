import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stars, Button } from './ui';
import { audio } from '../audio';
import type { Feedback } from '@shortest/engine';

const REASON: Record<string, string> = {
  incomplete: 'Expression incomplète', has_parens: 'Parenthèses interdites', bad_token: 'Symbole non autorisé',
  missing_required: 'Contrainte non respectée', timeout: 'Temps écoulé',
};
/** Feuille de feedback mobile. Joue le son succès/échec à l'apparition. */
export function FeedbackSheet({ fb, input, onContinue, onRetry }:
  { fb: Feedback; input: string; onContinue: () => void; onRetry: () => void }) {
  useEffect(() => {
    void audio.play(fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail');
    if (fb.pr) setTimeout(() => void audio.play('record'), 260);
  }, [fb]);
  const stars = fb.stars ?? 0;
  return (
    <View className="absolute left-0 right-0 bottom-0 bg-card border-t border-line p-[18px] rounded-t-[22px]">
      {fb.pr && (
        <View className="mb-[12px] rounded-[14px] py-[10px] items-center" style={{ backgroundColor: '#E8A317' }}>
          <Text className="text-white font-bold">🏆 Nouveau record personnel !</Text>
        </View>
      )}
      {fb.ok ? (
        <>
          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-bold text-ok">{stars === 3 ? '✓ Optimal !' : '✓ Correct'}</Text>
            <Text className="text-[15px] text-gold font-bold">+{fb.gained}</Text>
          </View>
          <View className="my-[12px]"><Stars value={stars} /></View>
          <Text className="text-mut text-[13px]">
            {input}{stars < 3 ? ` · plus court : ${fb.optimal}` : ''}{fb.canAdvance === false ? ' · 3★ requis pour débloquer' : ''}
          </Text>
          <View className="mt-[12px]"><Button variant="primary" label={fb.canAdvance === false ? 'Rejouer ce niveau' : 'Continuer'} onPress={onContinue} /></View>
        </>
      ) : (
        <>
          <Text className="text-[18px] font-bold text-err">✕ {REASON[fb.reason ?? ''] ?? `Ce n'est pas ${fb.target}`}</Text>
          <Text className="text-mut text-[13px] mt-[2px]">{fb.soft ? 'réessaie — la série ne tombe que sur une vraie réponse fausse.' : `cible ${fb.target} · une solution : ${fb.optimal}`}</Text>
          <View className="mt-[12px]"><Button variant="primary" label={fb.soft ? 'Réessayer' : 'Continuer'} onPress={fb.soft ? onRetry : onContinue} /></View>
        </>
      )}
    </View>
  );
}
