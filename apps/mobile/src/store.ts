/** Instance mobile du store partagé (storage + leaderboard injectés). */
import { createGameStore } from '@shortest/engine';
import { nativeStorage } from './storage';
import { leaderboard } from './leaderboard';
export const useGame = createGameStore(nativeStorage, leaderboard);
