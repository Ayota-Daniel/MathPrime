const { cahier } = require('@shortest/tokens');
/** @type {import('tailwindcss').Config} — palette « Cahier » (les écrans utilisent surtout des styles inline via components/ui). */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {
    colors: { paper: cahier.paper, grid: cahier.grid, sheet: cahier.white, ink: cahier.ink, 'ink-soft': cahier.inkSoft,
      graphite: cahier.graphite, mine: cahier.mine, dash: cahier.dash, ghost: cahier.ghost, pen: cahier.pen, hl: cahier.hl },
    borderRadius: { sheet: '6px', cell: '4px' },
  } },
  plugins: [],
};
