import './global.css';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import { ApiError } from './src/lib/api';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthProvider, useAuth } from './src/features/auth/AuthContext';
import LoginScreen from './src/features/auth/LoginScreen';
import MainShell from './src/features/shell/MainShell';

function AuthGate() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-[#F6F9FE]">
        <ActivityIndicator color="#2F80F0" />
      </View>
    );
  }
  return status === 'signedIn' ? <MainShell /> : <LoginScreen />;
}

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 1,
          },
        },
      }),
  );
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  if (!fontsLoaded) return <View className="flex-1 bg-[#F6F9FE]" />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <AuthGate />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
