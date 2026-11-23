import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TopBar } from '../components/TopBar';
import { tableQuery } from '../data/puzzles';
export function About() {
  const { data } = useQuery(tableQuery('base'));
  return (
    <>
      <TopBar />
      <main className="math-inner lesson-page">
        <Link to="/" className="math-back">
          <ChevronLeft size={18} />
          Accueil
        </Link>
        <h1>Comment jouer</h1>
        <p className="rule-strip">Atteins la cible, fais court.</p>
        <div className="target-panel">
          <small>Cible</small>
          <strong>8</strong>
        </div>
        <p>
          Utilise 3, 5 et 7 avec +, − et ×. Tu peux réutiliser chaque chiffre.
          La multiplication est prioritaire.
        </p>
        <p className="lesson-example">
          3 × 5 − 7 = 8 <small>3 chiffres</small>
        </p>
        <p className="lesson-example">
          3 + 5 = 8 <small>2 chiffres</small>
        </p>
        <p>À résultat égal, le calcul le plus court gagne le plus d’étoiles.</p>
        <Link to="/" className="math-action">
          C’est compris
        </Link>
        <details>
          <summary>À propos de MathPrime</summary>
          <p>
            {data?.length ?? '…'} cibles dans la table de base. La progression
            est enregistrée sur cet appareil.
          </p>
        </details>
      </main>
    </>
  );
}
