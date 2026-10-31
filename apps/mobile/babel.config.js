module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Reanimated v4 : garder CE plugin uniquement. NE PAS ajouter 'react-native-worklets/plugin'
    // séparément (il est déjà inclus) -> sinon "Duplicate plugin/preset detected".
    plugins: ['react-native-reanimated/plugin'],
  };
};
