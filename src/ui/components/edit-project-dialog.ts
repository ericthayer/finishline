import { checkProjectFields } from '../../domain/project-fields.ts';
import type { ProjectStatus } from '../../domain/types.ts';
import { define } from './dom.ts';
import { FormDialog, type Field } from './form.ts';
import { nameField, nextActionField, outcomeField, summaryField } from './project-fields.ts';

export interface EditSubject {
  id: string;
  name: string;
  status: ProjectStatus;
  summary: string;
  outcome: string;
  nextAction: string;
}

export interface EditDetail {
  id: string;
  name: string;
  summary: string;
  outcome: string;
  nextAction: string;
}

/**
 * <fl-edit-project-dialog> · `.edit(subject)` · changes the words on a project. Status is not
 * editable here. Fires fl-project-edit-submit {id, name, summary, outcome, nextAction}.
 */
export class EditProjectDialog extends FormDialog<EditDetail> {
  protected readonly eventName = 'fl-project-edit-submit';
  #id = '';
  #status: ProjectStatus = 'idea';
  #name: Field | null = null;
  #summary: Field | null = null;
  #outcome: Field | null = null;
  #next: Field | null = null;

  edit(subject: EditSubject): void {
    this.#id = subject.id;
    this.#status = subject.status;
    this.#name = nameField(subject.name);
    this.#summary = summaryField(subject.summary);
    this.#outcome = outcomeField(subject.outcome);
    this.#next = nextActionField(subject.nextAction);
    this.present({
      title: `Edit “${subject.name}”`,
      intro: 'Changes the words only. Status moves through Promote and Archive in the Inbox.',
      fields: [this.#name, this.#summary, this.#outcome, this.#next],
      submitLabel: 'Save changes',
    });
  }

  protected collect(): EditDetail | null {
    const name = this.#name;
    const summary = this.#summary;
    const outcome = this.#outcome;
    const next = this.#next;
    if (!name || !summary || !outcome || !next) return null;
    const checks = checkProjectFields(this.#status, { name: name.value(), nextAction: next.value() });
    name.invalid(checks.name);
    next.invalid(checks.nextAction);
    if (checks.name || checks.nextAction) return null;
    return {
      id: this.#id,
      name: name.value(),
      summary: summary.value(),
      outcome: outcome.value(),
      nextAction: next.value(),
    };
  }
}

define('fl-edit-project-dialog', EditProjectDialog);
