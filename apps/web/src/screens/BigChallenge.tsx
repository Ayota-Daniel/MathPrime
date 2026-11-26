import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { bigModes, type BigMode } from '@shortest/tokens';
import { useGame } from '../store/game';
import { BackLink, ScreenTitle, fmt } from '../components/ui';

/** Big Challenge : choisir le chiffre imposé avant de jouer. */
export function BigChallenge() {
  const [mode, setMode] = useState<BigMode>('big3');
  const best = useGame((s) => s.bestByMode);
  const digit = mode.slice(-1);
  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-[18px]">
        <BackLink to="/" label="Retour à l'accueil" />
        <ScreenTitle>Big Challenge</ScreenTitle>
      </header>
      <main className="flex flex-col px-5 pb-6 flex-1">
        <h2 className="mt-4 mb-2.5 text-base font-extrabold">Choisis le chiffre imposé</h2>
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Chiffre obligatoire">
          {bigModes.map((key) => {
            const on = key === mode; const rec = best[key] ?? 0;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setMode(key)}
                className={`sheet press min-h-[96px] flex flex-col items-center justify-center gap-1 ${on ? 'border-pen shadow-stamp-pen' : ''}`}>
                <span className={`num text-[38px] font-black leading-none ${on ? 'text-pen' : ''}`}>{key.slice(-1)}</span>
                <span className="text-mine text-xs">{rec > 0 ? `record ${fmt(rec)}` : 'pas encore joué'}</span>
              </button>
            );
          })}
        </div>
        <div className="hand self-center mt-6 px-3.5 py-2 border-[2.5px] border-pen rounded-sheet text-pen text-lg font-extrabold -rotate-[2.5deg]">
          Doit contenir un {digit}
        </div>
        <p className="mt-5 mb-0 text-[15px] leading-relaxed">Ta solution doit utiliser au moins un {digit}. Les autres chiffres restent permis. Sans parenthèses : × se calcule avant + et −. Les points comptent ×1,25.</p>
        <Link to="/play/$mode" params={{ mode }} className="btn-ink press mt-auto">Jouer avec le {digit}</Link>
        <Link to="/stats" className="mt-3 text-center text-ink font-bold text-[15px] no-underline">Voir mes records</Link>
      </main>
    </>
  );
}
