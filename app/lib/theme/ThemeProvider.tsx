/**
 * Theme Provider Component
 *
 * Provides theme context to the entire app and handles
 * system theme changes.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { useThemeStore, useTheme, Theme, ThemeMode, colors } from '../theme';

interface ThemeContextValue extends Theme {
  isDark: boolean;
  mode: ThemeMode;
  colors: typeof colors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { setMode } = useThemeStore();
  const systemColorScheme = useColorScheme();

  // Update status bar based on theme
  useEffect(() => {
    StatusBar.setBarStyle(theme.statusBar === 'dark' ? 'dark-content' : 'light-content');
  }, [theme.statusBar]);

  const value: ThemeContextValue = {
    ...theme,
    colors,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}

// Re-export for convenience
export { colors } from '../theme';
