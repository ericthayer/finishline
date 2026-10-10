import { define, el, emit } from './dom.ts';
import { icon } from './icons.ts';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'fl-theme';

/** Applies the remembered theme; dark is the default. Call before first paint. */
export function applySavedTheme(root: HTMLElement = document.documentElement): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') root.dataset['theme'] = saved;
  } catch {
    // Storage blocked: stay on the default.
  }
}

/** <fl-theme-toggle> · flips data-theme on <html> · fires fl-theme-change {theme}. */
export class ThemeToggle extends HTMLElement {
  connectedCallback(): void {
    const root = document.documentElement;
    const button = el('button', 'fl-iconbtn');
    button.type = 'button';
    const paint = (): void => {
      const light = root.dataset['theme'] === 'light';
      button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
      button.replaceChildren(icon(light ? 'moon' : 'sun'));
    };
    button.addEventListener('click', () => {
      const theme: Theme = root.dataset['theme'] === 'light' ? 'dark' : 'light';
      root.dataset['theme'] = theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Storage blocked: the choice lasts for this page only.
      }
      paint();
      emit(this, 'fl-theme-change', { theme });
    });
    paint();
    this.replaceChildren(button);
  }
}

define('fl-theme-toggle', ThemeToggle);
