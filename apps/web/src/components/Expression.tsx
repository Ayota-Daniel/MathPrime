import type { ReactNode } from 'react';
import { evaluate, exprTokens } from '@shortest/engine';

export const sym = (o: string) => (o === '*' ? '×' : o === '-' ? '−' : '+');
export const isOp = (t: string) => t === '+' || t === '-' || t === '*';
/** Élément lisible : symbole pour un opérateur, nombre tel quel. */
export const say = (t: string) => (isOp(t) ? sym(t) : t);

/** Valeur courante de l'expression, ou null si elle est incomplète. */
export function liveValue(input: string): number | null {
  if (!input || /[+\-*]$/.test(input)) return null;
  try { return evaluate(input); } catch { return null; }
}

/**
 * L'expression saisie, case par case, sur le papier quadrillé.
 * Les cases vides en pointillé montrent la longueur optimale ; le trait rouge (« optimal »)
 * marque la limite : chaque chiffre au-delà coûte une étoile.
 * Avec `onSelect`, chaque élément est un bouton : on le sélectionne pour le remplacer ou le retirer.
 */
export function ExpressionCells({ input, optimal, size = 'md', shakeRef, selected = null, onSelect }:
  { input: string; optimal: number; size?: 'md' | 'sm'; shakeRef?: React.Ref<HTMLDivElement>; selected?: number | null; onSelect?: (at: number) => void }) {
  const tokens = exprTokens(input);
  const operands = tokens.filter((t) => !isOp(t)).length;
  const slots = Math.max(operands, optimal);
  const sm = size === 'sm' || slots > 6;
  const cell = sm ? 'w-8 h-10 text-xl' : 'w-10 h-12 text-[26px]';
  const op = sm ? 'w-5 h-10 text-lg' : 'w-7 h-12 text-2xl';

  const items: ReactNode[] = [];
  const marker = (
    <span key="optimal" aria-hidden="true" className="relative self-stretch w-[2px] -my-2 bg-pen shrink-0">
      <span className="hand absolute -top-6 right-1 text-[13px] font-bold text-pen whitespace-nowrap">optimal</span>
    </span>
  );
  let seen = 0;
  const Tag = onSelect ? 'button' : 'span';
  const tap = (i: number, t: string) => onSelect
    ? { type: 'button' as const, onClick: () => onSelect(i), 'aria-pressed': selected === i, 'aria-label': `${say(t)}, ${selected === i ? 'sélectionné' : 'modifier'}` }
    : {};
  tokens.forEach((t, i) => {
    const on = selected === i;
    if (isOp(t)) {
      items.push(<Tag key={`o${i}`} {...tap(i, t)} className={`num grid place-items-center font-extrabold text-ink shrink-0 p-0 rounded-cell ${on ? 'bg-hl border-2 border-ink' : 'bg-transparent border-0'} ${op}`}>{sym(t)}</Tag>);
    } else {
      seen += 1;
      items.push(<Tag key={`n${i}`} {...tap(i, t)} className={`num grid place-items-center font-extrabold text-graphite rounded-cell shrink-0 p-0 ${on ? 'bg-hl border-[2.5px] border-ink' : 'bg-sheet border-[1.5px] border-graphite'} ${cell} ${t.length > 1 ? '!w-auto px-1.5' : ''}`}>{t}</Tag>);
      if (seen === optimal) items.push(marker);
    }
  });
  // cases fantômes jusqu'à la longueur optimale
  let missing = optimal - operands;
  let needOp = tokens.length > 0 && !isOp(tokens[tokens.length - 1]);
  let g = 0;
  while (missing > 0) {
    if (needOp) items.push(<span key={`go${g}`} className={`shrink-0 ${op}`} />);
    items.push(<span key={`gc${g}`} className={`border-[1.5px] border-dashed border-ghost rounded-cell shrink-0 ${cell}`} />);
    needOp = true; missing -= 1; g += 1;
    if (missing === 0) items.push(marker);
  }

  return (
    <div ref={shakeRef} className="overflow-x-auto pt-7 pb-2 -mx-1 px-1">
      <div className="flex items-center gap-1 w-max mx-auto" aria-live="polite" aria-label={input ? `Ton expression : ${tokens.map(say).join(' ')}` : 'Expression vide'}>
        {items}
      </div>
    </div>
  );
}

/** Ligne sous l'expression : valeur, écart à la cible, compteur de chiffres, contrainte manquante. */
export function ExpressionStatus({ input, target, optimal, required }:
  { input: string; target: number; optimal: number; required: number[] }) {
  const tokens = exprTokens(input);
  const nums = tokens.filter((t) => !isOp(t)).map(Number);
  const value = liveValue(input);
  const diff = value === null ? null : value - target;
  const missingReq = required.filter((r) => !nums.includes(r));
  return (
    <div className="flex justify-between items-baseline gap-3 mt-3 text-[15px]">
      <span>
        vaut <b className="num text-[17px]">{value ?? '—'}</b>{' '}
        {diff !== null && <span className="text-mine">{diff === 0 ? '(pile la cible)' : diff > 0 ? `(${diff} de trop)` : `(il manque ${-diff})`}</span>}
      </span>
      {missingReq.length > 0 && input
        ? <span className="font-bold text-pen">le {missingReq.join(' et le ')} manque encore</span>
        : <span className={`num font-bold ${nums.length > optimal ? 'text-pen' : 'text-mine'}`}>{nums.length} / {optimal} chiffres</span>}
    </div>
  );
}
