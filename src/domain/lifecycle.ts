import type { Project, ProjectStatus, ShipCriterion } from './types.ts';

// Lifecycle gates (SPEC §4). The same rules are enforced server-side by
// `public.transition_project()`; tests/lifecycle-sql.test.ts checks both agree.

export const DEFAULT_WIP_CAP = 3;
export const DEFAULT_PAUSE_REVIEW_DAYS = 14;

export const TRANSITIONS: Readonly<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  idea: ['ready', 'archived'],
  ready: ['active', 'idea', 'archived'],
  active: ['paused', 'shipped', 'archived'],
  paused: ['active', 'archived'],
  shipped: ['ready'],
  archived: ['ready'],
};

export type GateFailure =
  | { code: 'NOT_ALLOWED'; from: ProjectStatus; to: ProjectStatus }
  | { code: 'MISSING_OUTCOME' }
  | { code: 'MISSING_SHIP_CRITERIA' }
  | { code: 'MISSING_NEXT_ACTION' }
  | { code: 'WIP_CAP_REACHED'; cap: number; active: number }
  | { code: 'MISSING_CHECKPOINT' }
  | { code: 'UNMET_SHIP_CRITERIA'; remaining: number }
  | { code: 'MISSING_ARCHIVE_REASON' };

export type GateCode = GateFailure['code'];

export type TransitionCheck = { ok: true } | { ok: false; failures: readonly GateFailure[] };

export interface TransitionContext {
  /** Active projects for this user, excluding the one being moved. */
  activeCount: number;
  wipCap: number;
  shipCriteria: readonly Pick<ShipCriterion, 'doneAt'>[];
  /** Replaces the project's next action as part of this transition. */
  nextAction?: string;
  /** Park note; required when pausing. */
  checkpointSummary?: string;
  archivedReason?: string;
  shipAnyway?: boolean;
}

type GatedProject = Pick<Project, 'status' | 'outcome' | 'nextAction'>;

const NEEDS_NEXT_ACTION: ReadonlySet<ProjectStatus> = new Set(['ready', 'active', 'paused']);

/** Ready, Active and Paused projects must say what happens next. */
export function requiresNextAction(status: ProjectStatus): boolean {
  return NEEDS_NEXT_ACTION.has(status);
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function checkTransition(
  project: GatedProject,
  to: ProjectStatus,
  ctx: TransitionContext,
): TransitionCheck {
  const from = project.status;
  if (!canTransition(from, to)) {
    return { ok: false, failures: [{ code: 'NOT_ALLOWED', from, to }] };
  }

  const failures: GateFailure[] = [];
  const nextAction = ctx.nextAction ?? project.nextAction;

  if (requiresNextAction(to) && isBlank(nextAction)) {
    failures.push({ code: 'MISSING_NEXT_ACTION' });
  }

  if (from === 'idea' && to === 'ready') {
    if (isBlank(project.outcome)) failures.push({ code: 'MISSING_OUTCOME' });
    if (ctx.shipCriteria.length === 0) failures.push({ code: 'MISSING_SHIP_CRITERIA' });
  }

  if (to === 'active' && ctx.activeCount >= ctx.wipCap) {
    failures.push({ code: 'WIP_CAP_REACHED', cap: ctx.wipCap, active: ctx.activeCount });
  }

  if (to === 'paused' && isBlank(ctx.checkpointSummary)) {
    failures.push({ code: 'MISSING_CHECKPOINT' });
  }

  if (to === 'shipped' && !ctx.shipAnyway) {
    const remaining = ctx.shipCriteria.filter((c) => c.doneAt === null).length;
    if (remaining > 0) failures.push({ code: 'UNMET_SHIP_CRITERIA', remaining });
  }

  if (to === 'archived' && isBlank(ctx.archivedReason)) {
    failures.push({ code: 'MISSING_ARCHIVE_REASON' });
  }

  return failures.length === 0 ? { ok: true } : { ok: false, failures };
}

/** Default review date for a pause: today + 14 days, as YYYY-MM-DD (UTC). */
export function defaultReviewOn(now: Date, days: number = DEFAULT_PAUSE_REVIEW_DAYS): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}
