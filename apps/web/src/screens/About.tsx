import { useQuery } from '@tanstack/react-query';
import { tableQuery } from '../data/puzzles';
import { BackLink, fmt } from '../components/ui';

/** « Comment jouer » : règles, exemple et barème des étoiles (ex-About). */
export function About() {
  const { data } = useQuery(tableQuery('base'));
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <li className="grid grid-cols-[34px_1fr] gap-3 px-5 pt-4">
      <span aria-hidden="true" className="num w-8 h-8 rounded-full border-[1.5px] border-ink text-ink grid place-items-center font-black">{n}</span>
      <div><h2 className="mt-1 mb-1 text-[17px] font-extrabold">{title}</h2>{children}</div>
    </li>
  );
  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-[18px]">
        <BackLink to="/settings" label="Retour aux réglages" />
        <h1 className="hand m-0 text-[28px] font-black text-ink">Comment jouer</h1>
      </header>
      <ol className="list-none m-0 p-0 max-w-[60ch]">
        <Step n={1} title="Atteins la cible">
          <p className="m-0 text-[14.5px] leading-relaxed">Avec les chiffres 3, 5 et 7 et les signes +, − et ×. Pas de parenthèses : × se calcule avant + et −.</p>
          <div className="num mt-2.5 px-3 py-2.5 bg-sheet border-[1.5px] border-graphite rounded-sheet text-lg font-extrabold">7×7−5+3 <span className="text-mine font-semibold">=</span> 47</div>
        </Step>
        <Step n={2} title="Fais le plus court">
          <p className="m-0 text-[14.5px] leading-relaxed">On compte les chiffres utilisés. Le trait rouge « optimal » montre la longueur à viser.</p>
          <div className="mt-2 dashed-rows">
            <div className="flex justify-between py-1.5 text-[14.5px]"><span>Aussi court que l'optimal</span><b>3 étoiles</b></div>
            <div className="flex justify-between py-1.5 text-[14.5px]"><span>Un chiffre de plus</span><b>2 étoiles</b></div>
            <div className="flex justify-between py-1.5 text-[14.5px]"><span>Au-delà</span><b>1 étoile</b></div>
          </div>
        </Step>
        <Step n={3} title="Utilise les indices avec prudence">
          <p className="m-0 text-[14.5px] leading-relaxed">Chaque indice dévoile un symbole de la solution, mais baisse le nombre d'étoiles possible.</p>
        </Step>
      </ol>
      <p className="mt-auto mx-5 mb-6 pt-3.5 border-t-[1.5px] border-graphite text-mine text-[13px] leading-snug">
        Les {data ? fmt(data.length) : '1 000'} cibles sont résolues à l'avance par un solveur qui garantit la solution la plus courte. MathPrime fonctionne hors ligne.
      </p>
    </>
  );
}
