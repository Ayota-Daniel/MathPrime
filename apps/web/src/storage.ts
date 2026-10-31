import type { Storage } from '@shortest/engine';

/** Adaptateur web local; l’engine partagé ne dépend pas des API navigateur. */
export const webStorage: Storage = {
  async get<T>(key: string) {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string) {
    localStorage.removeItem(key);
  },
};
