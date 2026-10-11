import type { ActivityData } from '../data/activity.ts';
import type { FeedKind } from '../ui/components/feed.ts';
import { feedItem } from './overview-model.ts';

// Activity timeline: events grouped by calendar day (UTC), newest first. Pure, so it is unit-tested.

export interface TimelineItem {
  kind: FeedKind;
  title: string;
  /** 24-hour time, e.g. 14:05. */
  time: string;
  iso: string;
  by: 'You' | 'GitHub';
  key: string;
  href: string | null;
}

export interface TimelineDay {
  label: string;
  items: TimelineItem[];
}

const DAY_MS = 86_400_000;

function dayLabel(dayStart: number, today: number): string {
  if (dayStart === today) return 'Today';
  if (dayStart === today - DAY_MS) return 'Yesterday';
  return new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function buildTimeline(data: ActivityData, now: Date): TimelineDay[] {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const days: TimelineDay[] = [];
  let currentStart = Number.NaN;
  for (const e of data.events) {
    const at = Date.parse(e.occurredAt);
    const start = Math.floor(at / DAY_MS) * DAY_MS;
    if (start !== currentStart) {
      currentStart = start;
      days.push({ label: dayLabel(start, today), items: [] });
    }
    const project = data.projects.get(e.projectId);
    days[days.length - 1]?.items.push({
      ...feedItem(e.payload, project?.name ?? 'a project'),
      time: new Date(at).toISOString().slice(11, 16),
      iso: e.occurredAt,
      by: e.source === 'github' ? 'GitHub' : 'You',
      key: project?.slug ?? '',
      href: project ? `/p/${project.slug}` : null,
    });
  }
  return days;
}
