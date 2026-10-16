import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter, Platform } from 'react-native';
import storage from '../storage/storage';
import { AuthService } from '../api/services/auth.service';
import axiosInstance, { AUTH_SESSION_INVALID_EVENT } from '../api/axios';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { leaveHomeFeed } from '../utils/feedVideoPlayback';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  // add any other necessary fields
}

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { deviceToken, refreshDeviceToken } = usePushNotifications();
  const appState = useRef(AppState.currentState);
  const isAuthenticatedRef = useRef(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const syncDeviceToken = useCallback(
    async (tokenOverride?: string, force: boolean = false) => {
      if (!isAuthenticatedRef.current && !force) {
        return;
      }

      try {
        const token = tokenOverride || (await refreshDeviceToken()) || deviceToken;
        if (!token) {
          console.log('[AuthContext] No FCM token available to sync');
          return;
        }

        await axiosInstance.post('/user/device-token', {
          device_token: token,
          device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        console.log('[AuthContext] Device token synced');
      } catch (err) {
        console.error('[AuthContext] Failed to save device token:', err);
      }
    },
    [deviceToken, refreshDeviceToken],
  );

  // Sync whenever auth/token state changes
  useEffect(() => {
    if (isAuthenticated && deviceToken) {
      syncDeviceToken(deviceToken);
    }
  }, [isAuthenticated, deviceToken, syncDeviceToken]);

  // Sync again every time app comes to foreground
  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isAuthenticatedRef.current
      ) {
        syncDeviceToken();
      }
      appState.current = nextState;
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [syncDeviceToken]);

  useEffect(() => {
    loadUser();
  }, []);

  // Axios 401 clears storage; mirror that into React auth state so screens
  // (e.g. Cart) can stop skeletons and redirect to login.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_SESSION_INVALID_EVENT, () => {
      leaveHomeFeed();
      setIsAuthenticated(false);
      setUser(null);
      isAuthenticatedRef.current = false;
    });
    return () => sub.remove();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getToken();
      if (token) {
        // Assume AuthService.profile() returns user data
        // For now, if there's a token, we set authenticated to true.
        // Usually, you fetch profile from backend to verify token:
        try {
          const response = await AuthService.profile();
          if (response) {
            const userData = response.data?.user || response.data || response.user || response;
            setUser(userData);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Failed to load profile:', error);
          // Token might be invalid/expired, remove it
          await storage.removeToken();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to restore token', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData?: User) => {
    await storage.setToken(token);
    setIsAuthenticated(true);
    isAuthenticatedRef.current = true; // Immediately update ref for immediate sync
    if (userData) {
      setUser(userData);
    } else {
      await loadUser(); // Re-fetch user profile if not provided
    }
    // Force sync immediately after login completes
    syncDeviceToken(undefined, true).catch((err) =>
      console.log('Login sync device token failed', err),
    );
  };

  const logout = async () => {
    leaveHomeFeed();
    try {
      await AuthService.logout();
    } catch (error) {
      console.warn('Backend logout failed:', error);
    }
    await storage.removeToken();
    setIsAuthenticated(false);
    setUser(null);
  };
  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
