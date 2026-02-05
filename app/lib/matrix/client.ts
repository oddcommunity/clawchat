/**
 * ClawChat Matrix Client
 *
 * Handles all Matrix protocol communication with E2EE support.
 * Uses matrix-js-sdk with Rust crypto backend (WASM).
 */

import * as sdk from 'matrix-js-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_HOMESERVER = config.matrixHomeserver;

export interface MatrixConfig {
  homeserver: string;
  enableE2EE?: boolean;
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
  encrypted: boolean;
  verified: boolean;
}

export interface Room {
  id: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  isDirect: boolean;
  lastMessage?: Message;
  unreadCount: number;
  encrypted: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  displayName: string;
  lastSeen?: number;
  verified: boolean;
}

export interface VerificationRequest {
  recipientUserId: string;
  recipientDeviceId: string;
  sasEmoji?: string[];
  sasNumbers?: number[];
}

// =============================================================================
// Crypto Store (Persists E2EE keys)
// =============================================================================

class AsyncStorageCryptoStore {
  private prefix = 'clawchat_crypto_';

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(this.prefix + key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(this.prefix + key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.prefix + key);
  }

  async getAllKeys(): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(k => k.startsWith(this.prefix));
  }

  async clear(): Promise<void> {
    const keys = await this.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  }
}

// =============================================================================
// Matrix Client Class
// =============================================================================

export class ClawChatClient {
  private client: sdk.MatrixClient | null = null;
  private config: MatrixConfig;
  private cryptoStore: AsyncStorageCryptoStore;
  private onMessageCallback: ((message: Message) => void) | null = null;
  private onRoomUpdateCallback: ((rooms: Room[]) => void) | null = null;
  private onVerificationCallback: ((request: VerificationRequest) => void) | null = null;

