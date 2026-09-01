module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // Inlines .sql migration files as string literals — Metro's default transform
      // can't handle non-JS source, so this must run before anything else touches them.
      ['inline-import', { extensions: ['.sql'] }],
      // reanimated/plugin must stay last — it rewrites worklets and needs every
      // other transform to have already run.
      'react-native-reanimated/plugin',
    ],
  };
};
