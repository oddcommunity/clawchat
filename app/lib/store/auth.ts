/**
 * ClawChat Auth Store
 *
 * Manages authentication state using Zustand + SecureStore
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthSession, getMatrixClient, resetMatrixClient } from '../matrix/client';

// =============================================================================
// Types
// =============================================================================

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'clawchat_session';

// =============================================================================
// Store
// =============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoading: true,
  isAuthenticated: false,
  session: null,
  error: null,

  /**
   * Initialize auth state from stored session
   */
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Try to load stored session
      const storedSession = await SecureStore.getItemAsync(STORAGE_KEY);

      if (storedSession) {
        const session: AuthSession = JSON.parse(storedSession);

        // Restore the Matrix client session
        const client = getMatrixClient({ homeserver: session.homeserver });
        await client.restoreSession(session);

        set({
          isAuthenticated: true,
          session,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear corrupted session
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      set({
        isLoading: false,
        error: 'Session expired. Please login again.',
      });
    }
  },

  /**
   * Login with username and password
   */
  login: async (username: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const client = getMatrixClient();
      const session = await client.login({ username, password });

      // Store session securely
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));

      set({
        isAuthenticated: true,
        session,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      set({
        isLoading: false,
        error: error.message || 'Login failed. Please check your credentials.',
      });
      throw error;
    }
  },

  /**
   * Register a new account
   */
  register: async (username: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const client = getMatrixClient();
      const session = await client.register(username, password);

      // Store session securely
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));

      set({
        isAuthenticated: true,
        session,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      set({
        isLoading: false,
        error: error.message || 'Registration failed. Please try again.',
      });
      throw error;
    }
  },

  /**
   * Logout and clear session
   */
  logout: async () => {
    try {
      set({ isLoading: true });

      // Logout from Matrix
      resetMatrixClient();

      // Clear stored session
      await SecureStore.deleteItemAsync(STORAGE_KEY);

      set({
        isAuthenticated: false,
        session: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout anyway
      set({
        isAuthenticated: false,
        session: null,
        isLoading: false,
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
