import type { ProjectStatus } from '../../domain/types.ts';
import { AttrElement, define, el, splitTime, svgEl } from './dom.ts';

export type StaleLevel = 'fresh' | 'stale' | 'cold';

export const STATUS_LABEL: Readonly<Record<ProjectStatus, string>> = {
  idea: 'Idea',
  ready: 'Ready',
  active: 'Active',
  paused: 'Paused',
  shipped: 'Shipped',
  archived: 'Archived',
};

/** Token that colours each status in chips and charts. */
export const STATUS_COLOR: Readonly<Record<ProjectStatus, string>> = {
  idea: '--status-idea',
  ready: '--status-ready',
  active: '--status-active',
  paused: '--status-paused',
  shipped: '--positive',
  archived: '--ink-muted',
};

// Glyphs on a 12×12 grid: shape carries status as well as colour.
const GLYPH: Readonly<Record<ProjectStatus, string>> = {
  idea: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
  ready: 'M6 1.5a4.5 4.5 0 0 1 0 9z M6 1.5a4.5 4.5 0 1 0 0 9',
  active: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
  paused: 'M3.5 2v8 M8.5 2v8',
  shipped: 'M2 6.5l2.5 2.5L10 3',
  archived: 'M3 3l6 6 M9 3l-6 6',
};
const FILLED: ReadonlySet<ProjectStatus> = new Set(['active', 'ready']);

export function isStatus(value: string): value is ProjectStatus {
  return Object.hasOwn(STATUS_LABEL, value);
}

function glyph(status: ProjectStatus): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' });
  svg.append(
    svgEl('path', {
      d: GLYPH[status],
      fill: FILLED.has(status) ? 'currentColor' : 'none',
      stroke: 'currentColor',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
    }),
  );
  return svg;
}

/** <fl-status-pill status="active"> · unknown values render as Idea. */
export class StatusPill extends AttrElement {
  static readonly observedAttributes = ['status'];

  protected render(): void {
    const raw = this.attr('status');
    const status = isStatus(raw) ? raw : 'idea';
    const pill = el('span', 'fl-status');
    pill.dataset['status'] = status;
    pill.append(glyph(status), el('span', null, STATUS_LABEL[status]));
    this.replaceChildren(pill);
  }
}

const LEVEL_WORD: Readonly<Record<StaleLevel, string>> = { fresh: 'Fresh', stale: 'Stale', cold: 'Cold' };

/** <fl-stale-badge level days label> · split time + word; `label` is read, not shown. */
export class StaleBadge extends AttrElement {
  static readonly observedAttributes = ['level', 'days', 'label'];

  protected render(): void {
    const raw = this.attr('level');
    const level: StaleLevel = raw === 'stale' || raw === 'cold' ? raw : 'fresh';
    const wrap = el('span', 'fl-stale');
    wrap.dataset['level'] = level;
    wrap.append(
      el('b', null, splitTime(Number(this.attr('days')))),
      el('span', null, LEVEL_WORD[level]),
      el('span', 'fl-sr', ` ${this.attr('label') || 'since progress'}`),
    );
    this.replaceChildren(wrap);
  }
}

export function statusPill(status: ProjectStatus): HTMLElement {
  const node = document.createElement('fl-status-pill');
  node.setAttribute('status', status);
  return node;
}

export function staleBadge(level: StaleLevel, days: number, label?: string): HTMLElement {
  const node = document.createElement('fl-stale-badge');
  node.setAttribute('level', level);
  node.setAttribute('days', String(days));
  if (label) node.setAttribute('label', label);
  return node;
}

define('fl-status-pill', StatusPill);
define('fl-stale-badge', StaleBadge);
