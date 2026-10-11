import type { ProjectStatus } from './types.ts';
import { nextActionMissing } from './gates.ts';

// Rules the create and edit forms check before saving. Pure, so they are unit-tested.

export const NAME_LIMIT = 120;
export const NAME_EMPTY_COPY = 'Give it a name. Anything you will recognize later works.';

export const SHIP_URL_COPY = 'Use a link that starts with https://.';

/** The shipped link is optional; when given it must be an https:// address. Null when fine. */
export function shipUrlError(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  try {
    return new URL(value).protocol === 'https:' ? null : SHIP_URL_COPY;
  } catch {
    return SHIP_URL_COPY;
  }
}

export interface ProjectFieldValues {
  name: string;
  nextAction: string;
}

/** Error copy per field, or null where the field is fine. */
export function checkProjectFields(
  status: ProjectStatus,
  values: ProjectFieldValues,
): { name: string | null; nextAction: string | null } {
  return {
    name: values.name.trim() ? null : NAME_EMPTY_COPY,
    nextAction: nextActionMissing(status, values.nextAction),
  };
}
