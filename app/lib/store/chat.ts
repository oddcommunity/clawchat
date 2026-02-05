/**
 * ClawChat Chat Store
 *
 * Manages chat messages and rooms using Zustand
 */

import { create } from 'zustand';
import { Message, Room, getMatrixClient } from '../matrix/client';

// =============================================================================
// Types
// =============================================================================

interface ChatState {
  rooms: Room[];
  currentRoomId: string | null;
  messages: Record<string, Message[]>; // roomId -> messages
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  e2eeEnabled: boolean;

  // Actions
  initialize: () => Promise<void>;
  setCurrentRoom: (roomId: string) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (uri: string, filename: string) => Promise<void>;
  startBotChat: (botUserId: string, enableE2EE?: boolean) => Promise<string>;
  refresh: () => void;
  checkE2EEStatus: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  messages: {},
  isLoading: false,
  isSending: false,
  error: null,
  e2eeEnabled: false,

  /**
   * Initialize chat and set up listeners
   */
  initialize: async () => {
    const client = getMatrixClient();

    // Set up message listener
    client.onMessage((message) => {
      set((state) => {
        const roomMessages = state.messages[message.roomId] || [];

        // Check if message already exists
        if (roomMessages.some((m) => m.id === message.id)) {
          return state;
        }

        return {
          messages: {
            ...state.messages,
            [message.roomId]: [...roomMessages, message],
          },
        };
      });
    });

    // Set up room update listener
    client.onRoomUpdate((rooms) => {
      set({ rooms });
    });

    // Initial load
    const rooms = client.getRooms();
    set({ rooms });
  },

  /**
   * Set the current active room and load messages
   */
  setCurrentRoom: (roomId: string) => {
    set({ currentRoomId: roomId });
    get().loadMessages(roomId);
  },

  /**
   * Set the current room ID without loading messages
   */
  setCurrentRoomId: (roomId: string | null) => {
    set({ currentRoomId: roomId });
  },

  /**
   * Check and update E2EE status
   */
  checkE2EEStatus: () => {
    const client = getMatrixClient();
    const enabled = client.isE2EEEnabled();
    set({ e2eeEnabled: enabled });
  },

  /**
   * Load messages for a room
   */
  loadMessages: async (roomId: string) => {
    try {
      set({ isLoading: true });

      const client = getMatrixClient();
      const messages = await client.getMessages(roomId, 100);

      set((state) => ({
        isLoading: false,
        messages: {
          ...state.messages,
          [roomId]: messages,
        },
      }));
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to load messages',
      });
    }
  },

  /**
   * Send a message to the current room
   */
  sendMessage: async (text: string) => {
    const { currentRoomId } = get();
    if (!currentRoomId || !text.trim()) return;

    try {
      set({ isSending: true });

      const client = getMatrixClient();
      await client.sendMessage(currentRoomId, text.trim());

      set({ isSending: false });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      set({
        isSending: false,
        error: error.message || 'Failed to send message',
      });
    }
  },

  /**
   * Send an image to the current room
   */
  sendImage: async (uri: string, filename: string) => {
    const { currentRoomId } = get();
    if (!currentRoomId) return;

    try {
      set({ isSending: true });

      const client = getMatrixClient();
      await client.sendImage(currentRoomId, uri, filename);

      set({ isSending: false });
    } catch (error: any) {
      console.error('Failed to send image:', error);
      set({
        isSending: false,
        error: error.message || 'Failed to send image',
      });
    }
  },

  /**
   * Start or get existing chat with a bot (E2EE enabled by default)
   */
  startBotChat: async (botUserId: string, enableE2EE: boolean = true) => {
    try {
      set({ isLoading: true });

      const client = getMatrixClient();
      const roomId = await client.getOrCreateBotRoom(botUserId, enableE2EE);

      // Refresh rooms list
      const rooms = client.getRooms();

      set({
        rooms,
        currentRoomId: roomId,
        isLoading: false,
      });

      // Load messages for this room
      get().loadMessages(roomId);

      return roomId;
    } catch (error: any) {
      console.error('Failed to start bot chat:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to start chat with bot',
      });
      throw error;
    }
  },

  /**
   * Refresh rooms list
   */
  refresh: () => {
    const client = getMatrixClient();
    const rooms = client.getRooms();
    set({ rooms });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectCurrentMessages = (state: ChatState): Message[] => {
  if (!state.currentRoomId) return [];
  return state.messages[state.currentRoomId] || [];
};

export const selectCurrentRoom = (state: ChatState): Room | null => {
  if (!state.currentRoomId) return null;
  return state.rooms.find((r) => r.id === state.currentRoomId) || null;
};
