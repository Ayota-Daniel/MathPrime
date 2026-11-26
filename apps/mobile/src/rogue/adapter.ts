import type { RogueStorage } from "@shortest/engine/rogue-v1/storage";

export interface NativeKeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
/** Shared by all screen instances in the native JS process. */
let tail: Promise<void> = Promise.resolve();
export function createNativeRogueStorage(raw: NativeKeyValue): RogueStorage {
  return {
    exclusive<T>(work: () => Promise<T>): Promise<T> {
      const operation = tail.then(work);
      tail = operation.then(
        () => {},
        () => {},
      );
      return operation;
    },
    storage: {
      async get<T>(key: string) {
        const value = await raw.getItem(key);
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return { corrupt: true } as T;
        }
      },
      async set<T>(key: string, value: T) {
        await raw.setItem(key, JSON.stringify(value));
      },
      async remove(key: string) {
        await raw.removeItem(key);
      },
    },
  };
}
