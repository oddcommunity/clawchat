/**
 * Polyfills required for matrix-js-sdk in React Native
 *
 * Import this file at the very top of your app entry point
 */

import { Buffer } from 'buffer';

// @ts-ignore - global assignment for polyfills
global.Buffer = global.Buffer || Buffer;

// TextEncoder/TextDecoder polyfills if needed
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

export {};
