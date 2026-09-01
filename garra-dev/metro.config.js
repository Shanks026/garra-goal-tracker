const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Drizzle migrations ship as .sql files, inlined as strings via babel-plugin-inline-import
// (babel.config.js) — they need to be source, not an opaque asset like an image.
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
