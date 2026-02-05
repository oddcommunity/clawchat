const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// matrix-js-sdk requires some Node.js polyfills
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
  crypto: require.resolve('react-native-crypto'),
  buffer: require.resolve('buffer'),
};

// Ensure .cjs files are resolved (some matrix-js-sdk deps use them)
config.resolver.sourceExts.push('cjs');

module.exports = config;
