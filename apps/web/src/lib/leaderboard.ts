import { localLeaderboard, supabaseCompetition } from '@shortest/engine';
import { webStorage } from '../storage';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const leaderboard = localLeaderboard(webStorage);
export const competitionApi = url && key ? supabaseCompetition(url, key, webStorage) : undefined;
export const isCompetitionConfigured = Boolean(competitionApi);
