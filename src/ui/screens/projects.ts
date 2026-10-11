import type { ProjectStatus } from '../../domain/types.ts';
import type { ProjectFilter } from '../../state/projects-model.ts';
import { el } from '../components/dom.ts';
import { loadDialog } from '../components/lazy.ts';
import type { ArchiveDialog } from '../components/archive-dialog.ts';
import type { CreateProjectDialog } from '../components/create-project-dialog.ts';
import type { EditProjectDialog } from '../components/edit-project-dialog.ts';
import { icon } from '../components/icons.ts';
import type { PauseProjectDialog } from '../components/pause-project-dialog.ts';
import type { ShipProjectDialog } from '../components/ship-project-dialog.ts';
import type { ProjectRow, ProjectTable, RowAction } from '../components/table.ts';
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
  onAction(id: string, action: RowAction): void;
  onQuery(query: string): void;
  onToggle(status: ProjectStatus): void;
  onReset(): void;
  onRetry(): void;
}

export interface ProjectsScreen {
  /** The screen root, so the controller can tell whether it is still on the page. */
  root: HTMLElement;
  create: CreateProjectDialog;
  edit: EditProjectDialog;
  pause: PauseProjectDialog;
  ship: ShipProjectDialog;
  archive: ArchiveDialog;
  show(view: ProjectsView): void;
  setLoading(): void;
  setError(message: string): void;
  /** Says what just happened, visibly and to screen readers. */
  announce(message: string): void;
  /** Moves focus to the list heading after a save, since the row it came from may be gone. */
  focusList(): void;
}

function createEl<T extends HTMLElement>(tag: string): T {
  return document.createElement(tag) as T;
}

export function mountProjects(main: HTMLElement, handlers: ProjectsHandlers): ProjectsScreen {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Projects');
  h1.id = 'page-title';
  const tools = el('div', 'fl-pagehead__tools');
  const create = document.createElement('fl-create-project-dialog') as CreateProjectDialog;
  const newButton = el('button', 'fl-btn fl-btn--primary');
  newButton.type = 'button';
  newButton.append(icon('plus'), document.createTextNode('New project'));
  newButton.addEventListener('click', () => void loadDialog('fl-create-project-dialog').then(() => create.open()));
  tools.append(newButton);
  head.append(h1, tools);

  const panel = el('section', 'fl-panel fl-panel--flush');
  panel.setAttribute('aria-labelledby', 'h-projects');
  const bar = el('div', 'fl-projects__bar');
  const h2 = el('h2', null, 'All projects');
  h2.id = 'h-projects';
  h2.tabIndex = -1;
  const count = el('p', 'fl-projects__count');
  count.setAttribute('role', 'status');
  bar.append(h2, count);
  const status = el('p', 'fl-projects__status');
  status.setAttribute('aria-live', 'polite');

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
  const table = createEl<ProjectTable>('fl-project-table');
  table.setAttribute('caption', 'Projects, sorted by name');
  panel.addEventListener('fl-project-action', (event) => {
    const { id, action } = (event as CustomEvent<{ id: string; action: RowAction }>).detail;
    handlers.onAction(id, action);
  });
  panel.append(bar, status, toolbar, body);

  const edit = createEl<EditProjectDialog>('fl-edit-project-dialog');
  const pause = createEl<PauseProjectDialog>('fl-pause-project-dialog');
  const ship = createEl<ShipProjectDialog>('fl-ship-project-dialog');
  const archive = createEl<ArchiveDialog>('fl-archive-dialog');
  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, panel, create, edit, pause, ship, archive);
  document.title = 'Projects · Finishlyne';

  const box = (className: string): HTMLElement => el('div', `fl-empty fl-projects__empty ${className}`);

  return {
    root: panel,
    create,
    edit,
    pause,
    ship,
    archive,
    announce(message) {
      status.textContent = message;
    },
    focusList() {
      h2.focus();
    },
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
