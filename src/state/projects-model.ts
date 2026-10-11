import { PLATFORM_LABELS } from '../domain/brief.ts';
import { staleness } from '../domain/staleness.ts';
import { OPEN_STATUSES, type ProjectStatus } from '../domain/types.ts';
import type { ProjectListing } from '../data/projects.ts';
import type { ProjectRow } from '../ui/components/table.ts';
import { relativeTime } from './overview-model.ts';

// Projects list (SPEC §5): search by name, filter by status, shipped and archived hidden by default.
// Pure, so it is unit-tested.

export interface ProjectFilter {
  readonly query: string;
  readonly statuses: ReadonlySet<ProjectStatus>;
}

export const DEFAULT_STATUSES: ReadonlySet<ProjectStatus> = new Set(OPEN_STATUSES);

export function filterProjects(listings: readonly ProjectListing[], filter: ProjectFilter): ProjectListing[] {
  const q = filter.query.trim().toLowerCase();
  return listings.filter(
    ({ project }) => filter.statuses.has(project.status) && (q === '' || project.name.toLowerCase().includes(q)),
  );
}

export function toProjectRows(listings: readonly ProjectListing[], now: Date): ProjectRow[] {
  return [...listings]
    .sort((a, b) => a.project.name.localeCompare(b.project.name))
    .map(({ project: p, platform, repo }): ProjectRow => {
      const s = staleness(p, now);
      return {
        id: p.id,
        name: p.name,
        key: repo ?? p.slug,
        href: `/p/${p.slug}`,
        status: p.status,
        ...(p.nextAction ? { next: p.nextAction } : {}),
        ...(platform ? { platform: PLATFORM_LABELS[platform] } : {}),
        ...(s.level !== 'none'
          ? { stale: { level: s.level, days: s.days, ...(p.status === 'paused' ? { label: s.days < 0 ? 'until review' : 'past review date' } : {}) } }
          : {}),
        updated: relativeTime(p.updatedAt, now),
      };
    });
}
