import { localLeaderboard, supabaseCompetition } from '@shortest/engine';
import { nativeStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const leaderboard = localLeaderboard(nativeStorage);
export const competitionApi = url && key ? supabaseCompetition(url, key, nativeStorage) : undefined;
export const isCompetitionConfigured = Boolean(competitionApi);
