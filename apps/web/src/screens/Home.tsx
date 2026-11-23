import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronDown, LockKeyhole, Play, Star } from 'lucide-react';
import {
  featuredInfo,
  featuredModes,
  levelNumbers,
  modeNames,
  type FeaturedMode,
} from '@shortest/tokens';
import tiles from '../../../../packages/tokens/assets/math-tiles.png';
import { audio } from '../lib/audio';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store/game';

export function Home() {
  const [tab, setTab] = useState<FeaturedMode>('classic');
  const level = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) =>
    Object.values(s.classicStars).reduce((sum, value) => sum + value, 0),
  );
  const info = featuredInfo(tab, level);
  useEffect(() => {
    audio.switchMusic('main');
  }, []);
  return (
    <>
      <TopBar />
      <main className="math-home">
        <section className="home-intro">
          <div>
            <h1>
              Ton prochain
              <br />
              déclic t’attend.
            </h1>
            <p>Le plaisir de trouver.</p>
          </div>
          <img src={tiles} alt="" width="240" height="160" />
        </section>
        <div className="mode-tabs" role="group" aria-label="Parcours">
          {featuredModes.map((mode) => (
            <button
              key={mode}
              aria-pressed={tab === mode}
              onClick={() => {
                audio.play('select');
                setTab(mode);
              }}
            >
              {modeNames[mode]}
            </button>
          ))}
        </div>
        <section className="journey-card" aria-label={modeNames[tab]}>
          <div className="journey-title">
            <small>{info.eyebrow}</small>
            <h2>{modeNames[tab]}</h2>
            <p>{info.detail}</p>
            {tab === 'classic' && (
              <strong>
                <Star size={18} fill="currentColor" />
                {stars} étoiles
              </strong>
            )}
          </div>
          {tab === 'classic' && (
            <ol className="level-trail" aria-label="Progression Classic">
              {levelNumbers(Math.max(1, Math.min(level - 2, 96)), 5).map(
                (n) => (
                  <li
                    key={n}
                    aria-label={`Niveau ${n}${n > level ? ' verrouillé' : ''}`}
                    aria-current={n === level ? 'step' : undefined}
                    className={n > level ? 'locked' : ''}
                  >
                    {n}
                    <span>{n > level && <LockKeyhole size={13} />}</span>
                  </li>
                ),
              )}
            </ol>
          )}
          <div className="journey-actions">
            {tab === 'rogue' ? (
              <Link className="math-action" to="/rogue">
                <Play size={17} />
                {info.action}
              </Link>
            ) : (
              <Link
                className="math-action"
                to="/play/$mode"
                params={{ mode: tab }}
              >
                <Play size={17} />
                {info.action}
              </Link>
            )}
            {tab === 'classic' && (
              <Link to="/niveaux">
                Voir les niveaux <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>
        <details className="more-modes">
          <summary>
            <div>
              <b>Tous les modes</b>
              <small>Big Challenge et Free Skill</small>
            </div>
            <ChevronDown />
          </summary>
          <div className="other-modes">
            <Link to="/big-challenge">
              <b>Big Challenge</b>
              <small>Choisis ton chiffre obligatoire</small>
              <ArrowRight size={16} />
            </Link>
            <Link to="/play/$mode" params={{ mode: 'freeskill' }}>
              <b>Free Skill</b>
              <small>Entraînement chronométré</small>
              <ArrowRight size={16} />
            </Link>
          </div>
        </details>
        <Link className="home-help" to="/about">
          Comment jouer ?
        </Link>
      </main>
    </>
  );
}
