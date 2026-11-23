import { useEffect } from 'react';
import { formatCalculation } from '@shortest/tokens';
import { Stars } from './Stars';
import { Button } from './ui';
import { audio } from '../lib/audio';
import type { Feedback } from '@shortest/engine';

const REASON: Record<string, string> = {
  empty: 'Vide',
  incomplete: 'Expression incomplète',
  has_parens: 'Parenthèses interdites',
  bad_token: 'Symbole non autorisé',
  missing_required: 'Contrainte non respectée',
  timeout: 'Temps écoulé',
  save_failed: 'Sauvegarde impossible',
};

/** Résultat du calcul courant. */
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
    audio.play(fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail');
    if (!fb.pr) return;
    const recordCue = setTimeout(() => audio.play('record'), 260);
    return () => clearTimeout(recordCue);
  }, [fb]);

  const stars = fb.stars ?? 0;
  return (
    <div className="math-result anim-sheet-up" aria-live="polite">
      {/* Bannière RECORD PERSO — n'apparaît qu'une fois par run (fb.pr piloté par le store) */}
      {fb.pr && (
        <div className="record-note anim-pop">Nouveau record personnel !</div>
      )}
      {fb.ok ? (
        <>
          <h4 className="font-display text-[18px] m-0 mb-[2px] flex items-center gap-[8px]">
            <span className="text-ok">✓</span>
            {stars === 3 ? 'Optimal !' : 'Correct'}
            <span className="ml-auto font-mono text-[13px] text-gold">
              {fb.training ? 'Entraînement · sans récompense' : `+${fb.gained}`}
            </span>
          </h4>
          <div className="result-stars">
            <Stars value={stars} />
          </div>
          <p className="result-calculation">
            {formatCalculation(input)} = {fb.target}
            {stars < 3
              ? ` · plus court : ${formatCalculation(fb.optimal)}`
              : ''}
            {fb.canAdvance === false &&
              ' · 3★ requis pour débloquer le niveau suivant'}
          </p>
          <Button
            variant="primary"
            className="w-full mt-[12px]"
            onClick={onContinue}
          >
            {fb.canAdvance === false ? 'Rejouer ce niveau' : 'Continuer'}
          </Button>
        </>
      ) : (
        <>
          <h4 className="font-display text-[18px] m-0 mb-[2px] flex items-center gap-[8px]">
            <span className="text-err">✕</span>
            {REASON[fb.reason ?? ''] ?? `Ce n'est pas ${fb.target}`}
          </h4>
          <p className="text-mut text-[13px] font-mono m-0">
            {fb.soft
              ? 'réessaie — la série ne tombe que sur une vraie réponse fausse.'
              : `cible ${fb.target} · une solution : ${formatCalculation(fb.optimal)}`}
          </p>
          <Button
            variant="primary"
            className="w-full mt-[12px]"
            onClick={fb.soft ? onRetry : onContinue}
          >
            {fb.soft ? 'Réessayer' : 'Continuer'}
          </Button>
        </>
      )}
    </div>
  );
}
