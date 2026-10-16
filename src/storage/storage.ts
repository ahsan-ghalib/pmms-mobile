import AsyncStorage from '@react-native-async-storage/async-storage';

/** In-memory mirror so axios can auth immediately after login without AsyncStorage lag. */
let memoryAccessToken: string | null = null;

const TOKEN_KEY = 'accessToken';

const storage = {
  async getToken() {
    try {
      if (memoryAccessToken) {
        return memoryAccessToken;
      }
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        memoryAccessToken = token;
      }
      return token;
    } catch (error) {
      console.warn('Unable to read access token from storage', error);
      return memoryAccessToken;
    }
  },

  async setToken(token: string) {
    memoryAccessToken = token;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.warn('Unable to save access token to storage', error);
      // Keep memory token so auth still works for this session.
    }
  },

  async removeToken() {
    memoryAccessToken = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Unable to remove access token from storage', error);
    }
  },

  /** Wait until a token is readable (memory or AsyncStorage). */
  async waitForToken(options?: { timeoutMs?: number; intervalMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 4000;
    const intervalMs = options?.intervalMs ?? 50;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const token = await this.getToken();
      if (token) {
        return token;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return this.getToken();
  },

  async clearAll() {
    await this.removeToken();
  },
};

export default storage;
