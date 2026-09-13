export type Theme = 'light' | 'dark';
export type ThemePref = Theme | 'system';

export const THEME_KEY = 'btl_theme';

export const systemTheme = (): Theme =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export const resolveTheme = (pref: ThemePref): Theme =>
  pref === 'system' ? systemTheme() : pref;

export function readThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private mode / blocked storage — fall back to following the OS.
  }
  return 'system';
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', theme);
  // Keep the browser/PWA chrome in step with the page, otherwise a dark page
  // sits under a cream status bar on iOS.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#14110F' : '#FFFAF4');
}

/**
 * Runs before first paint, inlined in the document head. Without it the page
 * renders light and then snaps to dark once React hydrates, which is the exact
 * full-brightness flash dark mode exists to avoid.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_KEY}');var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
