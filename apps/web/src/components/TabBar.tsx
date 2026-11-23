import { Link } from '@tanstack/react-router';
import { LayoutGrid, BarChart3, Trophy, SlidersHorizontal } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Jouer', Icon: LayoutGrid },
  { to: '/stats', label: 'Stats', Icon: BarChart3 },
  { to: '/leaderboard', label: 'Classement', Icon: Trophy },
  { to: '/settings', label: 'Réglages', Icon: SlidersHorizontal },
] as const;

/** Barre d'onglets du bas : les 4 destinations principales. L'onglet actif est surligné. */
export function TabBar() {
  return (
    <nav aria-label="Navigation principale" className="sticky bottom-0 mt-auto grid grid-cols-4 border-t-[1.5px] border-graphite bg-sheet pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ to, label, Icon }) => (
        <Link key={to} to={to} activeOptions={{ exact: true }}
          className="group flex flex-col items-center gap-1 pt-2.5 pb-3.5 text-xs font-bold text-mine no-underline data-[status=active]:text-ink">
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
              <span className={isActive ? 'hl' : ''}>{label}</span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
