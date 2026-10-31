/** Instance web du store partagé (storage + leaderboard injectés). */
import { createGameStore, webStorage } from '@shortest/engine';
import { leaderboard } from '../lib/leaderboard';
export const useGame = createGameStore(webStorage, leaderboard);
