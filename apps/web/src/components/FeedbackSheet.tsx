import { useEffect } from 'react';
import { Stars } from './Stars';
import { Button } from './ui';
import { audio } from '../lib/audio';
import type { Feedback } from '@shortest/engine';

const REASON: Record<string, string> = {
  empty: 'Vide', incomplete: 'Expression incomplète', has_parens: 'Parenthèses interdites',
  bad_token: 'Symbole non autorisé', missing_required: 'Contrainte non respectée', timeout: 'Temps écoulé',
};

/** Feuille de feedback (animation CSS native). Joue le son succès/échec à l'apparition. */
export function FeedbackSheet({ fb, input, onContinue, onRetry }:
  { fb: Feedback; input: string; onContinue: () => void; onRetry: () => void }) {
  useEffect(() => {
    audio.play(fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail');
    if (fb.pr) setTimeout(() => audio.play('record'), 260); // cue record APRÈS le succès
  }, [fb]);

  const stars = fb.stars ?? 0;
  return (
    <div className="anim-sheet-up fixed left-0 right-0 bottom-0 mx-auto max-w-app bg-card border-t border-line p-[18px] rounded-t-[22px]">
      {/* Bannière RECORD PERSO — n'apparaît qu'une fois par run (fb.pr piloté par le store) */}
      {fb.pr && (
        <div className="anim-pop mb-[12px] rounded-[14px] py-[10px] text-center font-display font-bold text-white" style={{ background: 'linear-gradient(90deg,#E8A317,#F5C451)' }}>
          🏆 Nouveau record personnel !
        </div>
      )}
      {fb.ok ? (
        <>
          <h4 className="font-display text-[18px] m-0 mb-[2px] flex items-center gap-[8px]">
            <span className="text-ok">✓</span>{stars === 3 ? 'Optimal !' : 'Correct'}
            <span className="ml-auto font-mono text-[15px] text-gold">+{fb.gained}</span>
          </h4>
          <div className="my-[12px]"><Stars value={stars} /></div>
          <p className="text-mut text-[13px] font-mono m-0">
            {input}{stars < 3 ? ` · plus court : ${fb.optimal}` : ''}
            {fb.canAdvance === false && ' · 3★ requis pour débloquer le niveau suivant'}
          </p>
          <Button variant="primary" className="w-full mt-[12px]" onClick={onContinue}>
            {fb.canAdvance === false ? 'Rejouer ce niveau' : 'Continuer'}
          </Button>
        </>
      ) : (
        <>
          <h4 className="font-display text-[18px] m-0 mb-[2px] flex items-center gap-[8px]">
            <span className="text-err">✕</span>{REASON[fb.reason ?? ''] ?? `Ce n'est pas ${fb.target}`}
          </h4>
          <p className="text-mut text-[13px] font-mono m-0">
            {fb.soft ? 'réessaie — la série ne tombe que sur une vraie réponse fausse.' : `cible ${fb.target} · une solution : ${fb.optimal}`}
          </p>
          <Button variant="primary" className="w-full mt-[12px]" onClick={fb.soft ? onRetry : onContinue}>
            {fb.soft ? 'Réessayer' : 'Continuer'}
          </Button>
        </>
      )}
    </div>
  );
}
