import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { appThemes, appThemeById, rogueThemes, rogueThemeById } from '@shortest/tokens';
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
/** Choix d'une couleur : vrais boutons radio (flèches au clavier), pastilles dessinées par-dessus. */
function Swatches({ name, legend, current, options, onChange }: {
  name: string; legend: string; current: string;
  options: readonly { id: string; name: string; fill: string; dot?: string }[];
  onChange: (id: string) => void;
}) {
  const round = !options[0]?.dot;
  return (
    <fieldset className="m-0 p-0 border-0 py-3">
      <legend className="float-left w-full flex items-baseline justify-between mb-2.5 text-[15.5px] font-bold">
        {legend}<span className="text-[13.5px] font-normal text-mine">{options.find((o) => o.id === current)?.name}</span>
      </legend>
      <div className="clear-both flex justify-between">
        {options.map((o) => (
          <label key={o.id} className="relative cursor-pointer">
            <input type="radio" name={name} value={o.id} checked={o.id === current} onChange={() => onChange(o.id)} aria-label={o.name} className="peer sr-only" />
            <span className={`flex items-center justify-center w-12 h-12 border-[2.5px] border-transparent peer-checked:border-graphite peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-graphite ${round ? 'rounded-full' : 'rounded-lg'}`}>
              <span className={`flex items-end justify-end p-1 w-9 h-9 ${round ? 'rounded-full' : 'rounded-[5px]'}`} style={{ background: o.fill }}>
                {o.dot && <span className="w-3.5 h-3.5 rounded-[3px]" style={{ background: o.dot }} />}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
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
        <Group title="Apparence">
          <Swatches name="app-theme" legend="Couleur d'accent" current={appThemeById(s.appTheme).id}
            options={appThemes.map((t) => ({ id: t.id, name: t.name, fill: t.colors.ink }))} onChange={(id) => set('appTheme', id)} />
          <Swatches name="rogue-theme" legend="Page Rogue" current={rogueThemeById(s.rogueTheme).id}
            options={rogueThemes.map((t) => ({ id: t.id, name: t.name, fill: t.colors.night, dot: t.colors.coral }))} onChange={(id) => set('rogueTheme', id)} />
        </Group>

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

        <Group title="Profil et Daily compétitif">
          <Row><span id="set-lb">Participer au Daily compétitif</span><Switch on={s.leaderboardOptIn} onToggle={() => set('leaderboardOptIn', !s.leaderboardOptIn)} labelledBy="set-lb" /></Row>
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
          <p className="text-mine text-[13px] leading-snug mt-2 mb-0">Ta progression et tes réglages sont enregistrés sur cet appareil.</p>
        </section>
      </main>
      <TabBar />
    </>
  );
}
