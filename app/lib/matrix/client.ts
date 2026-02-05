/**
 * ClawChat Matrix Client
 *
 * Handles all Matrix protocol communication with the Synapse homeserver.
 */

import * as sdk from 'matrix-js-sdk';
import config from '../config';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_HOMESERVER = config.matrixHomeserver;

export interface MatrixConfig {
  homeserver: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  userId: string;
  deviceId: string;
  homeserver: string;
}

export interface Message {
  id: string;
  roomId: string;
  sender: string;
  senderName: string;
  body: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'notice';
  isMe: boolean;
}

export interface Room {
  id: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  isDirect: boolean;
  lastMessage?: Message;
  unreadCount: number;
}

// =============================================================================
// Matrix Client Class
// =============================================================================

export class ClawChatClient {
  private client: sdk.MatrixClient | null = null;
  private config: MatrixConfig;
  private onMessageCallback: ((message: Message) => void) | null = null;
  private onRoomUpdateCallback: ((rooms: Room[]) => void) | null = null;

  constructor(config?: Partial<MatrixConfig>) {
    this.config = {
      homeserver: config?.homeserver || DEFAULT_HOMESERVER,
    };
  }

  // ===========================================================================
  // Authentication
  // ===========================================================================

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const tempClient = sdk.createClient({
      baseUrl: this.config.homeserver,
    });

