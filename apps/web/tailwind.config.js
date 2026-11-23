import { colors, radius, rogue } from '@shortest/tokens';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: colors.bg, card: colors.card, ink: colors.ink, mut: colors.mut, line: colors.line,
        pri: colors.pri, 'pri-d': colors.priDark, ok: colors.ok, gold: colors.gold, err: colors.err,
        num: colors.num, op: colors.op, panel: colors.panel,
        rogue: {
          surface: 'var(--surface)', ink: 'var(--ink)',
          muted: 'var(--secondary)', line: 'var(--line)',
        },
      },
      borderRadius: {
        tile: `${radius.md}px`, card: `${radius.xl}px`, mode: `${radius.lg}px`,
        'rogue-panel': `${rogue.radius.panel}px`,
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        mono: ['Nunito', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      maxWidth: { app: '430px' },
    },
  },
  plugins: [],
};
