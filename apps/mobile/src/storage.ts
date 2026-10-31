/** Adaptateur Storage natif (AsyncStorage) injecté dans le store partagé. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from '@shortest/engine';

export const nativeStorage: Storage = {
  async get<T>(key: string) { try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  async set<T>(key: string, value: T) { await AsyncStorage.setItem(key, JSON.stringify(value)); },
  async remove(key: string) { await AsyncStorage.removeItem(key); },
};
