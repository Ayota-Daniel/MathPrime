import { cahier } from '@shortest/tokens';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: cahier.paper, grid: cahier.grid, sheet: cahier.white,
        ink: cahier.ink, 'ink-d': cahier.inkDark, 'ink-soft': cahier.inkSoft,
        graphite: cahier.graphite, mine: cahier.mine, dash: cahier.dash, ghost: cahier.ghost,
        pen: cahier.pen, hl: cahier.hl,
      },
      borderRadius: { sheet: '6px', cell: '4px' },
      fontFamily: { sans: ['Recursive', 'system-ui', 'sans-serif'] },
      boxShadow: { stamp: `3px 3px 0 ${cahier.graphite}`, 'stamp-pen': `3px 3px 0 ${cahier.pen}` },
      maxWidth: { app: '430px' },
    },
  },
  plugins: [],
};
