module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // reanimated/plugin must stay last — it rewrites worklets and needs every
    // other transform to have already run.
    plugins: ['react-native-reanimated/plugin'],
  };
};
