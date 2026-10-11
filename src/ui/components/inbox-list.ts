import { DataElement, define, el, emit } from './dom.ts';
import { staleBadge, type StaleLevel } from './status.ts';

export interface InboxRow {
  id: string;
  name: string;
  summary: string | null;
  captured: string;
  stale?: { level: StaleLevel; days: number };
}

export type TriageMove = 'promote' | 'archive';

export interface TriageDetail {
  id: string;
  move: TriageMove;
}

/** <fl-inbox-list> · `.items` = InboxRow[] · fires fl-triage {id, move}. */
export class InboxList extends DataElement<InboxRow> {
  set items(value: readonly InboxRow[]) {
    this.setData(value);
  }
  get items(): readonly InboxRow[] {
    return this.data;
  }

  /** Focuses the Promote button of the item at `index` (or the last one). False when empty. */
  focusAt(index: number): boolean {
    const buttons = this.querySelectorAll<HTMLButtonElement>('[data-move="promote"]');
    const target = buttons[Math.min(index, buttons.length - 1)];
    target?.focus();
    return Boolean(target);
  }

  protected render(): void {
    const list = el('ul', 'fl-inbox');
    for (const item of this.data) {
      const main = el('div', 'fl-inbox__main');
      main.append(el('h3', 'fl-inbox__name', item.name));
      if (item.summary) main.append(el('p', 'fl-inbox__summary', item.summary));

      const meta = el('p', 'fl-inbox__meta');
      meta.append(el('span', null, item.captured));
      if (item.stale) meta.append(staleBadge(item.stale.level, item.stale.days, 'since capture, past triage age'));

      const moves = el('div', 'fl-inbox__moves');
      moves.append(this.move(item, 'promote', 'Promote', ' to Ready'), this.move(item, 'archive', 'Archive', ''));

      const li = el('li', 'fl-inbox__item');
      li.append(main, meta, moves);
      list.append(li);
    }
    this.replaceChildren(list);
  }

  private move(item: InboxRow, move: TriageMove, label: string, tail: string): HTMLButtonElement {
    const button = el('button', `fl-btn ${move === 'promote' ? 'fl-btn--secondary' : 'fl-btn--quiet'}`, label);
    button.type = 'button';
    button.dataset['move'] = move;
    // Visible label first, so the accessible name starts with what sighted users see.
    button.append(el('span', 'fl-sr', ` ${item.name}${tail}`));
    button.addEventListener('click', () => emit<TriageDetail>(this, 'fl-triage', { id: item.id, move }));
    return button;
  }
}

define('fl-inbox-list', InboxList);
