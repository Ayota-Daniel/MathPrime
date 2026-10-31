/** Choisit l'implémentation du leaderboard :
 *  - Supabase si VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY sont définis (.env)
 *  - sinon fallback LOCAL (ne voit que cet appareil — utile en dev). */
import { localLeaderboard, supabaseLeaderboard, type LeaderboardClient } from '@shortest/engine';
import { webStorage } from '../storage';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const leaderboard: LeaderboardClient = url && key ? supabaseLeaderboard(url, key) : localLeaderboard(webStorage);
export const isGlobalLeaderboard = Boolean(url && key);
