import { Link } from '@tanstack/react-router';
import { ChevronLeft, Star } from 'lucide-react';
import { modeNames } from '@shortest/tokens';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store/game';

const modes = [
  'classic',
  'daily',
  'freeskill',
  'rogue',
  'big3',
  'big5',
  'big7',
] as const;

export function Stats() {
  const game = useGame();
  const stars = Object.values(game.classicStars).reduce(
    (sum, value) => sum + value,
    0,
  );
  return (
    <>
      <TopBar />
      <main className="math-inner utility-page">
        <Link className="math-back" to="/">
          <ChevronLeft size={18} />
          Accueil
        </Link>
        <h1>Mes statistiques</h1>
        <section className="level-summary stat-progress">
          <small>Ton parcours</small>
          <h2>Classic</h2>
          <div>
            <b>Niveau {game.classicProgress + 1} / 100</b>
            <strong>
              <Star size={16} fill="currentColor" /> {stars} / 300 étoiles
            </strong>
          </div>
          <progress value={stars} max={300} aria-label="Étoiles Classic" />
          <Link to="/niveaux">Voir les niveaux →</Link>
        </section>
        <dl className="score-summary">
          {[
            ['XP', game.xp],
            ['Rang', game.rank()],
            ['Parties', game.stats.played],
            ['Parfaits', game.stats.perfect],
            [
              'Taux de parfaits',
              game.stats.played
                ? Math.round((100 * game.stats.perfect) / game.stats.played) +
                  ' %'
                : '—',
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h2 className="utility-heading">Tes records</h2>
        <div className="ranking-list">
          {modes.map((mode) => (
            <div key={mode}>
              <b>{modeNames[mode]}</b>
              <span>Série {game.bestStreakByMode[mode] ?? 0}</span>
              <strong>{game.bestByMode[mode] ?? 0} pts</strong>
            </div>
          ))}
        </div>
        <Link className="home-help" to="/leaderboard">
          Voir le classement →
        </Link>
      </main>
    </>
  );
}
