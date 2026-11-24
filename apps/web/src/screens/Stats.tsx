import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { Mode } from '@shortest/engine';
import { xpForRank } from '@shortest/engine';
import { useGame } from '../store/game';
import { TabBar } from '../components/TabBar';
import { ScreenTitle, fmt } from '../components/ui';

const ROWS: { mode: Mode; label: string; unit?: string }[] = [
  { mode: 'classic', label: 'Classique' }, { mode: 'daily', label: 'Défi du jour', unit: ' j' },
  { mode: 'freeskill', label: 'Free Skill' }, { mode: 'rogue', label: 'Rogue' },
  { mode: 'big3', label: 'Big 3' }, { mode: 'big5', label: 'Big 5' }, { mode: 'big7', label: 'Big 7' },
];

export function Stats() {
  const best = useGame((s) => s.bestByMode);
  const bestStreak = useGame((s) => s.bestStreakByMode);
  const stats = useGame((s) => s.stats);
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const lo = xpForRank(rank); const hi = xpForRank(rank + 1);
  const frac = hi > lo ? Math.min(1, (xp - lo) / (hi - lo)) : 0;
  const progress = useGame((s) => s.classicProgress);
  const classicStars = useGame((s) => Object.values(s.classicStars).reduce((sum, v) => sum + v, 0));
  const rate = stats.played ? `${Math.round((stats.perfect / stats.played) * 100)} %` : '—';

  return (
    <>
      <header className="px-5 pt-6 pb-1"><ScreenTitle>Statistiques</ScreenTitle></header>
      <main className="flex flex-col pb-5">
        <section className="sheet mx-5 mt-3.5 p-4">
          <div className="flex justify-between items-baseline"><span className="text-[22px] font-black">Rang {rank}</span><span className="num text-mine text-sm font-semibold">{fmt(xp)} XP</span></div>
          <div aria-hidden="true" className="mt-2.5 h-3 border-[1.5px] border-graphite rounded-[3px] overflow-hidden bg-paper">
            <div className="h-full bg-ink" style={{ width: `${frac * 100}%` }} />
          </div>
          <div className="text-mine text-[13.5px] mt-2">Encore {fmt(Math.max(0, hi - xp))} XP pour le rang {rank + 1}</div>
        </section>

        <Link to="/niveaux" className="sheet mx-5 mt-4 p-4 flex items-center gap-3 text-graphite no-underline">
          <span className="flex-1">
            <span className="block text-[17px] font-extrabold">Classique, niveau {progress + 1} / 100</span>
            <span className="text-mine text-[13.5px]">{classicStars} étoiles sur 300</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>

        <div className="mx-5 mt-4 grid grid-cols-3 gap-2.5">
          {[[fmt(stats.played), 'puzzles réussis'], [fmt(stats.perfect), 'optimaux'], [rate, 'taux optimal']].map(([v, k]) => (
            <div key={k} className="sheet p-3"><div className="num text-2xl font-black">{v}</div><div className="text-mine text-[12.5px]">{k}</div></div>
          ))}
        </div>

        <section className="sheet mx-5 mt-4 px-4 pt-0.5 pb-1.5">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="text-mine text-[13px]"><th scope="col" className="text-left font-bold py-2.5">Mode</th><th scope="col" className="text-right font-bold">Record</th><th scope="col" className="text-right font-bold">Série max</th></tr>
            </thead>
            <tbody>
              {ROWS.map(({ mode, label, unit }) => {
                const b = best[mode] ?? 0;
                return (
                  <tr key={mode} className="border-t border-dashed border-dash">
                    <td className="py-2.5">{label}</td>
                    <td className="text-right">{b > 0 ? <b className="num">{fmt(b)}</b> : <span className="text-mine">pas encore joué</span>}</td>
                    <td className="text-right num">{bestStreak[mode] ?? 0}{unit ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
      <TabBar />
    </>
  );
}
