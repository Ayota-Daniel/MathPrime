import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLoaderData } from '@tanstack/react-router';
import { ChevronLeft, Delete, X, Check, Plus, RotateCcw, Swords, Lightbulb } from 'lucide-react';
import type { Mode, Puzzle } from '@shortest/engine';
import { evaluate, operandCount, exprTokens } from '@shortest/engine';
import { useGame } from '../store/game';
import { audio } from '../lib/audio';
import { TopBar } from '../components/TopBar';
import { Card, Button, Tile, Chip } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { ConditionBanner } from '../components/ConditionBanner';
import { FeedbackSheet } from '../components/FeedbackSheet';

const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
const liveValue = (input: string): string => { try { return /[+\-*]$|^$/.test(input) ? '—' : String(evaluate(input)); } catch { return '—'; } };

export function Play() {
  const { mode } = useParams({ from: '/play/$mode' });
  const table = useLoaderData({ from: '/play/$mode' }) as Puzzle[];
  const nav = useNavigate();
  const { session, rogueSelectionFailed, start, press, del, clear, submit, next, tick, hint, chooseModifier, clearSoftFeedback, quit } = useGame();
  const shakeRef = useRef<HTMLDivElement>(null);
  const lastWrong = useRef(0);

  useEffect(() => { start(mode as Mode, table); audio.switchMusic(mode === 'rogue' ? 'rogue' : 'main'); }, [mode, table, start]);

  // ---- timer Free Skill : décrémente + bip "tick" sous 5 s ----
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0) audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);

  // ---- MAPPING CLAVIER (web) : 3 5 7, + - *, Entrée=valider, Backspace=effacer, Échap=vider ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState().session;
      if (!s || s.feedback || s.draft || s.rogue?.over) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { if (s.rules.numbers.includes(Number(k))) { press(k); e.preventDefault(); } return; }
      if (k === '+' || k === '-') { if (s.rules.operations.includes(k)) { press(k); e.preventDefault(); } return; }
      if (k === '*' || k === 'x' || k === 'X') { if (s.rules.operations.includes('*')) { press('*'); e.preventDefault(); } return; }
      if (k === 'Enter') { submit(); e.preventDefault(); return; }
      if (k === 'Backspace') { del(); e.preventDefault(); return; }
      if (k === 'Escape') { clear(); e.preventDefault(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, del, clear, submit]);

  // ---- écran de fin Rogue ----
  if (rogueSelectionFailed || session?.rogue?.over) {
    return (
      <>
        <TopBar streakMode="rogue" />
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-[6px] p-[18px]">
          <Swords size={40} color="#E5484D" />
          <h1 className="font-display font-bold text-[22px] m-0">Run terminé</h1>
          {rogueSelectionFailed && <p className="text-mut text-[13.5px]">Aucun puzzle trouvé dans les limites de recherche.</p>}
          <p className="text-mut text-[13.5px]">Survécu à {session?.rogue?.solved ?? 0} puzzles.</p>
          <div className="font-display font-bold text-[60px] text-gold leading-none">{session?.rogue?.score ?? 0}</div>
          <span className="text-mut text-[13px]">points</span>
          <Button variant="primary" className="mt-[18px] w-[220px]" onClick={() => start('rogue', table)}>Rejouer</Button>
          <button className="mt-[10px] text-pri font-semibold text-[13px]" onClick={() => { quit(); nav({ to: '/' }); }}>Menu</button>
        </div>
      </>
    );
  }

  if (!session) return null;
  const s = session;
  const p = s.puzzle;

  // secousse à chaque nouvelle réponse fausse
  if (s.feedback && !s.feedback.ok && lastWrong.current !== p.target) {
    lastWrong.current = p.target;
    shakeRef.current?.classList.remove('anim-shake'); void shakeRef.current?.offsetWidth; shakeRef.current?.classList.add('anim-shake');
  }

  // ---- draft Rogue ----
  if (s.draft) {
    return (
      <>
        <TopBar streakMode="rogue" />
        <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
          <h1 className="font-display font-bold text-[22px] m-0">Choisis une contrainte</h1>
          <p className="text-mut text-[13.5px]">Elle s'applique à la suite. Les malus rapportent plus.</p>
          {s.draft.map((m) => (
            <button key={m.id} onClick={() => { audio.play('select'); chooseModifier(m); }}
              className="border border-line rounded-[16px] p-[16px] flex items-center gap-[12px] hover:-translate-y-[2px] hover:border-pri transition">
              <div className="w-[38px] h-[38px] rounded-[11px] grid place-items-center text-white" style={{ background: m.kind === 'boon' ? '#179C6B' : '#E5484D' }}>
                {m.kind === 'boon' ? <Plus size={18} /> : <X size={18} />}
              </div>
              <div className="flex-1 text-left">
                <div className="font-display font-semibold">{m.label}</div>
                <div className="text-mut text-[12px]">{m.kind === 'boon' ? 'Avantage' : 'Malus'} · score ×{m.scoreMult}</div>
              </div>
            </button>
          ))}
        </div>
      </>
    );
  }

  const fb = s.feedback;
  return (
    <>
      <TopBar streakMode={mode as Mode} />
      <div className="flex-1 p-[18px] flex flex-col gap-[12px]">
        <button className="flex items-center gap-[4px] text-mut font-semibold text-[14px]" onClick={() => { quit(); nav({ to: '/' }); }}><ChevronLeft size={18} />Quitter</button>

        {/* Bannière conditions : mode + Big Challenge + règles bien mises en avant */}
        <ConditionBanner mode={mode as Mode} rules={s.rules} lives={s.rogue?.lives} mods={s.rogue?.mods} />

        {mode === 'freeskill' && <TimerBar secondsLeft={s.secondsLeft} maxSeconds={s.maxSeconds} />}

        <Card>
          <div className="flex flex-col items-center gap-[4px] pb-[14px] pt-[8px]">
            <span className="text-mut text-[12px] font-semibold uppercase tracking-wider">Cible</span>
            <span className="font-display font-bold text-[60px] leading-none tracking-tight">{p.target}</span>
            <div className="flex gap-[6px] mt-[4px] flex-wrap justify-center">
              <Chip>Niveau {p.difficulty}</Chip>
              <Chip bg="#FBEFE0" color="#B5651d">{mode === 'rogue' ? 'minimum trouvé' : 'optimal'} · {s.optimalOperands} chiffres</Chip>
              {mode === 'classic' && <Chip bg="#EFEAFE" color="#7C5BD6">3★ pour débloquer</Chip>}
            </div>
          </div>

          <div ref={shakeRef} className="font-mono font-bold text-[24px] min-h-[40px] text-center tracking-wider border-b-2 border-dashed border-line py-[6px] flex items-center justify-center">
            {s.input || <span className="text-[#AEBccB] font-medium text-[15px] tracking-normal">tape au clavier ou touche les tuiles…</span>}
          </div>
          <div className="flex justify-between items-center text-[13px] text-mut mt-[8px]">
            <span>vaut <b className="font-mono text-ink">{liveValue(s.input)}</b></span>
            <span>{s.input ? `${operandCount(s.input)} chiffre(s)` : ''}</span>
          </div>

          <div className="grid grid-cols-3 gap-[10px] mt-[14px]">
            {s.rules.numbers.map((n) => <Tile key={n} label={String(n)} kind="num" onPress={() => press(String(n))} />)}
          </div>
          <div className="grid grid-cols-3 gap-[10px] mt-[10px]">
            {s.rules.operations.map((o) => <Tile key={o} label={sym(o)} kind="op" onPress={() => press(o)} />)}
          </div>

          {/* Indice révélé progressivement (réduit le plafond d'étoiles) */}
          {s.hintsUsed > 0 && (
            <div className="mt-[10px] text-center text-[13px] text-mut">
              indice : <b className="font-mono text-ink">{exprTokens(s.puzzle.expr).slice(0, s.hintsUsed).join('')}…</b>
              <span className="text-[11px]"> · max {s.hintsUsed * 2 <= exprTokens(s.puzzle.expr).length ? '2' : '1'}★</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-[10px] mt-[10px]">
            <Button icon={<Delete size={17} />} onClick={del}>Effacer</Button>
            <Button icon={<RotateCcw size={16} />} onClick={clear}>Vider</Button>
            <Button icon={<Lightbulb size={16} />} onClick={hint} disabled={s.hintsUsed >= exprTokens(s.puzzle.expr).length}>Indice</Button>
            <Button variant="primary" className="col-span-3" icon={<Check size={18} />} onClick={submit} disabled={!s.input || s.dailySaving}>{s.dailySaving ? 'Enregistrement…' : 'Valider'}</Button>
          </div>
        </Card>

        {s.mode === 'daily' && s.dailyTraining && (
          <div className="text-center text-[12px] text-mut">Défi du jour déjà validé : entraînement sans nouvelle récompense.</div>
        )}
        <div className="text-center text-mut text-[13px]">
          Score : <b className="text-ink">{s.rogue ? s.rogue.score : s.score}</b>
          {mode === 'freeskill' && ` · niveau adaptatif ${s.level}`}
        </div>
      </div>

      {fb && <FeedbackSheet fb={fb} input={s.input} onContinue={next} onRetry={clearSoftFeedback} />}
    </>
  );
}
