import { explainGate } from '../../domain/gates.ts';
import { define } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface ArchiveDetail {
  id: string;
  reason: string;
}

/** <fl-archive-dialog> · `.confirm({id, name})` · fires fl-archive-submit {id, reason}. Answer with `.close()` or `.fail()`. */
export class ArchiveDialog extends FormDialog<ArchiveDetail> {
  protected readonly eventName = 'fl-archive-submit';
  #id = '';
  #reason: Field | null = null;

  confirm(subject: { id: string; name: string }): void {
    this.#id = subject.id;
    this.#reason = formField({ name: 'reason', label: 'Why archive it?', help: 'One line. Quitting on purpose is closure; future you will want the reason.' });
    this.present({
      title: `Archive “${subject.name}”`,
      intro: 'Archiving is a deliberate exit, not a delete. You can reopen it later.',
      fields: [this.#reason],
      submitLabel: 'Archive',
      danger: true,
    });
  }

  protected collect(): ArchiveDetail | null {
    const reason = this.#reason;
    if (!reason) return null;
    if (!reason.value()) {
      reason.invalid(explainGate({ code: 'MISSING_ARCHIVE_REASON' }, 'archived'));
      return null;
    }
    reason.invalid(null);
    return { id: this.#id, reason: reason.value() };
  }
}

define('fl-archive-dialog', ArchiveDialog);
