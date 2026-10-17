import axios from 'axios';
import { Alert, DeviceEventEmitter } from 'react-native';
import storage from '../storage/storage';
import i18n from '../i18n';
import { API_URL } from '../lib/api';

/** Fired after a 401 clears the stored session so AuthContext can update. */
export const AUTH_SESSION_INVALID_EVENT = 'auth:session-invalid';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let sessionKickHandled = false;

function shouldSkipSessionKick(url?: string) {
  const path = url || '';
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/forgot') ||
    path.includes('/auth/reset')
  );
}

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Backend SetLocale middleware reads `lang` / Accept-Language (en|ar)
    const lang = (i18n.language || 'en').startsWith('ar') ? 'ar' : 'en';
    config.headers.lang = lang;
    config.headers['Accept-Language'] = lang;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !shouldSkipSessionKick(error.config?.url)) {
      const hadToken = Boolean(await storage.getToken());
      await storage.clearAll();
      DeviceEventEmitter.emit(AUTH_SESSION_INVALID_EVENT, { hadToken });
      if (hadToken && !sessionKickHandled) {
        sessionKickHandled = true;
        Alert.alert(
          i18n.t('session_replaced_title', {
            defaultValue: 'Signed in elsewhere',
          }),
          i18n.t('session_replaced', {
            defaultValue: 'Your account was signed in on another device. Please log in again.',
          }),
        );
        setTimeout(() => {
          sessionKickHandled = false;
        }, 3000);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
