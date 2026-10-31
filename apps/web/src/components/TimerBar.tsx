import { timeColor } from '@shortest/tokens';
/** Barre de temps : largeur = fraction restante, COULEUR vert→jaune→rouge,
 *  et SECONDES affichées en repère. Pulsation CSS quand il reste peu. */
export function TimerBar({ secondsLeft, maxSeconds }: { secondsLeft: number; maxSeconds: number }) {
  const frac = maxSeconds > 0 ? secondsLeft / maxSeconds : 0;
  const color = timeColor(frac);
  const low = frac <= 0.2;
  return (
    <div className="flex items-center gap-[10px]">
      <div className="flex-1 h-[8px] rounded-full bg-line overflow-hidden">
        <div className={low ? 'anim-time-pulse' : ''} style={{ width: `${frac * 100}%`, height: '100%', background: color, transition: 'width 1s linear' }} />
      </div>
      <span className="font-mono font-bold text-[14px] tabular-nums" style={{ color, minWidth: 34, textAlign: 'right' }}>
        {secondsLeft}s
      </span>
    </div>
  );
}
