import type { ProjectEventType } from './types.ts';

/**
 * Events that count as progress and move `lastProgressAt` (SPEC §6).
 * `reviewed` is deliberately absent: reviewing is not progress.
 * Keep in sync with `public.progress_event_types()` in the init migration.
 */
export const PROGRESS_EVENT_TYPES: ReadonlySet<ProjectEventType> = new Set<ProjectEventType>([
  'status_changed',
  'next_action_completed',
  'checkpoint_added',
  'ship_criterion_done',
  'github_push',
  'github_pr_merged',
]);

export function isProgressEvent(type: ProjectEventType): boolean {
  return PROGRESS_EVENT_TYPES.has(type);
}
