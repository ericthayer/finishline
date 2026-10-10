import { describe, expect, it } from 'vitest';
import { buildBrief, slugify } from '../src/domain/index.ts';
import { project } from './fixtures.ts';

const now = new Date('2026-10-12T10:00:00Z');

describe('buildBrief', () => {
  it('renders every section in order', () => {
    const brief = buildBrief({
      now,
      project: { ...project(), agentInstructions: 'Strict TypeScript. No new dependencies.' },
      latestCheckpoint: { platform: 'claude_code', summary: 'Scaffolded Vite\nand domain layer', createdAt: '2026-10-10T10:00:00Z' },
      shipCriteria: [
        { text: 'Deployed', doneAt: null, position: 2 },
        { text: 'Schema with RLS', doneAt: '2026-10-10T00:00:00Z', position: 1 },
      ],
      decisions: [
        { text: 'GitHub App', rationale: 'least privilege', supersededBy: null, createdAt: '2026-10-10T00:00:00Z' },
        { text: 'OAuth App', rationale: null, supersededBy: 'd2', createdAt: '2026-10-09T00:00:00Z' },
      ],
      blockers: [
        { text: 'Need Supabase project', resolvedAt: null },
        { text: 'Old blocker', resolvedAt: '2026-10-10T00:00:00Z' },
      ],
      repo: { fullName: 'ericthayer/finishline', trackedBranch: null, defaultBranch: 'main' },
      recentCommits: [{ sha: 'abcdef1234', message: 'Add domain layer\n\nbody', committedAt: '2026-10-10T00:00:00Z' }],
      includeCommits: true,
    });

    expect(brief).toBe(`# Resuming: Finishline
Tracks projects born from agentic development

## Outcome
A personal command center that gets projects shipped

## Where it stands
Last session (Claude Code, 2 days ago): Scaffolded Vite and domain layer
Repo: ericthayer/finishline · branch main
Recent commits:
- abcdef1 Add domain layer

## Done when
- [x] Schema with RLS
- [ ] Deployed

## Decisions already made (don't relitigate)
- GitHub App — least privilege

## Open blockers
- Need Supabase project

## Do this next
Write the init migration

## Working instructions
Strict TypeScript. No new dependencies.
`);
  });

  it('omits empty sections and commits unless asked', () => {
    const brief = buildBrief({
      now,
      project: { name: 'Bare', summary: null, outcome: null, nextAction: null, agentInstructions: null },
      recentCommits: [{ sha: 'abcdef1234', message: 'x', committedAt: '2026-10-10T00:00:00Z' }],
    });
    expect(brief).toBe('# Resuming: Bare\n');
  });
});

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Café  Tracker: v2!')).toBe('cafe-tracker-v2');
    expect(slugify('!!!')).toBe('project');
  });
});
