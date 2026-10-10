import type { Project } from './types.ts';

// Stale detection (SPEC §6). Computed at read time, never stored.
// All day math is in UTC whole days.

export interface StaleThresholds {
  activeStaleDays: number;
  activeColdDays: number;
  readyStaleDays: number;
  readyColdDays: number;
  /** Days past `reviewOn` before a paused project turns cold. */
  pausedColdDays: number;
  ideaStaleDays: number;
}

export const DEFAULT_STALE_THRESHOLDS: Readonly<StaleThresholds> = {
  activeStaleDays: 7,
  activeColdDays: 21,
  readyStaleDays: 14,
  readyColdDays: 30,
  pausedColdDays: 30,
  ideaStaleDays: 30,
};

/** Moves offered inline on the Overview's "Needs a decision" lane. */
export type StaleMove = 'resume' | 'pause' | 'archive' | 'activate' | 'demote' | 'promote' | 'review';

export type Staleness =
  | { level: 'none' }
  | { level: 'fresh'; days: number }
  | { level: 'stale' | 'cold'; days: number; moves: readonly StaleMove[] };

type StaleInput = Pick<
  Project,
  'status' | 'lastProgressAt' | 'statusChangedAt' | 'reviewOn' | 'lastReviewedAt' | 'createdAt'
>;

const DAY_MS = 86_400_000;

function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/** Whole UTC days from `start` to `now`; negative when `start` is in the future. */
export function daysSince(start: string, now: Date): number {
  return utcDay(now.getTime()) - utcDay(Date.parse(start));
}

function later(a: string, b: string | null): string {
  return b !== null && Date.parse(b) > Date.parse(a) ? b : a;
}

function grade(
  days: number,
  staleAt: number,
  coldAt: number,
  staleMoves: readonly StaleMove[],
  coldMoves: readonly StaleMove[],
): Staleness {
  if (days >= coldAt) return { level: 'cold', days, moves: coldMoves };
  if (days >= staleAt) return { level: 'stale', days, moves: staleMoves };
  return { level: 'fresh', days };
}

export function staleness(
  project: StaleInput,
  now: Date,
  t: StaleThresholds = DEFAULT_STALE_THRESHOLDS,
): Staleness {
  switch (project.status) {
    case 'active':
      // Review never snoozes Active: only progress resets the clock.
      return grade(
        daysSince(project.lastProgressAt, now),
        t.activeStaleDays,
        t.activeColdDays,
        ['resume', 'pause'],
        ['pause', 'archive'],
      );
    case 'ready':
      return grade(
        daysSince(later(project.statusChangedAt, project.lastReviewedAt), now),
        t.readyStaleDays,
        t.readyColdDays,
        ['activate', 'review'],
        ['activate', 'demote'],
      );
    case 'paused': {
      if (project.reviewOn === null) return { level: 'fresh', days: 0 };
      const pastReview = daysSince(`${project.reviewOn}T00:00:00Z`, now);
      return grade(pastReview, 0, t.pausedColdDays, ['resume', 'review'], ['resume', 'archive']);
    }
    case 'idea': {
      const days = daysSince(later(project.createdAt, project.lastReviewedAt), now);
      // Ideas have no cold tier: past the triage age they need one decision.
      return grade(days, t.ideaStaleDays, Number.POSITIVE_INFINITY, ['promote', 'archive', 'review'], []);
    }
    case 'shipped':
    case 'archived':
      return { level: 'none' };
  }
}

export function needsDecision(s: Staleness): s is Extract<Staleness, { moves: readonly StaleMove[] }> {
  return s.level === 'stale' || s.level === 'cold';
}
