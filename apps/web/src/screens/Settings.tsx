import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useGame } from '../store/game';

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="w-[46px] h-[28px] rounded-full relative transition-colors"
      style={{ background: on ? '#12346C' : '#BBA4AD' }}
    >
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all"
        style={{ left: on ? 21 : 3 }}
      />
    </button>
  );
}

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-[14px] border-b border-line last:border-0">
    <span>{label}</span>
    {children}
  </div>
);

export function Settings() {
  const nav = useNavigate();
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSetting);
  const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo);
  const setPseudo = useGame((st) => st.setPseudo);
  return (
    <>
      <TopBar />
      <main className="math-inner utility-page">
        <button
          className="flex items-center gap-[4px] text-mut font-semibold text-[14px]"
          onClick={() => nav({ to: '/' })}
        >
          <ChevronLeft size={18} />
          Retour
        </button>
        <h1 className="font-display font-bold text-[22px] m-0">Paramètres</h1>
        <div className="bg-card border border-line rounded-card px-[16px]">
          <h2 className="utility-heading mt-3">Ambiance</h2>
          <Row label="Sons (bruitages)">
            <Toggle
              label="Sons (bruitages)"
              on={s.sound}
              onClick={() => set('sound', !s.sound)}
            />
          </Row>
          <Row label="Musique de fond">
            <Toggle
              label="Musique de fond"
              on={s.music}
              onClick={() => set('music', !s.music)}
            />
          </Row>
          <h2 className="utility-heading mt-3">Accessibilité</h2>
          <Row label="Réduire les animations">
            <Toggle
              label="Réduire les animations"
              on={s.reduceMotion}
              onClick={() => set('reduceMotion', !s.reduceMotion)}
            />
          </Row>
          <Row label="Langue">
            <button
              className="text-pri-d font-semibold text-[13px]"
              onClick={() => set('language', s.language === 'fr' ? 'en' : 'fr')}
            >
              {s.language === 'fr' ? 'Français' : 'English'}
            </button>
          </Row>
          <h2 className="utility-heading mt-3">Profil et partage</h2>
          <Row label="Participer au Daily compétitif">
            <Toggle
              label="Participer au Daily compétitif"
              on={s.leaderboardOptIn}
              onClick={() => set('leaderboardOptIn', !s.leaderboardOptIn)}
            />
          </Row>
          <Row label="Pseudo (leaderboard)">
            <input
              aria-label="Pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={16}
              placeholder="anon"
              className="border border-line rounded-[8px] px-[10px] py-[6px] font-mono text-[13px] w-[140px] text-right"
            />
          </Row>
          <Row label="Réinitialiser la progression">
            <button
              className="text-err font-semibold text-[13px]"
              onClick={() => {
                if (window.confirm('Effacer ta progression locale ?')) reset();
              }}
            >
              Effacer
            </button>
          </Row>
        </div>
        <p className="text-mut text-[13.5px]">
          Ta progression et tes réglages sont enregistrés sur cet appareil.
        </p>
      </main>
    </>
  );
}
