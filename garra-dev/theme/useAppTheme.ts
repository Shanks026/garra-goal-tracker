import { useColorScheme } from 'nativewind';

import { dark, light } from './tokens';

// Selector hook (04-hooks.md §1) — resolves NativeWind's own color-scheme state to the
// matching raw token object, for consumers that can't take a className: Skia draws,
// StyleSheet values, anything needing an actual hex/rgba string.
export function useAppTheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const resolved = colorScheme === 'dark' ? 'dark' : 'light';

  return {
    colorScheme: resolved,
    tokens: resolved === 'dark' ? dark : light,
    setColorScheme,
    toggleColorScheme,
  };
}
