// Monorepo + NativeWind. watchFolders pointe la racine pour résoudre @shortest/*.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;
// s'assurer que les .wav (bruitages) sont empaquetés comme assets
if (!config.resolver.assetExts.includes('wav')) config.resolver.assetExts.push('wav');

module.exports = withNativeWind(config, { input: './global.css' });
