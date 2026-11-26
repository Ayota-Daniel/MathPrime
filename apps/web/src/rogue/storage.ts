import type { RogueStorage } from "@shortest/engine/rogue-v1/storage";

/** A Web Lock protects compare-and-write across tabs; localStorage replaces a value atomically. */
export const rogueWebStorage: RogueStorage = {
  exclusive: async (work) => {
    if (!navigator.locks)
      return Promise.reject(new Error("Web Locks indisponible"));
    return await navigator.locks.request("shortest:rogue:write", work);
  },
  storage: {
    async get<T>(key: string) {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return { corrupt: true } as T;
      }
    },
    async set<T>(key: string, value: T) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string) {
      localStorage.removeItem(key);
    },
  },
};
