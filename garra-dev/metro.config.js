const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Drizzle migrations ship as .sql files bundled into the app.
config.resolver.assetExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
