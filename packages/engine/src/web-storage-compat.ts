import type { Storage } from './persistence';

interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): BrowserStorage | undefined {
  return (globalThis as typeof globalThis & { localStorage?: BrowserStorage }).localStorage;
}

/**
 * @deprecated Import the web app's adapter for new code.
 * Kept for compatibility with existing engine consumers.
 */
export const webStorage: Storage = {
  async get<T>(key: string) {
    try {
      const value = browserStorage()?.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T) {
    browserStorage()!.setItem(key, JSON.stringify(value));
  },
  async remove(key: string) {
    browserStorage()!.removeItem(key);
  },
};
