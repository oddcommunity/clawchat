/**
 * ClawChat Configuration
 *
 * Environment-specific settings for the app
 */

import Constants from 'expo-constants';

// Get config from app.json extra or use defaults
const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  // Matrix homeserver URL
  // In development, this might be localhost or a local IP
  // In production, this should be your deployed Synapse server
  matrixHomeserver: extra.matrixHomeserver ?? 'https://matrix.clawchat.io',

  // Bot user ID to chat with
  // This should match the Matrix user ID of your clawdbot instance
  botUserId: '@clawbot:clawchat.io',

  // App metadata
  appName: 'ClawChat',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
} as const;

// Development overrides
if (__DEV__) {
  // Uncomment and modify for local development
  // config.matrixHomeserver = 'http://localhost:8008';
  // config.botUserId = '@clawbot:localhost';
}

export default config;
