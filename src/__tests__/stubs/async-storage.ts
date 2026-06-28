// In-memory stub for @react-native-async-storage/async-storage.
// Mirrors the async API surface used by zustand's `persist` middleware.

const store = new Map<string, string>();

export const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async getAllKeys(): Promise<string[]> {
    return Array.from(store.keys());
  },
  async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    return keys.map((k) => [k, store.has(k) ? (store.get(k) as string) : null]);
  },
  async multiSet(entries: Array<[string, string]>): Promise<void> {
    for (const [k, v] of entries) store.set(k, v);
  },
  async multiRemove(keys: string[]): Promise<void> {
    for (const k of keys) store.delete(k);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  // Test helper
  __reset() {
    store.clear();
  },
};

export default AsyncStorage;
