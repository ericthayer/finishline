import type { ProjectStatus } from '../../domain/types.ts';
import type { ProjectFilter } from '../../state/projects-model.ts';
import { el } from '../components/dom.ts';
import { icon } from '../components/icons.ts';
import type { ProjectRow, ProjectTable } from '../components/table.ts';
import { STATUS_LABEL } from '../components/status.ts';

// Projects (`/projects`): a search field, status chips and the table. The toolbar is built once,
// so typing never loses focus; `show` only updates the chips, the count and the results.

const ORDER: readonly ProjectStatus[] = ['idea', 'ready', 'active', 'paused', 'shipped', 'archived'];

export interface ProjectsView {
  total: number;
  rows: readonly ProjectRow[];
  filter: ProjectFilter;
  /** True when the list shows fewer projects than exist (search, status chips or hidden closed projects). */
  filtered: boolean;
}

export interface ProjectsHandlers {
  onQuery(query: string): void;
  onToggle(status: ProjectStatus): void;
  onReset(): void;
  onRetry(): void;
}

export interface ProjectsScreen {
  /** The screen root, so the controller can tell whether it is still on the page. */
  root: HTMLElement;
  show(view: ProjectsView): void;
  setLoading(): void;
  setError(message: string): void;
}

function create<T extends HTMLElement>(tag: string): T {
  return document.createElement(tag) as T;
}

export function mountProjects(main: HTMLElement, handlers: ProjectsHandlers): ProjectsScreen {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Projects');
  h1.id = 'page-title';
  head.append(h1);

  const panel = el('section', 'fl-panel fl-panel--flush');
  panel.setAttribute('aria-labelledby', 'h-projects');
  const bar = el('div', 'fl-projects__bar');
  const h2 = el('h2', null, 'All projects');
  h2.id = 'h-projects';
  const count = el('p', 'fl-projects__count');
  count.setAttribute('role', 'status');
  bar.append(h2, count);

  const search = el('input');
  search.type = 'search';
  search.name = 'q';
  search.id = 'projects-q';
  search.autocomplete = 'off';
  search.placeholder = 'Search by name';
  const searchLabel = el('label', 'fl-sr', 'Search projects by name');
  searchLabel.htmlFor = search.id;
  search.addEventListener('input', () => handlers.onQuery(search.value));
  const form = el('form', 'fl-projects__search');
  form.setAttribute('role', 'search');
  form.setAttribute('aria-label', 'Filter projects');
  form.addEventListener('submit', (event) => event.preventDefault());
  form.append(icon('search'), searchLabel, search);

  const group = el('div', 'fl-projects__chips');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Filter by status');
  const chips = new Map<ProjectStatus, HTMLButtonElement>();
  for (const status of ORDER) {
    const chip = el('button', 'fl-chip', STATUS_LABEL[status]);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => handlers.onToggle(status));
    chips.set(status, chip);
    group.append(chip);
  }
  const toolbar = el('div', 'fl-projects__toolbar');
  toolbar.append(form, group);

  const body = el('div', 'fl-projects__body');
  const table = create<ProjectTable>('fl-project-table');
  table.setAttribute('caption', 'Projects, sorted by name');
  panel.append(bar, toolbar, body);

  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, panel);
  document.title = 'Projects · Finishlyne';

  const box = (className: string): HTMLElement => el('div', `fl-empty fl-projects__empty ${className}`);

  return {
    root: panel,
    show(view) {
      for (const [status, chip] of chips) chip.setAttribute('aria-pressed', String(view.filter.statuses.has(status)));
      if (search.value !== view.filter.query) search.value = view.filter.query;

      if (view.total === 0) {
        count.textContent = '';
        const empty = box('');
        const start = el('a', 'fl-btn fl-btn--primary');
        start.href = '/inbox';
        start.append(icon('plus'), document.createTextNode('Capture your first idea'));
        empty.append(el('h3', null, 'No projects yet'), el('p', null, 'Capture an idea in the Inbox, then promote it to Ready when it has a finish line.'), start);
        body.replaceChildren(empty);
        return;
      }

      if (view.rows.length === 0) {
        count.textContent = 'No projects match.';
        const empty = box('');
        const clear = el('button', 'fl-btn fl-btn--secondary', 'Clear search and filters');
        clear.type = 'button';
        clear.addEventListener('click', handlers.onReset);
        empty.append(el('h3', null, 'Nothing matches'), el('p', null, 'Try another name, or show more statuses.'), clear);
        body.replaceChildren(empty);
        return;
      }

      count.textContent = view.filtered ? `${view.rows.length} of ${view.total} projects` : `${view.total} projects`;
      table.rows = view.rows;
      if (table.parentElement !== body) body.replaceChildren(table);
    },

    setLoading() {
      count.textContent = '';
      const loading = box('');
      loading.setAttribute('aria-busy', 'true');
      loading.append(el('p', null, 'Loading your projects…'));
      body.replaceChildren(loading);
    },

    setError(message) {
      count.textContent = '';
      const failed = box('');
      failed.setAttribute('role', 'alert');
      const retry = el('button', 'fl-btn fl-btn--secondary', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', handlers.onRetry);
      failed.append(el('h3', null, 'Projects did not load'), el('p', null, message), retry);
      body.replaceChildren(failed);
    },
  };
}
