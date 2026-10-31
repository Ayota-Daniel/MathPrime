import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { audio } from '../lib/audio';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card border border-line rounded-card p-[18px] ${className}`}>{children}</div>;
}

export function Chip({ children, color, bg }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[12px] font-semibold px-[10px] py-[4px] rounded-full"
      style={{ color: color ?? 'var(--chip-fg, #5B5BD6)', background: bg ?? '#EEF0FF' }}>
      {children}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; icon?: ReactNode };
export function Button({ variant = 'ghost', icon, children, className = '', onClick, ...rest }: BtnProps) {
  const base = 'font-display font-semibold text-[15px] rounded-tile flex items-center justify-center gap-[7px] py-[14px] active:scale-[.98]';
  const styles = variant === 'primary'
    ? 'bg-pri text-white border border-pri btn-3d disabled:opacity-50'
    : 'bg-card text-ink border border-line';
  return (
    <button {...rest} onClick={(e) => { audio.play('select'); onClick?.(e); }} className={`${base} ${styles} ${className}`}>
      {icon}{children}
    </button>
  );
}

/** Tuile chiffre/opérateur. `kind` change la couleur ; clic = son de sélection. */
export function Tile({ label, kind, onPress }: { label: string; kind: 'num' | 'op'; onPress: () => void }) {
  return (
    <button
      onClick={() => { audio.play('select'); onPress(); }}
      className={`font-mono font-bold text-[22px] py-[16px] rounded-tile border border-line active:scale-[.94] transition-transform
        ${kind === 'num' ? 'bg-num text-pri-d' : 'bg-op'}`}
      style={kind === 'op' ? { color: '#B5651d' } : undefined}>
      {label}
    </button>
  );
}
