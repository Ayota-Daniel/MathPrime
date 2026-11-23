import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Timer, Heart } from 'lucide-react';
import { dailyPuzzle, dateKey, xpForRank } from '@shortest/engine';
import { cahier } from '@shortest/tokens';
import { audio } from '../lib/audio';
import { tableQuery } from '../data/puzzles';
import { useGame } from '../store/game';
import { TabBar } from '../components/TabBar';
import { StreakPill, fmt } from '../components/ui';

export function Home() {
  useEffect(() => { audio.switchMusic('main'); }, []);
  const { data: base } = useQuery(tableQuery('base'));
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const progress = useGame((s) => s.classicProgress);
  const best = useGame((s) => s.bestByMode);
  const dailyDone = useGame((s) => s.dailyDone) === dateKey();
  const streak = useGame((s) => Math.max(0, ...Object.values(s.streakByMode)));

  const daily = base ? dailyPuzzle(base) : null;
  const lo = xpForRank(rank); const hi = xpForRank(rank + 1);
  const rankFrac = hi > lo ? Math.min(1, (xp - lo) / (hi - lo)) : 0;
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const select = () => audio.play('select');

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-[22px] pb-2.5">
        <div className="hand text-[26px] font-black text-ink tracking-[-0.01em]">MathPrime</div>
        <div className="flex gap-2">
          {streak > 0 && <StreakPill value={streak} />}
          <Link to="/stats" className="pill gap-2" aria-label={`Rang ${rank}, voir mes statistiques`}>
            Rang {rank}
            <span aria-hidden="true" className="inline-block w-[34px] h-1.5 rounded-sm bg-grid overflow-hidden">
              <span className="block h-full bg-ink" style={{ width: `${rankFrac * 100}%` }} />
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-col pb-5">
        <section className="sheet mx-5 mt-2 p-[18px]">
          <div className="text-mine text-sm font-semibold first-letter:uppercase">Défi du {today}</div>
          <div className="flex items-center gap-4 mt-1.5 mb-3.5">
            <div className="num text-[76px] font-black leading-none tracking-[-0.04em]"><span className="hl">{daily?.target ?? '…'}</span></div>
            <p className="m-0 text-[15px] leading-snug">
              {daily ? `Atteins ${daily.target} avec 3, 5 et 7. La solution la plus courte tient en ${daily.operands} chiffres.` : 'Chargement du défi…'}
            </p>
          </div>
          {dailyDone
            ? <p className="m-0 font-bold text-ink">Fait aujourd'hui. Reviens demain pour un nouveau défi.</p>
            : <Link to="/play/$mode" params={{ mode: 'daily' }} onClick={select} className="btn-ink press">Jouer le défi</Link>}
        </section>

        <Link to="/play/$mode" params={{ mode: 'classic' }} onClick={select} className="sheet mx-5 mt-[18px] px-4 py-3.5 flex flex-col gap-2.5 text-graphite no-underline">
          <div className="flex justify-between items-baseline">
            <span className="text-[17px] font-extrabold">{progress > 0 ? 'Reprendre Classique' : 'Commencer Classique'}</span>
            <span className="num text-mine text-sm font-semibold">niveau {progress + 1} / 100</span>
          </div>
          <div aria-hidden="true" className="relative h-3.5" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${cahier.graphite} 0 1px, transparent 1px 1%)`, backgroundSize: '100% 8px', backgroundRepeat: 'no-repeat', backgroundPosition: 'bottom' }}>
            <div className="absolute left-0 inset-y-0 bg-ink rounded-[1px]" style={{ width: `${progress}%` }} />
          </div>
        </Link>

        <section className="sheet mx-5 mt-[18px] dashed-rows">
          <Link to="/play/$mode" params={{ mode: 'freeskill' }} onClick={select} className="flex items-center gap-3.5 px-4 py-3.5 text-graphite no-underline">
            <Timer size={26} color={cahier.ink} aria-hidden="true" />
            <span className="flex-1"><span className="block font-extrabold">Free Skill</span><span className="text-mine text-[13.5px]">Chrono, la difficulté suit ton niveau</span></span>
          </Link>
          <Link to="/play/$mode" params={{ mode: 'rogue' }} onClick={select} className="flex items-center gap-3.5 px-4 py-3.5 text-graphite no-underline">
            <Heart size={26} color={cahier.pen} aria-hidden="true" />
            <span className="flex-1"><span className="block font-extrabold">Rogue-like</span><span className="text-mine text-[13.5px]">3 vies, une règle à choisir tous les 3 puzzles</span></span>
          </Link>
        </section>

        <div className="mx-5 mt-5 mb-2 flex justify-between items-baseline gap-3">
          <h2 className="m-0 text-base font-extrabold">Big Challenge</h2>
          <span className="text-mine text-[13.5px] text-right">un chiffre imposé</span>
        </div>
        <div className="mx-5 grid grid-cols-3 gap-3">
          {([3, 5, 7] as const).map((n) => {
            const rec = best[`big${n}`] ?? 0;
            return (
              <Link key={n} to="/play/$mode" params={{ mode: `big${n}` }} onClick={select} aria-label={`Big Challenge ${n}`}
                className="sheet min-h-[84px] flex flex-col items-center justify-center gap-0.5 text-graphite no-underline">
                <span className="num text-[34px] font-black leading-none">{n}</span>
                <span className="text-mine text-xs">{rec > 0 ? `record ${fmt(rec)}` : 'pas encore joué'}</span>
              </Link>
            );
          })}
        </div>
      </main>
      <TabBar />
    </>
  );
}
