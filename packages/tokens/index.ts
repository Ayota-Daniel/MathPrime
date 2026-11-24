/** Design tokens partagés. Tailwind (web) et le thème RN (mobile) les consomment. */
export const colors = {
  // Palette historique, alignée sur la direction « Cahier » (voir `cahier`).
  bg: '#F7F9F6', card: '#FFFFFF', ink: '#23293A', mut: '#586174', line: '#B9C3CF',
  pri: '#1D2A8A', priDark: '#16217A', ok: '#1F6B45', gold: '#7A5A00', err: '#C2302A',
  warn: '#7A5A00', num: '#FFFFFF', op: '#EEF0FA',
  night: '#16217A', panel: '#1D2A8A', onNight: '#F7F9F6', accent: '#FFE04A', actionInk: '#FFFFFF',
  // paliers de la barre de temps
  timeOk: '#FFE04A', timeMid: '#FFE04A', timeLow: '#C2302A',
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
 * Direction « Cahier » (refonte 2026-11) : papier quadrillé, encre bleue, stylo rouge, surligneur.
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

/** Rogue R4.3B: implementation roles derived from the archived visual references.
 * The Rogue run keeps its own night-surface roles.
 */
export const rogue = {
  colors: {
    // Direction « Cahier » : le run se joue sur une page d'encre bleue quadrillée,
    // surligneur jaune pour l'action, rouge stylo pour les erreurs.
    ivory: "#F7F9F6",        // papier : fond clair et texte sur l'encre
    aubergine: "#23293A",    // graphite : texte sur papier
    night: "#16217A",        // encre foncée : fond du run
    panel: "#1D2A8A",        // encre : panneaux du run
    raised: "#2B3A9E",
    coral: "#FFE04A",        // surligneur : action principale
    coralPressed: "#F2CF2E",
    coralInk: "#23293A",
    gold: "#FFE04A",
    operator: "#C9D1F5",
    muted: "#C9D0EE",
    mutedLight: "#586174",
    border: "#5563B8",
    success: "#BFEBD2",
    error: "#FFC2B9",
    warning: "#FFE04A",
    errorSurface: "#5E1F33",
    focus: "#FFE04A",
  },
  font: {
    body: "RecursiveRegular",
    strong: "RecursiveBold",
    display: "RecursiveExtraBold",
  },
  size: { small: 12, body: 15, title: 24, display: 36, target: 56 },
  space: { tight: 4, small: 8, medium: 12, large: 20, section: 28 },
  radius: { control: 6, panel: 8, hero: 10 },
  touch: 44,
  roomyHeight: 840,
  transitionMs: 120,
} as const;

/** Libellés et repères de présentation communs aux deux interfaces. */
export const modeNames = {
  classic: "Classic", daily: "Daily", rogue: "Rogue", freeskill: "Free Skill",
  big3: "Big 3", big5: "Big 5", big7: "Big 7",
} as const;

export const bigModes = ['big3','big5','big7'] as const;
export type BigMode = typeof bigModes[number];

export const featuredModes = ["classic", "daily", "rogue"] as const;
export type FeaturedMode = typeof featuredModes[number];

export function featuredInfo(mode: FeaturedMode, level: number) {
  if (mode === "daily") return { eyebrow: "Défi du jour", detail: "Une cible commune chaque jour", action: "Jouer au Daily" };
  if (mode === "rogue") return { eyebrow: "Ton parcours", detail: "Trois actes, douze cartes, trois boss", action: "Entrer en Rogue" };
  return { eyebrow: "Ton parcours", detail: `Niveau ${level} sur 100`, action: level > 1 ? "Reprendre" : "Jouer" };
}

export function levelNumbers(first: number, count: number) {
  return Array.from({ length: Math.min(count, 101 - first) }, (_, offset) => first + offset);
}

export function formatCalculation(expression: string) {
  return expression.replace(/\*/g, "×").replace(/-/g, "−");
}
