import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useGame } from '../store/game';
import { TabBar } from '../components/TabBar';
import { Button, ScreenTitle, Switch } from '../components/ui';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="mx-5 mt-[18px] mb-2 text-sm font-extrabold text-mine">{title}</h2>
      <section className="sheet mx-5 px-4 dashed-rows">{children}</section>
    </>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center justify-between gap-3 min-h-[50px] text-[15.5px]">{children}</div>;

export function Settings() {
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSetting);
  const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo);
  const setPseudo = useGame((st) => st.setPseudo);
  const [confirm, setConfirm] = useState(false);
  const field = 'h-9 border-[1.5px] border-graphite rounded-sheet bg-sheet text-graphite text-[14.5px]';

  return (
    <>
      <header className="px-5 pt-6"><ScreenTitle>Réglages</ScreenTitle></header>
      <main className="flex flex-col pb-5">
        <Group title="Son et affichage">
          <Row><span id="set-sound">Bruitages</span><Switch on={s.sound} onToggle={() => set('sound', !s.sound)} labelledBy="set-sound" /></Row>
          <Row><span id="set-music">Musique</span><Switch on={s.music} onToggle={() => set('music', !s.music)} labelledBy="set-music" /></Row>
          <Row><span id="set-motion">Réduire les animations</span><Switch on={s.reduceMotion} onToggle={() => set('reduceMotion', !s.reduceMotion)} labelledBy="set-motion" /></Row>
          <Row>
            <label htmlFor="set-lang">Langue</label>
            <select id="set-lang" value={s.language} onChange={(e) => set('language', e.target.value as typeof s.language)} className={`${field} px-2`}>
              <option value="fr">Français</option><option value="en">English</option>
            </select>
          </Row>
        </Group>

        <Group title="Classement">
          <Row><span id="set-lb">Publier mes scores</span><Switch on={s.leaderboardOptIn} onToggle={() => set('leaderboardOptIn', !s.leaderboardOptIn)} labelledBy="set-lb" /></Row>
          <Row>
            <label htmlFor="set-pseudo">Pseudo</label>
            <input id="set-pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={16} placeholder="anon" className={`${field} num w-[150px] px-2.5 text-right`} />
          </Row>
        </Group>

        <Group title="Aide">
          <Link to="/about" className="flex items-center justify-between min-h-[50px] text-[15.5px] text-graphite no-underline">
            <span>Comment jouer</span><ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </Group>

        <section className="mx-5 mt-[22px]">
          {!confirm
            ? <Button variant="pen" className="w-full min-h-12" onClick={() => setConfirm(true)}>Effacer ma progression</Button>
            : (
              <div className="sheet p-4 flex flex-col gap-3" role="alertdialog" aria-label="Confirmer l'effacement">
                <p className="m-0 font-bold">Effacer niveaux, records et XP sur cet appareil ? C'est définitif.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setConfirm(false)}>Annuler</Button>
                  <Button variant="pen" onClick={() => { reset(); setConfirm(false); }}>Effacer</Button>
                </div>
              </div>
            )}
          <p className="text-mine text-[13px] leading-snug mt-2 mb-0">Ta progression est enregistrée sur cet appareil uniquement.</p>
        </section>
      </main>
      <TabBar />
    </>
  );
}
