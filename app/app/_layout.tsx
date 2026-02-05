/**
 * ClawChat Root Layout
 */

// Polyfills must be imported first
import '../polyfills';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../lib/store/auth';
import { ErrorBoundary, LoadingScreen, NetworkStatus } from '../components';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady || isLoading) {
    return <LoadingScreen message="Starting ClawChat..." />;
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <NetworkStatus />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(chat)" />
        </Stack>
      </View>
    </ErrorBoundary>
  );
}
