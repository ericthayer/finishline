import { define, el, emit, uid } from './dom.ts';

/** <fl-handoff-brief> · `.brief`, optional `.briefWithCommits` · fires fl-brief-copied {text}. */
export class HandoffBrief extends HTMLElement {
  #brief = '';
  #withCommits = '';

  set brief(value: string) {
    this.#brief = value;
    if (this.isConnected) this.render();
  }
  get brief(): string {
    return this.#brief;
  }
  set briefWithCommits(value: string) {
    this.#withCommits = value;
    if (this.isConnected) this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const pre = el('pre', null, this.#brief);
    pre.tabIndex = 0;

    const left = el('div', 'fl-brief__group');
    left.append(el('span', 'fl-eyebrow', 'Agent handoff'));
    if (this.#withCommits) {
      const box = el('input');
      box.type = 'checkbox';
      box.id = `fl-brief-commits-${uid()}`;
      box.addEventListener('change', () => {
        pre.textContent = box.checked ? this.#withCommits : this.#brief;
      });
      const label = el('label');
      label.append(box, document.createTextNode('Include recent commits'));
      left.append(label);
    }

    const status = el('span', 'fl-brief__status');
    status.setAttribute('aria-live', 'polite');
    const copy = el('button', 'fl-btn fl-btn--primary');
    copy.type = 'button';
    copy.append(document.createTextNode('Copy brief'), el('kbd', null, 'C'));
    copy.addEventListener('click', () => void this.copy(pre, status));
    const right = el('div', 'fl-brief__group');
    right.append(status, copy);

    const bar = el('div', 'fl-brief__bar');
    bar.append(left, right);
    const section = el('section', 'fl-brief');
    section.setAttribute('aria-label', 'Agent handoff brief');
    section.append(bar, pre);
    this.replaceChildren(section);
  }

  private async copy(pre: HTMLPreElement, status: HTMLElement): Promise<void> {
    const text = pre.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied';
      emit(this, 'fl-brief-copied', { text });
    } catch {
      // No clipboard permission: select the text so one keystroke finishes the job.
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      status.textContent = 'Selected · press Ctrl+C';
    }
  }
}

define('fl-handoff-brief', HandoffBrief);
