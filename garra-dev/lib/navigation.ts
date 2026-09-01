import type { Router } from 'expo-router';

/** expo-router's own href type, taken from `replace`'s signature rather than restated. */
export type Href = Parameters<Router['replace']>[0];

/**
 * `router.back()` is only safe when there's something to pop. Both the Window and Load Check
 * screens are reachable via `router.replace` from the cold-start router (a resumed draft arc),
 * where the history is empty and a bare `back()` does nothing — leaving the user stuck on a
 * screen whose button appears broken.
 */
export function safeBack(router: Router, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
