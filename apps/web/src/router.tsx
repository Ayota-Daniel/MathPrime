import { createRootRoute, createRoute, createRouter, Outlet, lazyRouteComponent, redirect, useRouterState } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import type { Mode } from '@shortest/engine';
import { tableForMode, tableQuery } from './data/puzzles';
import { useGame } from './store/game';
import { useAudioSettings } from './lib/useAudio';
import { BigChallenge } from './screens/BigChallenge';
import { Levels } from './screens/Levels';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Settings } from './screens/Settings';
import { About } from './screens/About';
import { Stats } from './screens/Stats';
import { Leaderboard } from './screens/Leaderboard';

export const queryClient = new QueryClient();

function Layout() {
  const roguePage = useRouterState({ select: state => state.location.pathname === '/rogue' });
  const reduce = useGame((s) => s.settings.reduceMotion);
  useAudioSettings(); // applique sound/music selon les réglages
  return (
    <div className={reduce ? 'reduce-motion' : ''}>
      {roguePage
        ? <div className="rogue-shell"><Outlet /></div>
        : <div className="cahier-app"><div className="cahier-col"><Outlet /></div></div>}
    </div>
  );
}

const rootRoute = createRootRoute({ component: Layout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });
const bigRoute = createRoute({ getParentRoute: () => rootRoute, path: '/big-challenge', component: BigChallenge });
const levelsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/niveaux', component: Levels });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: Settings });
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: About });
const statsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stats', component: Stats });
const leaderboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/leaderboard', component: Leaderboard });
const rogueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/rogue',
  component: lazyRouteComponent(() => import('./screens/Rogue'), 'Rogue'),
  pendingComponent: () => <p className="p-8 text-center" role="status">Préparation du mode Rogue…</p>,
  errorComponent: () => <div className="p-8" role="alert">Le mode Rogue n’a pas pu être chargé. Rechargez la page pour réessayer.</div>,
});
const playRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/play/$mode',
  validateSearch: (search: Record<string, unknown>): { niveau?: number } => {
    const level = Number(search.niveau);
    return Number.isInteger(level) && level >= 1 && level <= 100 ? { niveau: level } : {};
  },
  beforeLoad: ({ params }) => { if (params.mode === 'rogue') throw redirect({ to: '/rogue', replace: true }); },
  loader: ({ params }) => queryClient.ensureQueryData(tableQuery(tableForMode(params.mode as Mode))),
  component: Play,
});

const routeTree = rootRoute.addChildren([indexRoute, bigRoute, levelsRoute, rogueRoute, playRoute, settingsRoute, aboutRoute, statsRoute, leaderboardRoute]);
export const router = createRouter({ routeTree });
declare module '@tanstack/react-router' { interface Register { router: typeof router; } }
