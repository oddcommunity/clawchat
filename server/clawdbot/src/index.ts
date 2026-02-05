/**
 * ClawChat Bot - Matrix Bot with Claude AI and E2EE Support
 *
 * This bot supports end-to-end encryption using Matrix's Olm/Megolm protocol.
 * For production, use the full clawdbot/openclaw with the Matrix plugin.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as sdk from 'matrix-js-sdk';
import { createServer } from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Configuration from environment
const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  matrixHomeserver: process.env.MATRIX_HOMESERVER || 'http://synapse:8008',
  matrixUserId: process.env.MATRIX_USER_ID || '@clawbot:clawchat.io',
  matrixAccessToken: process.env.MATRIX_ACCESS_TOKEN!,
  matrixDeviceId: process.env.MATRIX_DEVICE_ID || 'CLAWBOT001',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  port: parseInt(process.env.PORT || '3000', 10),
  enableE2EE: process.env.ENABLE_E2EE !== 'false', // Enabled by default
  dataDir: process.env.DATA_DIR || '/data',
};

// Validate required config
if (!config.anthropicApiKey) {
  console.error('ANTHROPIC_API_KEY is required');
  process.exit(1);
}

if (!config.matrixAccessToken) {
  console.error('MATRIX_ACCESS_TOKEN is required');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

// Crypto store path
const cryptoStorePath = path.join(config.dataDir, 'crypto');

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
if (!fs.existsSync(cryptoStorePath)) {
  fs.mkdirSync(cryptoStorePath, { recursive: true });
}

// Initialize Matrix client with crypto support
const matrixClient = sdk.createClient({
  baseUrl: config.matrixHomeserver,
  accessToken: config.matrixAccessToken,
  userId: config.matrixUserId,
  deviceId: config.matrixDeviceId,
});

// Simple conversation memory (per-room)
const conversations: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

// E2EE status tracking
let e2eeEnabled = false;

// Initialize E2EE
async function initializeCrypto(): Promise<boolean> {
  if (!config.enableE2EE) {
    console.log('[E2EE] Disabled by configuration');
    return false;
  }

  try {
    // Initialize Rust crypto (WASM)
    await matrixClient.initRustCrypto();

    console.log('[E2EE] Rust crypto initialized');

    // Upload device keys
    await matrixClient.uploadKeys();
    console.log('[E2EE] Device keys uploaded');

    // Set up verification listeners
    matrixClient.on(sdk.CryptoEvent.VerificationRequest, (request) => {
      console.log(`[E2EE] Verification request from ${request.otherUserId}`);
      // Auto-accept verification requests for simplicity
      // In production, you might want more sophisticated handling
    });

    return true;
  } catch (error) {
    console.warn('[E2EE] Failed to initialize crypto:', error);
    console.log('[E2EE] Continuing without encryption');
    return false;
  }
}

// Handle incoming messages
async function handleMessage(event: sdk.MatrixEvent, room: sdk.Room) {
  // Ignore our own messages
  if (event.getSender() === config.matrixUserId) return;

  // Only handle text messages
  if (event.getType() !== 'm.room.message') return;

  // Decrypt if encrypted
  if (event.isEncrypted() && e2eeEnabled) {
    try {
      await matrixClient.decryptEventIfNeeded(event);
    } catch (error) {
      console.warn(`[E2EE] Failed to decrypt message in ${room.roomId}:`, error);
      // Send error message
      await sendMessage(
        room.roomId,
        "⚠️ I couldn't decrypt your message. Please make sure I have the correct encryption keys.",
        room.hasEncryptionStateEvent()
      );
      return;
    }
  }

  const content = event.getContent();
  if (content.msgtype !== 'm.text') return;

  const roomId = room.roomId;
  const userMessage = content.body;
  const sender = event.getSender();
  const isEncrypted = event.isEncrypted() || room.hasEncryptionStateEvent();

  console.log(`[${roomId}] ${sender}: ${userMessage} ${isEncrypted ? '🔒' : ''}`);

  // Get or create conversation history
  let history = conversations.get(roomId) || [];

  // Add user message to history
  history.push({ role: 'user', content: userMessage });

  // Keep only last 20 messages for context
  if (history.length > 20) {
    history = history.slice(-20);
  }

  try {
    // Send typing indicator
    matrixClient.sendTyping(roomId, true, 30000);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: `You are ClawChat AI, a helpful and friendly assistant powered by Claude. You're chatting with users through a secure messaging app. ${isEncrypted ? 'This conversation is end-to-end encrypted. ' : ''}Keep responses concise and conversational. The current user's Matrix ID is ${sender}.`,
      messages: history,
    });

    // Extract response text
    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage });
    conversations.set(roomId, history);

    // Stop typing and send response
    matrixClient.sendTyping(roomId, false, 0);
    await sendMessage(roomId, assistantMessage, isEncrypted);

    console.log(`[${roomId}] Bot: ${assistantMessage.substring(0, 100)}... ${isEncrypted ? '🔒' : ''}`);
  } catch (error) {
    console.error('Error calling Claude:', error);
    matrixClient.sendTyping(roomId, false, 0);
    await sendMessage(
      roomId,
      "I'm having trouble processing that right now. Please try again.",
      isEncrypted
    );
  }
}

// Send message (encrypted if room is encrypted)
async function sendMessage(roomId: string, text: string, encrypt: boolean) {
  try {
    // If E2EE is enabled and room is encrypted, message will be auto-encrypted
    await matrixClient.sendTextMessage(roomId, text);
  } catch (error) {
    console.error(`Failed to send message to ${roomId}:`, error);
  }
}

// Auto-join rooms when invited
async function handleInvite(event: sdk.MatrixEvent, member: sdk.RoomMember) {
  if (member.userId === config.matrixUserId && member.membership === 'invite') {
    const roomId = member.roomId;
    console.log(`Invited to room ${roomId}, joining...`);
    try {
      await matrixClient.joinRoom(roomId);
      console.log(`Joined room ${roomId}`);

      // Send welcome message
      setTimeout(async () => {
        const room = matrixClient.getRoom(roomId);
        const isEncrypted = room?.hasEncryptionStateEvent() ?? false;

        let welcomeMessage = "👋 Hello! I'm ClawChat AI, powered by Claude. How can I help you today?";
        if (isEncrypted && e2eeEnabled) {
          welcomeMessage += "\n\n🔒 This conversation is end-to-end encrypted.";
        }

        await sendMessage(roomId, welcomeMessage, isEncrypted);
      }, 1000);
    } catch (error) {
      console.error(`Failed to join room ${roomId}:`, error);
    }
  }
}

// Handle room encryption events
function handleEncryption(event: sdk.MatrixEvent, room: sdk.Room) {
  if (event.getType() === 'm.room.encryption') {
    console.log(`[E2EE] Room ${room.roomId} encryption enabled`);
  }
}

// Health check server
function startHealthServer() {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        connected: matrixClient.isLoggedIn(),
        rooms: matrixClient.getRooms().length,
        e2ee: e2eeEnabled,
        deviceId: config.matrixDeviceId,
      }));
    } else if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`
# HELP clawbot_rooms_total Number of rooms the bot is in
# TYPE clawbot_rooms_total gauge
clawbot_rooms_total ${matrixClient.getRooms().length}

# HELP clawbot_conversations_total Number of active conversations
# TYPE clawbot_conversations_total gauge
clawbot_conversations_total ${conversations.size}

# HELP clawbot_e2ee_enabled Whether E2EE is enabled
# TYPE clawbot_e2ee_enabled gauge
clawbot_e2ee_enabled ${e2eeEnabled ? 1 : 0}
      `.trim());
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.port, () => {
    console.log(`Health server listening on port ${config.port}`);
  });
}

// Main startup
async function main() {
  console.log('Starting ClawChat Bot...');
  console.log(`Homeserver: ${config.matrixHomeserver}`);
  console.log(`Bot User: ${config.matrixUserId}`);
  console.log(`Device ID: ${config.matrixDeviceId}`);
  console.log(`Model: ${config.model}`);
  console.log(`E2EE Config: ${config.enableE2EE ? 'enabled' : 'disabled'}`);

  // Initialize E2EE
  e2eeEnabled = await initializeCrypto();
  console.log(`E2EE Status: ${e2eeEnabled ? '🔒 Enabled' : '🔓 Disabled'}`);

  // Set up event handlers
  matrixClient.on(sdk.RoomEvent.Timeline, handleMessage);
  matrixClient.on(sdk.RoomMemberEvent.Membership, handleInvite);
  matrixClient.on(sdk.RoomStateEvent.Events, handleEncryption);

  // Start Matrix client
  await matrixClient.startClient({ initialSyncLimit: 10 });

  // Wait for initial sync
  await new Promise<void>((resolve) => {
    matrixClient.once(sdk.ClientEvent.Sync, (state) => {
      if (state === 'PREPARED') {
        console.log('Matrix client synced and ready');
        resolve();
      }
    });
  });

  // Start health check server
  startHealthServer();

  const encryptedRooms = matrixClient.getRooms().filter(r => r.hasEncryptionStateEvent()).length;
  console.log(`Bot is running!`);
  console.log(`  - Total rooms: ${matrixClient.getRooms().length}`);
  console.log(`  - Encrypted rooms: ${encryptedRooms}`);
}

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  matrixClient.stopClient();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  matrixClient.stopClient();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
