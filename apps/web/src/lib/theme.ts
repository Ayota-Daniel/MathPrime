import type { CSSProperties } from 'react';
import { appThemeById } from '@shortest/tokens';

/** Variables CSS d'accent pour le thème choisi (consommées par Tailwind : ink, pri, op…). */
export function appThemeVars(id: string): CSSProperties {
  const { ink, inkDark, inkSoft } = appThemeById(id).colors;
  return { '--accent': ink, '--accent-d': inkDark, '--accent-soft': inkSoft } as CSSProperties;
}
