/** Instance web du store partagé (storage + leaderboard injectés). */
import { createGameStore } from '@shortest/engine';
import { leaderboard } from '../lib/leaderboard';
import { webStorage } from '../storage';
export const useGame = createGameStore(webStorage, leaderboard);
