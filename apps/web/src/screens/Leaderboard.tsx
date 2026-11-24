import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Globe, Smartphone } from 'lucide-react';
import type { Mode, LbEntry } from '@shortest/engine';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/ui';
import { useGame } from '../store/game';
import { isGlobalLeaderboard } from '../lib/leaderboard';

const MODES: Mode[] = ['classic', 'freeskill', 'rogue', 'daily'];
const LABELS: Record<string, string> = { classic: 'Classique', freeskill: 'Free Skill', rogue: 'Rogue', daily: 'Daily' };

export function Leaderboard() {
  const nav = useNavigate();
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

  return (
    <>
      <TopBar />
      <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
        <button className="flex items-center gap-[4px] text-mut font-semibold text-[14px]" onClick={() => nav({ to: '/' })}><ChevronLeft size={18} />Retour</button>
        <div className="flex items-center gap-[8px]">
          <h1 className="font-display font-bold text-[22px] m-0">Leaderboard</h1>
          <span className="flex items-center gap-[4px] text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-bg border border-line text-mut">
            {isGlobalLeaderboard ? <><Globe size={12} /> mondial</> : <><Smartphone size={12} /> local</>}
          </span>
        </div>

        {/* Consentement : on ne publie RIEN sans opt-in explicite */}
        {!optIn && (
          <div className="bg-card border border-line rounded-card p-[16px] flex flex-col gap-[10px]">
            <p className="text-[14px] m-0">Partager tes performances avec le reste du monde ? Seul un <b>pseudo</b> est publié (aucun compte, aucune donnée perso).</p>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={16} placeholder="ton pseudo"
              className="border border-line rounded-[10px] px-[12px] py-[10px] font-mono" />
            <Button variant="primary" onClick={() => { setPseudo(draft.trim() || 'anon'); setSetting('leaderboardOptIn', true); }} disabled={!draft.trim()}>
              Activer le partage
            </Button>
          </div>
        )}

        <div className="flex gap-[8px] flex-wrap">
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-[13px] font-semibold px-[12px] py-[7px] rounded-full border ${mode === m ? 'bg-pri text-white border-pri' : 'bg-card border-line text-mut'}`}>
              {LABELS[m]}
            </button>
          ))}
        </div>

        <div className="bg-card border border-line rounded-card px-[16px]">
          {rows === null ? <p className="text-mut text-[13px] py-[14px]">Chargement…</p>
            : rows.length === 0 ? <p className="text-mut text-[13px] py-[14px]">Aucun score pour l'instant — sois le premier.</p>
            : rows.map((r, i) => (
              <div key={r.id + r.mode} className={`flex items-center justify-between py-[11px] border-b border-line last:border-0 ${r.id === deviceId ? 'font-bold' : ''}`}>
                <span className="flex items-center gap-[10px]">
                  <span className="font-mono text-mut w-[22px]">{i + 1}</span>
                  <span>{r.pseudo}{r.id === deviceId ? ' (toi)' : ''}</span>
                </span>
                <span className="font-mono font-bold">{r.score}</span>
              </div>
            ))}
        </div>

        {optIn && <p className="text-mut text-[12px]">Partage activé en tant que « {pseudo} ». Désactivable dans Settings.</p>}
      </div>
    </>
  );
}
