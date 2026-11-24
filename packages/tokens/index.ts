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
