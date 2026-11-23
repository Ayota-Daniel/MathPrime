import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, LockKeyhole, Star } from 'lucide-react';
import { levelNumbers } from '@shortest/tokens';
import { useGame } from '../store/game';
import { TopBar } from '../components/TopBar';

export function Levels() {
  const current = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) => s.classicStars);
  const [page, setPage] = useState(Math.floor((current - 1) / 15));
  const first = page * 15 + 1;
  return (
    <>
      <TopBar />
      <main className="math-inner levels-page">
        <Link className="math-back" to="/">
          <ChevronLeft size={18} />
          Accueil
        </Link>
        <h1>Classic</h1>
        <p className="text-center text-mut">Choisis ton niveau</p>
        <div className="levels-columns">
          <div>
            <div className="level-grid">
              {levelNumbers(first, 15).map((n) =>
                n <= current ? (
                  <Link
                    key={n}
                    to="/play/$mode"
                    params={{ mode: 'classic' }}
                    search={{ niveau: n }}
                    aria-label={`Jouer au niveau ${n}`}
                    aria-current={n === current ? 'step' : undefined}
                  >
                    {n}
                    <span>
                      <Star size={13} />
                      {stars[n - 1] ?? 0}/3
                    </span>
                  </Link>
                ) : (
                  <div
                    className="locked"
                    key={n}
                    aria-label={`Niveau ${n} verrouillé`}
                  >
                    {n}
                    <LockKeyhole size={15} />
                  </div>
                ),
              )}
            </div>
            <div className="level-pager">
              <button
                aria-label="Page précédente"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft />
              </button>
              <span>
                {first}–{Math.min(first + 14, 100)} sur 100
              </span>
              <button
                aria-label="Page suivante"
                disabled={first + 15 > 100}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="level-summary">
            <small>Ton parcours</small>
            <h2>Niveau {current}</h2>
            <p>Obtiens trois étoiles pour débloquer le niveau suivant.</p>
            <Link
              className="math-action"
              to="/play/$mode"
              params={{ mode: 'classic' }}
            >
              Jouer au niveau {current}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
