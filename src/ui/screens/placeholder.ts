import { el } from '../components/dom.ts';

const COPY: Readonly<Record<string, { title: string; body: string }>> = {
  project: { title: 'Resume', body: 'The project detail and handoff brief. Arrives in Phase 2.' },
  'load-failed': { title: 'Not loaded', body: 'This screen did not load. Check your connection, then reload the page.' },
  'not-found': { title: 'Not found', body: 'Nothing lives at this address.' },
};

/** Stand-in for screens later phases build, so navigation works end to end today. */
export function renderPlaceholder(main: HTMLElement, name: string): void {
  const copy = COPY[name] ?? COPY['not-found'] ?? { title: '', body: '' };
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, copy.title);
  h1.id = 'page-title';
  head.append(h1);
  const panel = el('section', 'fl-panel fl-empty');
  const back = el('a', 'fl-link', 'Back to Overview');
  back.href = '/';
  panel.append(el('p', null, copy.body), back);
  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, panel);
  document.title = `${copy.title} · Finishlyne`;
}
