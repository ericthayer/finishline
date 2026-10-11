import { checkProjectFields } from '../../domain/project-fields.ts';
import type { PlatformLink } from '../../domain/types.ts';
import { define } from './dom.ts';
import { FormDialog, type Field } from './form.ts';
import { platformFields, type PlatformFields } from './platform-fields.ts';
import { nameField, outcomeField, summaryField } from './project-fields.ts';

export interface CreateDetail {
  name: string;
  summary: string;
  outcome: string;
  platform: PlatformLink | null;
}

/**
 * <fl-create-project-dialog> · `.open()` · full form for a new project. It starts as an idea,
 * since the database only creates ideas. Fires fl-project-create-submit {name, summary, outcome, platform}.
 * Answer with `.close()` or `.fail()`.
 */
export class CreateProjectDialog extends FormDialog<CreateDetail> {
  protected readonly eventName = 'fl-project-create-submit';
  #name: Field | null = null;
  #summary: Field | null = null;
  #outcome: Field | null = null;
  #platform: PlatformFields | null = null;

  open(): void {
    this.#name = nameField();
    this.#summary = summaryField();
    this.#outcome = outcomeField();
    this.#platform = platformFields();
    this.present({
      title: 'New project',
      intro: 'It starts as an idea in the Inbox. It moves to Ready once it has an outcome, a finish line and a next action.',
      fields: [this.#name, this.#summary, this.#outcome, ...this.#platform.fields],
      submitLabel: 'Create project',
    });
  }

  protected collect(): CreateDetail | null {
    const name = this.#name;
    const platform = this.#platform;
    if (!name || !this.#summary || !this.#outcome || !platform) return null;
    const error = checkProjectFields('idea', { name: name.value(), nextAction: '' }).name;
    name.invalid(error);
    const platformOk = platform.check();
    if (error || !platformOk) return null;
    return { name: name.value(), summary: this.#summary.value(), outcome: this.#outcome.value(), platform: platform.value() };
  }
}

define('fl-create-project-dialog', CreateProjectDialog);
