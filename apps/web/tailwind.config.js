import { colors, radius } from '@shortest/tokens';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: colors.bg, card: colors.card, ink: colors.ink, mut: colors.mut, line: colors.line,
        pri: colors.pri, 'pri-d': colors.priDark, ok: colors.ok, gold: colors.gold, err: colors.err,
        num: colors.num, op: colors.op,
      },
      borderRadius: { tile: `${radius.md}px`, card: `${radius.xl}px`, mode: `${radius.lg}px` },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { app: '430px' },
    },
  },
  plugins: [],
};
