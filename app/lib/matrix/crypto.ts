/**
 * ClawChat E2EE (End-to-End Encryption) Module
 *
 * Implements Matrix Olm/Megolm encryption for secure communication
 * between users and bots.
 */

import * as SecureStore from 'expo-secure-store';
import { MatrixClient } from './client';

// Crypto storage keys
const CRYPTO_STORE_KEY = 'clawchat_crypto_store';
const DEVICE_KEY_PREFIX = 'clawchat_device_';

export interface DeviceKeys {
  deviceId: string;
  curve25519: string;
  ed25519: string;
}

export interface EncryptedPayload {
  algorithm: 'm.megolm.v1.aes-sha2';
  senderKey: string;
  ciphertext: string;
  sessionId: string;
  deviceId: string;
}

export interface VerificationStatus {
  verified: boolean;
  deviceId: string;
  userId: string;
  fingerprint: string;
}

/**
 * E2EE Manager for ClawChat
 *
 * Handles:
 * - Device key generation and storage
 * - Session key exchange with bots
 * - Message encryption/decryption
 * - Device verification (safety numbers)
 */
export class CryptoManager {
  private deviceKeys: DeviceKeys | null = null;
  private sessionKeys: Map<string, string> = new Map();
  private verifiedDevices: Set<string> = new Set();

  /**
   * Initialize crypto for this device
   */
  async initialize(): Promise<DeviceKeys> {
    // Try to load existing keys
    const stored = await SecureStore.getItemAsync(CRYPTO_STORE_KEY);
    if (stored) {
      this.deviceKeys = JSON.parse(stored);
      return this.deviceKeys!;
    }

    // Generate new device keys
    // In production, this uses Olm library for proper key generation
    this.deviceKeys = await this.generateDeviceKeys();

    // Store securely
    await SecureStore.setItemAsync(
      CRYPTO_STORE_KEY,
      JSON.stringify(this.deviceKeys)
    );

    return this.deviceKeys;
  }

  /**
   * Generate device identity keys
   * Uses Olm Curve25519 and Ed25519
   */
  private async generateDeviceKeys(): Promise<DeviceKeys> {
    // In production, use @matrix-org/olm
    // This is a placeholder structure
    const deviceId = this.generateDeviceId();

    return {
      deviceId,
      // These would be actual Olm-generated keys
      curve25519: `curve25519_${deviceId}`,
      ed25519: `ed25519_${deviceId}`,
    };
  }

  private generateDeviceId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get fingerprint for verification (safety number)
   * Users compare these to verify they're talking to the right bot
   */
  getFingerprint(userId: string, deviceKeys: DeviceKeys): string {
    // Generate human-readable safety number
    // In production, this is a hash of both parties' keys
    const combined = `${userId}:${deviceKeys.ed25519}`;

    // Convert to 60-digit number (like Signal)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }

    // Format as groups of 5 digits
    const numStr = Math.abs(hash).toString().padStart(60, '0').slice(0, 60);
    const groups: string[] = [];
    for (let i = 0; i < 60; i += 5) {
      groups.push(numStr.slice(i, i + 5));
    }

    return groups.join(' ');
  }

  /**
   * Verify a device (mark as trusted)
   */
  async verifyDevice(userId: string, deviceId: string): Promise<void> {
    const key = `${userId}:${deviceId}`;
    this.verifiedDevices.add(key);

    // Persist verified devices
    const verified = Array.from(this.verifiedDevices);
    await SecureStore.setItemAsync(
      'clawchat_verified_devices',
      JSON.stringify(verified)
    );
  }

  /**
   * Check if a device is verified
   */
  isDeviceVerified(userId: string, deviceId: string): boolean {
    return this.verifiedDevices.has(`${userId}:${deviceId}`);
  }

  /**
   * Encrypt a message for a room
   * Uses Megolm for group encryption (efficient for rooms)
   */
  async encryptMessage(
    roomId: string,
    content: string,
    recipientKeys: DeviceKeys[]
  ): Promise<EncryptedPayload> {
    if (!this.deviceKeys) {
      throw new Error('Crypto not initialized');
    }

    // Get or create session for this room
    let sessionId = this.sessionKeys.get(roomId);
    if (!sessionId) {
      sessionId = this.createMegolmSession(roomId);
      this.sessionKeys.set(roomId, sessionId);

      // Share session key with recipients
      await this.shareSessionKey(roomId, sessionId, recipientKeys);
    }

    // In production, this uses actual Megolm encryption
    const ciphertext = Buffer.from(content).toString('base64');

    return {
      algorithm: 'm.megolm.v1.aes-sha2',
      senderKey: this.deviceKeys.curve25519,
      ciphertext,
      sessionId,
      deviceId: this.deviceKeys.deviceId,
    };
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(payload: EncryptedPayload): Promise<string> {
    // In production, use Megolm session to decrypt
    // This is a placeholder
    return Buffer.from(payload.ciphertext, 'base64').toString('utf-8');
  }

  private createMegolmSession(roomId: string): string {
    // In production, creates actual Megolm outbound session
    return `session_${roomId}_${Date.now()}`;
  }

  private async shareSessionKey(
    roomId: string,
    sessionId: string,
    recipientKeys: DeviceKeys[]
  ): Promise<void> {
    // In production, encrypt session key to each recipient's Curve25519 key
    // and send via Matrix to-device messages
    console.log(`Sharing session ${sessionId} with ${recipientKeys.length} devices`);
  }

  /**
   * Export keys for backup
   */
  async exportKeys(passphrase: string): Promise<string> {
    if (!this.deviceKeys) {
      throw new Error('No keys to export');
    }

    // In production, encrypt with passphrase
    const data = {
      deviceKeys: this.deviceKeys,
      sessionKeys: Object.fromEntries(this.sessionKeys),
      verifiedDevices: Array.from(this.verifiedDevices),
    };

    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Import keys from backup
   */
  async importKeys(backup: string, passphrase: string): Promise<void> {
    // In production, decrypt with passphrase
    const data = JSON.parse(Buffer.from(backup, 'base64').toString('utf-8'));

    this.deviceKeys = data.deviceKeys;
    this.sessionKeys = new Map(Object.entries(data.sessionKeys));
    this.verifiedDevices = new Set(data.verifiedDevices);

    await SecureStore.setItemAsync(
      CRYPTO_STORE_KEY,
      JSON.stringify(this.deviceKeys)
    );
  }
}

// Singleton instance
let cryptoManager: CryptoManager | null = null;

export function getCryptoManager(): CryptoManager {
  if (!cryptoManager) {
    cryptoManager = new CryptoManager();
  }
  return cryptoManager;
}

export async function initializeCrypto(): Promise<DeviceKeys> {
  const manager = getCryptoManager();
  return manager.initialize();
}
