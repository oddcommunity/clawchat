/**
 * ClawChat Bot - Simple Matrix Bot with Claude AI
 *
 * This is a minimal standalone bot implementation.
 * For production, use the full clawdbot/openclaw with the Matrix plugin.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as sdk from 'matrix-js-sdk';
import { createServer } from 'http';

// Configuration from environment
const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  matrixHomeserver: process.env.MATRIX_HOMESERVER || 'http://synapse:8008',
  matrixUserId: process.env.MATRIX_USER_ID || '@clawbot:clawchat.io',
  matrixAccessToken: process.env.MATRIX_ACCESS_TOKEN!,
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  port: parseInt(process.env.PORT || '3000', 10),
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

// Initialize clients
const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const matrixClient = sdk.createClient({
  baseUrl: config.matrixHomeserver,
  accessToken: config.matrixAccessToken,
  userId: config.matrixUserId,
});

// Simple conversation memory (per-room)
const conversations: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();

// Handle incoming messages
async function handleMessage(event: sdk.MatrixEvent, room: sdk.Room) {
  // Ignore our own messages
  if (event.getSender() === config.matrixUserId) return;

  // Only handle text messages
  if (event.getType() !== 'm.room.message') return;
  const content = event.getContent();
  if (content.msgtype !== 'm.text') return;

  const roomId = room.roomId;
  const userMessage = content.body;
  const sender = event.getSender();

  console.log(`[${roomId}] ${sender}: ${userMessage}`);

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
      system: `You are ClawChat AI, a helpful and friendly assistant. You're chatting with users through a messaging app. Keep responses concise and conversational. The current user's Matrix ID is ${sender}.`,
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
    await matrixClient.sendTextMessage(roomId, assistantMessage);

    console.log(`[${roomId}] Bot: ${assistantMessage.substring(0, 100)}...`);
  } catch (error) {
    console.error('Error calling Claude:', error);
    matrixClient.sendTyping(roomId, false, 0);
    await matrixClient.sendTextMessage(
      roomId,
      "I'm having trouble processing that right now. Please try again."
    );
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
    } catch (error) {
      console.error(`Failed to join room ${roomId}:`, error);
    }
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
      }));
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
  console.log(`Model: ${config.model}`);

  // Set up event handlers
  matrixClient.on(sdk.RoomEvent.Timeline, handleMessage);
  matrixClient.on(sdk.RoomMemberEvent.Membership, handleInvite);

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

  console.log(`Bot is running! Joined ${matrixClient.getRooms().length} rooms.`);
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
