import { Platform } from 'react-native';

let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const memoryStore = new Map();

const getBrowserStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }

  return null;
};

const safeStorage = {
  getItem: async (key) => {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      return browserStorage.getItem(key);
    }

    if (AsyncStorage) {
      return AsyncStorage.getItem(key);
    }

    return memoryStore.get(key) ?? null;
  },
  setItem: async (key, value) => {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.setItem(key, value);
      return;
    }

    if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    memoryStore.set(key, value);
  },
  removeItem: async (key) => {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.removeItem(key);
      return;
    }

    if (AsyncStorage) {
      await AsyncStorage.removeItem(key);
      return;
    }

    memoryStore.delete(key);
  },
};

export default safeStorage;
export const isWebEnvironment = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
