import { createCompetitionStore } from '@shortest/engine';
import { competitionApi } from '../lib/leaderboard';
import { webStorage } from '../storage';
import { useGame } from './game';
export const useCompetition = createCompetitionStore(competitionApi, webStorage,
  () => useGame.getState().settings.leaderboardOptIn, () => useGame.getState().pseudo);
