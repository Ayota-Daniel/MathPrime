import { useEffect, useState } from 'react';
import { Globe, Smartphone } from 'lucide-react';
import type { Mode, LbEntry } from '@shortest/engine';
import { useGame } from '../store/game';
import { isGlobalLeaderboard } from '../lib/leaderboard';
import { TabBar } from '../components/TabBar';
import { Button, ScreenTitle, fmt } from '../components/ui';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'classic', label: 'Classique' }, { mode: 'daily', label: 'Jour' },
  { mode: 'freeskill', label: 'Free Skill' }, { mode: 'rogue', label: 'Rogue' },
];
const TOP = 8;

export function Leaderboard() {
  const fetchLb = useGame((s) => s.fetchLeaderboard);
  const optIn = useGame((s) => s.settings.leaderboardOptIn);
  const pseudo = useGame((s) => s.pseudo);
  const deviceId = useGame((s) => s.deviceId);
  const setPseudo = useGame((s) => s.setPseudo);
  const setSetting = useGame((s) => s.setSetting);

  const [mode, setMode] = useState<Mode>('classic');
  const [rows, setRows] = useState<LbEntry[] | null>(null);
  const [draft, setDraft] = useState(pseudo);

  useEffect(() => { setRows(null); fetchLb(mode).then(setRows); }, [mode, fetchLb, optIn]);

  const meIdx = rows ? rows.findIndex((r) => r.id === deviceId) : -1;
  const shown = rows ? rows.slice(0, TOP) : [];
  const gap = meIdx >= TOP ? meIdx - TOP : 0;

  return (
    <>
      <header className="px-5 pt-6 pb-1 flex items-center justify-between">
        <ScreenTitle>Classement</ScreenTitle>
        <span className="text-mine text-[13px] font-bold flex items-center gap-1.5">
          {isGlobalLeaderboard ? <><Globe size={16} aria-hidden="true" />Mondial</> : <><Smartphone size={16} aria-hidden="true" />Cet appareil</>}
        </span>
      </header>
      <main className="flex flex-col pb-5">
        {!optIn && (
          <section className="sheet mx-5 mt-3.5 p-4 flex flex-col gap-3">
            <p className="m-0 text-[15px] leading-snug">Pour apparaître dans le classement, choisis un pseudo. Seul ce pseudo est publié : pas de compte, pas de donnée personnelle.</p>
            <label htmlFor="lb-pseudo" className="sr-only">Pseudo</label>
            <input id="lb-pseudo" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={16} placeholder="ton pseudo"
              className="num h-11 border-[1.5px] border-graphite rounded-sheet px-3 bg-sheet text-graphite" />
            <Button variant="ink" disabled={!draft.trim()} onClick={() => { setPseudo(draft.trim()); setSetting('leaderboardOptIn', true); }}>Publier mes scores</Button>
          </section>
        )}

        <div role="group" aria-label="Mode" className="mx-5 mt-3.5 grid grid-cols-4 border-[1.5px] border-graphite rounded-sheet overflow-hidden bg-sheet">
          {MODES.map(({ mode: m, label }, i) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
              className={`h-11 text-[13.5px] font-bold ${i > 0 ? 'border-l-[1.5px] border-graphite' : ''} ${mode === m ? 'bg-ink text-white' : 'text-mine'}`}>
              {label}
            </button>
          ))}
        </div>

        <section className="sheet mx-5 mt-4 px-4 py-1 dashed-rows" aria-live="polite">
          {rows === null ? <p className="text-mine text-sm py-3 m-0">Chargement…</p>
            : rows.length === 0 ? <p className="text-mine text-sm py-3 m-0">Aucun score pour ce mode. Joue une partie pour ouvrir le classement.</p>
            : <>
              {shown.map((r, i) => (
                <div key={r.id + r.mode} className={`flex items-center gap-3 py-2.5 text-[15px] ${r.id === deviceId ? 'bg-hl -mx-4 px-4 font-extrabold' : ''}`}>
                  <span className="num w-7 font-extrabold">{i + 1}</span>
                  <span className="flex-1 truncate">{r.id === deviceId ? `Toi, ${r.pseudo}` : r.pseudo}</span>
                  <span className="num font-extrabold">{fmt(r.score)}</span>
                </div>
              ))}
              {gap > 0 && <div className="flex items-center gap-3 py-2.5 text-[15px] text-mine"><span className="num w-7">…</span><span>{gap} joueur{gap > 1 ? 's' : ''} entre vous</span></div>}
            </>}
        </section>

        {rows && meIdx >= TOP && (
          <section className="mx-5 mt-3.5 px-4 py-3 border-[1.5px] border-graphite rounded-sheet bg-hl flex items-center gap-3 text-[15px]">
            <span className="num w-7 font-black">{meIdx + 1}</span>
            <span className="flex-1 font-extrabold truncate">Toi, {rows[meIdx].pseudo}</span>
            <span className="num font-black">{fmt(rows[meIdx].score)}</span>
          </section>
        )}
        {optIn && <p className="mx-5 mt-2 mb-0 text-mine text-[13px]">Tu publies en tant que « {pseudo} ». Tu peux arrêter dans Réglages.</p>}
      </main>
      <TabBar />
    </>
  );
}
