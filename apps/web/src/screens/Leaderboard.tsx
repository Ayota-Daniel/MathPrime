import { useEffect, useState } from 'react';
import {
  COMPETITION_MESSAGES,
  type Mode,
  type LbEntry,
} from '@shortest/engine';
import { modeNames } from '@shortest/tokens';
import { TabBar } from '../components/TabBar';
import { Button, ScreenTitle, fmt } from '../components/ui';
import { useGame } from '../store/game';
import { useCompetition } from '../store/competition';
import { competitionApi, isCompetitionConfigured } from '../lib/leaderboard';

const MODES: Mode[] = [
  'classic',
  'big3',
  'big5',
  'big7',
  'freeskill',
  'rogue',
  'daily',
];

export function Leaderboard() {
  const game = useGame();
  const competition = useCompetition();
  const [view, setView] = useState<'local' | 'verified'>('local');
  const [mode, setMode] = useState<Mode>('classic');
  const [rows, setRows] = useState<LbEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [expression, setExpression] = useState('');
  const [draft, setDraft] = useState(game.pseudo);
  const challenge = competition.reply?.challenge;
  const busy = competition.status === 'syncing';
  useEffect(() => {
    void competition.hydrate().catch(() => {});
  }, [competition.hydrate]);
  useEffect(() => {
    let active = true;
    setRows(null);
    setError(false);
    const load =
      view === 'local'
        ? game.fetchLeaderboard(mode)
        : game.settings.leaderboardOptIn && competitionApi
          ? competitionApi.top()
          : Promise.resolve([]);
    void load
      .then((value) => {
        if (active) setRows(value);
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [
    view,
    mode,
    game.fetchLeaderboard,
    game.settings.leaderboardOptIn,
    competition.confirmedBest,
  ]);

  const meIdx = rows ? rows.findIndex((r) => r.id === game.deviceId) : -1;

  return (
    <>
      <header className="px-5 pt-6 pb-1"><ScreenTitle>Classement</ScreenTitle></header>
      <main className="flex flex-col px-5 pb-5 gap-3.5">
        <div role="group" aria-label="Classement" className="mt-2 grid grid-cols-2 border-[1.5px] border-graphite rounded-sheet overflow-hidden bg-sheet">
          {([['local', 'Cet appareil'], ['verified', 'Daily vérifié']] as const).map(([key, label], i) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
              className={`h-11 text-[14px] font-bold ${i > 0 ? 'border-l-[1.5px] border-graphite' : ''} ${view === key ? 'bg-ink text-white' : 'text-mine'}`}>
              {label}
            </button>
          ))}
        </div>

        {view === 'local' ? (
          <>
            <p className="m-0 text-mine text-[13.5px] leading-snug">Records locaux non vérifiés. Aucun record historique n'est transféré au classement compétitif.</p>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="lb-mode" className="text-[15px] font-bold">Mode</label>
              <select id="lb-mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="field text-[14.5px] px-2">
                {MODES.map((m) => <option key={m} value={m}>{modeNames[m]}</option>)}
              </select>
            </div>
            <p className="m-0 text-[14.5px]">Ton record local : <b className="num">{fmt(game.bestByMode[mode] ?? 0)}</b></p>
            {game.localLeaderboardError && <p className="m-0 text-pen font-bold">Le dernier record n'a pas pu être enregistré dans ce classement.</p>}
          </>
        ) : (
          <>
            <p className="m-0 text-mine text-[13.5px] leading-snug">Daily uniquement. Les autres modes restent locaux. Le serveur contrôle le défi, les indices et la récompense.</p>
            {!isCompetitionConfigured && <p className="m-0 text-[14.5px]">Service compétitif non configuré. Le jeu local reste disponible.</p>}
            {!game.settings.leaderboardOptIn && (
              <section className="sheet p-4 flex flex-col gap-3">
                <p className="m-0 text-[15px] leading-snug">Participer crée une identité anonyme Supabase. Ton pseudo et ton score vérifié sont publics. Aucun compte traditionnel n'est demandé.</p>
                <label htmlFor="lb-pseudo" className="sr-only">Pseudo</label>
                <input id="lb-pseudo" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={16} placeholder="ton pseudo" className="field num" />
                <Button variant="ink" onClick={() => { game.setPseudo(draft.trim()); game.setSetting('leaderboardOptIn', true); }} disabled={!draft.trim()}>
                  Activer la participation
                </Button>
              </section>
            )}
            {isCompetitionConfigured && game.settings.leaderboardOptIn && (
              <section className="sheet p-4 flex flex-col gap-3">
                <p className="m-0 text-[15px]" aria-live="polite">{COMPETITION_MESSAGES[competition.status]}</p>
                <p className="m-0 text-[14.5px]">Meilleur score confirmé : <b className="num">{fmt(competition.confirmedBest)}</b></p>
                <Button variant="ink" onClick={() => { setExpression(''); void competition.start(); }} disabled={busy || !!competition.pending}>
                  Ouvrir le Daily compétitif
                </Button>
                {competition.pending && (
                  <Button onClick={() => void competition.retry()} disabled={busy}>Réessayer la synchronisation</Button>
                )}
                {challenge && !challenge.rewarded && (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-mine text-sm font-semibold">Cible</span>
                      <span className="num text-[40px] font-black leading-none"><span className="hl">{challenge.target}</span></span>
                      <span className="text-mine text-[13px] ml-auto">{challenge.day} UTC</span>
                    </div>
                    <p className="m-0 text-[14.5px]">
                      {challenge.hints > 0 ? <><span className="hand font-bold text-pen">Indice :</span> <b className="num">{challenge.hint}…</b></> : 'Aucun indice demandé'}
                    </p>
                    <label htmlFor="lb-expr" className="sr-only">Expression compétitive</label>
                    <input id="lb-expr" aria-label="Expression compétitive" value={expression} onChange={(e) => setExpression(e.target.value)} maxLength={256}
                      className="field num text-lg" placeholder="3+5*7" />
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => void competition.hint()} disabled={busy || !!competition.pending}>Indice serveur</Button>
                      <Button variant="ink" onClick={() => void competition.answer(expression)} disabled={busy || !!competition.pending || !expression}>Valider</Button>
                    </div>
                  </>
                )}
                {challenge?.rewarded && <p className="m-0 text-[14.5px]">Défi déjà récompensé aujourd'hui. Le Daily local reste rejouable pour s'entraîner.</p>}
              </section>
            )}
          </>
        )}

        <section className="sheet px-4 py-1 dashed-rows" aria-live="polite" aria-label="Scores">
          {error ? <p className="text-pen text-sm py-3 m-0">Classement indisponible. Réessaie plus tard.</p>
            : rows === null ? <p className="text-mine text-sm py-3 m-0">Chargement…</p>
            : rows.length === 0 ? <p className="text-mine text-sm py-3 m-0">Aucun score dans ce classement.</p>
            : rows.map((row, i) => (
              <div key={row.id + row.mode} className={`flex items-center gap-3 py-2.5 text-[15px] ${i === meIdx ? 'bg-hl -mx-4 px-4 font-extrabold' : ''}`}>
                <span className="num w-7 font-extrabold">{i + 1}</span>
                <span className="flex-1 truncate">{i === meIdx ? `Toi, ${row.pseudo}` : row.pseudo}</span>
                <span className="num font-extrabold">{fmt(row.score)}</span>
              </div>
            ))}
        </section>
      </main>
      <TabBar />
    </>
  );
}
