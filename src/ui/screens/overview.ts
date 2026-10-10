import type { OverviewModel } from '../../state/overview-model.ts';
import { el } from '../components/dom.ts';
import type { ActivityFeed } from '../components/feed.ts';
import { icon } from '../components/icons.ts';
import type { StageBars } from '../components/charts.ts';
import type { ProjectTable } from '../components/table.ts';
import type { WipLanes } from '../components/lanes.ts';

function panel(title: string, id: string, extra?: HTMLElement): { section: HTMLElement; head: HTMLElement } {
  const section = el('section', 'fl-panel');
  section.setAttribute('aria-labelledby', id);
  const head = el('div', 'fl-panel__head');
  const h2 = el('h2', null, title);
  h2.id = id;
  head.append(h2);
  if (extra) head.append(extra);
  section.append(head);
  return { section, head };
}

function create<T extends HTMLElement>(tag: string): T {
  return document.createElement(tag) as T;
}

function pageHead(): HTMLElement {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Overview');
  h1.id = 'page-title';
  const tools = el('div', 'fl-pagehead__tools');
  const add = el('a', 'fl-btn fl-btn--primary');
  add.href = '/inbox';
  add.append(icon('plus'), document.createTextNode('New project'));
  tools.append(add);
  head.append(h1, tools);
  return head;
}

export function renderOverviewLoading(main: HTMLElement): void {
  const status = el('section', 'fl-panel fl-empty');
  status.setAttribute('aria-busy', 'true');
  status.append(el('p', null, 'Loading your projects…'));
  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(pageHead(), status);
  document.title = 'Overview · Finishline';
}

export function renderOverviewError(main: HTMLElement, message: string, retry: () => void): void {
  const box = el('section', 'fl-panel fl-empty');
  box.setAttribute('role', 'alert');
  const button = el('button', 'fl-btn fl-btn--secondary', 'Try again');
  button.type = 'button';
  button.addEventListener('click', retry);
  box.append(el('h2', null, 'Projects did not load'), el('p', null, message), button);
  main.replaceChildren(pageHead(), box);
}

export function renderOverview(main: HTMLElement, feedHost: HTMLElement, m: OverviewModel): void {
  const dash = el('div', 'fl-dash');

  const kpis = el('section', 'fl-panel fl-panel--flush fl-kpis');
  kpis.setAttribute('aria-label', 'At a glance');
  const grid = el('div', 'fl-kpis__grid');
  for (const k of m.kpis) {
    const cell = create('fl-kpi');
    for (const [name, value] of Object.entries(k)) if (value !== undefined) cell.setAttribute(name, String(value));
    grid.append(cell);
  }
  kpis.append(grid);
  dash.append(kpis);

  const meter = create<WipLanes>('fl-wip-lanes');
  meter.setAttribute('cap', String(m.cap));
  meter.projects = m.activeNames;
  const now = panel('Now', 'h-now', meter);
  if (m.empty) {
    const empty = el('div', 'fl-empty');
    const start = el('a', 'fl-btn fl-btn--primary');
    start.href = '/inbox';
    start.append(icon('plus'), document.createTextNode('Capture your first idea'));
    empty.append(
      el('h3', null, 'No projects yet'),
      el('p', null, 'Capture every side project here, then promote up to three to Active. Finishline keeps each one ready to resume.'),
      start,
    );
    now.section.append(empty);
  } else {
    const cards = el('div', 'fl-lanecards');
    const cardGrid = el('div', 'fl-lanecards__grid');
    for (const lane of m.lanes) {
      const card = create('fl-project-card');
      card.setAttribute('lane', String(lane.lane));
      if (lane.project) {
        const p = lane.project;
        card.setAttribute('name', p.name);
        card.setAttribute('href', p.href);
        card.setAttribute('status', 'active');
        card.setAttribute('next', p.next);
        card.setAttribute('level', p.level);
        card.setAttribute('days', String(p.days));
        card.setAttribute('platform', p.where);
      }
      cardGrid.append(card);
    }
    cards.append(cardGrid);
    now.section.append(cards);
  }
  dash.append(now.section);

  if (!m.empty) {
    const rate = panel('Finish rate', 'h-rate');
    rate.section.classList.add('fl-span-4');
    const ring = create('fl-finish-rate');
    ring.setAttribute('shipped', String(m.finish.shipped));
    ring.setAttribute('archived', String(m.finish.archived));
    rate.section.append(ring);

    const byStatus = panel('Projects by status', 'h-stage');
    byStatus.section.classList.add('fl-span-8');
    const bars = create<StageBars>('fl-stage-bars');
    bars.stages = m.stages;
    byStatus.section.append(bars);

    const list = panel('Projects', 'h-proj');
    list.section.classList.add('fl-panel--flush');
    const table = create<ProjectTable>('fl-project-table');
    table.setAttribute('caption', 'Open projects, most in need of attention first');
    table.rows = m.rows;
    list.section.append(table);

    dash.append(rate.section, byStatus.section, list.section);
  }

  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(pageHead(), dash);

  if (m.feed.length) {
    const feed = create<ActivityFeed>('fl-activity-feed');
    feed.items = m.feed;
    feedHost.replaceChildren(feed);
  } else {
    feedHost.replaceChildren(el('p', 'fl-muted', 'Activity shows up here as you move projects along.'));
  }
}
