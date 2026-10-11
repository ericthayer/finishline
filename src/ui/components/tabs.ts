import { el, uid } from './dom.ts';

// ARIA tabs with a roving tabindex: arrows, Home and End move between tabs and select them.

export interface TabSpec<K extends string> {
  key: K;
  label: string;
}

export interface Tabs<K extends string> {
  list: HTMLElement;
  panels: ReadonlyMap<K, HTMLElement>;
  select(key: K, focus?: boolean): void;
}

export function tabs<K extends string>(specs: readonly TabSpec<K>[], initial: K, onSelect: (key: K) => void): Tabs<K> {
  const prefix = `fl-tab-${uid()}`;
  const list = el('div', 'fl-tabs');
  list.setAttribute('role', 'tablist');
  const buttons = new Map<K, HTMLButtonElement>();
  const panels = new Map<K, HTMLElement>();

  for (const spec of specs) {
    const tab = el('button', 'fl-tabs__tab', spec.label);
    tab.type = 'button';
    tab.id = `${prefix}-${spec.key}`;
    tab.setAttribute('role', 'tab');
    const panel = el('div', 'fl-tabs__panel');
    panel.id = `${prefix}-${spec.key}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.setAttribute('aria-controls', panel.id);
    tab.addEventListener('click', () => select(spec.key));
    buttons.set(spec.key, tab);
    panels.set(spec.key, panel);
    list.append(tab);
  }

  const keys = specs.map((s) => s.key);
  list.addEventListener('keydown', (event) => {
    const current = keys.findIndex((k) => buttons.get(k) === document.activeElement);
    if (current < 0) return;
    const last = keys.length - 1;
    const next =
      event.key === 'ArrowRight' ? (current + 1) % keys.length
      : event.key === 'ArrowLeft' ? (current + last) % keys.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    const key = keys[next];
    if (key === undefined) return;
    event.preventDefault();
    select(key, true);
  });

  function select(key: K, focus = false): void {
    for (const [k, tab] of buttons) {
      const on = k === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = panels.get(k);
      if (panel) panel.hidden = !on;
      if (on && focus) tab.focus();
    }
    onSelect(key);
  }

  select(initial);
  return { list, panels, select };
}
