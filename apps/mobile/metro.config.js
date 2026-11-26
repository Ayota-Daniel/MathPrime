const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Expo configure la résolution des workspaces et ses dossiers surveillés.
const config = getDefaultConfig(__dirname);
// s'assurer que les .wav (bruitages) sont empaquetés comme assets
if (!config.resolver.assetExts.includes('wav')) config.resolver.assetExts.push('wav');

module.exports = withNativeWind(config, { input: './global.css' });
