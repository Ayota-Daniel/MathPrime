/** persistence.ts — sauvegarde locale. Interface + adaptateurs. */
import type { Mode } from './game-engine';

export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Les adaptateurs de stockage vivent dans les applications web et mobile. */

export interface SaveState {
  version: number;
  xp: number;
  classicProgress: number;
  classicStars: Record<number, number>;
  bestByMode: Partial<Record<Mode, number>>;
  streakByMode: Partial<Record<Mode, number>>;
  bestStreakByMode: Partial<Record<Mode, number>>;
  dailyDone: string | null;
  deviceId: string;                 // UUID anonyme local (jamais de PII)
  pseudo: string;                   // pseudo choisi pour le leaderboard
  settings: {
    language: 'en' | 'fr'; reduceMotion: boolean; sound: boolean; music: boolean; leaderboardOptIn: boolean;
    /** Identifiants des thèmes de couleur (voir `appThemes` et `rogueThemes` dans @shortest/tokens). */
    appTheme: string; rogueTheme: string;
  };
  stats: { played: number; perfect: number };
}

export const EMPTY_SAVE: SaveState = {
  version: 3, xp: 0, classicProgress: 0, classicStars: {}, bestByMode: {},
  streakByMode: {}, bestStreakByMode: {}, dailyDone: null, deviceId: '', pseudo: '',
  settings: { language: 'fr', reduceMotion: false, sound: true, music: true, leaderboardOptIn: false, appTheme: 'encre', rogueTheme: 'ardoise' },
  stats: { played: 0, perfect: 0 },
};

const SAVE_KEY = 'shortest:save:v3';
export const loadSave = async (s: Storage): Promise<SaveState> => {
  const saved = await s.get<SaveState>(SAVE_KEY);
  // Les réglages ajoutés après coup (thèmes…) prennent leur valeur par défaut sur une ancienne sauvegarde.
  return { ...EMPTY_SAVE, ...saved, settings: { ...EMPTY_SAVE.settings, ...saved?.settings } };
};
export const persistSave = (s: Storage, st: SaveState) => s.set(SAVE_KEY, st);
export const resetSave = (s: Storage) => s.remove(SAVE_KEY);
