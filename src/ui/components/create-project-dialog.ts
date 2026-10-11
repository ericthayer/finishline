import { checkProjectFields } from '../../domain/project-fields.ts';
import { define } from './dom.ts';
import { FormDialog, type Field } from './form.ts';
import { nameField, outcomeField, summaryField } from './project-fields.ts';

export interface CreateDetail {
  name: string;
  summary: string;
  outcome: string;
}

/**
 * <fl-create-project-dialog> · `.open()` · full form for a new project. It starts as an idea,
 * since the database only creates ideas. Fires fl-project-create-submit {name, summary, outcome}.
 * Answer with `.close()` or `.fail()`.
 */
export class CreateProjectDialog extends FormDialog<CreateDetail> {
  protected readonly eventName = 'fl-project-create-submit';
  #name: Field | null = null;
  #summary: Field | null = null;
  #outcome: Field | null = null;

  open(): void {
    this.#name = nameField();
    this.#summary = summaryField();
    this.#outcome = outcomeField();
    this.present({
      title: 'New project',
      intro: 'It starts as an idea in the Inbox. It moves to Ready once it has an outcome, a finish line and a next action.',
      fields: [this.#name, this.#summary, this.#outcome],
      submitLabel: 'Create project',
    });
  }

  protected collect(): CreateDetail | null {
    const name = this.#name;
    if (!name || !this.#summary || !this.#outcome) return null;
    const error = checkProjectFields('idea', { name: name.value(), nextAction: '' }).name;
    name.invalid(error);
    if (error) return null;
    return { name: name.value(), summary: this.#summary.value(), outcome: this.#outcome.value() };
  }
}

define('fl-create-project-dialog', CreateProjectDialog);
