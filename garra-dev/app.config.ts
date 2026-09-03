import type { ExpoConfig } from 'expo/config';

// Even native config reads its colors from the token file — rules/01 §10 admits no exceptions,
// and the value here was previously an Expo template default (a pale blue that appears nowhere
// in Garra's palette). Expo's config evaluator transpiles this file but does NOT resolve
// TypeScript imports from it, so tokens load via the same `tsx` register that
// tailwind.config.js uses (rules/02 §7) rather than a plain `import`.
/* eslint-disable @typescript-eslint/no-require-imports -- Expo's config evaluator requires this
   file with plain CJS and no TS path resolution, so `import` cannot reach theme/tokens.ts. */
// ⚠️ Unregister immediately after reading — see the long note in tailwind.config.js. `expo start`
// evaluates this file in the same process that then runs Metro, so a hook left installed makes
// every later `require()` probe four extra extensions per node_modules level and the dev server
// never finishes starting.
const unregisterTsx = require('tsx/cjs/api').register();
const { dark } = require('./theme/tokens.ts') as typeof import('./theme/tokens');
unregisterTsx();
/* eslint-enable @typescript-eslint/no-require-imports */

const config: ExpoConfig = {
  name: 'Garra',
  slug: 'garra',
  scheme: 'garra',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.chrisaustin.garra',
  },
  android: {
    package: 'com.chrisaustin.garra',
    adaptiveIcon: {
      backgroundColor: dark.bg,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  // expo-font added by hand: `expo install` can't write to a dynamic app.config.ts and printed
  // the block to add. It's native, so adding it requires a new dev build.
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    'expo-font',
    '@sentry/react-native',
  ],
};

export default config;
