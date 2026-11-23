/** Design tokens partagés. Tailwind (web) et le thème RN (mobile) les consomment. */
export const colors = {
  bg: '#F1F4F7', card: '#FFFFFF', ink: '#16202C', mut: '#5A6B7B', line: '#E2E8EE',
  pri: '#5B5BD6', priDark: '#4646B8', ok: '#179C6B', gold: '#E8A317', err: '#E5484D',
  warn: '#E8A317', num: '#EEF0FF', op: '#FBEFE0',
  // paliers de la barre de temps
  timeOk: '#179C6B', timeMid: '#E8A317', timeLow: '#E5484D',
} as const;

export const radius = { sm: 11, md: 14, lg: 18, xl: 22 } as const;
export const space = { xs: 6, sm: 10, md: 14, lg: 18 } as const;

/** Seuils de la barre de temps (fraction restante). */
export const TIME_MID = 0.5;  // < 50% -> jaune
export const TIME_LOW = 0.2;  // < 20% -> rouge
export const timeColor = (frac: number): string =>
  frac <= TIME_LOW ? colors.timeLow : frac <= TIME_MID ? colors.timeMid : colors.timeOk;

/** Couleur d'accent par Big Challenge (pour bien identifier où on est). */
export const bigColor: Record<number, string> = { 3: '#7C5BD6', 5: '#5B8FD6', 7: '#D67C5B' };

/**
 * Direction « Cahier » (redesign 2026-11) : papier quadrillé, encre bleue, stylo rouge, surligneur.
 * Consommée par le web. Le mobile garde `colors` jusqu'à sa migration.
 */
export const cahier = {
  paper: '#F7F9F6',     // fond
  grid: '#E6EDF2',      // lignes du quadrillage
  white: '#FFFFFF',     // feuille posée (cartes, touches)
  ink: '#1D2A8A',       // action principale, opérateurs, titres
  inkDark: '#16217A',
  inkSoft: '#EEF0FA',   // fond des touches opérateur
  graphite: '#23293A',  // texte, contours, ombres décalées
  mine: '#586174',      // texte secondaire (6:1 sur paper)
  dash: '#B9C3CF',      // séparateurs pointillés
  ghost: '#9AA6B4',     // cases vides
  pen: '#C2302A',       // stylo rouge : limite optimale, erreurs, malus
  hl: '#FFE04A',        // surligneur : cible, étoiles, record
} as const;

/** Taille de la grille du papier, en px. */
export const CAHIER_GRID = 26;
