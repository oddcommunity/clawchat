/**
 * ClawChat Root Layout
 *
 * Root layout with theme provider, error boundary, and auth initialization.
 */

// Polyfills must be imported first
import '../polyfills';

import { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../lib/store/auth';
import { useTheme, useThemeStore } from '../lib/theme';
import { ErrorBoundary, LoadingScreen, NetworkStatus } from '../components';

function RootLayoutContent() {
  const [isReady, setIsReady] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const theme = useTheme();
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <LoadingScreen message="Starting ClawChat..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NetworkStatus />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(chat)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}
