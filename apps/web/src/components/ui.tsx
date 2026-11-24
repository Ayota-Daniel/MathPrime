import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, Heart, Star, Flame } from 'lucide-react';
import { cahier } from '@shortest/tokens';
import { audio } from '../lib/audio';

/**
 * Bouton texte. `ink` = action principale, `line` = secondaire, `pen` = destructif.
 * `primary` / `ghost` restent acceptés (mode Rogue) : `bg-pri` est la classe que rogue.css restyle.
 */
const VARIANT = {
  ink: 'btn-ink press', line: 'btn-line', pen: 'btn-pen',
  primary: 'btn-ink press bg-pri', ghost: 'btn-line',
} as const;
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT; icon?: ReactNode };
export function Button({ variant = 'line', icon, children, className = '', onClick, type = 'button', ...rest }: BtnProps) {
  return (
    <button {...rest} type={type} onClick={(e) => { audio.play('select'); onClick?.(e); }}
      className={`${VARIANT[variant]} ${className}`}>
      {icon}{children}
    </button>
  );
}

/** Touche du clavier de jeu : chiffre (feuille blanche) ou opérateur (encre). `required` = chiffre imposé (cerclé de rouge). */
export function Key({ label, aria, kind, required, onPress, disabled }:
  { label: string; aria?: string; kind: 'num' | 'op'; required?: boolean; onPress: () => void; disabled?: boolean }) {
  const base = 'press relative num font-extrabold border-[1.5px] rounded-sheet shadow-stamp disabled:opacity-40';
  const look = kind === 'num'
    ? `h-[68px] text-[32px] bg-sheet ${required ? 'border-pen text-pen shadow-stamp-pen' : 'border-graphite text-graphite'}`
    : 'h-14 text-[28px] bg-ink-soft border-graphite text-ink';
  return (
    <button type="button" aria-label={aria ?? label} disabled={disabled} onClick={() => { audio.play('select'); onPress(); }} className={`${base} ${look}`}>
      {label}
      {required && (
        <svg aria-hidden="true" width="70" height="56" viewBox="0 0 70 56" fill="none" stroke={cahier.pen} strokeWidth="2"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <path d="M48 8C30 0 8 10 9 28c1 18 25 24 41 17 14-6 17-24 4-33-8-5-18-5-24-2" />
        </svg>
      )}
    </button>
  );
}

/** Lien retour carré (en-tête des écrans secondaires). */
export function BackLink({ to, label, onClick }: { to: '/' | '/settings' | '/niveaux' | '/big-challenge'; label: string; onClick?: () => void }) {
  return (
    <Link to={to} aria-label={label} className="icon-btn" onClick={onClick}>
      <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
    </Link>
  );
}

/** Titre d'écran, écriture manuscrite à l'encre. */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className="hand m-0 text-[30px] font-black text-ink leading-tight">{children}</h1>;
}

export function Stars({ value, size = 30 }: { value: number; size?: number }) {
  return (
    <div role="img" aria-label={`${value} étoile${value > 1 ? 's' : ''} sur 3`} className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <Star key={i} size={size} strokeWidth={1.6} aria-hidden="true"
          fill={i <= value ? cahier.hl : 'none'} color={i <= value ? cahier.graphite : cahier.ghost} />
      ))}
    </div>
  );
}

export function Hearts({ lives, max }: { lives: number; max: number }) {
  return (
    <span role="img" aria-label={`${lives} vie${lives > 1 ? 's' : ''} sur ${max}`} className="flex gap-[3px]">
      {Array.from({ length: max }).map((_, i) => (
        <Heart key={i} size={22} aria-hidden="true" fill={i < lives ? cahier.pen : 'none'} color={i < lives ? cahier.pen : cahier.ghost} />
      ))}
    </span>
  );
}

export function StreakPill({ value }: { value: number }) {
  return (
    <span className="pill" aria-label={`Série en cours : ${value}`}>
      <Flame size={16} color={cahier.pen} strokeWidth={2.2} aria-hidden="true" />{value}
    </span>
  );
}

/** Interrupteur accessible (role=switch). */
export function Switch({ on, onToggle, labelledBy }: { on: boolean; onToggle: () => void; labelledBy: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} onClick={onToggle}
      className={`relative w-[50px] h-[30px] rounded-full border-[1.5px] border-graphite shrink-0 transition-colors ${on ? 'bg-ink' : 'bg-grid'}`}>
      <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-sheet border-[1.5px] border-graphite transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );
}

/** Formate un nombre à la française (espace fine insécable pour les milliers). */
export const fmt = (n: number): string => n.toLocaleString('fr-FR');
