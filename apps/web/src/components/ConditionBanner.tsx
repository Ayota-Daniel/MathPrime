import { Shield, Swords, Zap, Calendar, Target, Heart } from 'lucide-react';
import { bigColor } from '@shortest/tokens';
import type { Mode, Rules, RogueModifier } from '@shortest/engine';
import { MAX_LIVES } from '@shortest/engine';

const META: Record<Mode, { label: string; icon: typeof Shield; color: string }> = {
  classic: { label: 'Classique', icon: Target, color: '#5B5BD6' },
  daily: { label: 'Daily', icon: Calendar, color: '#179C6B' },
  freeskill: { label: 'Free Skill', icon: Zap, color: '#E8A317' },
  rogue: { label: 'Rogue', icon: Swords, color: '#E5484D' },
  big3: { label: 'Big Challenge 3', icon: Shield, color: bigColor[3] },
  big5: { label: 'Big Challenge 5', icon: Shield, color: bigColor[5] },
  big7: { label: 'Big Challenge 7', icon: Shield, color: bigColor[7] },
};

/** Affiché EN HAUT du puzzle : on voit immédiatement où on est et les règles actives. */
export function ConditionBanner({ mode, rules, lives, mods }: { mode: Mode; rules: Rules; lives?: number; mods?: RogueModifier[] }) {
  const m = META[mode]; const I = m.icon;
  const isBig = mode.startsWith('big');
  return (
    <div className="rounded-mode p-[12px] flex items-center gap-[12px] border" style={{ borderColor: m.color, background: `${m.color}12` }}>
      <div className="w-[36px] h-[36px] rounded-[11px] grid place-items-center text-white shrink-0" style={{ background: m.color }}>
        <I size={19} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-700 text-[15px]" style={{ color: m.color }}>{m.label}</div>
        <div className="text-[12px] text-mut flex flex-wrap gap-x-[10px]">
          {/* condition la plus saillante : la contrainte du Big Challenge */}
          {isBig && <span className="font-semibold" style={{ color: m.color }}>l'expression DOIT contenir un {rules.required.join(', ')}</span>}
          <span>chiffres {rules.numbers.join(' ')}</span>
          <span>ops {rules.operations.map((o) => (o === '*' ? '×' : o === '-' ? '−' : '+')).join(' ')}</span>
        </div>
      </div>
      {mode === 'rogue' && typeof lives === 'number' && (
        <div className="flex gap-[4px] shrink-0">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <Heart key={i} size={18} fill={i < lives ? '#E5484D' : 'none'} color={i < lives ? '#E5484D' : '#D5DCE4'} />
          ))}
        </div>
      )}
      {mode === 'rogue' && mods && mods.length > 0 && (
        <div className="flex flex-col gap-[3px] shrink-0 max-w-[120px]">
          {mods.slice(-2).map((mod) => (
            <span key={mod.id} className="text-[10px] font-semibold px-[6px] py-[2px] rounded-full text-right"
              style={{ background: mod.kind === 'boon' ? '#E7F6EE' : '#FDE7E7', color: mod.kind === 'boon' ? '#179C6B' : '#E5484D' }}>
              {mod.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