  constructor(config?: Partial<MatrixConfig>) {
    this.config = {
      homeserver: config?.homeserver || DEFAULT_HOMESERVER,
      enableE2EE: config?.enableE2EE ?? true,
    };
    this.cryptoStore = new AsyncStorageCryptoStore();
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

      // Initialize the authenticated client with E2EE
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
        undefined,
        {
          type: 'm.login.dummy',
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
  // Client Initialization with E2EE
  // ===========================================================================

  private async initializeClient(session: AuthSession): Promise<void> {
    this.client = sdk.createClient({
      baseUrl: session.homeserver,
      accessToken: session.accessToken,
      userId: session.userId,
      deviceId: session.deviceId,
    });

    // Initialize E2EE if enabled
    if (this.config.enableE2EE) {
      try {
        // Initialize Rust crypto (WASM)
        // This handles Olm/Megolm encryption automatically
        await this.client.initRustCrypto();

        console.log('[E2EE] Rust crypto initialized');

        // Set up crypto event listeners
        this.setupCryptoListeners();
      } catch (error) {
        console.warn('[E2EE] Failed to initialize crypto:', error);
        // Continue without E2EE if it fails
      }
    }

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

    // Upload device keys if E2EE enabled
    if (this.config.enableE2EE && this.client.isCryptoEnabled()) {
      await this.client.uploadKeys();
      console.log('[E2EE] Device keys uploaded');
    }
  }

  private setupCryptoListeners(): void {
    if (!this.client) return;

    // Listen for verification requests
    this.client.on(sdk.CryptoEvent.VerificationRequest, (request) => {
      console.log('[E2EE] Verification request received');
      if (this.onVerificationCallback) {
        this.onVerificationCallback({
          recipientUserId: request.otherUserId,
          recipientDeviceId: request.otherDeviceId || '',
        });
      }
    });

    // Listen for key backup status
    this.client.on(sdk.CryptoEvent.KeyBackupStatus, (enabled) => {
      console.log('[E2EE] Key backup status:', enabled);
    });
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    // Listen for new messages
    this.client.on(sdk.RoomEvent.Timeline, async (event, room, toStartOfTimeline) => {
      if (toStartOfTimeline) return;
      if (event.getType() !== 'm.room.message') return;

      // Decrypt if needed
      if (event.isEncrypted() && this.client?.isCryptoEnabled()) {
        try {
          await this.client.decryptEventIfNeeded(event);
        } catch (e) {
          console.warn('[E2EE] Failed to decrypt event:', e);
        }
      }

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
  // E2EE Functions
  // ===========================================================================

  /**
   * Check if E2EE is enabled
   */
  isE2EEEnabled(): boolean {
    return this.client?.isCryptoEnabled() ?? false;
  }

  /**
   * Get device fingerprint for verification
   */
  async getDeviceFingerprint(): Promise<string | null> {
    if (!this.client?.isCryptoEnabled()) return null;

    const deviceId = this.client.getDeviceId();
    if (!deviceId) return null;

    const device = await this.client.getCrypto()?.getOwnDeviceKeys();
    return device?.ed25519 || null;
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    if (!this.client?.isCryptoEnabled()) return [];

    const crypto = this.client.getCrypto();
    if (!crypto) return [];

    const deviceMap = await crypto.getUserDeviceInfo([userId]);
    const devices = deviceMap.get(userId);

    if (!devices) return [];

    return Array.from(devices.values()).map(device => ({
      deviceId: device.deviceId,
      displayName: device.displayName || device.deviceId,
      verified: device.verified === sdk.DeviceVerification.Verified,
    }));
  }

  /**
   * Start device verification
   */
  async startVerification(userId: string, deviceId: string): Promise<void> {
    if (!this.client?.isCryptoEnabled()) {
      throw new Error('E2EE not enabled');
    }

    const crypto = this.client.getCrypto();
    if (!crypto) throw new Error('Crypto not available');

    // Request verification
    await crypto.requestDeviceVerification(userId, deviceId);
  }

  /**
   * Verify a device manually (mark as trusted)
   */
  async verifyDevice(userId: string, deviceId: string): Promise<void> {
    if (!this.client?.isCryptoEnabled()) {
      throw new Error('E2EE not enabled');
    }

    const crypto = this.client.getCrypto();
    if (!crypto) throw new Error('Crypto not available');

    await crypto.setDeviceVerified(userId, deviceId, true);
  }

  /**
   * Enable encryption for a room
   */
  async enableRoomEncryption(roomId: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.sendStateEvent(roomId, 'm.room.encryption', {
      algorithm: 'm.megolm.v1.aes-sha2',
    });
  }

  /**
   * Check if a room is encrypted
   */
  isRoomEncrypted(roomId: string): boolean {
    if (!this.client) return false;
    const room = this.client.getRoom(roomId);
    return room?.hasEncryptionStateEvent() ?? false;
  }

  /**
   * Export encryption keys (for backup)
   */
  async exportKeys(passphrase: string): Promise<string> {
    if (!this.client?.isCryptoEnabled()) {
      throw new Error('E2EE not enabled');
    }

    const crypto = this.client.getCrypto();
    if (!crypto) throw new Error('Crypto not available');

    const keys = await crypto.exportRoomKeys();
    // In production, encrypt with passphrase
    return JSON.stringify(keys);
  }

  /**
   * Import encryption keys (from backup)
   */
  async importKeys(keysJson: string, passphrase: string): Promise<void> {
    if (!this.client?.isCryptoEnabled()) {
      throw new Error('E2EE not enabled');
    }

    const crypto = this.client.getCrypto();
    if (!crypto) throw new Error('Crypto not available');

    const keys = JSON.parse(keysJson);
    await crypto.importRoomKeys(keys);
  }

  // ===========================================================================
  // Messaging
  // ===========================================================================

  /**
   * Send a text message to a room
   * Automatically encrypted if room has E2EE enabled
   */
  async sendMessage(roomId: string, text: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.sendTextMessage(roomId, text);
    return response.event_id;
  }

  /**
   * Send an image to a room
   * Automatically encrypted if room has E2EE enabled
   */
  async sendImage(roomId: string, uri: string, filename: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload (encrypted if E2EE enabled for room)
    const uploadResponse = await this.client.uploadContent(blob, {
      name: filename,
      type: blob.type,
    });

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

    // Decrypt any encrypted events
    const messages: Message[] = [];
    for (const event of events.filter(e => e.getType() === 'm.room.message').slice(-limit)) {
      if (event.isEncrypted() && this.client.isCryptoEnabled()) {
        try {
          await this.client.decryptEventIfNeeded(event);
        } catch (e) {
          console.warn('[E2EE] Failed to decrypt:', e);
        }
      }
      const msg = this.eventToMessage(event, room);
      if (msg) messages.push(msg);
    }

    return messages;
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
   * Get or create a DM room with a bot (E2EE enabled by default)
   */
  async getOrCreateBotRoom(botUserId: string, enableEncryption = true): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    // Check for existing DM
    const existingRooms = this.client.getRooms();
    for (const room of existingRooms) {
      const members = room.getJoinedMembers();
      if (members.length === 2 && members.some((m) => m.userId === botUserId)) {
        return room.roomId;
      }
    }

    // Create new DM room with E2EE
    const response = await this.client.createRoom({
      is_direct: true,
      invite: [botUserId],
      preset: sdk.Preset.TrustedPrivateChat,
      initial_state: enableEncryption && this.isE2EEEnabled() ? [
        {
          type: 'm.room.encryption',
          content: {
            algorithm: 'm.megolm.v1.aes-sha2',
          },
        },
      ] : [],
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

  onVerification(callback: (request: VerificationRequest) => void): void {
    this.onVerificationCallback = callback;
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
      encrypted: event.isEncrypted(),
      verified: event.isVerified?.() ?? false,
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
      encrypted: room.hasEncryptionStateEvent(),
    };
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.client?.getUserId() || null;
  }

  /**
   * Get the current device ID
   */
  getDeviceId(): string | null {
    return this.client?.getDeviceId() || null;
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
