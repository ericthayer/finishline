import { CAPTURE_TITLE, CaptureForm } from './capture-form.ts';
import { define, el, emit } from './dom.ts';

/**
 * <fl-capture-dialog> · `.open()` · quick capture from anywhere. Stays open after each
 * capture so several ideas go in a row; fires fl-capture-closed when dismissed.
 */
export class CaptureDialog extends HTMLElement {
  #dialog: HTMLDialogElement | null = null;
  #form: CaptureForm | null = null;

  connectedCallback(): void {
    if (!this.#dialog) this.render();
  }

  get form(): CaptureForm {
    if (!this.#form) this.render();
    return this.#form as CaptureForm;
  }

  get isOpen(): boolean {
    return this.#dialog?.open ?? false;
  }

  open(): void {
    if (!this.#dialog) this.render();
    if (this.#dialog?.open) return;
    this.form.reset();
    this.#dialog?.showModal();
    this.form.focusName();
  }

  close(): void {
    this.#dialog?.close();
  }

  private render(): void {
    const form = document.createElement('fl-capture-form') as CaptureForm;
    form.setAttribute('dialog', '');
    form.addEventListener('fl-capture-close', () => this.close());
    const dialog = el('dialog', 'fl-dialog');
    // The form draws the visible heading; the dialog carries the same name.
    dialog.setAttribute('aria-label', CAPTURE_TITLE);
    dialog.append(form);
    dialog.addEventListener('close', () => emit(this, 'fl-capture-closed', null));
    this.#dialog = dialog;
    this.#form = form;
    this.replaceChildren(dialog);
  }
}

define('fl-capture-dialog', CaptureDialog);
