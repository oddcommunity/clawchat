/**
 * Themed UI Components
 *
 * Components that automatically adapt to light/dark mode
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme, spacing, borderRadius } from '../lib/theme';

// =============================================================================
// Themed View
// =============================================================================

interface ThemedViewProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'card';
}

export function ThemedView({ children, style, variant = 'primary' }: ThemedViewProps) {
  const theme = useTheme();

  const backgroundColor = {
    primary: theme.background,
    secondary: theme.backgroundSecondary,
    tertiary: theme.backgroundTertiary,
    card: theme.card,
  }[variant];

  return (
    <View style={[{ backgroundColor }, style]}>
      {children}
    </View>
  );
}

// =============================================================================
// Themed Text
// =============================================================================

interface ThemedTextProps {
  children?: React.ReactNode;
  style?: TextStyle;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
  size?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption';
}

export function ThemedText({
  children,
  style,
  variant = 'primary',
  size = 'body',
}: ThemedTextProps) {
  const theme = useTheme();

  const color = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    inverse: theme.textInverse,
  }[variant];

  const sizeStyles = {
    h1: { fontSize: 32, fontWeight: 'bold' as const, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    body: { fontSize: 16, fontWeight: 'normal' as const, lineHeight: 24 },
    bodySmall: { fontSize: 14, fontWeight: 'normal' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: 'normal' as const, lineHeight: 16 },
  }[size];

  return (
    <Text style={[{ color }, sizeStyles, style]}>
      {children}
    </Text>
  );
}

// =============================================================================
// Themed Text Input
// =============================================================================

interface ThemedTextInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function ThemedTextInput({
  style,
  containerStyle,
  placeholderTextColor,
  ...props
}: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <View style={containerStyle}>
      <TextInput
        style={[
          {
            backgroundColor: theme.inputBackground,
            color: theme.inputText,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 4,
            fontSize: 16,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor || theme.inputPlaceholder}
        keyboardAppearance={theme.keyboardAppearance}
        {...props}
      />
    </View>
  );
}

// =============================================================================
// Themed Button
// =============================================================================

interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}

export function ThemedButton({
  title,
  variant = 'primary',
  size = 'medium',
  style,
  disabled,
  ...props
}: ThemedButtonProps) {
  const theme = useTheme();

  const variantStyles = {
    primary: {
      backgroundColor: theme.isDark ? '#0A84FF' : '#007AFF',
      textColor: '#FFFFFF',
      borderWidth: 0,
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: theme.backgroundSecondary,
      textColor: theme.text,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      textColor: theme.isDark ? '#0A84FF' : '#007AFF',
      borderWidth: 1,
      borderColor: theme.isDark ? '#0A84FF' : '#007AFF',
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: theme.isDark ? '#0A84FF' : '#007AFF',
      borderWidth: 0,
      borderColor: 'transparent',
    },
  }[variant];

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    medium: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 16 },
    large: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 18 },
  }[size];

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth,
          borderColor: variantStyles.borderColor,
          borderRadius: borderRadius.lg,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      <Text
        style={{
          color: variantStyles.textColor,
          fontSize: sizeStyles.fontSize,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// Themed Card
// =============================================================================

interface ThemedCardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function ThemedCard({ children, style, elevated = false }: ThemedCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.cardElevated : theme.card,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
        },
        elevated && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// =============================================================================
// Themed Divider
// =============================================================================

interface ThemedDividerProps {
  style?: ViewStyle;
  inset?: number;
}

export function ThemedDivider({ style, inset = 0 }: ThemedDividerProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.border,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}

// =============================================================================
// Screen Container
// =============================================================================

interface ScreenContainerProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
}

export function ScreenContainer({
  children,
  style,
  variant = 'primary',
}: ScreenContainerProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: variant === 'primary' ? theme.background : theme.backgroundSecondary,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
