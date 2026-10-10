import { el } from '../components/dom.ts';

const COPY: Readonly<Record<string, { title: string; body: string }>> = {
  projects: { title: 'Projects', body: 'Search and filter every project. Arrives in Phase 1 with capture and the lifecycle.' },
  project: { title: 'Resume', body: 'The project detail and handoff brief. Arrives in Phase 2.' },
  inbox: { title: 'Inbox', body: 'Triage captured ideas. Arrives in Phase 1.' },
  archive: { title: 'Archive', body: 'Shipped and archived projects. Arrives in Phase 1.' },
  settings: { title: 'Settings', body: 'GitHub connection, stale thresholds and the WIP cap. Arrives with Phases 3 and 4.' },
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
