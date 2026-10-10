import { define, el, emit, uid } from './dom.ts';

export interface ChecklistItem {
  text: string;
  done: boolean;
}

/** <fl-ship-checklist> · `.items` = [{text, done}] · fires fl-criterion-toggle {index, done}. */
export class ShipChecklist extends HTMLElement {
  #items: ChecklistItem[] = [];

  set items(value: readonly ChecklistItem[]) {
    this.#items = value.map((x) => ({ text: x.text, done: x.done }));
    if (this.isConnected) this.render();
  }
  get items(): readonly ChecklistItem[] {
    return this.#items;
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const total = this.#items.length;
    const done = this.#items.filter((x) => x.done).length;

    const head = el('div', 'fl-check__head');
    head.append(el('span', 'fl-eyebrow', 'Done when'), el('span', 'fl-lanes__count', `${done}/${total}`));

    const meter = el('div', 'fl-check__meter');
    meter.setAttribute('role', 'progressbar');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', String(total));
    meter.setAttribute('aria-valuenow', String(done));
    meter.setAttribute('aria-label', `${done} of ${total} ship criteria done`);
    const fill = el('i');
    fill.style.width = total ? `${(done / total) * 100}%` : '0';
    meter.append(fill);

    const list = el('ul');
    const suffix = uid();
    this.#items.forEach((item, index) => {
      const id = `fl-crit-${index}-${suffix}`;
      const box = el('input');
      box.type = 'checkbox';
      box.id = id;
      box.checked = item.done;
      box.addEventListener('change', () => {
        item.done = box.checked;
        emit(this, 'fl-criterion-toggle', { index, done: box.checked });
        this.render();
        this.querySelector<HTMLInputElement>(`#${id}`)?.focus();
      });
      const label = el('label', null, item.text);
      label.htmlFor = id;
      const li = el('li');
      li.append(box, label);
      list.append(li);
    });

    const section = el('section', 'fl-check');
    section.setAttribute('aria-label', 'What remains');
    section.append(head, meter, list);
    this.replaceChildren(section);
  }
}

define('fl-ship-checklist', ShipChecklist);
