import { explainGate, nextActionMissing } from '../../domain/gates.ts';
import { reviewDateError } from '../../domain/project-fields.ts';
import { define } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface PauseSubject {
  id: string;
  name: string;
  nextAction: string;
  /** Suggested review day, YYYY-MM-DD. */
  reviewOn: string;
  /** Today, YYYY-MM-DD; the earliest day that can be picked. */
  today: string;
}

export interface PauseDetail {
  id: string;
  checkpointSummary: string;
  nextAction: string;
  reviewOn: string;
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
  #review: Field | null = null;
  #today = '';

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
    this.#today = subject.today;
    this.#review = formField({
      name: 'review-on',
      label: 'Review on',
      help: 'It shows as due for review on this day.',
      value: subject.reviewOn,
    });
    this.#review.control.setAttribute('type', 'date');
    this.#review.control.setAttribute('min', subject.today);
    this.present({
      title: `Pause “${subject.name}”`,
      intro: 'Pausing takes it out of the Active lanes. Pick the day it comes back for review.',
      fields: [this.#checkpoint, this.#next, this.#review],
      submitLabel: 'Pause project',
    });
  }

  protected collect(): PauseDetail | null {
    const checkpoint = this.#checkpoint;
    const next = this.#next;
    const review = this.#review;
    if (!checkpoint || !next || !review) return null;
    const summary = checkpoint.value();
    const summaryError = summary ? null : explainGate({ code: 'MISSING_CHECKPOINT' }, 'paused');
    const nextError = nextActionMissing('paused', next.value());
    const reviewError = reviewDateError(review.value(), this.#today);
    checkpoint.invalid(summaryError);
    next.invalid(nextError);
    review.invalid(reviewError);
    if (summaryError || nextError || reviewError) return null;
    return { id: this.#id, checkpointSummary: summary, nextAction: next.value(), reviewOn: review.value() };
  }
}

define('fl-pause-project-dialog', PauseProjectDialog);
