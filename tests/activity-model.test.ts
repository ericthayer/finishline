import { describe, expect, it } from 'vitest';
import type { ActivityData } from '../src/data/activity.ts';
import { buildTimeline } from '../src/state/activity-model.ts';

const NOW = new Date('2026-10-10T12:00:00Z');

describe('buildTimeline', () => {
  it('groups events by UTC day with Today and Yesterday labels', () => {
    const data: ActivityData = {
      projects: new Map([['p1', { name: 'Finishlyne', slug: 'finishlyne' }]]),
      events: [
        { projectId: 'p1', occurredAt: '2026-10-10T09:05:00Z', source: 'user', payload: { type: 'status_changed', from: 'ready', to: 'active' } },
        { projectId: 'p1', occurredAt: '2026-10-10T08:00:00Z', source: 'github', payload: { type: 'github_pr_merged', repoLinkId: 'r', number: 7 } },
        { projectId: 'p1', occurredAt: '2026-10-09T23:59:00Z', source: 'user', payload: { type: 'reviewed' } },
        { projectId: 'gone', occurredAt: '2026-10-06T10:00:00Z', source: 'user', payload: { type: 'checkpoint_added', checkpointId: 'c' } },
      ],
    };
    const days = buildTimeline(data, NOW);
    expect(days.map((d) => [d.label, d.items.length])).toEqual([['Today', 2], ['Yesterday', 1], ['Tue, Oct 6', 1]]);
    expect(days[0]?.items[0]).toEqual({
      kind: 'status',
      title: 'Finishlyne moved to Active',
      time: '09:05',
      iso: '2026-10-10T09:05:00Z',
      by: 'You',
      key: 'finishlyne',
      href: '/p/finishlyne',
    });
    expect(days[0]?.items[1]).toMatchObject({ by: 'GitHub', title: 'Merged PR #7' });
    expect(days[2]?.items[0]).toMatchObject({ title: 'Checkpoint on a project', href: null, key: '' });
  });

  it('returns no days when there is no activity', () => {
    expect(buildTimeline({ events: [], projects: new Map() }, NOW)).toEqual([]);
  });
});
