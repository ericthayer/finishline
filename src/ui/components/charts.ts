import type { ProjectStatus } from '../../domain/types.ts';
import { AttrElement, DataElement, define, el, pct, svgEl } from './dom.ts';
import { STATUS_COLOR, STATUS_LABEL } from './status.ts';

export interface StageCount {
  status: Exclude<ProjectStatus, 'archived'>;
  count: number;
}

/** <fl-stage-bars> · `.stages` = [{status, count}] · column width follows share. */
export class StageBars extends DataElement<StageCount> {
  set stages(value: readonly StageCount[]) {
    this.setData(value);
  }
  get stages(): readonly StageCount[] {
    return this.data;
  }

  protected render(): void {
    const total = this.data.reduce((sum, s) => sum + s.count, 0);
    const list = el('ol', 'fl-stages');
    list.setAttribute('aria-label', `Projects by status, ${total} total`);
    for (const stage of this.data) {
      const li = el('li', 'fl-stage');
      li.style.setProperty('--c', `var(${STATUS_COLOR[stage.status]})`);
      // A floor keeps a one-project column readable.
      li.style.setProperty('--share', String(Math.max(stage.count / (total || 1), 0.04) * 10));
      const bar = el('i', 'fl-stage__bar');
      bar.setAttribute('aria-hidden', 'true');
      li.append(
        el('span', 'fl-stage__label', STATUS_LABEL[stage.status]),
        el('span', 'fl-stage__count', String(stage.count)),
        el('span', 'fl-stage__pct', `${pct(stage.count, total)}%`),
        bar,
      );
      list.append(li);
    }
    this.replaceChildren(list);
  }
}

/** <fl-finish-rate shipped archived delta tone> · shipped ÷ (shipped + archived). */
export class FinishRate extends AttrElement {
  static readonly observedAttributes = ['shipped', 'archived', 'delta', 'tone'];

  protected render(): void {
    const shipped = Number(this.attr('shipped')) || 0;
    const archived = Number(this.attr('archived')) || 0;
    const total = shipped + archived;
    const rate = pct(shipped, total);
    const segments: readonly [string, string, number][] = [
      ['Shipped', '--positive', shipped],
      ['Archived', '--status-idea', archived],
    ];

    const svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    svg.append(svgEl('circle', { class: 'fl-donut__track', cx: 50, cy: 50, r: 44, pathLength: 100 }));
    const gap = shipped && archived ? 1.5 : 0;
    let at = 0;
    for (const [, token, count] of segments) {
      const len = total ? (count / total) * 100 : 0;
      if (!len) continue;
      svg.append(
        svgEl('circle', {
          cx: 50,
          cy: 50,
          r: 44,
          pathLength: 100,
          stroke: `var(${token})`,
          'stroke-dasharray': `${Math.max(len - gap, 0)} ${100 - len + gap}`,
          'stroke-dashoffset': -at,
        }),
      );
      at += len;
    }

    const center = el('div', 'fl-donut__center');
    center.append(el('span', 'fl-donut__value', total ? `${rate}%` : '—'));
    if (this.attr('delta')) {
      const tag = el('span', 'fl-tag', this.attr('delta'));
      tag.dataset['tone'] = this.attr('tone') || 'positive';
      center.append(tag);
    }
    const ring = el('div', 'fl-donut__ring');
    ring.setAttribute('role', 'img');
    ring.setAttribute(
      'aria-label',
      total ? `Finish rate ${rate}%: ${shipped} shipped, ${archived} archived` : 'No finished projects yet',
    );
    ring.append(svg, center);

    const legend = el('ul', 'fl-legend');
    for (const [label, token, count] of segments) {
      const dot = el('i');
      dot.style.setProperty('--c', `var(${token})`);
      const li = el('li');
      li.append(dot, el('span', null, label), el('b', null, String(count)));
      legend.append(li);
    }
    const wrap = el('div', 'fl-donut');
    wrap.append(ring, legend);
    this.replaceChildren(wrap);
  }
}

define('fl-stage-bars', StageBars);
define('fl-finish-rate', FinishRate);
