import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import type { Mode } from '@shortest/engine';
import { tableForMode, tableQuery } from './data/puzzles';
import { useGame } from './store/game';
import { useAudioSettings } from './lib/useAudio';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Settings } from './screens/Settings';
import { About } from './screens/About';
import { Stats } from './screens/Stats';
import { Leaderboard } from './screens/Leaderboard';

export const queryClient = new QueryClient();

function Layout() {
  const reduce = useGame((s) => s.settings.reduceMotion);
  useAudioSettings(); // applique sound/music selon les réglages
  return (
    <div className={reduce ? 'reduce-motion' : ''}>
      <div className="mx-auto max-w-app min-h-screen flex flex-col bg-bg"><Outlet /></div>
    </div>
  );
}

const rootRoute = createRootRoute({ component: Layout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: Settings });
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: About });
const statsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stats', component: Stats });
const leaderboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/leaderboard', component: Leaderboard });
const playRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/play/$mode',
  loader: ({ params }) => queryClient.ensureQueryData(tableQuery(tableForMode(params.mode as Mode))),
  component: Play,
});

const routeTree = rootRoute.addChildren([indexRoute, playRoute, settingsRoute, aboutRoute, statsRoute, leaderboardRoute]);
export const router = createRouter({ routeTree });
declare module '@tanstack/react-router' { interface Register { router: typeof router; } }
