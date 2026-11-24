import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { audio } from '../lib/audio';
import { Target, Calendar, Zap, Swords, Shield, Settings as Cog, Info, BarChart3, Trophy } from 'lucide-react';
import { bigColor } from '@shortest/tokens';
import { TopBar } from '../components/TopBar';
import { ModeCard } from '../components/ModeCard';

const MODES = [
  { id: 'classic', name: 'Classique', tg: '100 niveaux, gate 3★, sans chrono', icon: Target, color: '#5B5BD6' },
  { id: 'daily', name: 'Daily', tg: 'Un défi par jour', icon: Calendar, color: '#179C6B' },
  { id: 'freeskill', name: 'Free Skill', tg: 'Chrono, difficulté adaptative', icon: Zap, color: '#E8A317' },
  { id: 'rogue', name: 'Rogue-like', tg: '3 vies, draft de contraintes', icon: Swords, color: '#E5484D' },
] as const;

export function Home() {
  const nav = useNavigate();
  useEffect(() => { audio.switchMusic('main'); }, []);
  const go = (mode: string) => nav({ to: '/play/$mode', params: { mode } });
  return (
    <>
      <TopBar />
      <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight m-0">Écris-le le plus court</h1>
          <p className="text-mut text-[13.5px] mt-[2px]">Atteins la cible avec 3, 5, 7 et +, −, ×. Le plus court gagne.</p>
        </div>
        <div className="grid grid-cols-2 gap-[12px]">
          {MODES.map((m) => <ModeCard key={m.id} icon={<m.icon size={20} />} color={m.color} name={m.name} tagline={m.tg} onClick={() => go(m.id)} />)}
        </div>
        <p className="font-semibold text-[13.5px]">Big Challenge</p>
        <div className="grid grid-cols-2 gap-[12px]">
          {[3, 5, 7].map((x) => (
            <ModeCard key={x} icon={<Shield size={20} />} color={bigColor[x]} name={`Big ${x}`} tagline={`Doit contenir un ${x}`} onClick={() => go(`big${x}`)} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-[12px]">
          <ModeCard wide icon={<BarChart3 size={18} />} color="#179C6B" name="Statistiques" onClick={() => nav({ to: '/stats' })} />
          <ModeCard wide icon={<Trophy size={18} />} color="#E8A317" name="Leaderboard" onClick={() => nav({ to: '/leaderboard' })} />
          <ModeCard wide icon={<Cog size={18} />} color="#5A6B7B" name="Settings" onClick={() => nav({ to: '/settings' })} />
          <ModeCard wide icon={<Info size={18} />} color="#16202C" name="About" onClick={() => nav({ to: '/about' })} />
        </div>
      </div>
    </>
  );
}
