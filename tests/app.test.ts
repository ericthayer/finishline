import { describe, expect, it, vi } from 'vitest';
import { match } from '../src/app/router.ts';
import { readConfig } from '../src/data/client.ts';
import { signal } from '../src/state/signal.ts';

describe('router', () => {
  it('matches static routes, trailing slashes and params', () => {
    expect(match('/').name).toBe('overview');
    expect(match('/projects/').name).toBe('projects');
    expect(match('/p/finish-line')).toEqual({ name: 'project', params: { slug: 'finish-line' } });
    expect(match('/p/').name).toBe('not-found');
    expect(match('/nope/deeper').name).toBe('not-found');
  });
});

describe('signal', () => {
  it('notifies on change only, and unsubscribes', () => {
    const s = signal(1);
    const seen = vi.fn();
    const off = s.subscribe(seen);
    s.set(1);
    s.set(2);
    off();
    s.set(3);
    expect(seen.mock.calls).toEqual([[2]]);
    expect(s.get()).toBe(3);
  });
});

describe('readConfig', () => {
  it('needs both public values and trims the trailing slash', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co/' })).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_k' })).toEqual({
      url: 'https://x.supabase.co',
      publishableKey: 'sb_publishable_k',
    });
  });
});
