import type { ProjectListing } from '../data/projects.ts';
import type { Project } from '../domain/types.ts';
import { relativeTime } from './overview-model.ts';

// Archive (SPEC §5): shipped and archived projects, most recently closed first. Pure, so it is unit-tested.

export type ClosedStatus = 'shipped' | 'archived';

export interface ArchiveItem {
  id: string;
  name: string;
  status: ClosedStatus;
  /** When it closed: "3 days ago" or "Sep 12". The status pill beside it says how. */
  closed: string;
  /** The archive reason, or the shipped link when there is one. */
  note: { kind: 'reason'; text: string } | { kind: 'link'; url: string } | null;
  /** Carried into the reopen dialog so the last next action is a starting point. */
  nextAction: string;
}

export interface ArchiveModel {
  items: ArchiveItem[];
  shipped: number;
  archived: number;
}

const isClosed = (p: Project): p is Project & { status: ClosedStatus } => p.status === 'shipped' || p.status === 'archived';

/** When the project closed: the shipped or archived stamp, falling back to the last status change. */
function closedAt(p: Project & { status: ClosedStatus }): string {
  return (p.status === 'shipped' ? p.shippedAt : p.archivedAt) ?? p.statusChangedAt;
}

function note(p: Project & { status: ClosedStatus }): ArchiveItem['note'] {
  if (p.status === 'archived') return p.archivedReason ? { kind: 'reason', text: p.archivedReason } : null;
  return p.shippedUrl ? { kind: 'link', url: p.shippedUrl } : null;
}

export function buildArchive(listings: readonly ProjectListing[], now: Date): ArchiveModel {
  const closed = listings.map((l) => l.project).filter(isClosed);
  closed.sort((a, b) => Date.parse(closedAt(b)) - Date.parse(closedAt(a)) || a.name.localeCompare(b.name));
  return {
    items: closed.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      closed: relativeTime(closedAt(p), now),
      note: note(p),
      nextAction: p.nextAction ?? '',
    })),
    shipped: closed.filter((p) => p.status === 'shipped').length,
    archived: closed.filter((p) => p.status === 'archived').length,
  };
}
