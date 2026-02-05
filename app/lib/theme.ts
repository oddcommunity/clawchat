/**
 * ClawChat Theme System
 *
 * Provides light and dark mode support with consistent colors
 */

import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// Color Palette
// =============================================================================

export const colors = {
  // Primary brand colors
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#4DA3FF',

  // Semantic colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightTheme = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#E5E5E5',

  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E0E0E0',
  borderLight: '#F0F0F0',

  // Chat bubbles
  bubbleUser: colors.primary,
  bubbleUserText: '#FFFFFF',
  bubbleOther: '#F0F0F0',
  bubbleOtherText: '#1A1A1A',

  // Input
  inputBackground: '#F5F5F5',
  inputText: '#1A1A1A',
  inputPlaceholder: '#999999',

  // Cards
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',

  // Status bar
  statusBar: 'dark' as const,

  // Keyboard
  keyboardAppearance: 'light' as const,
} as const;

export const darkTheme = {
  // Backgrounds
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',

  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textInverse: '#000000',

  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',

  // Chat bubbles
  bubbleUser: colors.primary,
  bubbleUserText: '#FFFFFF',
  bubbleOther: '#2C2C2E',
  bubbleOtherText: '#FFFFFF',

  // Input
  inputBackground: '#1C1C1E',
  inputText: '#FFFFFF',
  inputPlaceholder: '#8E8E93',

  // Cards
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',

  // Status bar
  statusBar: 'light' as const,

  // Keyboard
  keyboardAppearance: 'dark' as const,
} as const;

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'system';

// =============================================================================
// Theme Store
// =============================================================================

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'clawchat-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// =============================================================================
// Theme Hook
// =============================================================================

export function useTheme(): Theme & { isDark: boolean; mode: ThemeMode } {
  const systemColorScheme = useColorScheme();
  const { mode } = useThemeStore();

  const isDark =
    mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  return {
    ...theme,
    isDark,
    mode,
  };
}

// =============================================================================
// Spacing & Typography
// =============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
