const { colors, radius } = require('@shortest/tokens');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {
    colors: { bg: colors.bg, card: colors.card, ink: colors.ink, mut: colors.mut, line: colors.line,
      pri: colors.pri, 'pri-d': colors.priDark, ok: colors.ok, gold: colors.gold, err: colors.err, num: colors.num, op: colors.op },
    borderRadius: { tile: `${radius.md}px`, card: `${radius.xl}px`, mode: `${radius.lg}px` },
  } },
  plugins: [],
};
