import { cahier, colors, radius, rogue } from '@shortest/tokens';

/** Couleurs d'accent : variables CSS posées par le thème choisi (voir `appThemeVars`). */
const accent = { ink: 'var(--accent)', inkDark: 'var(--accent-d)', inkSoft: 'var(--accent-soft)' };
/** @type {import('tailwindcss').Config} — direction « Cahier ». */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cahier
        paper: cahier.paper, grid: cahier.grid, sheet: cahier.white,
        ink: accent.ink, 'ink-d': accent.inkDark, 'ink-soft': accent.inkSoft,
        graphite: cahier.graphite, mine: cahier.mine, dash: cahier.dash, ghost: cahier.ghost,
        pen: cahier.pen, hl: cahier.hl,
        // noms historiques (alignés sur Cahier dans les tokens)
        bg: colors.bg, card: colors.card, mut: colors.mut, line: colors.line,
        pri: accent.ink, 'pri-d': accent.inkDark, ok: colors.ok, gold: colors.gold, err: colors.err,
        num: colors.num, op: accent.inkSoft, panel: colors.panel,
        rogue: {
          surface: 'var(--surface)', ink: 'var(--ink)',
          muted: 'var(--secondary)', line: 'var(--line)',
        },
      },
      borderRadius: {
        sheet: '6px', cell: '4px',
        tile: `${radius.md}px`, card: `${radius.xl}px`, mode: `${radius.lg}px`,
        'rogue-panel': `${rogue.radius.panel}px`,
      },
      fontFamily: {
        sans: ['Recursive', 'system-ui', 'sans-serif'],
        display: ['Recursive', 'system-ui', 'sans-serif'],
        mono: ['Recursive', 'ui-monospace', 'monospace'],
      },
      boxShadow: { stamp: `3px 3px 0 ${cahier.graphite}`, 'stamp-pen': `3px 3px 0 ${cahier.pen}` },
      maxWidth: { app: '480px' },
    },
  },
  plugins: [],
};
