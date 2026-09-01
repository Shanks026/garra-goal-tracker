import type { ExpoConfig } from 'expo/config';

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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', 'expo-sqlite', 'expo-secure-store', '@sentry/react-native'],
};

export default config;
