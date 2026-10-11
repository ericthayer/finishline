import { define, el, emit } from './dom.ts';
import { formField, type Field } from './form.ts';

export interface CaptureDetail {
  name: string;
  summary: string;
}

const NAME_LIMIT = 120;
export const CAPTURE_TITLE = 'Capture an idea';

/**
 * <fl-capture-form dialog?> · fires fl-capture {name, summary}; answer with `.captured(name)`
 * or `.fail(message)`. With `dialog` it adds a Done button that fires fl-capture-close.
 */
export class CaptureForm extends HTMLElement {
  #name: Field | null = null;
  #summary: Field | null = null;
  #submit: HTMLButtonElement | null = null;
  #status: HTMLElement | null = null;

  connectedCallback(): void {
    if (!this.#name) this.render();
  }

  focusName(): void {
    this.#name?.control.focus();
  }

  /** Clears the fields and any message. */
  reset(): void {
    if (!this.#name || !this.#summary || !this.#status) return;
    this.#name.control.value = '';
    this.#summary.control.value = '';
    this.#name.invalid(null);
    this.#status.textContent = '';
    delete this.#status.dataset['tone'];
    if (this.#submit) this.#submit.disabled = false;
  }

  /** Confirms the save and readies the form for the next idea. */
  captured(name: string): void {
    this.reset();
    if (this.#status) this.#status.textContent = `Captured “${name}”. It's in the Inbox.`;
    this.focusName();
  }

  fail(message: string): void {
    if (this.#status) {
      this.#status.textContent = message;
      this.#status.dataset['tone'] = 'danger';
    }
    if (this.#submit) this.#submit.disabled = false;
  }

  private render(): void {
    const inDialog = this.hasAttribute('dialog');
    const name = formField({
      name: 'name',
      label: 'Idea name',
      help: inDialog ? 'Only the name is required.' : 'Only the name is required. Press / anywhere to capture.',
      maxLength: NAME_LIMIT,
    });
    const summary = formField({ name: 'summary', label: 'What is it? (optional)', help: 'One line, for when you triage it later.' });
    const submit = el('button', 'fl-btn fl-btn--primary', 'Capture');
    submit.type = 'submit';
    const actions = el('div', 'fl-capture__actions');
    if (inDialog) {
      const done = el('button', 'fl-btn fl-btn--secondary', 'Done');
      done.type = 'button';
      done.addEventListener('click', () => emit(this, 'fl-capture-close', null));
      actions.append(done);
    }
    actions.append(submit);
    const status = el('p', 'fl-capture__status');
    status.setAttribute('role', 'status');

    const form = el('form', 'fl-capture');
    form.noValidate = true;
    if (inDialog) form.append(el('h2', null, CAPTURE_TITLE));
    form.append(name.wrap, summary.wrap, actions, status);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      status.textContent = '';
      delete status.dataset['tone'];
      const value = name.value();
      if (!value) {
        name.invalid('Give it a name. Anything you will recognize later works.');
        name.control.focus();
        return;
      }
      name.invalid(null);
      submit.disabled = true;
      emit<CaptureDetail>(this, 'fl-capture', { name: value, summary: summary.value() });
    });
    name.control.addEventListener('input', () => name.invalid(null));

    this.#name = name;
    this.#summary = summary;
    this.#submit = submit;
    this.#status = status;
    this.replaceChildren(form);
  }
}

define('fl-capture-form', CaptureForm);
