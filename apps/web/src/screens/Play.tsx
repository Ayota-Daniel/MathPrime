import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLoaderData, Link } from '@tanstack/react-router';
import { ChevronLeft, Delete, Check, RotateCcw, Lightbulb } from 'lucide-react';
import type { Mode, Puzzle, Session } from '@shortest/engine';
import { exprTokens, hintStarCeiling, MAX_LIVES } from '@shortest/engine';
import { useGame } from '../store/game';
import { audio } from '../lib/audio';
import { Button, Key, Hearts, StreakPill, fmt } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ExpressionCells, ExpressionStatus } from '../components/Expression';
import { FeedbackSheet } from '../components/FeedbackSheet';

const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
const OP_NAME: Record<string, string> = { '+': 'plus', '-': 'moins', '*': 'fois' };

const TITLE: Record<Mode, string> = {
  classic: 'Classique', daily: 'Défi du jour', freeskill: 'Free Skill', rogue: 'Rogue-like',
  big3: 'Big Challenge 3', big5: 'Big Challenge 5', big7: 'Big Challenge 7',
};
function subtitle(mode: Mode, s: Session): string {
  if (mode === 'classic') return `niveau ${s.index + 1} sur 100`;
  if (mode === 'daily') return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (mode === 'freeskill') return `difficulté ${s.level} sur 5, elle s'adapte`;
  if (mode === 'rogue') return `puzzle ${(s.rogue?.solved ?? 0) + 1}`;
  return `puzzle ${s.index + 1}, points ×1,25`;
}

