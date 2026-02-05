/**
 * ClawChat Search Store
 *
 * Handles message search functionality
 */

import { create } from 'zustand';
import { Message, getMatrixClient } from '../matrix/client';

interface SearchResult {
  message: Message;
  roomId: string;
  roomName: string;
  highlights: string[];
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  hasSearched: false,
  error: null,

  setQuery: (query) => {
    set({ query });

    // Auto-search after typing stops
    if (query.trim().length >= 2) {
      // Debounce would be added here in production
      get().search(query);
    } else if (query.trim().length === 0) {
      get().clearSearch();
    }
  },

  search: async (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery.length < 2) return;

    set({ isSearching: true, error: null });

    try {
      const client = getMatrixClient();
      const rooms = client.getRooms();
      const results: SearchResult[] = [];

      // Search through all rooms and their messages
      for (const room of rooms) {
        const messages = await client.getMessages(room.id, 100);

        for (const message of messages) {
          if (message.body.toLowerCase().includes(trimmedQuery)) {
            // Find highlight positions
            const highlights: string[] = [];
            const bodyLower = message.body.toLowerCase();
            let startIndex = 0;

            while (true) {
              const index = bodyLower.indexOf(trimmedQuery, startIndex);
              if (index === -1) break;

              // Extract context around the match
              const contextStart = Math.max(0, index - 20);
              const contextEnd = Math.min(message.body.length, index + trimmedQuery.length + 20);
              let highlight = message.body.slice(contextStart, contextEnd);

              if (contextStart > 0) highlight = '...' + highlight;
              if (contextEnd < message.body.length) highlight = highlight + '...';

              highlights.push(highlight);
              startIndex = index + 1;
            }

            results.push({
              message,
              roomId: room.id,
              roomName: room.name,
              highlights,
            });
          }
        }
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => b.message.timestamp - a.message.timestamp);

      set({
        results,
        isSearching: false,
        hasSearched: true,
      });
    } catch (error: any) {
      console.error('Search failed:', error);
      set({
        isSearching: false,
        hasSearched: true,
        error: error.message || 'Search failed',
      });
    }
  },

  clearSearch: () => {
    set({
      query: '',
      results: [],
      isSearching: false,
      hasSearched: false,
      error: null,
    });
  },
}));
