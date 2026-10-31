import { Trophy, Flame } from 'lucide-react';
import { useGame } from '../store/game';
import type { Mode } from '@shortest/engine';
/** streakMode : si fourni, affiche la série DU MODE courant (séries par mode). */
export function TopBar({ streakMode }: { streakMode?: Mode }) {
  const xp = useGame((s) => s.xp);
  const rank = useGame((s) => s.rank());
  const streak = useGame((s) => (streakMode ? s.streakByMode[streakMode] ?? 0 : Math.max(0, ...Object.values(s.bestStreakByMode))));
  return (
    <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-line bg-card sticky top-0 z-10">
      <div className="font-display font-bold text-[17px] flex items-center gap-[8px]">
        <span className="w-[10px] h-[10px] rounded-[3px] bg-pri rotate-45" />Shortest
      </div>
      <div className="flex gap-[8px]">
        <span className="flex items-center gap-[5px] text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg border border-line"><Trophy size={14} color="#E8A317" />{xp}</span>
        <span className="flex items-center gap-[5px] text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg border border-line"><Flame size={14} color="#E5484D" />{streak}</span>
        <span className="text-[13px] font-semibold px-[9px] py-[5px] rounded-full bg-bg border border-line">Rang {rank}</span>
      </div>
    </div>
  );
}
