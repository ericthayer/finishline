import { describe, expect, it } from 'vitest';
import type { OverviewData } from '../src/data/overview.ts';
import { buildOverview, relativeTime } from '../src/state/overview-model.ts';
import { project } from './fixtures.ts';

const NOW = new Date('2026-10-10T12:00:00Z');

function data(overrides: Partial<OverviewData> = {}): OverviewData {
  return { projects: [], platforms: new Map(), repos: new Map(), events: [], ...overrides };
}

describe('buildOverview', () => {
  it('marks an account with no projects as empty and leaves every lane open', () => {
    const m = buildOverview(data(), NOW);
    expect(m.empty).toBe(true);
    expect(m.lanes).toEqual([{ lane: 1 }, { lane: 2 }, { lane: 3 }]);
    expect(m.kpis[0]).toMatchObject({ label: 'Active', value: '0', unit: '/3', meta: '3 lanes open' });
  });

  it('fills lanes by focus rank and counts stale, cold and review-due projects', () => {
    const projects = [
      project({ id: 'a', slug: 'a', name: 'A', status: 'active', focusRank: 2, lastProgressAt: '2026-10-09T00:00:00Z' }),
      project({ id: 'b', slug: 'b', name: 'B', status: 'active', focusRank: 1, lastProgressAt: '2026-09-01T00:00:00Z' }),
      project({ id: 'c', slug: 'c', name: 'C', status: 'paused', reviewOn: '2026-10-01' }),
      project({ id: 'd', slug: 'd', name: 'D', status: 'shipped', shippedAt: '2026-10-03T00:00:00Z' }),
      project({ id: 'e', slug: 'e', name: 'E', status: 'archived', archivedReason: 'Superseded' }),
    ];
    const m = buildOverview(
      data({ projects, platforms: new Map([['b', 'codex']]), repos: new Map([['b', 'eric/b']]) }),
      NOW,
    );
    expect(m.activeNames).toEqual(['B', 'A']);
    expect(m.lanes[0]?.project).toMatchObject({ name: 'B', level: 'cold', where: 'Codex · eric/b', href: '/p/b' });
    expect(m.lanes[2]).toEqual({ lane: 3 });
    expect(m.kpis[1]).toMatchObject({ value: '2', delta: '1 cold', tone: 'danger' });
    expect(m.kpis[2]).toMatchObject({ value: '1' });
    expect(m.kpis[3]).toMatchObject({ value: '1', delta: '+1 vs last', tone: 'positive' });
    expect(m.finish).toEqual({ shipped: 1, archived: 1 });
    expect(m.stages.map((s) => s.count)).toEqual([0, 0, 2, 1, 1]);
  });

  it('sorts the table cold first and hides shipped and archived projects', () => {
    const projects = [
      project({ id: 'f', slug: 'fresh', name: 'Fresh', status: 'active', lastProgressAt: '2026-10-10T00:00:00Z' }),
      project({ id: 'c', slug: 'cold', name: 'Cold', status: 'active', lastProgressAt: '2026-09-01T00:00:00Z' }),
      project({ id: 's', slug: 'done', name: 'Done', status: 'shipped' }),
    ];
    const rows = buildOverview(data({ projects }), NOW).rows;
    expect(rows.map((r) => r.name)).toEqual(['Cold', 'Fresh']);
    expect(rows[0]?.stale).toEqual({ level: 'cold', days: 39 });
  });

  it('turns events into feed lines named after their project', () => {
    const m = buildOverview(
      data({
        projects: [project({ id: 'p1', slug: 'finishline', name: 'Finishline' })],
        events: [
          { projectId: 'p1', occurredAt: '2026-10-10T11:46:00Z', source: 'user', payload: { type: 'status_changed', from: 'active', to: 'paused' } },
          { projectId: 'p1', occurredAt: '2026-10-10T09:00:00Z', source: 'github', payload: { type: 'github_push', repoLinkId: 'r', branch: 'main', sha: 'abc' } },
        ],
      }),
      NOW,
    );
    expect(m.feed).toEqual([
      { kind: 'paused', title: 'Paused Finishline', meta: '14 min ago · You', key: 'finishline' },
      { kind: 'push', title: 'Pushed to main', meta: '3 hrs ago · GitHub', key: 'finishline' },
    ]);
  });
});

describe('relativeTime', () => {
  it('moves from minutes to hours to days to dates', () => {
    expect(relativeTime('2026-10-10T11:59:50Z', NOW)).toBe('just now');
    expect(relativeTime('2026-10-10T11:00:00Z', NOW)).toBe('1 hr ago');
    expect(relativeTime('2026-10-08T12:00:00Z', NOW)).toBe('2 days ago');
    expect(relativeTime('2026-09-06T12:00:00Z', NOW)).toBe('Sep 6');
  });
});
