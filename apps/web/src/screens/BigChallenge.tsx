import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { bigModes, modeNames, type BigMode } from '@shortest/tokens';
import { TopBar } from '../components/TopBar';

export function BigChallenge() {
  const [mode, setMode] = useState<BigMode>('big3');
  return (
    <>
      <TopBar />
      <main className="math-inner lesson-page">
        <Link to="/" className="math-back">
          <ChevronLeft size={18} />
          Accueil
        </Link>
        <h1>Big Challenge</h1>
        <h2 className="utility-heading">Choisis le chiffre imposé</h2>
        <div
          className="big-options"
          role="group"
          aria-label="Chiffre obligatoire"
        >
          {bigModes.map((key) => (
            <button
              key={key}
              aria-pressed={key === mode}
              onClick={() => setMode(key)}
            >
              {modeNames[key]}
              <strong>{key.slice(-1)}</strong>
            </button>
          ))}
        </div>
        <div className="level-summary big-summary">
          <h2>{modeNames[mode]}</h2>
          <p>Ta solution doit contenir au moins un {mode.slice(-1)}.</p>
          <p>Tu peux aussi utiliser les autres chiffres.</p>
        </div>
        <p className="rule-strip">
          Sans parenthèses · La multiplication est prioritaire
        </p>
        <Link className="math-action" to="/play/$mode" params={{ mode }}>
          Jouer à {modeNames[mode]}
        </Link>
        <Link className="home-help" to="/stats">
          Voir mes records →
        </Link>
      </main>
    </>
  );
}
