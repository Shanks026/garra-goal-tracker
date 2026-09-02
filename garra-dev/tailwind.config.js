// Theme is generated from theme/tokens.ts, not hand-duplicated here — see
// .claude/rules/02-ui-components.md §7. tokens.ts is TypeScript (uses `as const`), which
// plain Node can't parse, so tsx registers a loader before requiring it.
//
// ⚠️ The loader MUST be unregistered immediately afterwards. metro.config.js loads this file
// (via withNativeWind), so a hook left installed here lives for the whole life of the Metro
// process — and tsx makes every subsequent `require()` probe .ts/.tsx/.mts/.cts at every
// node_modules level. Metro resolves thousands of modules, so the extra `stat()` calls compound
// until the dev server never finishes starting: a CPU profile of the wedged process showed ~55%
// of samples in `internalModuleStat` and ~17% in Node's cjs/loader. Register, read, unregister.
const unregisterTsx = require('tsx/cjs/api').register();
const { dark, light, ACCENTS, system, radii, layout, controls } = require('./theme/tokens.ts');
unregisterTsx();

function kebab(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// NativeWind's dark mode is Tailwind's standard `dark:` *variant* on utility classes
// (compiles to a real `:is(.dark *)` selector) — confirmed working. A custom base-layer
// selector holding CSS custom properties (the web pattern for "one token, two values") is
// NOT honored by NativeWind's native compiler — it silently drops anything under a
// non-`:root` selector. So each semantic color gets two literal Tailwind color names
// instead of one variable: the plain name is the light value, `*-dark` is the dark value,
// used together as `className="bg-bg dark:bg-bg-dark"`. Three tokens exist only in dark
// (fillStrong, handle, borderSelectedHi — no light value in the rule file) and get just
// the one name.
function themedColors(lightObj, darkObj) {
  const out = {};
  const keys = new Set([...Object.keys(lightObj), ...Object.keys(darkObj)]);
  for (const key of keys) {
    if (key === 'cardShadow') continue; // a box-shadow value, not a color — see rules/01 §5
    const name = kebab(key);
    if (key in lightObj) out[name] = lightObj[key];
    if (key in darkObj) out[key in lightObj ? `${name}-dark` : name] = darkObj[key];
  }
  return out;
}

const staticColors = Object.fromEntries([
  ...Object.entries(ACCENTS),
  ...Object.entries(system).filter(([, value]) => typeof value === 'string'),
]);

const borderRadius = Object.fromEntries(
  Object.entries(radii).map(([key, value]) => [kebab(key), `${value}px`]),
);

const spacing = Object.fromEntries(
  Object.entries({ ...layout, ...controls })
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => [kebab(key), `${value}px`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './sheets/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...themedColors(light, dark), ...staticColors },
      borderRadius,
      spacing,
    },
  },
};
