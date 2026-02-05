/**
 * Loading Screen Component
 *
 * Displayed while the app is initializing or loading data.
 * Supports light and dark modes.
 */

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.logoContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={styles.logo}>🐾</Text>
      </View>
      <ActivityIndicator
        size="large"
        color={theme.isDark ? '#0A84FF' : '#007AFF'}
        style={styles.spinner}
      />
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
  },
});
