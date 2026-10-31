/** Leaderboard mobile : Supabase si EXPO_PUBLIC_SUPABASE_* définis, sinon local. */
import { localLeaderboard, supabaseLeaderboard, type LeaderboardClient } from '@shortest/engine';
import { nativeStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const leaderboard: LeaderboardClient = url && key ? supabaseLeaderboard(url, key) : localLeaderboard(nativeStorage);
export const isGlobalLeaderboard = Boolean(url && key);
