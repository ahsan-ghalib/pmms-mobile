import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storage from '../../storage/storage';
import { ApiError, apiRequest } from '../../lib/api';

const USER_KEY = 'pmms_user';

export type AuthUser = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role?: string | null;
  username?: string | null;
  company_name?: string | null;
  last_login_at?: string | null;
  email_verified_at?: string | null;
  is_active?: boolean;
};

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const clear = useCallback(async () => {
    await storage.removeToken();
    await AsyncStorage.removeItem(USER_KEY).catch(() => {});
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await storage.getToken();
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      const cached = await AsyncStorage.getItem(USER_KEY).catch(() => null);
      if (cached) setUser(JSON.parse(cached));
      setToken(saved);
      setStatus('signedIn');
      try {
        const fresh = await apiRequest<AuthUser>('/user', { token: saved });
        setUser(fresh);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh)).catch(() => {});
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await clear();
      }
    })();
  }, [clear]);

  const signIn = useCallback(async (nextToken: string, nextUser: AuthUser, remember: boolean) => {
    if (remember) {
      await storage.setToken(nextToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)).catch(() => {});
    }
    setToken(nextToken);
    setUser(nextUser);
    setStatus('signedIn');
    apiRequest<AuthUser>('/user', { token: nextToken })
      .then((fresh) => {
        setUser(fresh);
        if (remember) AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh)).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    if (token) await apiRequest('/logout', { method: 'POST', token }).catch(() => {});
    await clear();
  }, [clear, token]);

  const value = useMemo(
    () => ({ status, token, user, signIn, signOut }),
    [status, token, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
