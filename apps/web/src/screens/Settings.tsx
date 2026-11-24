import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store/game';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-[46px] h-[28px] rounded-full relative transition-colors" style={{ background: on ? '#179C6B' : '#CBD5E1' }}>
      <span className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all" style={{ left: on ? 21 : 3 }} />
    </button>
  );
}

export function Settings() {
  const nav = useNavigate();
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSetting);
  const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo);
  const setPseudo = useGame((st) => st.setPseudo);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) =>
    <div className="flex items-center justify-between py-[14px] border-b border-line last:border-0"><span>{label}</span>{children}</div>;
  return (
    <>
      <TopBar />
      <div className="flex-1 p-[18px] flex flex-col gap-[14px]">
        <button className="flex items-center gap-[4px] text-mut font-semibold text-[14px]" onClick={() => nav({ to: '/' })}><ChevronLeft size={18} />Retour</button>
        <h1 className="font-display font-bold text-[22px] m-0">Settings</h1>
        <div className="bg-card border border-line rounded-card px-[16px]">
          <Row label="Sons (bruitages)"><Toggle on={s.sound} onClick={() => set('sound', !s.sound)} /></Row>
          <Row label="Musique de fond"><Toggle on={s.music} onClick={() => set('music', !s.music)} /></Row>
          <Row label="Réduire les animations"><Toggle on={s.reduceMotion} onClick={() => set('reduceMotion', !s.reduceMotion)} /></Row>
          <Row label="Langue"><button className="text-pri font-semibold text-[13px]" onClick={() => set('language', s.language === 'fr' ? 'en' : 'fr')}>{s.language === 'fr' ? 'Français' : 'English'}</button></Row>
          <Row label="Partager au leaderboard"><Toggle on={s.leaderboardOptIn} onClick={() => set('leaderboardOptIn', !s.leaderboardOptIn)} /></Row>
          <Row label="Pseudo (leaderboard)"><input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={16} placeholder="anon" className="border border-line rounded-[8px] px-[10px] py-[6px] font-mono text-[13px] w-[140px] text-right" /></Row>
          <Row label="Réinitialiser la progression"><button className="text-err font-semibold text-[13px]" onClick={reset}>Effacer</button></Row>
        </div>
        <p className="text-mut text-[13.5px]">Progression et réglages sauvegardés en local (localStorage web, AsyncStorage mobile).</p>
      </div>
    </>
  );
}
