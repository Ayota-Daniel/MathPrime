/** Design tokens partagés. Tailwind (web) et le thème RN (mobile) les consomment. */
export const colors = {
  bg: '#FFF5EF', card: '#FFF9F1', ink: '#4A1933', mut: '#724E62', line: '#EACFC0',
  pri: '#F05B4B', priDark: '#A93232', ok: '#276044', gold: '#976000', err: '#A4273F',
  warn: '#976000', num: '#FBE5CB', op: '#ABC8FB',
  night: '#0C1A3E', panel: '#12346C', onNight: '#FFF7EB', accent: '#FFD269', actionInk: '#341426',
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

/** Rogue R4.3B: implementation roles derived from the archived visual references.
 * The Rogue run keeps its own night-surface roles.
 */
export const rogue = {
  colors: {
    ivory: "#FFF7EB",
    aubergine: "#4A1C32",
    night: "#0C1A3E",
    panel: "#12346C",
    raised: "#1C4787",
    coral: "#F05B4B",
    coralPressed: "#D1463B",
    coralInk: "#341426",
    gold: "#FFD269",
    operator: "#A9C5F6",
    muted: "#C6D1EA",
    mutedLight: "#735368",
    border: "#42689F",
    success: "#ADE3C8",
    error: "#FFC2B9",
    warning: "#FFD269",
    errorSurface: "#54263C",
    focus: "#FFD269",
  },
  font: {
    body: "NunitoRegular",
    strong: "NunitoBold",
    display: "NunitoExtraBold",
  },
  size: { small: 12, body: 15, title: 24, display: 36, target: 56 },
  space: { tight: 4, small: 8, medium: 12, large: 20, section: 28 },
  radius: { control: 12, panel: 24, hero: 28 },
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
