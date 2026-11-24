import { cahier } from '@shortest/tokens';

/**
 * Chrono Free Skill dessiné comme une règle graduée : le surligneur recule avec le temps,
 * et passe au rouge sous 20 %. Les secondes restent lisibles en chiffres.
 */
export function TimerBar({ secondsLeft, maxSeconds }: { secondsLeft: number; maxSeconds: number }) {
  const frac = maxSeconds > 0 ? Math.max(0, secondsLeft / maxSeconds) : 0;
  const low = frac <= 0.2;
  const tick = maxSeconds > 0 ? 100 / maxSeconds : 100;
  return (
    <section aria-label={`Temps restant : ${secondsLeft} secondes sur ${maxSeconds}`}>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-mine text-[13.5px] font-semibold">Temps restant</span>
        <span className={`num text-[22px] font-black ${low ? 'text-pen' : ''}`}>{secondsLeft} s</span>
      </div>
      <div aria-hidden="true" className="relative h-[30px] border-[1.5px] border-graphite rounded-cell bg-sheet overflow-hidden">
        <div className={low ? 'anim-time-pulse' : ''}
          style={{ position: 'absolute', inset: 0, width: `${frac * 100}%`, background: low ? cahier.pen : cahier.hl, opacity: low ? 0.85 : 1, transition: 'width 1s linear' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(90deg, ${cahier.graphite} 0 1px, transparent 1px ${tick}%)`, backgroundSize: '100% 9px', backgroundRepeat: 'no-repeat' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(90deg, ${cahier.graphite} 0 1.5px, transparent 1.5px ${tick * 5}%)`, backgroundSize: '100% 16px', backgroundRepeat: 'no-repeat' }} />
      </div>
      <p className="text-mine text-[12.5px] mt-1.5 mb-0">Le temps restant s'ajoute à tes points.</p>
    </section>
  );
}
