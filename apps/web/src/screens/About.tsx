import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { tableQuery } from '../data/puzzles';

export function About() {
  const nav = useNavigate();
  const { data } = useQuery(tableQuery('base'));
  return (
    <>
      <TopBar />
      <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
        <button className="flex items-center gap-[4px] text-mut font-semibold text-[14px]" onClick={() => nav({ to: '/' })}><ChevronLeft size={18} />Retour</button>
        <h1 className="font-display font-bold text-[22px] m-0">About</h1>
        <div className="bg-card border border-line rounded-card p-[18px]">
          <p className="text-[14px] leading-relaxed mt-0"><b>Shortest</b> — jeu de décomposition de nombres. Trouve l'expression la plus courte pour chaque cible (1–1000) avec 3, 5, 7 et +, −, ×, sans parenthèses, priorité standard.</p>
          <p className="text-[13.5px] leading-relaxed text-mut">Puzzles pré-calculés hors-ligne (solveur BFS, optimalité garantie). Difficulté par paliers d'opérandes, calibrée pour un public aguerri. Le solveur n'est pas dans le bundle ; seul un mini-solveur borné sert au Rogue.</p>
          <div className="flex items-center justify-between py-[14px] border-t border-line"><span className="text-mut text-[13.5px]">Cibles couvertes</span><b className="font-mono">{data?.length ?? '—'}/1000</b></div>
        </div>
      </div>
    </>
  );
}
