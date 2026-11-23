import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { audio } from '../lib/audio';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  icon?: ReactNode;
};
export function Button({
  variant = 'ghost',
  icon,
  children,
  className = '',
  onClick,
  ...rest
}: BtnProps) {
  const base =
    'font-display font-semibold text-[15px] rounded-tile flex items-center justify-center gap-[7px] py-[14px] active:scale-[.98]';
  const styles =
    variant === 'primary'
      ? 'bg-pri text-ink border border-pri btn-3d disabled:opacity-60'
      : 'bg-card text-ink border border-line';
  return (
    <button
      {...rest}
      onClick={(e) => {
        audio.play('select');
        onClick?.(e);
      }}
      className={`${base} ${styles} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Tuile chiffre/opérateur. `kind` change la couleur ; clic = son de sélection. */
export function Tile({
  label,
  kind,
  onPress,
  disabled = false,
}: {
  label: string;
  kind: 'num' | 'op';
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        audio.play('select');
        onPress();
      }}
      className={`math-tile ${kind === 'num' ? 'digit' : 'operator'}`}
    >
      {label}
    </button>
  );
}
