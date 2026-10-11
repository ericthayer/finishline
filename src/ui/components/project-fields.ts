import { NAME_LIMIT } from '../../domain/project-fields.ts';
import { formField, type Field } from './form.ts';

// Field builders shared by the create and edit dialogs, so the copy and limits match.

export function nameField(value = ''): Field {
  return formField({
    name: 'name',
    label: 'Name',
    help: 'Shown in every list. The link stays the same if you rename it.',
    value,
    maxLength: NAME_LIMIT,
  });
}

export function summaryField(value = ''): Field {
  return formField({ name: 'summary', label: 'What is it? (optional)', help: 'One line, for when you look at it later.', value });
}

export function outcomeField(value = ''): Field {
  return formField({ name: 'outcome', label: 'Outcome (optional)', help: 'One line: the result you want when this is done.', value });
}

export function nextActionField(value = ''): Field {
  return formField({ name: 'next', label: 'Next action (optional for ideas)', help: 'The first concrete step, written as an instruction.', value });
}
