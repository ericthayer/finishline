import { PostgrestClient } from '@supabase/postgrest-js';
import { describe, expect, it } from 'vitest';
import type { Backend } from '../src/data/client.ts';
import { supabaseProjects } from '../src/data/projects.ts';
import { explainGate, parseCriteria, parseGateError, planCriteria, uniqueSlug } from '../src/domain/index.ts';
import { saveError } from '../src/app/errors.ts';
import { buildInbox } from '../src/state/inbox-model.ts';
import { project } from './fixtures.ts';

describe('uniqueSlug', () => {
  it('takes the base when free, then the next number', () => {
    expect(uniqueSlug('devlog', new Set())).toBe('devlog');
    expect(uniqueSlug('devlog', new Set(['devlog', 'devlog-2']))).toBe('devlog-3');
  });

  it('stays within 60 characters', () => {
    const base = 'a'.repeat(60);
    expect(uniqueSlug(base, new Set([base]))).toBe(`${'a'.repeat(58)}-2`);
  });
});

describe('gate copy', () => {
  it('says what to add, for client and server failures alike', () => {
    expect(explainGate({ code: 'MISSING_OUTCOME' }, 'ready')).toBe('Add an outcome to move this to Ready.');
    expect(explainGate({ code: 'WIP_CAP_REACHED', cap: 3, active: 3 }, 'active')).toMatch(/^All 3 lanes are full/);
    expect(explainGate({ code: 'NOT_ALLOWED', from: 'idea', to: 'shipped' }, 'shipped')).toBe("Idea projects can't move to Shipped.");
  });

  it('reads GATE: codes out of database errors', () => {
    expect(parseGateError('GATE:MISSING_OUTCOME,MISSING_SHIP_CRITERIA')).toEqual([
      { code: 'MISSING_OUTCOME' },
      { code: 'MISSING_SHIP_CRITERIA' },
    ]);
    expect(parseGateError('permission denied for table projects')).toBeNull();
    expect(saveError(new Error('GATE:MISSING_ARCHIVE_REASON'), 'archived')).toBe('Say why you are archiving it.');
    expect(saveError(new Error('Failed to fetch'))).toBe("That didn't save. Failed to fetch");
  });
});

describe('parseCriteria', () => {
  it('one per line, without bullets, blanks or repeats', () => {
    expect(parseCriteria('- Deployed\n\n* [x] Docs written\n  deployed \n• Tests green')).toEqual(['Deployed', 'Docs written', 'Tests green']);
  });
});

describe('planCriteria', () => {
  const existing = [
    { id: 'a', text: 'Deployed', position: 0 },
    { id: 'b', text: 'Docs', position: 1 },
  ];

  it('keeps matching rows, reorders, removes the rest and inserts new text', () => {
    expect(planCriteria(existing, ['Docs', 'Tests'])).toEqual({
      remove: ['a'],
      update: [{ id: 'b', position: 0 }],
      insert: [{ text: 'Tests', position: 1 }],
    });
  });

  it('writes nothing when the list is unchanged', () => {
    expect(planCriteria(existing, ['Deployed', 'Docs'])).toEqual({ remove: [], update: [], insert: [] });
  });
});

describe('buildInbox', () => {
  const now = new Date('2026-10-10T12:00:00Z');

  it('lists newest first and flags ideas past triage age', () => {
    const model = buildInbox(
      [
        { project: project({ id: 'old', name: 'Old', createdAt: '2026-08-01T00:00:00Z' }), criteria: [] },
        {
          project: project({ id: 'new', name: 'New', createdAt: '2026-10-10T11:00:00Z', outcome: null, nextAction: null }),
          criteria: [
            { id: 'c2', text: 'Second', position: 1, doneAt: null },
            { id: 'c1', text: 'First', position: 0, doneAt: null },
          ],
        },
      ],
      now,
    );
    expect(model.items.map((i) => i.id)).toEqual(['new', 'old']);
    expect(model.items[0]).toMatchObject({ captured: 'Captured 1 hr ago', outcome: '', nextAction: '', criteria: ['First', 'Second'] });
    expect(model.items[0]?.stale).toBeUndefined();
    expect(model.items[1]).toMatchObject({ captured: 'Captured on Aug 1', stale: { level: 'stale', days: 70 } });
    expect(model.staleCount).toBe(1);
  });
});

// A PostgREST stand-in: records each request and answers from a queue.
function fakeBackend(responses: { status: number; body: unknown }[]): { backend: Backend; calls: string[] } {
  const calls: string[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    calls.push(`${init?.method ?? 'GET'} ${url.pathname}${decodeURIComponent(url.search)}${init?.body ? ` ${String(init.body)}` : ''}`);
    const next = responses.shift() ?? { status: 200, body: [] };
    return new Response(next.body === null ? null : JSON.stringify(next.body), { status: next.status, headers: { 'content-type': 'application/json' } });
  };
  const db = new PostgrestClient('https://x.supabase.co/rest/v1', { fetch });
  return { backend: { db } as unknown as Backend, calls };
}

const row = (slug: string) => ({
  id: 'p', slug, name: 'Dev Log', outcome: null, summary: null, status: 'idea', status_changed_at: 'now', next_action: null,
  agent_instructions: null, focus_rank: null, review_on: null, last_reviewed_at: null, last_progress_at: 'now', shipped_at: null,
  shipped_url: null, archived_at: null, archived_reason: null, tags: [], created_at: 'now', updated_at: 'now',
});

describe('supabaseProjects', () => {
  it('captures with the next free slug and retries when another tab took it first', async () => {
    const { backend, calls } = fakeBackend([
      { status: 200, body: [{ slug: 'dev-log' }] },
      { status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint' } },
      { status: 200, body: [{ slug: 'dev-log' }, { slug: 'dev-log-2' }] },
      { status: 201, body: row('dev-log-3') },
    ]);
    const p = await supabaseProjects(backend).capture({ name: '  Dev Log ' });
    expect(p.slug).toBe('dev-log-3');
    expect(calls[1]).toContain('"slug":"dev-log-2"');
    expect(calls[3]).toContain('"name":"Dev Log","slug":"dev-log-3","summary":null');
  });

  it('promotes by saving the gate fields, syncing the checklist, then transitioning', async () => {
    const { backend, calls } = fakeBackend([
      { status: 204, body: null },
      { status: 200, body: [{ id: 'a', text: 'Stale item', position: 0 }] },
      { status: 204, body: null },
      { status: 201, body: null },
      { status: 200, body: row('dev-log') },
    ]);
    await supabaseProjects(backend).promote('p', { outcome: 'Ship it', nextAction: 'Start', criteria: ['Deployed'] });
    expect(calls.map((c) => c.split(' ').slice(0, 2).join(' '))).toEqual([
      'PATCH /rest/v1/projects?id=eq.p',
      'GET /rest/v1/ship_criteria?select=id,text,position&project_id=eq.p',
      'DELETE /rest/v1/ship_criteria?id=in.(a)',
      'POST /rest/v1/ship_criteria?columns="project_id","text","position"',
      'POST /rest/v1/rpc/transition_project',
    ]);
    expect(calls[4]).toContain('"p_to":"ready"');
  });

  it('surfaces gate errors from the database', async () => {
    const { backend } = fakeBackend([{ status: 400, body: { code: 'P0001', message: 'GATE:MISSING_ARCHIVE_REASON' } }]);
    await expect(supabaseProjects(backend).archive('p', ' ')).rejects.toThrow('GATE:MISSING_ARCHIVE_REASON');
  });
});
