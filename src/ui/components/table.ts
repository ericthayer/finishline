import type { ProjectStatus } from '../../domain/types.ts';
import { DataElement, define, el, emit } from './dom.ts';
import { staleBadge, statusPill, type StaleLevel } from './status.ts';

export interface ProjectRow {
  /** Project id. When set, the row shows an Edit button that fires fl-project-edit {id}. */
  id?: string;
  name: string;
  key?: string;
  href?: string;
  status: ProjectStatus;
  next?: string;
  platform?: string;
  /** Omit for shipped and archived projects; they show no badge. */
  stale?: { level: StaleLevel; days: number; label?: string };
  updated?: string;
}

const COLUMNS: readonly { label: string; col?: string }[] = [
  { label: 'Project' },
  { label: 'Status' },
  { label: 'Next action', col: 'next' },
  { label: 'Agent', col: 'agent' },
  { label: 'Last progress' },
  { label: 'Updated' },
];

/** <fl-project-table caption> · `.rows` = ProjectRow[] */
export class ProjectTable extends DataElement<ProjectRow> {
  set rows(value: readonly ProjectRow[]) {
    this.setData(value);
  }
  get rows(): readonly ProjectRow[] {
    return this.data;
  }

  protected render(): void {
    const caption = this.getAttribute('caption') || 'Projects';
    const table = el('table', 'fl-table');
    table.append(el('caption', 'fl-sr', caption));

    const head = el('tr');
    for (const c of COLUMNS) {
      const th = el('th', null, c.label);
      th.scope = 'col';
      if (c.col) th.dataset['col'] = c.col;
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);

    const tbody = el('tbody');
    for (const r of this.data) {
      const name = el('div', 'fl-table__name');
      const link = el('a', null, r.name);
      link.href = r.href ?? '#';
      name.append(link, el('span', null, r.key ?? ''));
      if (r.id) {
        const id = r.id;
        const edit = el('button', 'fl-btn fl-btn--quiet fl-table__edit', 'Edit');
        edit.type = 'button';
        edit.setAttribute('aria-label', `Edit ${r.name}`);
        edit.addEventListener('click', () => emit(this, 'fl-project-edit', { id }));
        name.append(edit);
      }
      const nameCell = el('td');
      nameCell.append(name);

      const statusCell = el('td');
      statusCell.append(statusPill(r.status));

      const next = el('td', 'fl-table__next', r.next || '—');
      next.dataset['col'] = 'next';
      if (r.next) next.title = r.next;

      const agent = el('td', 'fl-muted', r.platform || '—');
      agent.dataset['col'] = 'agent';

      const progress = el('td');
      if (r.stale) progress.append(staleBadge(r.stale.level, r.stale.days, r.stale.label));
      else progress.textContent = '—';

      const row = el('tr');
      row.append(nameCell, statusCell, next, agent, progress, el('td', 'fl-muted', r.updated ?? ''));
      tbody.append(row);
    }
    table.append(thead, tbody);

    const wrap = el('div', 'fl-tablewrap');
    wrap.tabIndex = 0;
    wrap.setAttribute('aria-label', `${caption}, scrollable`);
    wrap.append(table);
    this.replaceChildren(wrap);
  }
}

define('fl-project-table', ProjectTable);
