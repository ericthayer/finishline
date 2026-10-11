import { nextActionMissing } from '../../domain/gates.ts';
import { define } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface ReopenDetail {
  id: string;
  nextAction: string;
}

/**
 * <fl-reopen-dialog> · `.reopen({id, name, nextAction})` · Ready needs a next action.
 * Fires fl-reopen-submit {id, nextAction}. Answer with `.close()` or `.fail()`.
 */
export class ReopenDialog extends FormDialog<ReopenDetail> {
  protected readonly eventName = 'fl-reopen-submit';
  #id = '';
  #next: Field | null = null;

  reopen(subject: { id: string; name: string; nextAction: string }): void {
    this.#id = subject.id;
    this.#next = formField({ name: 'next', label: 'Next action', help: 'The first concrete step when you pick it back up.', value: subject.nextAction });
    this.present({
      title: `Reopen “${subject.name}”`,
      intro: 'Reopening moves it to Ready. It takes a lane only when you Start it.',
      fields: [this.#next],
      submitLabel: 'Reopen',
    });
  }

  protected collect(): ReopenDetail | null {
    const next = this.#next;
    if (!next) return null;
    const error = nextActionMissing('ready', next.value());
    next.invalid(error);
    return error ? null : { id: this.#id, nextAction: next.value() };
  }
}

define('fl-reopen-dialog', ReopenDialog);
