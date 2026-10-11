import { describe, expect, it } from 'vitest';
import type { ProjectListing } from '../src/data/projects.ts';
import { buildArchive } from '../src/state/archive-model.ts';
import { project } from './fixtures.ts';

const listing = (overrides: Parameters<typeof project>[0]): ProjectListing => ({ project: project(overrides), platform: null, repo: null });
const now = new Date('2026-10-10T12:00:00Z');

describe('buildArchive', () => {
  const model = buildArchive(
    [
      listing({ id: 'open', name: 'Open', status: 'active' }),
      listing({ id: 'old', name: 'Old', status: 'archived', archivedAt: '2026-09-02T00:00:00Z', archivedReason: 'Superseded' }),
      listing({ id: 'new', name: 'New', status: 'shipped', shippedAt: '2026-10-08T12:00:00Z', shippedUrl: 'https://example.com', nextAction: null }),
      listing({ id: 'bare', name: 'Bare', status: 'shipped', shippedAt: null, statusChangedAt: '2026-10-09T12:00:00Z' }),
    ],
    now,
  );

  it('keeps only shipped and archived projects, most recently closed first', () => {
    expect(model.items.map((i) => i.id)).toEqual(['bare', 'new', 'old']);
    expect([model.shipped, model.archived]).toEqual([2, 1]);
  });

  it('says when it closed and why', () => {
    const [bare, recent, old] = model.items;
    expect(bare?.closed).toBe('1 day ago');
    expect(recent?.note).toEqual({ kind: 'link', url: 'https://example.com' });
    expect(old?.closed).toBe('Sep 2');
    expect(old?.note).toEqual({ kind: 'reason', text: 'Superseded' });
    expect(bare?.note).toBeNull();
  });

  it('carries the last next action into reopen, blank when there was none', () => {
    expect(model.items.find((i) => i.id === 'new')?.nextAction).toBe('');
    expect(model.items.find((i) => i.id === 'old')?.nextAction).toBe('Write the init migration');
  });
});
