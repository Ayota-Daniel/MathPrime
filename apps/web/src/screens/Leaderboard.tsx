import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { COMPETITION_MESSAGES, type Mode, type LbEntry } from '@shortest/engine';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/ui';
import { useGame } from '../store/game';
import { useCompetition } from '../store/competition';
import { competitionApi, isCompetitionConfigured } from '../lib/leaderboard';

const MODES: Mode[] = ['classic', 'big3', 'big5', 'big7', 'freeskill', 'rogue', 'daily'];
const LABELS: Record<Mode, string> = { classic: 'Classique', big3: 'Big 3', big5: 'Big 5', big7: 'Big 7', freeskill: 'Free Skill', rogue: 'Rogue', daily: 'Daily' };

export function Leaderboard() {
  const nav = useNavigate();
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
  useEffect(() => { void competition.hydrate().catch(() => {}); }, [competition.hydrate]);
  useEffect(() => {
    let active = true;
    setRows(null); setError(false);
    const load = view === 'local' ? game.fetchLeaderboard(mode)
      : game.settings.leaderboardOptIn && competitionApi ? competitionApi.top() : Promise.resolve([]);
    void load.then((value) => { if (active) setRows(value); }).catch(() => { if (active) { setRows([]); setError(true); } });
    return () => { active = false; };
  }, [view, mode, game.fetchLeaderboard, game.settings.leaderboardOptIn, competition.confirmedBest]);

  return <>
    <TopBar />
    <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
      <button className="flex items-center text-mut" onClick={() => nav({ to: '/' })}><ChevronLeft size={18} />Retour</button>
      <h1 className="font-display font-bold text-[22px] m-0">Leaderboard</h1>
      <div className="flex gap-[8px]">
        <Button onClick={() => setView('local')}>Cet appareil</Button>
        <Button onClick={() => setView('verified')}>Daily vérifié</Button>
      </div>
      {view === 'local' ? <>
        <p className="text-mut text-[13px]">Records locaux non vérifiés. Aucun record historique n'est transféré au classement compétitif.</p>
        <p className="text-[13px]">Ton record local : {game.bestByMode[mode] ?? 0}</p>
        <div className="flex flex-wrap gap-[8px]">{MODES.map((m) => <Button key={m} onClick={() => setMode(m)}>{m === mode ? '• ' : ''}{LABELS[m]}</Button>)}</div>
        {game.localLeaderboardError && <p className="text-err">Le dernier record n'a pas pu être enregistré dans ce classement.</p>}
      </> : <>
        <p className="text-mut text-[13px]">Daily uniquement. Les autres modes restent locaux. Le serveur contrôle le défi, les indices et la récompense.</p>
        {!isCompetitionConfigured && <p>Service compétitif non configuré. Le jeu local reste disponible.</p>}
        {!game.settings.leaderboardOptIn && <div className="bg-card border border-line rounded-card p-[16px] flex flex-col gap-[10px]">
          <p>Participer crée une identité anonyme Supabase. Ton pseudo et ton score vérifié sont publics. Aucun compte traditionnel n'est demandé.</p>
          <input aria-label="Pseudo" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={16} placeholder="ton pseudo" className="border border-line rounded-[10px] p-[10px]" />
          <Button onClick={() => { game.setPseudo(draft.trim()); game.setSetting('leaderboardOptIn', true); }} disabled={!draft.trim()}>Activer la participation</Button>
        </div>}
        {isCompetitionConfigured && game.settings.leaderboardOptIn && <div className="bg-card border border-line rounded-card p-[16px] flex flex-col gap-[10px]">
          <p aria-live="polite">{COMPETITION_MESSAGES[competition.status]}</p>
          <p>Meilleur score confirmé : {competition.confirmedBest}</p>
          <Button onClick={() => { setExpression(''); void competition.start(); }} disabled={busy || !!competition.pending}>Ouvrir le Daily compétitif</Button>
          {competition.pending && <Button onClick={() => void competition.retry()} disabled={busy}>Réessayer la synchronisation</Button>}
          {challenge && !challenge.rewarded && <>
            <p>Cible {challenge.target} · {challenge.day} UTC</p>
            <p>{challenge.hints > 0 ? `Indice : ${challenge.hint}…` : 'Aucun indice demandé'}</p>
            <input aria-label="Expression compétitive" value={expression} onChange={(e) => setExpression(e.target.value)} maxLength={256} className="border border-line rounded-[10px] p-[10px] font-mono" placeholder="3+5*7" />
            <div className="flex gap-[8px]"><Button onClick={() => void competition.hint()} disabled={busy || !!competition.pending}>Indice serveur</Button>
              <Button variant="primary" onClick={() => void competition.answer(expression)} disabled={busy || !!competition.pending || !expression}>Valider</Button></div>
          </>}
          {challenge?.rewarded && <p>Défi déjà récompensé aujourd'hui. Le Daily local reste rejouable pour s'entraîner.</p>}
        </div>}
      </>}
      <div className="bg-card border border-line rounded-card px-[16px]">
        {error ? <p>Classement indisponible. Réessaie plus tard.</p> : rows === null ? <p>Chargement…</p> : rows.length === 0 ? <p>Aucun score dans ce classement.</p>
          : rows.map((row, index) => <div key={row.id + row.mode} className="flex justify-between py-[11px] border-b border-line"><span>{index + 1}. {row.pseudo}</span><b>{row.score}</b></div>)}
      </div>
    </div>
  </>;
}
