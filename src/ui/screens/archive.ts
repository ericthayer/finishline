import type { ArchiveModel } from '../../state/archive-model.ts';
import '../components/archive-list.ts';
import type { ArchiveList } from '../components/archive-list.ts';
import { el } from '../components/dom.ts';
import type { ReopenDialog } from '../components/reopen-dialog.ts';

// Archive (`/archive`): shipped and archived projects, out of the way, each one Reopen away from Ready.
// Reuses the Inbox panel and list layout; no new styles.

export interface ArchiveScreen {
  /** Screen root; reopen events bubble here. */
  root: HTMLElement;
  reopen: ReopenDialog;
  setLoading(): void;
  setError(message: string, retry: () => void): void;
  setItems(model: ArchiveModel): void;
  /** Says what just happened, visibly and to screen readers. */
  announce(message: string): void;
  /** Puts focus back in the list after an item leaves it. */
  focusAfterMove(index: number): void;
}

export function mountArchive(main: HTMLElement): ArchiveScreen {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Archive');
  h1.id = 'page-title';
  head.append(h1);

  const section = el('section', 'fl-panel fl-panel--flush');
  section.setAttribute('aria-labelledby', 'h-closed');
  const panelHead = el('div', 'fl-panel__head');
  const heading = el('h2', null, 'Shipped and archived');
  heading.id = 'h-closed';
  heading.tabIndex = -1;
  const count = el('span', 'fl-muted fl-inbox__count');
  panelHead.append(heading, count);
  const status = el('p', 'fl-inbox__status');
  status.setAttribute('role', 'status');
  const body = el('div', 'fl-inbox__body');
  section.append(panelHead, status, body);
  const list = document.createElement('fl-archive-list') as ArchiveList;
  const reopen = document.createElement('fl-reopen-dialog') as ReopenDialog;

  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, section, reopen);
  document.title = 'Archive · Finishlyne';

  const box = (): HTMLElement => el('div', 'fl-empty fl-inbox__empty');

  return {
    root: section,
    reopen,
    setLoading() {
      count.textContent = '';
      const loading = box();
      loading.setAttribute('aria-busy', 'true');
      loading.append(el('p', null, 'Loading closed projects…'));
      body.replaceChildren(loading);
    },
    setError(message, retry) {
      count.textContent = '';
      const failed = box();
      failed.setAttribute('role', 'alert');
      const button = el('button', 'fl-btn fl-btn--secondary', 'Try again');
      button.type = 'button';
      button.addEventListener('click', retry);
      failed.append(el('h3', null, 'Archive did not load'), el('p', null, message), button);
      body.replaceChildren(failed);
    },
    setItems(model) {
      count.textContent = model.items.length ? `${model.shipped} shipped · ${model.archived} archived` : '';
      if (!model.items.length) {
        const empty = box();
        empty.append(el('h3', null, 'Nothing closed yet'), el('p', null, 'Projects you ship or archive land here. Reopen one to send it back to Ready.'));
        body.replaceChildren(empty);
        return;
      }
      list.items = model.items;
      if (list.parentElement !== body) body.replaceChildren(list);
    },
    announce(message) {
      status.textContent = message;
    },
    focusAfterMove(index) {
      if (!list.isConnected || !list.focusAt(index)) heading.focus();
    },
  };
}
