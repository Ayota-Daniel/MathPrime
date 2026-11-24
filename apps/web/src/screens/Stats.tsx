import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type { Mode } from '@shortest/engine';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store/game';

const LABELS: Record<Mode, string> = {
  classic: 'Classique', daily: 'Daily', freeskill: 'Free Skill', rogue: 'Rogue', big3: 'Big 3', big5: 'Big 5', big7: 'Big 7',
};
const ORDER: Mode[] = ['classic', 'daily', 'freeskill', 'rogue', 'big3', 'big5', 'big7'];

export function Stats() {
  const nav = useNavigate();
  const best = useGame((s) => s.bestByMode);
  const bestStreak = useGame((s) => s.bestStreakByMode);
  const stats = useGame((s) => s.stats);
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const classicProgress = useGame((s) => s.classicProgress);

  return (
    <>
      <TopBar />
      <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
        <button className="flex items-center gap-[4px] text-mut font-semibold text-[14px]" onClick={() => nav({ to: '/' })}><ChevronLeft size={18} />Retour</button>
        <h1 className="font-display font-bold text-[22px] m-0">Statistiques</h1>

        <div className="grid grid-cols-3 gap-[10px]">
          {[['XP', xp], ['Rang', rank], ['Niveau Classique', classicProgress + 1], ['Parties', stats.played], ['Parfaits (3★)', stats.perfect], ['Taux 3★', stats.played ? `${Math.round((stats.perfect / stats.played) * 100)}%` : '—']].map(([k, v]) => (
            <div key={k} className="bg-card border border-line rounded-[14px] p-[12px] text-center">
              <div className="font-display font-bold text-[20px]">{v}</div>
              <div className="text-mut text-[11px]">{k}</div>
            </div>
          ))}
        </div>

        <p className="font-semibold text-[13.5px] mt-[4px]">Meilleur score par mode</p>
        <div className="bg-card border border-line rounded-card px-[16px]">
          {ORDER.map((m) => (
            <div key={m} className="flex items-center justify-between py-[12px] border-b border-line last:border-0">
              <span className="text-[14px]">{LABELS[m]}</span>
              <span className="flex gap-[14px] items-center">
                <span className="font-mono font-bold">{best[m] ?? 0}</span>
                <span className="text-mut text-[12px]">série {bestStreak[m] ?? 0}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
