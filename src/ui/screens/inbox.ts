import type { InboxModel } from '../../state/inbox-model.ts';
import type { ArchiveDialog } from '../components/archive-dialog.ts';
import type { CaptureForm } from '../components/capture-form.ts';
import { el } from '../components/dom.ts';
import type { InboxList } from '../components/inbox-list.ts';
import type { PromoteDialog } from '../components/promote-dialog.ts';

// Inbox (`/inbox`): capture on the left, ideas to triage on the right. The capture panel
// works while the list loads or fails, so a slow network never blocks getting an idea down.

export interface InboxScreen {
  /** Screen root; triage events bubble here. */
  root: HTMLElement;
  capture: CaptureForm;
  promote: PromoteDialog;
  archive: ArchiveDialog;
  setLoading(): void;
  setError(message: string, retry: () => void): void;
  setItems(model: InboxModel): void;
  /** Says what just happened, visibly and to screen readers. */
  announce(message: string): void;
  /** Puts focus back in the list after an item leaves it. */
  focusAfterMove(index: number): void;
}

function create<T extends HTMLElement>(tag: string): T {
  return document.createElement(tag) as T;
}

function panel(title: string, id: string, className: string): { section: HTMLElement; head: HTMLElement; heading: HTMLElement } {
  const section = el('section', `fl-panel ${className}`);
  section.setAttribute('aria-labelledby', id);
  const head = el('div', 'fl-panel__head');
  const heading = el('h2', null, title);
  heading.id = id;
  head.append(heading);
  section.append(head);
  return { section, head, heading };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function mountInbox(main: HTMLElement): InboxScreen {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Inbox');
  h1.id = 'page-title';
  head.append(h1);

  const capturePanel = panel('Capture', 'h-capture', 'fl-span-4');
  const capture = create<CaptureForm>('fl-capture-form');
  capturePanel.section.append(capture);

  const ideas = panel('Ideas to triage', 'h-ideas', 'fl-panel--flush fl-span-8');
  ideas.heading.tabIndex = -1;
  const count = el('span', 'fl-muted fl-inbox__count');
  ideas.head.append(count);
  const status = el('p', 'fl-inbox__status');
  status.setAttribute('role', 'status');
  const body = el('div', 'fl-inbox__body');
  const list = create<InboxList>('fl-inbox-list');
  ideas.section.append(status, body);

  const promote = create<PromoteDialog>('fl-promote-dialog');
  const archive = create<ArchiveDialog>('fl-archive-dialog');

  const dash = el('div', 'fl-dash');
  dash.append(capturePanel.section, ideas.section);
  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, dash, promote, archive);
  document.title = 'Inbox · Finishlyne';

  return {
    root: dash,
    capture,
    promote,
    archive,
    setLoading() {
      count.textContent = '';
      const box = el('div', 'fl-empty fl-inbox__empty');
      box.setAttribute('aria-busy', 'true');
      box.append(el('p', null, 'Loading your ideas…'));
      body.replaceChildren(box);
    },
    setError(message, retry) {
      count.textContent = '';
      const box = el('div', 'fl-empty fl-inbox__empty');
      box.setAttribute('role', 'alert');
      const button = el('button', 'fl-btn fl-btn--secondary', 'Try again');
      button.type = 'button';
      button.addEventListener('click', retry);
      box.append(el('h3', null, 'Ideas did not load'), el('p', null, message), button);
      body.replaceChildren(box);
    },
    setItems(model) {
      const n = model.items.length;
      count.textContent = n ? [plural(n, 'idea'), model.staleCount ? `${model.staleCount} past triage age` : ''].filter(Boolean).join(' · ') : '';
      if (!n) {
        const box = el('div', 'fl-empty fl-inbox__empty');
        box.append(
          el('h3', null, 'Inbox zero'),
          el('p', null, 'Nothing is waiting for a decision. Capture an idea here, or press / on any screen.'),
        );
        body.replaceChildren(box);
        return;
      }
      list.items = model.items;
      if (list.parentElement !== body) body.replaceChildren(list);
    },
    announce(message) {
      status.textContent = message;
    },
    focusAfterMove(index) {
      if (!list.isConnected || !list.focusAt(index)) ideas.heading.focus();
    },
  };
}
