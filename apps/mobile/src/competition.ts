import { createCompetitionStore } from '@shortest/engine';
import { competitionApi } from './leaderboard';
import { nativeStorage } from './storage';
import { useGame } from './store';
export const useCompetition = createCompetitionStore(competitionApi, nativeStorage,
  () => useGame.getState().settings.leaderboardOptIn, () => useGame.getState().pseudo);
