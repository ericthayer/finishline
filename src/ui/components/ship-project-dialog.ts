import { explainGate } from '../../domain/gates.ts';
import { shipUrlError } from '../../domain/project-fields.ts';
import type { CriterionRecord } from '../../data/projects.ts';
import { define, el, uid } from './dom.ts';
import { formField, FormDialog, type Field } from './form.ts';

export interface ShipSubject {
  id: string;
  name: string;
  criteria: readonly CriterionRecord[];
}

export interface ShipDetail {
  id: string;
  check: string[];
  uncheck: string[];
  shipAnyway: boolean;
  shippedUrl: string;
}

interface Box {
  input: HTMLInputElement;
  was: boolean;
  id: string;
}

function checkRow(text: string, checked: boolean): { li: HTMLLIElement; input: HTMLInputElement } {
  const input = el('input');
  input.type = 'checkbox';
  input.id = `fl-ship-${uid()}`;
  input.checked = checked;
  const label = el('label', null, text);
  label.htmlFor = input.id;
  const li = el('li');
  li.append(input, label);
  return { li, input };
}

/** A fieldset of checkboxes that satisfies the dialog's Field shape, so its note can show an error. */
function checkGroup(legend: string, rows: readonly { li: HTMLLIElement; input: HTMLInputElement }[], note: string): Field {
  const list = el('ul');
  list.append(...rows.map((r) => r.li));
  const small = el('p', 'fl-ship__note', note);
  small.id = `fl-ship-note-${uid()}`;
  const set = el('fieldset', 'fl-check fl-ship__group');
  set.setAttribute('aria-describedby', small.id);
  set.append(el('legend', 'fl-eyebrow', legend), list, small);
  const first = rows[0]?.input ?? el('input');
  return {
    wrap: set,
    control: first,
    invalid(message) {
      if (message) small.dataset['invalid'] = '';
      else delete small.dataset['invalid'];
      small.textContent = message ?? note;
    },
    value: () => '',
  };
}

/**
 * <fl-ship-project-dialog> · `.ship(subject)` · shows the checklist, lets the user check items off,
 * and ships. Open items need "ship anyway". Fires fl-project-ship-submit {id, check, uncheck, shipAnyway, shippedUrl}.
 */
export class ShipProjectDialog extends FormDialog<ShipDetail> {
  protected readonly eventName = 'fl-project-ship-submit';
  #id = '';
  #boxes: Box[] = [];
  #list: Field | null = null;
  #anyway: { field: Field; input: HTMLInputElement } | null = null;
  #url: Field | null = null;

  ship(subject: ShipSubject): void {
    this.#id = subject.id;
    const rows = subject.criteria.map((c) => ({ ...checkRow(c.text, c.doneAt !== null), c }));
    this.#boxes = rows.map((r) => ({ input: r.input, was: r.c.doneAt !== null, id: r.c.id }));
    this.#list = rows.length
      ? checkGroup('Done when', rows, 'Check off what is finished.')
      : null;
    const anywayRow = checkRow('Ship anyway, with the open items left as they are', false);
    const anywayField = checkGroup('Open items', [anywayRow], 'Only needed if something above is still unchecked.');
    this.#anyway = { field: anywayField, input: anywayRow.input };
    this.#url = formField({ name: 'url', label: 'Link to what you shipped (optional)', help: 'An https:// address, for the record.' });
    const fields = [...(this.#list ? [this.#list] : []), anywayField, this.#url];
    this.present({
      title: `Ship “${subject.name}”`,
      intro: 'Shipping closes the project out. You can reopen it later.',
      fields,
      submitLabel: 'Ship project',
    });
  }

  protected collect(): ShipDetail | null {
    const anyway = this.#anyway;
    const url = this.#url;
    if (!anyway || !url) return null;
    const remaining = this.#boxes.filter((b) => !b.input.checked).length;
    const unmet = remaining > 0 && !anyway.input.checked ? explainGate({ code: 'UNMET_SHIP_CRITERIA', remaining }, 'shipped') : null;
    const urlError = shipUrlError(url.value());
    anyway.field.invalid(unmet);
    url.invalid(urlError);
    if (unmet || urlError) {
      (unmet ? anyway.input : url.control).focus();
      return null;
    }
    return {
      id: this.#id,
      check: this.#boxes.filter((b) => b.input.checked && !b.was).map((b) => b.id),
      uncheck: this.#boxes.filter((b) => !b.input.checked && b.was).map((b) => b.id),
      shipAnyway: anyway.input.checked,
      shippedUrl: url.value(),
    };
  }
}

define('fl-ship-project-dialog', ShipProjectDialog);
