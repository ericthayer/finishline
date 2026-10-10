import { AttrElement, define, el } from './dom.ts';
import { icon, isIconName } from './icons.ts';

export type Tone = 'positive' | 'warning' | 'danger';

/** <fl-kpi label icon value unit delta tone meta> · one cell of the KPI strip. */
export class Kpi extends AttrElement {
  static readonly observedAttributes = ['label', 'icon', 'value', 'unit', 'delta', 'tone', 'meta'];

  protected render(): void {
    const cell = el('div', 'fl-kpi');
    const label = el('div', 'fl-kpi__label');
    const iconName = this.attr('icon');
    if (isIconName(iconName)) label.append(icon(iconName));
    label.append(el('span', null, this.attr('label')));

    const row = el('div', 'fl-kpi__row');
    const value = el('span', 'fl-kpi__value', this.attr('value') || '0');
    if (this.attr('unit')) value.append(el('small', null, this.attr('unit')));
    row.append(value);
    if (this.attr('delta')) {
      const tag = el('span', 'fl-tag', this.attr('delta'));
      if (this.attr('tone')) tag.dataset['tone'] = this.attr('tone');
      row.append(tag);
    } else if (this.attr('meta')) {
      row.append(el('span', 'fl-kpi__meta', this.attr('meta')));
    }
    cell.append(label, row);
    this.replaceChildren(cell);
  }
}

define('fl-kpi', Kpi);
