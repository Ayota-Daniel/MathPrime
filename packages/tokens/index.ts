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

/**
 * Thèmes d'accent de l'application : seule l'encre change (titres, actions, progression, onglet actif).
 * Le rouge stylo et le surligneur gardent leur sens et ne changent jamais.
 */
export const appThemes = [
  { id: 'encre', name: 'Encre bleue', colors: { ink: '#1D2A8A', inkDark: '#16217A', inkSoft: '#EEF0FA' } },
  { id: 'sapin', name: 'Sapin', colors: { ink: '#1E5B3F', inkDark: '#164530', inkSoft: '#E6F1EA' } },
  { id: 'prune', name: 'Prune', colors: { ink: '#5B2A86', inkDark: '#47206A', inkSoft: '#F1EAF7' } },
  { id: 'petrole', name: 'Pétrole', colors: { ink: '#0E5566', inkDark: '#0A4352', inkSoft: '#E3F0F2' } },
  { id: 'brique', name: 'Brique', colors: { ink: '#9A3412', inkDark: '#7C2D12', inkSoft: '#FAEBE3' } },
] as const;
export type AppTheme = typeof appThemes[number];
export const DEFAULT_APP_THEME = 'encre';
export const appThemeById = (id?: string): AppTheme => appThemes.find((t) => t.id === id) ?? appThemes[0];

type RogueSurface = {
  night: string; panel: string; raised: string; border: string; muted: string; operator: string;
  coral: string; coralPressed: string; coralInk: string; gold: string; focus: string;
};
const ROGUE_ARDOISE: RogueSurface = {
  night: "#14181F", panel: "#1C222C", raised: "#28303D", border: "#4B5568", muted: "#C5CCD8", operator: "#CDD4DF",
  coral: "#7FE0C0", coralPressed: "#66CCAA", coralInk: "#10241C", gold: "#FFE04A", focus: "#7FE0C0",
};

/** Pages du mode Rogue : fond du run, panneaux, contours et couleur d'action. */
export const rogueThemes: readonly { id: string; name: string; colors: RogueSurface }[] = [
  { id: 'ardoise', name: 'Ardoise', colors: ROGUE_ARDOISE },
  { id: 'encre', name: 'Encre', colors: {
    night: "#16217A", panel: "#1D2A8A", raised: "#2B3A9E", border: "#5563B8", muted: "#C9D0EE", operator: "#C9D1F5",
    coral: "#FFE04A", coralPressed: "#F2CF2E", coralInk: "#23293A", gold: "#FFE04A", focus: "#FFE04A" } },
  { id: 'foret', name: 'Forêt', colors: {
    night: "#0E3B2A", panel: "#144A35", raised: "#1D5E45", border: "#3D8A68", muted: "#C4E4D3", operator: "#C8E8D6",
    coral: "#FFE04A", coralPressed: "#F2CF2E", coralInk: "#23293A", gold: "#FFE04A", focus: "#FFE04A" } },
  { id: 'amethyste', name: 'Améthyste', colors: {
    night: "#26143D", panel: "#33194F", raised: "#432366", border: "#7A56A6", muted: "#DACBEE", operator: "#DED0F0",
    coral: "#FFB86B", coralPressed: "#F2A452", coralInk: "#2A1606", gold: "#FFB86B", focus: "#FFB86B" } },
  { id: 'braise', name: 'Braise', colors: {
    night: "#33130F", panel: "#451A15", raised: "#5A241D", border: "#9A4B3F", muted: "#F1CEC6", operator: "#F3D3CB",
    coral: "#FFD166", coralPressed: "#F2BE45", coralInk: "#2A1A00", gold: "#FFD166", focus: "#FFD166" } },
];
export type RogueTheme = typeof rogueThemes[number];
export const DEFAULT_ROGUE_THEME = 'ardoise';
export const rogueThemeById = (id?: string): RogueTheme => rogueThemes.find((t) => t.id === id) ?? rogueThemes[0];

/** Rogue R4.3B: implementation roles derived from the archived visual references.
 * The Rogue run keeps its own night-surface roles.
 */
export const rogue = {
  // Page Rogue par défaut : Ardoise (voir `rogueThemes`). Les autres pages remplacent les rôles de surface et d'action.
  colors: {
    ivory: "#F7F9F6",        // papier : fond clair et texte sur la page
    aubergine: "#23293A",    // graphite : texte sur papier
    mutedLight: "#586174",
    success: "#BFEBD2",
    error: "#FFC2B9",
    warning: "#FFE04A",
    errorSurface: "#5E1F33",
    ...ROGUE_ARDOISE,
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
