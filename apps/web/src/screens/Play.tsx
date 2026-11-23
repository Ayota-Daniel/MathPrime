import { useEffect } from 'react';
import {
  Link,
  useLoaderData,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { Check, ChevronLeft, Delete, Lightbulb, RotateCcw } from 'lucide-react';
import {
  evaluate,
  operandCount,
  exprTokens,
  hintStarCeiling,
  type Mode,
  type Puzzle,
} from '@shortest/engine';
import { formatCalculation, modeNames } from '@shortest/tokens';
import { useGame } from '../store/game';
import { audio } from '../lib/audio';
import { TopBar } from '../components/TopBar';
import { Button, Tile } from '../components/ui';
import { TimerBar } from '../components/TimerBar';
import { FeedbackSheet } from '../components/FeedbackSheet';

function valueOf(input: string) {
  try {
    return !input || /[+*\-]$/.test(input) ? '—' : evaluate(input);
  } catch {
    return '—';
  }
}

export function Play() {
  const { mode: pathMode } = useParams({ from: '/play/$mode' });
  const mode = pathMode as Mode;
  const { niveau } = useSearch({ from: '/play/$mode' });
  const table = useLoaderData({ from: '/play/$mode' }) as Puzzle[];
  const {
    session,
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
    start(mode, table, niveau === undefined ? undefined : niveau - 1);
    audio.switchMusic('main');
  }, [mode, table, niveau, start]);
  useEffect(() => {
    if (mode !== 'freeskill') return;
    const id = window.setInterval(() => {
      const s = useGame.getState().session;
      if (s && !s.feedback && s.secondsLeft <= 5 && s.secondsLeft > 0)
        audio.play('tick');
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, tick]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const s = useGame.getState().session;
      if (!s || s.feedback || event.altKey || event.ctrlKey || event.metaKey)
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable=true]')
      )
        return;
      const k = event.key;
      if (/^\d$/.test(k) && s.rules.numbers.includes(Number(k))) press(k);
      else if (['+', '-', '*', 'x', 'X'].includes(k)) {
        const op = k.toLowerCase() === 'x' ? '*' : k;
        if (!s.rules.operations.some((allowed) => allowed === op)) return;
        press(op);
      } else if (
        k === 'Enter' &&
        !(
          event.target instanceof Element &&
          event.target.closest('button,a,summary')
        )
      )
        submit();
      else if (k === 'Backspace') del();
      else if (k === 'Escape') clear();
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [press, del, clear, submit]);
  if (!session || session.mode !== mode) return null;
  const s = session;
  const tokens = exprTokens(s.puzzle.expr);
  return (
    <>
      <TopBar />
      <main className="math-inner math-play">
        <Link
          to={
            mode === 'classic'
              ? '/niveaux'
              : mode.startsWith('big')
                ? '/big-challenge'
                : '/'
          }
          onClick={quit}
          className="math-back"
        >
          <ChevronLeft size={18} />
          {mode === 'classic'
            ? 'Niveaux'
            : mode.startsWith('big')
              ? 'Big Challenge'
              : 'Accueil'}
        </Link>
        <h1>{modeNames[mode]}</h1>
        <p className="mode-context">
          {mode === 'classic'
            ? `Niveau ${s.index + 1} / 100`
            : mode === 'daily'
              ? s.dailyDate
              : mode === 'freeskill'
                ? `Difficulté ${s.level} / 5`
                : `Chiffre ${s.rules.required.join(', ')} obligatoire`}
        </p>
        {s.feedback ? (
          <FeedbackSheet
            fb={s.feedback}
            input={s.input}
            onContinue={next}
            onRetry={clearSoftFeedback}
          />
        ) : (
          <>
            <p className="rule-strip">
              Sans parenthèses <span>La multiplication est prioritaire</span>
            </p>
            <div className="puzzle-columns">
              <section aria-label="Ton calcul">
                <div className="target-panel">
                  <small>Cible</small>
                  <strong>{s.puzzle.target}</strong>
                  {mode === 'freeskill' ? (
                    <TimerBar
                      secondsLeft={s.secondsLeft}
                      maxSeconds={s.maxSeconds}
                    />
                  ) : (
                    <span>Minimum · {s.optimalOperands} chiffres</span>
                  )}
                </div>
                <div className="expression-line" aria-label="Ton expression">
                  {s.input ? (
                    formatCalculation(s.input)
                  ) : (
                    <small>Construis ton expression…</small>
                  )}
                </div>
                <div className="calc-meta">
                  <b>Résultat · {valueOf(s.input)}</b>
                  <span>{operandCount(s.input)} chiffres</span>
                </div>
                <button onClick={clear} className="text-tool">
                  <RotateCcw size={16} />
                  Vider
                </button>
              </section>
              <section className="play-controls" aria-label="Pavé de calcul">
                <div className="play-pad">
                  {s.rules.numbers.map((n) => (
                    <Tile
                      key={n}
                      label={String(n)}
                      kind="num"
                      onPress={() => press(String(n))}
                    />
                  ))}
                  {s.rules.operations.map((op) => (
                    <Tile
                      key={op}
                      label={formatCalculation(op)}
                      kind="op"
                      onPress={() => press(op)}
                    />
                  ))}
                </div>
                <div className="play-tools">
                  <button onClick={del}>
                    <Delete />
                    Effacer
                  </button>
                  <button
                    disabled={s.hintsUsed >= tokens.length}
                    onClick={hint}
                  >
                    <Lightbulb />
                    Indice
                  </button>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<Check size={20} />}
                  disabled={!s.input || s.dailySaving}
                  onClick={submit}
                >
                  {s.dailySaving ? 'Enregistrement…' : 'Valider'}
                </Button>
                {s.hintsUsed > 0 && (
                  <p role="status">
                    Indice ·{' '}
                    {formatCalculation(tokens.slice(0, s.hintsUsed).join(''))}…
                    · maximum {hintStarCeiling(s.hintsUsed, tokens.length)}★
                  </p>
                )}
              </section>
            </div>
            <p className="play-score">
              Score · {s.score}
              {mode === 'freeskill' && ` · Série ${s.streak}`}
              {mode === 'daily' &&
                s.dailyTraining &&
                ' · Entraînement sans nouvelle récompense'}
            </p>
          </>
        )}
      </main>
    </>
  );
}
