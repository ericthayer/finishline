import { explainGate, parseCriteria, SHIP_CRITERIA_LIMIT } from '../../domain/gates.ts';
import { checkTransition, DEFAULT_WIP_CAP } from '../../domain/lifecycle.ts';
import { define } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface PromoteSubject {
  id: string;
  name: string;
  outcome: string;
  nextAction: string;
  criteria: readonly string[];
}

export interface PromoteDetail {
  id: string;
  outcome: string;
  nextAction: string;
  criteria: string[];
}

/**
 * <fl-promote-dialog> · `.edit(subject)` · asks for what the Idea → Ready gate needs and
 * fires fl-promote-submit {id, outcome, nextAction, criteria}. Answer with `.close()` or `.fail()`.
 */
export class PromoteDialog extends FormDialog<PromoteDetail> {
  protected readonly eventName = 'fl-promote-submit';
  #id = '';
  #outcome: Field | null = null;
  #criteria: Field | null = null;
  #next: Field | null = null;

  edit(subject: PromoteSubject): void {
    this.#id = subject.id;
    this.#outcome = formField({ name: 'outcome', label: 'Outcome', help: 'One line: the result you want when this is done.', value: subject.outcome });
    this.#criteria = formField({
      name: 'criteria',
      label: 'Done when',
      help: `One per line, ${SHIP_CRITERIA_LIMIT} at most. These become the ship checklist.`,
      multiline: true,
      rows: 4,
      value: subject.criteria.join('\n'),
    });
    this.#next = formField({ name: 'next', label: 'Next action', help: 'The first concrete step, written as an instruction.', value: subject.nextAction });
    this.present({
      title: `Promote “${subject.name}” to Ready`,
      intro: 'Ready means it is defined well enough to start: an outcome, a finish line and a first step.',
      fields: [this.#outcome, this.#criteria, this.#next],
      submitLabel: 'Promote',
    });
  }

  protected collect(): PromoteDetail | null {
    const outcome = this.#outcome;
    const criteriaField = this.#criteria;
    const next = this.#next;
    if (!outcome || !criteriaField || !next) return null;
    const criteria = parseCriteria(criteriaField.control.value);
    const check = checkTransition({ status: 'idea', outcome: outcome.value(), nextAction: next.value() }, 'ready', {
      activeCount: 0,
      wipCap: DEFAULT_WIP_CAP,
      shipCriteria: criteria.map(() => ({ doneAt: null })),
    });
    const failures = check.ok ? [] : check.failures;
    const message = (code: string): string | null => {
      const failure = failures.find((f) => f.code === code);
      return failure ? explainGate(failure, 'ready') : null;
    };
    outcome.invalid(message('MISSING_OUTCOME'));
    next.invalid(message('MISSING_NEXT_ACTION'));
    const tooMany = criteria.length > SHIP_CRITERIA_LIMIT ? explainGate({ code: 'SHIP_CRITERIA_LIMIT' }, 'ready') : null;
    criteriaField.invalid(message('MISSING_SHIP_CRITERIA') ?? tooMany);
    if (failures.length || tooMany) return null;
    return { id: this.#id, outcome: outcome.value(), nextAction: next.value(), criteria };
  }
}

define('fl-promote-dialog', PromoteDialog);
