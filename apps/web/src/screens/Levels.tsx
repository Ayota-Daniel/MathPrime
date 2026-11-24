import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { levelNumbers } from '@shortest/tokens';
import { useGame } from '../store/game';
import { BackLink, ScreenTitle } from '../components/ui';

const PAGE = 15;

/** Niveaux Classique : grille de cases, étoiles à la main, cadenas au-delà du niveau atteint. */
export function Levels() {
  const current = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) => s.classicStars);
  const [page, setPage] = useState(Math.floor((current - 1) / PAGE));
  const first = page * PAGE + 1;
  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-[18px]">
        <BackLink to="/" label="Retour à l'accueil" />
        <ScreenTitle>Classique</ScreenTitle>
      </header>
      <main className="flex flex-col px-5 pb-6">
        <p className="mt-3 mb-0 text-[15px] leading-snug">Trois étoiles débloquent le niveau suivant. Tu peux rejouer tous les niveaux ouverts.</p>
        <div className="grid grid-cols-5 gap-2.5 mt-4">
          {levelNumbers(first, PAGE).map((n) => {
            const got = stars[n - 1] ?? 0;
            return n <= current ? (
              <Link key={n} to="/play/$mode" params={{ mode: 'classic' }} search={{ niveau: n }}
                aria-label={`Jouer au niveau ${n}, ${got} étoile${got > 1 ? 's' : ''} sur 3`} aria-current={n === current ? 'step' : undefined}
                className={`sheet press aspect-square flex flex-col items-center justify-center no-underline text-graphite ${n === current ? 'bg-hl' : ''}`}>
                <span className="num text-[22px] font-black leading-none">{n}</span>
                <span aria-hidden="true" className="num text-[11px] mt-1 tracking-[1px]">{'★'.repeat(got)}<span className="text-ghost">{'★'.repeat(3 - got)}</span></span>
              </Link>
            ) : (
              <div key={n} aria-label={`Niveau ${n} verrouillé`}
                className="aspect-square flex flex-col items-center justify-center border-[1.5px] border-dashed border-ghost rounded-sheet text-ghost">
                <span className="num text-[20px] font-bold leading-none">{n}</span>
                <LockKeyhole size={13} aria-hidden="true" className="mt-1" />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button type="button" className="icon-btn disabled:opacity-40" aria-label="Page précédente" disabled={!page} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span className="num text-mine text-sm">{first}–{Math.min(first + PAGE - 1, 100)} sur 100</span>
          <button type="button" className="icon-btn disabled:opacity-40" aria-label="Page suivante" disabled={first + PAGE > 100} onClick={() => setPage(page + 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
        <Link to="/play/$mode" params={{ mode: 'classic' }} className="btn-ink press mt-6">Jouer au niveau {current}</Link>
      </main>
    </>
  );
}