    try {
      const response = await tempClient.login('m.login.password', {
        user: credentials.username,
        password: credentials.password,
        initial_device_display_name: 'ClawChat Mobile',
      });

      const session: AuthSession = {
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
        homeserver: this.config.homeserver,
      };

      // Initialize the authenticated client
      await this.initializeClient(session);

      return session;
    } finally {
      tempClient.stopClient();
    }
  }

  /**
   * Register a new account
   */
  async register(username: string, password: string, email?: string): Promise<AuthSession> {
    const tempClient = sdk.createClient({
      baseUrl: this.config.homeserver,
    });

    try {
      const response = await tempClient.register(
        username,
        password,
        undefined, // session ID
        {
          type: 'm.login.dummy', // For servers without email verification
        }
      );

      const session: AuthSession = {
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
        homeserver: this.config.homeserver,
      };

      await this.initializeClient(session);

      return session;
    } finally {
      tempClient.stopClient();
    }
  }

  /**
   * Restore session from stored credentials
   */
  async restoreSession(session: AuthSession): Promise<void> {
    await this.initializeClient(session);
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout();
      } catch (e) {
        // Ignore logout errors
      }
      this.client.stopClient();
      this.client = null;
    }
  }

  // ===========================================================================
  // Client Initialization
  // ===========================================================================

  private async initializeClient(session: AuthSession): Promise<void> {
    this.client = sdk.createClient({
      baseUrl: session.homeserver,
      accessToken: session.accessToken,
      userId: session.userId,
      deviceId: session.deviceId,
    });

    // Set up event listeners
    this.setupEventListeners();

    // Start the client
    await this.client.startClient({
      initialSyncLimit: 20,
    });

    // Wait for initial sync
    await new Promise<void>((resolve) => {
      this.client!.once(sdk.ClientEvent.Sync, (state) => {
        if (state === 'PREPARED') {
          resolve();
        }
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    // Listen for new messages
    this.client.on(sdk.RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
      if (toStartOfTimeline) return; // Ignore historical messages during sync
      if (event.getType() !== 'm.room.message') return;

      const message = this.eventToMessage(event, room!);
      if (message && this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    });

    // Listen for room updates
    this.client.on(sdk.RoomEvent.MyMembership, () => {
      this.emitRoomUpdate();
    });

    this.client.on(sdk.RoomEvent.Name, () => {
      this.emitRoomUpdate();
    });
  }

  private emitRoomUpdate(): void {
    if (this.onRoomUpdateCallback) {
      const rooms = this.getRooms();
      this.onRoomUpdateCallback(rooms);
    }
  }

  // ===========================================================================
  // Messaging
  // ===========================================================================

  /**
   * Send a text message to a room
   */
  async sendMessage(roomId: string, text: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.sendTextMessage(roomId, text);
    return response.event_id;
  }

  /**
   * Send an image to a room
   */
  async sendImage(roomId: string, uri: string, filename: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    // Upload the image first
    const response = await fetch(uri);
    const blob = await response.blob();
    const uploadResponse = await this.client.uploadContent(blob, {
      name: filename,
      type: blob.type,
    });

    // Send the image message
    const eventResponse = await this.client.sendImageMessage(
      roomId,
      uploadResponse.content_uri,
      {
        body: filename,
        mimetype: blob.type,
        size: blob.size,
      }
    );

    return eventResponse.event_id;
  }

  /**
   * Get messages for a room
   */
  async getMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    if (!this.client) throw new Error('Client not initialized');

    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    return events
      .filter((event) => event.getType() === 'm.room.message')
      .slice(-limit)
      .map((event) => this.eventToMessage(event, room)!)
      .filter(Boolean);
  }

  // ===========================================================================
  // Rooms
  // ===========================================================================

  /**
   * Get all rooms the user is in
   */
  getRooms(): Room[] {
    if (!this.client) return [];

    const rooms = this.client.getRooms();
    return rooms.map((room) => this.matrixRoomToRoom(room)).filter(Boolean) as Room[];
  }

  /**
   * Get or create a DM room with the AI bot
   */
  async getOrCreateBotRoom(botUserId: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    // Check for existing DM
    const existingRooms = this.client.getRooms();
    for (const room of existingRooms) {
      const members = room.getJoinedMembers();
      if (members.length === 2 && members.some((m) => m.userId === botUserId)) {
        return room.roomId;
      }
    }

    // Create new DM room
    const response = await this.client.createRoom({
      is_direct: true,
      invite: [botUserId],
      preset: sdk.Preset.TrustedPrivateChat,
    });

    return response.room_id;
  }

  /**
   * Join a room by ID or alias
   */
  async joinRoom(roomIdOrAlias: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.joinRoom(roomIdOrAlias);
    return response.roomId;
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    await this.client.leave(roomId);
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  onMessage(callback: (message: Message) => void): void {
    this.onMessageCallback = callback;
  }

  onRoomUpdate(callback: (rooms: Room[]) => void): void {
    this.onRoomUpdateCallback = callback;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private eventToMessage(event: sdk.MatrixEvent, room: sdk.Room): Message | null {
    const content = event.getContent();
    if (!content.body) return null;

    const sender = event.getSender();
    const member = room.getMember(sender!);

    return {
      id: event.getId()!,
      roomId: room.roomId,
      sender: sender!,
      senderName: member?.name || sender!,
      body: content.body,
      timestamp: event.getTs(),
      type: this.getMessageType(content.msgtype),
      isMe: sender === this.client?.getUserId(),
    };
  }

  private getMessageType(msgtype: string): Message['type'] {
    switch (msgtype) {
      case 'm.image':
        return 'image';
      case 'm.file':
        return 'file';
      case 'm.notice':
        return 'notice';
      default:
        return 'text';
    }
  }

  private matrixRoomToRoom(room: sdk.Room): Room | null {
    const lastEvent = room.getLastLiveEvent();

    return {
      id: room.roomId,
      name: room.name || 'Unnamed Room',
      topic: room.currentState.getStateEvents('m.room.topic', '')?.[0]?.getContent()?.topic,
      avatarUrl: room.getAvatarUrl(this.config.homeserver, 50, 50, 'crop') || undefined,
      isDirect: room.getMyMembership() === 'join' && room.getJoinedMemberCount() === 2,
      lastMessage: lastEvent ? this.eventToMessage(lastEvent, room) || undefined : undefined,
      unreadCount: room.getUnreadNotificationCount() || 0,
    };
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.client?.getUserId() || null;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.isLoggedIn();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let clientInstance: ClawChatClient | null = null;

export function getMatrixClient(config?: Partial<MatrixConfig>): ClawChatClient {
  if (!clientInstance) {
    clientInstance = new ClawChatClient(config);
  }
  return clientInstance;
}

export function resetMatrixClient(): void {
  if (clientInstance) {
    clientInstance.logout();
    clientInstance = null;
  }
}
