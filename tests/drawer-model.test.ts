import { describe, expect, it } from 'vitest';
import type { CriterionRecord, ProjectListing } from '../src/data/projects.ts';
import { buildCommitted, buildPanelProjects } from '../src/state/drawer-model.ts';
import { project } from './fixtures.ts';

const NOW = new Date('2026-10-10T12:00:00Z');

function listing(overrides: Parameters<typeof project>[0], extra: Partial<ProjectListing> = {}): ProjectListing {
  return { project: project(overrides), platform: null, repo: null, ...extra };
}

function criterion(id: string, done: boolean): CriterionRecord {
  return { id, text: id, position: 0, doneAt: done ? '2026-10-09T00:00:00Z' : null };
}

describe('buildCommitted', () => {
  it('asks for one Ready project when nothing is committed', () => {
    const view = buildCommitted([listing({ status: 'ready' })], new Map(), 3, NOW);
    expect(view).toMatchObject({ used: 0, cap: 3, cards: [] });
    expect(view.headline).toBe('Nothing committed. Start one Ready project and see it through.');
  });

  it('orders lanes by focus rank and says to finish before starting more when full', () => {
    const fresh = '2026-10-09T00:00:00Z';
    const view = buildCommitted(
      [
        listing({ id: 'a', name: 'A', status: 'active', focusRank: 2, lastProgressAt: fresh }),
        listing({ id: 'b', name: 'B', status: 'active', focusRank: 1, lastProgressAt: fresh }),
        listing({ id: 'c', name: 'C', status: 'active', focusRank: null, lastProgressAt: fresh }),
        listing({ id: 'd', name: 'D', status: 'paused' }),
      ],
      new Map(),
      3,
      NOW,
    );
    expect(view.cards.map((c) => [c.lane, c.name])).toEqual([[1, 'B'], [2, 'A'], [3, 'C']]);
    expect(view.headline).toBe('All 3 lanes committed. Finish one before you start another.');
  });

  it('nudges by staleness first, then by finish-line items left', () => {
    const view = buildCommitted(
      [
        listing({ id: 'cold', status: 'active', focusRank: 1, lastProgressAt: '2026-09-01T00:00:00Z' }),
        listing({ id: 'stale', status: 'active', focusRank: 2, lastProgressAt: '2026-10-01T00:00:00Z' }),
        listing({ id: 'left', status: 'active', focusRank: 3, lastProgressAt: '2026-10-09T00:00:00Z' }),
        listing({ id: 'done', status: 'active', focusRank: 4, lastProgressAt: '2026-10-09T00:00:00Z' }),
        listing({ id: 'blank', status: 'active', focusRank: 5, nextAction: null }),
      ],
      new Map([
        ['left', [criterion('x', true), criterion('y', false)]],
        ['done', [criterion('z', true)]],
      ]),
      5,
      NOW,
    );
    expect(view.cards.map((c) => [c.level, c.nudge])).toEqual([
      ['cold', 'No progress in 39 days. Do the next action today, or pause it.'],
      ['stale', '9 days since progress. One small step keeps it moving.'],
      ['fresh', '1 of 2 finish-line items left.'],
      ['fresh', 'Every finish-line item is done. Ship it.'],
      [expect.any(String), 'Write the next action before anything else.'],
    ]);
  });
});

describe('buildPanelProjects', () => {
  it('lists open projects active first with the quick actions each status allows', () => {
    const cards = buildPanelProjects(
      [
        listing({ id: 'i', name: 'Idea', status: 'idea' }),
        listing({ id: 'r', name: 'Ready', status: 'ready' }, { platform: { platform: 'codex', label: null, url: null }, repo: 'eric/ready' }),
        listing({ id: 's', name: 'Shipped', status: 'shipped' }),
        listing({ id: 'a', name: 'Active', status: 'active' }),
      ],
      NOW,
    );
    expect(cards.map((c) => [c.name, c.actions])).toEqual([
      ['Active', ['edit', 'archive']],
      ['Ready', ['edit', 'start', 'archive']],
      ['Idea', ['edit', 'archive']],
    ]);
    expect(cards[1]?.where).toContain('eric/ready');
  });
});
