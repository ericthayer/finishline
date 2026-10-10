import { describe, expect, it } from 'vitest';
import { checkTransition, defaultReviewOn, type GateCode, type TransitionContext } from '../src/domain/index.ts';
import { project } from './fixtures.ts';

const ctx = (o: Partial<TransitionContext> = {}): TransitionContext => ({
  activeCount: 0,
  wipCap: 3,
  shipCriteria: [{ doneAt: null }],
  ...o,
});

function codes(r: ReturnType<typeof checkTransition>): GateCode[] {
  return r.ok ? [] : r.failures.map((f) => f.code);
}

describe('checkTransition', () => {
  it('rejects transitions outside the lifecycle', () => {
    expect(codes(checkTransition(project({ status: 'idea' }), 'active', ctx()))).toEqual(['NOT_ALLOWED']);
    expect(codes(checkTransition(project({ status: 'shipped' }), 'active', ctx()))).toEqual(['NOT_ALLOWED']);
  });

  it('idea → ready needs outcome, a ship criterion and a next action', () => {
    expect(checkTransition(project(), 'ready', ctx()).ok).toBe(true);
    const bare = project({ outcome: '  ', nextAction: null });
    expect(codes(checkTransition(bare, 'ready', ctx({ shipCriteria: [] })))).toEqual([
      'MISSING_NEXT_ACTION',
      'MISSING_OUTCOME',
      'MISSING_SHIP_CRITERIA',
    ]);
  });

  it('enforces the WIP cap when activating', () => {
    const ready = project({ status: 'ready' });
    expect(checkTransition(ready, 'active', ctx({ activeCount: 2 })).ok).toBe(true);
    const r = checkTransition(ready, 'active', ctx({ activeCount: 3 }));
    expect(r).toEqual({ ok: false, failures: [{ code: 'WIP_CAP_REACHED', cap: 3, active: 3 }] });
    expect(codes(checkTransition(project({ status: 'paused' }), 'active', ctx({ activeCount: 3 })))).toEqual([
      'WIP_CAP_REACHED',
    ]);
  });

  it('pausing requires a park note; a next action can be supplied in the same flow', () => {
    const active = project({ status: 'active', nextAction: null });
    expect(codes(checkTransition(active, 'paused', ctx()))).toEqual(['MISSING_NEXT_ACTION', 'MISSING_CHECKPOINT']);
    expect(checkTransition(active, 'paused', ctx({ checkpointSummary: 'Wired auth', nextAction: 'Add RLS tests' })).ok).toBe(
      true,
    );
  });

  it('shipping requires every criterion done unless shipping anyway', () => {
    const active = project({ status: 'active' });
    const criteria = [{ doneAt: '2026-10-02T00:00:00Z' }, { doneAt: null }];
    expect(checkTransition(active, 'shipped', ctx({ shipCriteria: criteria }))).toEqual({
      ok: false,
      failures: [{ code: 'UNMET_SHIP_CRITERIA', remaining: 1 }],
    });
    expect(checkTransition(active, 'shipped', ctx({ shipCriteria: criteria, shipAnyway: true })).ok).toBe(true);
  });

  it('archiving requires a reason from any open state', () => {
    for (const status of ['idea', 'ready', 'active', 'paused'] as const) {
      expect(codes(checkTransition(project({ status }), 'archived', ctx()))).toEqual(['MISSING_ARCHIVE_REASON']);
      expect(checkTransition(project({ status }), 'archived', ctx({ archivedReason: 'Superseded' })).ok).toBe(true);
    }
  });

  it('reopens shipped and archived projects into ready', () => {
    expect(checkTransition(project({ status: 'shipped' }), 'ready', ctx()).ok).toBe(true);
    expect(checkTransition(project({ status: 'archived' }), 'ready', ctx()).ok).toBe(true);
  });
});

describe('defaultReviewOn', () => {
  it('is 14 UTC days out', () => {
    expect(defaultReviewOn(new Date('2026-10-25T23:30:00Z'))).toBe('2026-11-08');
  });
});