export function Play() {
  const { mode: modeParam } = useParams({ from: '/play/$mode' });
  const mode = modeParam as Mode;
  const table = useLoaderData({ from: '/play/$mode' }) as Puzzle[];
  const nav = useNavigate();
  const { session, start, press, del, clear, submit, next, tick, hint, chooseModifier, clearSoftFeedback, quit } = useGame();
  const shakeRef = useRef<HTMLDivElement>(null);
  const lastWrong = useRef<string | null>(null);

  useEffect(() => { start(mode, table); audio.switchMusic(mode === 'rogue' ? 'rogue' : 'main'); }, [mode, table, start]);

  // ---- chrono Free Skill : décrémente + bip sous 5 s ----
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0) audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);

  // ---- clavier physique : 3 5 7, + - * x, Entrée, Retour arrière, Échap ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState().session;
      if (!s || s.feedback || s.draft || s.rogue?.over) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { if (s.rules.numbers.includes(Number(k))) { press(k); e.preventDefault(); } return; }
      if (k === '+' || k === '-') { if (s.rules.operations.includes(k)) { press(k); e.preventDefault(); } return; }
      if (k === '*' || k === 'x' || k === 'X') { if (s.rules.operations.includes('*')) { press('*'); e.preventDefault(); } return; }
      if (k === 'Enter') { submit(); e.preventDefault(); return; }
      if (k === 'Backspace') { del(); e.preventDefault(); return; }
      if (k === 'Escape') { clear(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, del, clear, submit]);

  // secousse à chaque nouvelle réponse fausse (hors effet de rendu)
  const fbKey = session?.feedback && !session.feedback.ok ? `${session.puzzle.target}:${session.input}` : null;
  useEffect(() => {
    if (!fbKey || lastWrong.current === fbKey) return;
    lastWrong.current = fbKey;
    const el = shakeRef.current; if (!el) return;
    el.classList.remove('anim-shake'); void el.offsetWidth; el.classList.add('anim-shake');
  }, [fbKey]);

  if (!session) return null;
  const s = session;
  const p = s.puzzle;
  const leave = () => { quit(); nav({ to: '/' }); };

  if (s.rogue?.over) return <RogueEnd s={s} onReplay={() => start('rogue', table)} onMenu={leave} />;
  if (s.draft) return <RogueDraft s={s} onPick={(m) => { audio.play('select'); chooseModifier(m); }} />;

  const total = exprTokens(p.expr).length;
  const ceiling = hintStarCeiling(s.hintsUsed, total);
  const score = s.rogue ? s.rogue.score : s.score;
  const isBig = mode.startsWith('big');
  const allowHint = mode !== 'freeskill';

  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-[18px] pb-1.5">
        <Link to="/" aria-label="Quitter la partie" className="icon-btn" onClick={(e) => { e.preventDefault(); leave(); }}>
          <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-extrabold">{TITLE[mode]}</div>
          <div className="text-mine text-[13.5px] truncate">{subtitle(mode, s)}</div>
        </div>
        {s.rogue ? <Hearts lives={s.rogue.lives} max={MAX_LIVES} /> : s.streak > 0 && <StreakPill value={s.streak} />}
        <span className="pill num">{fmt(score)} pts</span>
      </header>

      {mode === 'freeskill' && <div className="px-5 pt-3.5"><TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} /></div>}

      <section className="flex flex-col items-center px-5 pt-4">
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
        {s.rogue && s.rogue.mods.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Règles actives">
            {s.rogue.mods.map((m) => (
              <span key={m.id} className={`pill h-7 text-[13px] ${m.kind === 'bane' ? 'border-pen text-pen' : ''}`}>{m.label}</span>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Ton expression" className="px-5 mt-3">
        <ExpressionCells input={s.input} optimal={s.optimalOperands} shakeRef={shakeRef} />
        <ExpressionStatus input={s.input} target={p.target} optimal={s.optimalOperands} required={s.rules.required} />
        {s.hintsUsed > 0 && (
          <p className="mt-2 mb-0 text-[14px]">
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
        <Button variant="ink" icon={<Check size={20} strokeWidth={2.6} aria-hidden="true" />} className="min-h-[58px] text-[17px]" onClick={submit} disabled={!s.input}>Valider</Button>
        {!allowHint && <p className="m-0 text-center text-mine text-[12.5px]">En chrono, pas d'indice : chaque seconde compte.</p>}
      </section>

      {s.feedback && (
        <FeedbackSheet fb={s.feedback} input={s.input} mode={mode} difficulty={p.difficulty} streak={s.streak} level={s.index}
          onContinue={next} onRetry={clearSoftFeedback} onMenu={leave} />
      )}
    </>
  );
}

/* ---------------- Rogue : choix de règle ---------------- */
function RogueDraft({ s, onPick }: { s: Session; onPick: (m: NonNullable<Session['draft']>[number]) => void }) {
  const run = s.rogue!;
  return (
    <>
      <header className="flex items-center justify-between px-5 pt-[22px] pb-1.5">
        <div className="text-[17px] font-extrabold">Rogue-like</div>
        <div className="flex items-center gap-2"><Hearts lives={run.lives} max={MAX_LIVES} /><span className="pill num">{fmt(run.score)} pts</span></div>
      </header>
      <section className="px-5 pt-5">
        <h1 className="hand m-0 text-[32px] font-black text-ink leading-tight">Puzzle {run.solved} réussi</h1>
        <p className="mt-2 mb-0 text-[15.5px] leading-snug">Choisis une règle pour la suite du run. Plus elle te gêne, plus elle multiplie tes points.</p>
      </section>
      <section aria-label="Règles proposées" className="px-5 pt-5 flex flex-col gap-4">
        {s.draft!.map((m) => {
          const bane = m.kind === 'bane';
          return (
            <button key={m.id} type="button" onClick={() => onPick(m)}
              className="sheet press w-full text-left p-4 flex items-center gap-3.5 hover:-translate-x-px hover:-translate-y-px">
              <span className="flex-1">
                <span className={`hand inline-block text-[12.5px] font-extrabold px-2 py-0.5 border-2 rounded-cell -rotate-2 ${bane ? 'text-pen border-pen' : 'text-ink border-ink'}`}>{bane ? 'Malus' : 'Bonus'}</span>
                <span className="block text-[17px] font-extrabold mt-2">{m.label}</span>
                {m.restoreLife && <span className="block text-mine text-[13.5px] mt-0.5">Tu récupères une vie.</span>}
              </span>
              <span className={`num text-[28px] font-black min-w-[70px] text-right ${bane ? 'text-pen' : m.scoreMult > 1 ? 'text-ink' : 'text-mine'}`}>×{m.scoreMult.toLocaleString('fr-FR')}</span>
            </button>
          );
        })}
      </section>
      {run.mods.length > 0 && (
        <section className="mt-auto px-5 pb-6 pt-5">
          <div className="text-mine text-[13.5px] font-semibold mb-2">Déjà en jeu</div>
          <div className="flex gap-2 flex-wrap">
            {run.mods.map((m) => <span key={m.id} className={`pill ${m.kind === 'bane' ? 'border-pen text-pen' : ''}`}>{m.label} <span className="num">×{m.scoreMult.toLocaleString('fr-FR')}</span></span>)}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------- Rogue : fin de run ---------------- */
function RogueEnd({ s, onReplay, onMenu }: { s: Session; onReplay: () => void; onMenu: () => void }) {
  const run = s.rogue!;
  const record = run.score > s.prevBest;
  return (
    <>
      <section className="pt-14 px-5 flex flex-col items-center text-center">
        <h1 className="hand m-0 text-[34px] font-black text-pen">Plus de vies</h1>
        <p className="mt-1.5 mb-0 text-[15.5px]">{run.solved > 0 ? `Tu as tenu ${run.solved} puzzle${run.solved > 1 ? 's' : ''}.` : 'Aucun puzzle réussi cette fois.'}</p>
        <div className="num mt-5 text-[clamp(64px,22vw,92px)] font-black leading-none tracking-[-0.05em]"><span className="hl">{fmt(run.score)}</span></div>
        <div className="text-mine text-sm mt-1.5">{record ? 'points, nouveau record' : s.prevBest > 0 ? `points, ton record est à ${fmt(s.prevBest)}` : 'points'}</div>
      </section>
      {run.mods.length > 0 && (
        <section className="sheet mx-5 mt-7 px-4 py-1.5 dashed-rows">
          <div className="flex py-2.5 font-extrabold text-[15px]"><span className="flex-1">Règles prises pendant le run</span><span className="num text-mine text-[13px]">mult.</span></div>
          {run.mods.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 text-[15px]">
              <span className="num w-[26px] h-[26px] rounded-full border-[1.5px] border-graphite grid place-items-center text-[13px] font-extrabold">{i + 1}</span>
              <span className="flex-1">{m.label}</span>
              <span className={`num ${m.kind === 'bane' ? 'text-pen' : ''}`}>×{m.scoreMult.toLocaleString('fr-FR')}</span>
            </div>
          ))}
        </section>
      )}
      <section className="mt-auto px-5 pb-6 pt-6 grid grid-cols-[1fr_1.6fr] gap-3">
        <Button variant="line" className="min-h-[58px]" onClick={onMenu}>Menu</Button>
        <Button variant="ink" className="min-h-[58px] text-[17px]" onClick={onReplay}>Nouveau run</Button>
      </section>
    </>
  );
}
