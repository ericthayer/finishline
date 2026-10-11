import type { AgentPlatformId, PlatformLink, ProjectStatus } from './types.ts';
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

export const PLATFORM_LABEL_COPY = 'Name the platform, since it is not in the list.';
export const PLATFORM_LINK_NEEDS_PLATFORM_COPY = 'Pick the platform this link opens.';

export interface PlatformFieldValues {
  /** '' when no platform is picked. */
  platform: AgentPlatformId | '';
  label: string;
  url: string;
}

/** Error copy per platform field, or null where the field is fine. */
export function checkPlatformFields(values: PlatformFieldValues): { label: string | null; url: string | null } {
  const url = values.url.trim();
  return {
    label: values.platform === 'other' && !values.label.trim() ? PLATFORM_LABEL_COPY : null,
    url: url && !values.platform ? PLATFORM_LINK_NEEDS_PLATFORM_COPY : shipUrlError(url),
  };
}

/** The checked form values as the record to save; null when no platform is picked. */
export function toPlatformLink(values: PlatformFieldValues): PlatformLink | null {
  if (!values.platform) return null;
  return {
    platform: values.platform,
    label: values.platform === 'other' ? values.label.trim() || null : null,
    url: values.url.trim() || null,
  };
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

export const WIP_CAP_MIN = 1;
export const WIP_CAP_MAX = 10;
export const WIP_CAP_COPY = `Use a whole number from ${WIP_CAP_MIN} to ${WIP_CAP_MAX}.`;

/** The cap is a whole number the database also bounds; null when the text is a valid cap. */
export function wipCapError(raw: string): string | null {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return WIP_CAP_COPY;
  const n = Number(value);
  return n < WIP_CAP_MIN || n > WIP_CAP_MAX ? WIP_CAP_COPY : null;
}

export const REVIEW_DATE_COPY = 'Pick the day it comes back for review.';
export const REVIEW_DATE_PAST_COPY = 'Pick today or a later day.';

/** A pause review date is a real calendar day (YYYY-MM-DD) that is not before `today`. Null when fine. */
export function reviewDateError(raw: string, today: string): string | null {
  const value = raw.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return REVIEW_DATE_COPY;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const real = new Date(Date.UTC(y, m - 1, d));
  if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return REVIEW_DATE_COPY;
  return value < today ? REVIEW_DATE_PAST_COPY : null;
}
