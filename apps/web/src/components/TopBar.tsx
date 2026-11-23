import { Link } from '@tanstack/react-router';
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Settings,
  Trophy,
} from 'lucide-react';

export function TopBar() {
  return (
    <header className="math-header">
      <Link to="/" className="math-brand">
        MathPrime
      </Link>
      <nav aria-label="Navigation principale">
        <Link to="/stats" aria-label="Statistiques">
          <ChartNoAxesColumnIncreasing />
          <span>Statistiques</span>
        </Link>
        <Link to="/leaderboard" aria-label="Classement">
          <Trophy />
          <span>Classement</span>
        </Link>
        <Link to="/about" aria-label="Comment jouer">
          <BookOpen />
        </Link>
        <Link to="/settings" aria-label="Paramètres">
          <Settings />
        </Link>
      </nav>
    </header>
  );
}
