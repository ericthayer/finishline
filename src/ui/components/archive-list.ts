import type { ArchiveItem } from '../../state/archive-model.ts';
import { DataElement, define, el, emit } from './dom.ts';
import { statusPill } from './status.ts';

export interface ReopenRequest {
  id: string;
}

/**
 * <fl-archive-list> · `.items` = ArchiveItem[] · fires fl-reopen {id}.
 * Shares the Inbox list layout so closed projects read like the rest of the workspace.
 */
export class ArchiveList extends DataElement<ArchiveItem> {
  set items(value: readonly ArchiveItem[]) {
    this.setData(value);
  }
  get items(): readonly ArchiveItem[] {
    return this.data;
  }

  /** Focuses the Reopen button of the item at `index` (or the last one). False when empty. */
  focusAt(index: number): boolean {
    const buttons = this.querySelectorAll<HTMLButtonElement>('[data-move="reopen"]');
    const target = buttons[Math.min(index, buttons.length - 1)];
    target?.focus();
    return Boolean(target);
  }

  protected render(): void {
    const list = el('ul', 'fl-inbox');
    for (const item of this.data) {
      const main = el('div', 'fl-inbox__main');
      main.append(el('h3', 'fl-inbox__name', item.name));
      if (item.note?.kind === 'reason') main.append(el('p', 'fl-inbox__summary', item.note.text));
      if (item.note?.kind === 'link') {
        const shipped = el('a', 'fl-link', item.note.url.replace(/^https?:\/\//, ''));
        shipped.href = item.note.url;
        shipped.target = '_blank';
        shipped.rel = 'noopener noreferrer';
        shipped.append(el('span', 'fl-sr', ' (opens in a new tab)'));
        const line = el('p', 'fl-inbox__summary');
        line.append(shipped);
        main.append(line);
      }

      const meta = el('p', 'fl-inbox__meta');
      meta.append(statusPill(item.status), el('span', null, item.closed));

      const reopen = el('button', 'fl-btn fl-btn--secondary', 'Reopen');
      reopen.type = 'button';
      reopen.dataset['move'] = 'reopen';
      reopen.append(el('span', 'fl-sr', ` ${item.name}`));
      reopen.addEventListener('click', () => emit<ReopenRequest>(this, 'fl-reopen', { id: item.id }));
      const moves = el('div', 'fl-inbox__moves');
      moves.append(reopen);

      const li = el('li', 'fl-inbox__item');
      li.append(main, meta, moves);
      list.append(li);
    }
    this.replaceChildren(list);
  }
}

define('fl-archive-list', ArchiveList);
