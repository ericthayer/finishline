import { define, el, emit, uid } from './dom.ts';

export interface ParkDetail {
  summary: string;
  next: string;
  blocker: string;
}

/** <fl-park-dialog next open? inline?> · `.open()` / `.close()` · fires fl-park {summary, next, blocker}. */
export class ParkDialog extends HTMLElement {
  static readonly observedAttributes = ['next', 'open'];
  #dialog: HTMLDialogElement | null = null;

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === 'next') this.render();
    else this.sync();
  }

  open(): void {
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private sync(): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    const want = this.hasAttribute('open');
    if (want && !dialog.open) {
      if (this.hasAttribute('inline')) dialog.show();
      else dialog.showModal();
      dialog.querySelector('textarea')?.focus();
    }
    if (!want && dialog.open) dialog.close();
  }

  private render(): void {
    const id = uid();
    const field = (
      name: string,
      label: string,
      tag: 'input' | 'textarea',
      help: string,
      required: boolean,
      value = '',
    ): HTMLElement => {
      const control = el(tag);
      control.id = `${name}-${id}`;
      control.name = name;
      control.value = value;
      control.required = required;
      const lab = el('label', null, label);
      lab.htmlFor = control.id;
      const small = el('small', null, help);
      small.id = `${control.id}-help`;
      control.setAttribute('aria-describedby', small.id);
      const wrap = el('div', 'fl-field');
      wrap.append(lab, control, small);
      return wrap;
    };

    const title = el('h2', null, 'Park this session');
    title.id = `fl-park-title-${id}`;
    const cancel = el('button', 'fl-btn fl-btn--secondary', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => this.close());
    const save = el('button', 'fl-btn fl-btn--primary', 'Park');
    save.type = 'submit';
    const actions = el('div', 'fl-dialog__actions');
    actions.append(cancel, save);

    const form = el('form');
    form.method = 'dialog';
    form.append(
      title,
      field('summary', 'What happened', 'textarea', 'One or two lines. This becomes “Last session” in the brief.', true),
      field('next', 'Next action', 'input', 'The exact step to start with next time.', true, this.getAttribute('next') ?? ''),
      field('blocker', 'New blocker', 'input', 'Optional.', false),
      actions,
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const read = (key: string): string => {
        const v = data.get(key);
        return typeof v === 'string' ? v.trim() : '';
      };
      emit<ParkDetail>(this, 'fl-park', { summary: read('summary'), next: read('next'), blocker: read('blocker') });
      this.close();
    });

    const dialog = el('dialog', 'fl-dialog');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.addEventListener('close', () => this.removeAttribute('open'));
    dialog.append(form);
    this.#dialog = dialog;
    this.replaceChildren(dialog);
    if (this.hasAttribute('open')) queueMicrotask(() => this.sync());
  }
}

define('fl-park-dialog', ParkDialog);
