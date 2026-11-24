/**
 * Couleurs vivantes de l'app mobile. `C` (Cahier) et `RC` (page Rogue) sont des copies modifiables des tokens :
 * `applyThemes` y recopie le thème choisi, puis App remonte l'arbre de navigation pour que tout se redessine.
 * Les feuilles de style construites au chargement s'abonnent avec `onThemeChange` pour se reconstruire.
 */
import { cahier, rogue, appThemeById, rogueThemeById } from '@shortest/tokens';

type Palette<T> = { -readonly [K in keyof T]: string };

export const C: Palette<typeof cahier> = { ...cahier };
export const RC: Palette<typeof rogue.colors> = { ...rogue.colors };

const listeners = new Set<() => void>();
let applied = '';

/** Applique les thèmes choisis et renvoie une clé qui change avec eux. */
export function applyThemes(appId?: string, rogueId?: string): string {
  const app = appThemeById(appId);
  const page = rogueThemeById(rogueId);
  const key = `${app.id}:${page.id}`;
  if (key !== applied) {
    Object.assign(C, app.colors);
    Object.assign(RC, rogue.colors, page.colors);
    applied = key;
    listeners.forEach((rebuild) => rebuild());
  }
  return key;
}

/** Reconstruit un objet de styles quand le thème change (l'objet garde la même identité). */
export function themed<T extends object>(build: () => T): T {
  const target = { ...build() };
  listeners.add(() => Object.assign(target, build()));
  return target;
}
