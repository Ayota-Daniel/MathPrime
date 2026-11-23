import { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { exprTokens, type Feedback, type Mode } from '@shortest/engine';
import { cahier } from '@shortest/tokens';
import { Button, Stars, fmt } from './ui';
import { liveValue } from './Expression';
import { audio } from '../lib/audio';

const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
const isOp = (t: string) => t === '+' || t === '-' || t === '*';

const MODE_LABEL: Record<Mode, string> = {
  classic: 'Classique', daily: 'Défi du jour', freeskill: 'Free Skill', rogue: 'Rogue-like',
  big3: 'Big Challenge 3', big5: 'Big Challenge 5', big7: 'Big Challenge 7',
};
const SOFT_REASON: Record<string, { title: string; hint: string }> = {
  empty: { title: 'Rien à valider', hint: 'Tape une expression avec les touches ou le clavier.' },
  incomplete: { title: 'Expression incomplète', hint: 'Elle se termine par un signe : ajoute un chiffre.' },
  has_parens: { title: 'Pas de parenthèses', hint: '× se calcule avant + et −, sans parenthèses.' },
  bad_token: { title: 'Symbole non autorisé', hint: 'Utilise seulement les chiffres et les signes proposés, un chiffre à la fois.' },
};

/** Expression figée en cases (réponse du joueur ou solution). `mark` surligne le dernier chiffre. */
function Chain({ expr, result, strike, mark }: { expr: string; result: number | string; strike?: boolean; mark?: number }) {
  const toks = exprTokens(expr);
  return (
    <div className="relative inline-flex flex-wrap gap-[3px] items-center">
      {toks.map((t, i) => isOp(t)
        ? <span key={i} className="num w-[22px] h-[42px] grid place-items-center text-xl font-extrabold text-ink">{sym(t)}</span>
        : <span key={i} className={`num w-[34px] h-[42px] grid place-items-center text-[22px] font-extrabold border-[1.5px] border-graphite rounded-cell ${mark === i ? 'bg-hl' : 'bg-sheet'}`}>{t}</span>)}
      <span className="num ml-2 text-xl font-extrabold">= {result}</span>
      {strike && (
        <svg aria-hidden="true" className="absolute -left-1.5 top-1.5 w-[calc(100%+12px)] h-[30px] pointer-events-none" viewBox="0 0 260 30" preserveAspectRatio="none" fill="none" stroke={cahier.pen} strokeWidth="2.6" strokeLinecap="round">
          <path d="M2 22C60 12 140 8 258 6" />
        </svg>
      )}
    </div>
  );
}

/** Feuille de résultat : réussite (étoiles, détail des points) ou échec (écart, solution). */
export function FeedbackSheet({ fb, input, mode, difficulty, streak, level, onContinue, onRetry, onMenu }: {
  fb: Feedback; input: string; mode: Mode; difficulty: number; streak: number; level: number;
  onContinue: () => void; onRetry: () => void; onMenu: () => void;
}) {
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    audio.play(fb.ok ? 'success' : fb.reason === 'timeout' ? 'timeup' : 'fail');
    if (fb.pr) setTimeout(() => audio.play('record'), 260);
    primary.current?.focus();
  }, [fb]);

  const stars = fb.stars ?? 0;
  const ops = fb.operands ?? exprTokens(input).filter((t) => !isOp(t)).length;
  const optimalOps = fb.optimalOperands ?? exprTokens(fb.optimal).filter((t) => !isOp(t)).length;

  let body;
  if (fb.ok) {
    const prevStreak = Math.max(0, streak - 1);
    const streakMult = 1 + Math.min(0.5, prevStreak * 0.05);
    const nextLabel = fb.canAdvance === false ? 'Rejouer ce niveau' : mode === 'classic' ? `Passer au niveau ${level + 2}` : 'Puzzle suivant';
    body = (
      <>
        {fb.pr && (
          <div className="anim-pop flex items-center gap-2.5 bg-hl border-[1.5px] border-graphite rounded-sheet px-3 py-2.5 font-extrabold text-[15px]">
            <Trophy size={20} aria-hidden="true" />Nouveau record personnel en {MODE_LABEL[mode]}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="hand m-0 text-4xl font-black text-ink flex items-center gap-2">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 18c4 3 6 6 8 10 4-10 9-17 17-23" /></svg>
            {stars === 3 ? 'Optimal' : 'Correct'}
          </h2>
          <Stars value={stars} />
        </div>
        <div>
          <p className="text-mine text-[13.5px] mt-0 mb-1.5">
            Ta réponse, {ops} chiffres. {stars === 3 ? 'Impossible de faire plus court.' : `La plus courte en a ${optimalOps}.`}
          </p>
          <Chain expr={input} result={fb.target} />
          {stars < 3 && <div className="mt-2"><Chain expr={fb.optimal} result={fb.target} /></div>}
          {fb.canAdvance === false && <p className="text-pen font-bold text-[13.5px] mt-2 mb-0">Il faut 3 étoiles pour débloquer le niveau suivant.</p>}
        </div>
        <div className="border-[1.5px] border-graphite rounded-sheet px-3.5 py-1 dashed-rows">
          <div className="flex justify-between py-2 text-[15px]"><span>Difficulté {difficulty}</span><span className="num">sur 5</span></div>
          <div className="flex justify-between py-2 text-[15px]"><span>{stars === 3 ? 'Solution optimale' : `${stars} étoile${stars > 1 ? 's' : ''}`}</span><span className="num">×{(stars === 3 ? 1.5 : stars === 2 ? 1 : 0.6).toLocaleString('fr-FR')}</span></div>
          {prevStreak > 0 && <div className="flex justify-between py-2 text-[15px]"><span>Série de {prevStreak}</span><span className="num">×{streakMult.toLocaleString('fr-FR')}</span></div>}
          <div className="flex justify-between py-2 text-[17px] font-extrabold"><span>Gagné</span><span className="num">+{fmt(fb.gained ?? 0)}</span></div>
        </div>
        <button ref={primary} type="button" className="btn-ink press min-h-[58px] text-[17px]" onClick={() => { audio.play('select'); onContinue(); }}>{nextLabel}</button>
      </>
    );
  } else if (fb.soft) {
    const r = SOFT_REASON[fb.reason ?? ''] ?? { title: 'Expression invalide', hint: 'Corrige-la et valide à nouveau.' };
    body = (
      <>
        <div>
          <h2 className="hand m-0 text-[30px] font-black text-pen">{r.title}</h2>
          <p className="mt-1.5 mb-0 text-[15.5px] leading-snug">{r.hint} Ta série continue.</p>
        </div>
        <button ref={primary} type="button" className="btn-ink press min-h-[58px] text-[17px]" onClick={() => { audio.play('select'); onRetry(); }}>Corriger</button>
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
        <div>
          <h2 className="hand m-0 text-[32px] font-black text-pen">{title}</h2>
          <p className="mt-1.5 mb-0 text-[15.5px] leading-snug">{detail} {streak === 0 ? 'Ta série repart de zéro.' : ''}</p>
        </div>
        {input && v !== null && (
          <div>
            <div className="text-mine text-[13.5px] mb-1.5">Ta réponse</div>
            <Chain expr={input} result={v} strike />
          </div>
        )}
        <div>
          <div className="text-mine text-[13.5px] mb-1.5">Une solution en {optimalOps} chiffres</div>
          <Chain expr={fb.optimal} result={fb.target} />
        </div>
        <div className="grid grid-cols-[1fr_1.6fr] gap-3">
          <Button variant="line" className="min-h-[58px]" onClick={onMenu}>Menu</Button>
          <button ref={primary} type="button" className="btn-ink press min-h-[58px]" onClick={() => { audio.play('select'); onContinue(); }}>{cont}</button>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end" style={{ background: 'rgba(35,41,58,0.28)' }}>
      <section role="dialog" aria-modal="true" aria-label={fb.ok ? 'Résultat' : 'Réponse incorrecte'}
        className={`anim-sheet-up mx-auto w-full max-w-app bg-sheet rounded-t-[14px] px-5 pt-5 pb-6 flex flex-col gap-4 border-t-[1.5px] ${fb.ok || fb.soft ? 'border-graphite' : 'border-pen border-t-2'}`}>
        {body}
      </section>
    </div>
  );
}
