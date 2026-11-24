import { useEffect, useRef } from 'react';
import { useParams, useSearch, useNavigate, useLoaderData, Link } from '@tanstack/react-router';
import { ChevronLeft, Delete, Check, RotateCcw, Lightbulb } from 'lucide-react';
import type { Mode, Puzzle, Session } from '@shortest/engine';
import { exprTokens, hintStarCeiling } from '@shortest/engine';
import { useGame } from '../store/game';
import { audio } from '../lib/audio';
import { Button, Key, StreakPill, fmt } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ExpressionCells, ExpressionStatus } from '../components/Expression';
import { FeedbackSheet, MODE_LABEL } from '../components/FeedbackSheet';

const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
const OP_NAME: Record<string, string> = { '+': 'plus', '-': 'moins', '*': 'fois' };

function subtitle(mode: Mode, s: Session): string {
  if (mode === 'classic') return `niveau ${s.index + 1} sur 100`;
  if (mode === 'daily') {
    const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.dailyTraining ? `${day}, entraînement` : day;
  }
  if (mode === 'freeskill') return `difficulté ${s.level} sur 5, elle s'adapte`;
  return `puzzle ${s.index + 1}, points ×1,25`;
}

export function Play() {
  const { mode: modeParam } = useParams({ from: '/play/$mode' });
  const mode = modeParam as Mode;
  const { niveau } = useSearch({ from: '/play/$mode' });
  const table = useLoaderData({ from: '/play/$mode' }) as Puzzle[];
  const nav = useNavigate();
  const { session, start, press, del, clear, submit, next, tick, hint, clearSoftFeedback, quit } = useGame();
  const shakeRef = useRef<HTMLDivElement>(null);
  const lastWrong = useRef<string | null>(null);

  useEffect(() => {
    start(mode, table, niveau === undefined ? undefined : niveau - 1);
    audio.switchMusic('main');
  }, [mode, table, niveau, start]);

  // ---- chrono Free Skill : décrémente + bip sous 5 s ----
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = window.setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0) audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);

  // ---- clavier physique : chiffres, + - * x, Entrée, Retour arrière, Échap ----
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const s = useGame.getState().session;
      if (!s || s.feedback || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]')) return;
      const k = event.key;
      if (/^\d$/.test(k) && s.rules.numbers.includes(Number(k))) press(k);
      else if (['+', '-', '*', 'x', 'X'].includes(k)) {
        const op = k.toLowerCase() === 'x' ? '*' : k;
        if (!s.rules.operations.some((allowed) => allowed === op)) return;
        press(op);
      } else if (k === 'Enter' && !(event.target instanceof Element && event.target.closest('button,a,summary'))) submit();
      else if (k === 'Backspace') del();
      else if (k === 'Escape') clear();
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, del, clear, submit]);

  // secousse à chaque nouvelle réponse fausse
  const fbKey = session?.feedback && !session.feedback.ok && !session.feedback.soft ? `${session.puzzle.target}:${session.input}` : null;
  useEffect(() => {
    if (!fbKey || lastWrong.current === fbKey) return;
    lastWrong.current = fbKey;
    const el = shakeRef.current; if (!el) return;
    el.classList.remove('anim-shake'); void el.offsetWidth; el.classList.add('anim-shake');
  }, [fbKey]);

  if (!session || session.mode !== mode) return null;
  const s = session;
  const p = s.puzzle;
  const back = mode === 'classic' ? '/niveaux' : mode.startsWith('big') ? '/big-challenge' : '/';
  const leave = () => { quit(); nav({ to: back }); };

  const total = exprTokens(p.expr).length;
  const ceiling = hintStarCeiling(s.hintsUsed, total);
  const isBig = mode.startsWith('big');
  const allowHint = mode !== 'freeskill';

  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-[18px] pb-1.5">
        <Link to={back} aria-label="Quitter la partie" className="icon-btn" onClick={(e) => { e.preventDefault(); leave(); }}>
          <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="m-0 text-[17px] font-extrabold">{MODE_LABEL[mode]}</h1>
          <div className="text-mine text-[13.5px] truncate">{subtitle(mode, s)}</div>
        </div>
        {s.streak > 0 && <StreakPill value={s.streak} />}
        <span className="pill num">{fmt(s.score)} pts</span>
      </header>

      {mode === 'freeskill' && <div className="px-5 pt-3.5"><TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} /></div>}

      <section className="flex flex-col items-center px-5 pt-4" aria-label="Cible">
        <span className="text-mine text-sm font-semibold">Cible</span>
        <div className="num font-black leading-none tracking-[-0.05em] text-[clamp(72px,26vw,104px)] mt-1" aria-live="polite"><span className="hl">{p.target}</span></div>
        {mode === 'classic' && (
          <span className="mt-3 inline-flex items-center h-7 px-2.5 rounded-full bg-sheet border-[1.5px] border-graphite text-[13px] font-bold">
            3 étoiles pour passer au niveau {s.index + 2}
          </span>
        )}
        {isBig && s.rules.required.length > 0 && (
          <div className="hand mt-3 px-3.5 py-2 border-[2.5px] border-pen rounded-sheet text-pen text-lg font-extrabold -rotate-[2.5deg]">
            Doit contenir un {s.rules.required.join(' et un ')}
          </div>
        )}
        <p className="mt-3 mb-0 text-mine text-[13px]">Sans parenthèses : × se calcule avant + et −.</p>
      </section>

      <section aria-label="Ton expression" className="px-5 mt-2">
        <ExpressionCells input={s.input} optimal={s.optimalOperands} shakeRef={shakeRef} />
        <ExpressionStatus input={s.input} target={p.target} optimal={s.optimalOperands} required={s.rules.required} />
        {s.hintsUsed > 0 && (
          <p className="mt-2 mb-0 text-[14px]" role="status">
            <span className="hand font-bold text-pen">Indice :</span>{' '}
            <b className="num">{exprTokens(p.expr).slice(0, s.hintsUsed).map(sym).join('')}…</b>
            <span className="text-mine"> ({ceiling} étoile{ceiling > 1 ? 's' : ''} au mieux)</span>
          </p>
        )}
      </section>

      <section aria-label="Clavier" className="mt-auto px-5 pt-5 pb-[22px] flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          {s.rules.numbers.map((n) => <Key key={n} label={String(n)} kind="num" required={s.rules.required.includes(n)} aria={s.rules.required.includes(n) ? `${n}, chiffre obligatoire` : undefined} onPress={() => press(String(n))} />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {s.rules.operations.map((o) => <Key key={o} label={sym(o)} aria={OP_NAME[o]} kind="op" onPress={() => press(o)} />)}
        </div>
        <div className={`grid gap-3 ${allowHint ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {allowHint && <Button icon={<Lightbulb size={18} aria-hidden="true" />} className="min-h-12" onClick={hint} disabled={s.hintsUsed >= total}>Indice</Button>}
          <Button icon={<Delete size={18} aria-hidden="true" />} className="min-h-12" onClick={del}>Effacer</Button>
          <Button icon={<RotateCcw size={17} aria-hidden="true" />} className="min-h-12" onClick={clear}>Vider</Button>
        </div>
        <Button variant="ink" icon={<Check size={20} strokeWidth={2.6} aria-hidden="true" />} className="min-h-[58px] text-[17px]" onClick={submit} disabled={!s.input || s.dailySaving}>
          {s.dailySaving ? 'Enregistrement…' : 'Valider'}
        </Button>
        {!allowHint && <p className="m-0 text-center text-mine text-[12.5px]">En chrono, pas d'indice : chaque seconde compte.</p>}
        {mode === 'daily' && s.dailyTraining && <p className="m-0 text-center text-mine text-[12.5px]">Entraînement : le défi du jour est déjà récompensé.</p>}
      </section>

      {s.feedback && (
        <FeedbackSheet fb={s.feedback} input={s.input} mode={mode} difficulty={p.difficulty} streak={s.streak} level={s.index}
          onContinue={next} onRetry={clearSoftFeedback} onMenu={leave} />
      )}
    </>
  );
}
