import { cahier, colors, radius, rogue } from '@shortest/tokens';
/** @type {import('tailwindcss').Config} — direction « Cahier ». */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cahier
        paper: cahier.paper, grid: cahier.grid, sheet: cahier.white,
        ink: cahier.ink, 'ink-d': cahier.inkDark, 'ink-soft': cahier.inkSoft,
        graphite: cahier.graphite, mine: cahier.mine, dash: cahier.dash, ghost: cahier.ghost,
        pen: cahier.pen, hl: cahier.hl,
        // noms historiques (alignés sur Cahier dans les tokens)
        bg: colors.bg, card: colors.card, mut: colors.mut, line: colors.line,
        pri: colors.pri, 'pri-d': colors.priDark, ok: colors.ok, gold: colors.gold, err: colors.err,
        num: colors.num, op: colors.op, panel: colors.panel,
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
