import type { ReactNode } from 'react';
import { audio } from '../lib/audio';
export function ModeCard({ icon, color, name, tagline, wide, onClick }:
  { icon: ReactNode; color: string; name: string; tagline?: string; wide?: boolean; onClick: () => void }) {
  return (
    <button onClick={() => { audio.play('select'); onClick(); }}
      className={`text-left border border-line bg-card rounded-mode p-[14px] flex gap-[8px] hover:-translate-y-[2px] hover:shadow-lg transition
        ${wide ? 'col-span-2 flex-row items-center' : 'flex-col min-h-[108px]'}`}>
      <div className="w-[38px] h-[38px] rounded-[11px] grid place-items-center text-white shrink-0" style={{ background: color }}>{icon}</div>
      <div>
        <div className="font-display font-semibold text-[15px]">{name}</div>
        {tagline && <div className="text-mut text-[12px] leading-snug">{tagline}</div>}
      </div>
    </button>
  );
}
