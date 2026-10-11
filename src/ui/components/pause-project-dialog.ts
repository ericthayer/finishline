import { explainGate, nextActionMissing } from '../../domain/gates.ts';
import { DEFAULT_PAUSE_REVIEW_DAYS } from '../../domain/lifecycle.ts';
import { define } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface PauseSubject {
  id: string;
  name: string;
  nextAction: string;
}

export interface PauseDetail {
  id: string;
  checkpointSummary: string;
  nextAction: string;
}

/**
 * <fl-pause-project-dialog> · `.pause(subject)` · a pause needs a checkpoint and a next action.
 * Fires fl-project-pause-submit {id, checkpointSummary, nextAction}. Answer with `.close()` or `.fail()`.
 */
export class PauseProjectDialog extends FormDialog<PauseDetail> {
  protected readonly eventName = 'fl-project-pause-submit';
  #id = '';
  #checkpoint: Field | null = null;
  #next: Field | null = null;

  pause(subject: PauseSubject): void {
    this.#id = subject.id;
    this.#checkpoint = formField({
      name: 'checkpoint',
      label: 'What happened',
      help: 'One or two lines. This is the first thing you read when you come back.',
      multiline: true,
      rows: 3,
    });
    this.#next = formField({ name: 'next', label: 'Next action', help: 'The exact step to start with when you resume.', value: subject.nextAction });
    this.present({
      title: `Pause “${subject.name}”`,
      intro: `Pausing takes it out of the Active lanes. It comes back for review in ${DEFAULT_PAUSE_REVIEW_DAYS} days.`,
      fields: [this.#checkpoint, this.#next],
      submitLabel: 'Pause project',
    });
  }

  protected collect(): PauseDetail | null {
    const checkpoint = this.#checkpoint;
    const next = this.#next;
    if (!checkpoint || !next) return null;
    const summary = checkpoint.value();
    const summaryError = summary ? null : explainGate({ code: 'MISSING_CHECKPOINT' }, 'paused');
    const nextError = nextActionMissing('paused', next.value());
    checkpoint.invalid(summaryError);
    next.invalid(nextError);
    if (summaryError || nextError) return null;
    return { id: this.#id, checkpointSummary: summary, nextAction: next.value() };
  }
}

define('fl-pause-project-dialog', PauseProjectDialog);
