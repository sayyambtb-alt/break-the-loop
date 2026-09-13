import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readThemePref, resolveTheme, applyTheme, THEME_KEY, THEME_INIT_SCRIPT } from '../app/lib/theme';

function mockPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('dark') ? dark : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('follows the OS when the user has not chosen', () => {
    mockPrefersDark(true);
    expect(readThemePref()).toBe('system');
    expect(resolveTheme('system')).toBe('dark');

    mockPrefersDark(false);
    expect(resolveTheme('system')).toBe('light');
  });

  it('honours an explicit choice over the OS', () => {
    mockPrefersDark(true);
    window.localStorage.setItem(THEME_KEY, 'light');
    expect(readThemePref()).toBe('light');
    expect(resolveTheme('light')).toBe('light');
  });

  it('ignores junk in storage rather than throwing', () => {
    mockPrefersDark(false);
    window.localStorage.setItem(THEME_KEY, 'neon');
    expect(readThemePref()).toBe('system');
  });

  it('stamps the root element and keeps the browser chrome in step', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    mockPrefersDark(false);
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#14110F');

    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(meta.getAttribute('content')).toBe('#FFFAF4');

    meta.remove();
  });

  it('has a pre-paint script that sets the theme without touching React', () => {
    // This runs in <head> before hydration; if it throws, every visitor gets a
    // flash of the wrong theme.
    mockPrefersDark(true);
    expect(() => new Function(THEME_INIT_SCRIPT)()).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
