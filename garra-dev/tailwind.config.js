/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './sheets/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    // Left empty on purpose. Phase 1 generates this from theme/tokens.ts —
    // hardcoding values here would create a second source of truth.
  },
  plugins: [],
};
