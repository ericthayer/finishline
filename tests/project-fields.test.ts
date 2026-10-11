import { describe, expect, it } from 'vitest';
import { checkProjectFields, NAME_EMPTY_COPY, WIP_CAP_COPY, wipCapError, reviewDateError, REVIEW_DATE_COPY, REVIEW_DATE_PAST_COPY } from '../src/domain/project-fields.ts';
import { requiresNextAction } from '../src/domain/lifecycle.ts';

describe('requiresNextAction', () => {
  it('applies to Ready, Active and Paused only', () => {
    expect(['ready', 'active', 'paused'].map((s) => requiresNextAction(s as never))).toEqual([true, true, true]);
    expect(['idea', 'shipped', 'archived'].map((s) => requiresNextAction(s as never))).toEqual([false, false, false]);
  });
});

describe('checkProjectFields', () => {
  it('needs a name, always', () => {
    expect(checkProjectFields('idea', { name: '  ', nextAction: '' }).name).toBe(NAME_EMPTY_COPY);
    expect(checkProjectFields('idea', { name: 'Dev log', nextAction: '' }).name).toBeNull();
  });

  it('needs a next action once a project is Ready, Active or Paused, and says so in its own status', () => {
    expect(checkProjectFields('active', { name: 'Dev log', nextAction: ' ' }).nextAction).toBe(
      'Active projects need a next action. Write the first concrete step.',
    );
    expect(checkProjectFields('idea', { name: 'Dev log', nextAction: '' }).nextAction).toBeNull();
    expect(checkProjectFields('paused', { name: 'Dev log', nextAction: 'Decide the stack' }).nextAction).toBeNull();
  });
});

describe('shipUrlError', () => {
  it('is optional, and when given must be https', async () => {
    const { shipUrlError, SHIP_URL_COPY } = await import('../src/domain/project-fields.ts');
    expect(shipUrlError('  ')).toBeNull();
    expect(shipUrlError('https://example.com/app')).toBeNull();
    expect(shipUrlError('http://example.com')).toBe(SHIP_URL_COPY);
    expect(shipUrlError('not a link')).toBe(SHIP_URL_COPY);
  });
});

describe('wipCapError', () => {
  it('accepts whole numbers from 1 to 10', () => {
    for (const ok of ['1', '3', ' 10 ']) expect(wipCapError(ok)).toBeNull();
  });

  it('refuses everything else with the same copy', () => {
    for (const bad of ['', '0', '11', '2.5', '-1', 'three', '1e1']) expect(wipCapError(bad)).toBe(WIP_CAP_COPY);
  });
});

describe('reviewDateError', () => {
  it('accepts today and later days', () => {
    expect(reviewDateError('2026-10-10', '2026-10-10')).toBeNull();
    expect(reviewDateError(' 2027-01-05 ', '2026-10-10')).toBeNull();
  });

  it('refuses earlier days', () => {
    expect(reviewDateError('2026-10-09', '2026-10-10')).toBe(REVIEW_DATE_PAST_COPY);
  });

  it('refuses text that is not a real day', () => {
    for (const bad of ['', 'soon', '2026-13-01', '2026-02-30', '10/24/2026']) expect(reviewDateError(bad, '2026-10-10')).toBe(REVIEW_DATE_COPY);
  });
});

describe('platform fields', () => {
  it('needs a name for Other, and a platform and https for a deep link', async () => {
    const { checkPlatformFields, PLATFORM_LABEL_COPY, PLATFORM_LINK_NEEDS_PLATFORM_COPY, SHIP_URL_COPY } = await import(
      '../src/domain/project-fields.ts'
    );
    expect(checkPlatformFields({ platform: '', label: '', url: '' })).toEqual({ label: null, url: null });
    expect(checkPlatformFields({ platform: 'other', label: ' ', url: '' }).label).toBe(PLATFORM_LABEL_COPY);
    expect(checkPlatformFields({ platform: '', label: '', url: 'https://bolt.new/x' }).url).toBe(PLATFORM_LINK_NEEDS_PLATFORM_COPY);
    expect(checkPlatformFields({ platform: 'bolt', label: '', url: 'http://bolt.new/x' }).url).toBe(SHIP_URL_COPY);
    expect(checkPlatformFields({ platform: 'bolt', label: '', url: 'https://bolt.new/x' })).toEqual({ label: null, url: null });
  });

  it('saves null for no platform, and keeps a label only for Other', async () => {
    const { toPlatformLink } = await import('../src/domain/project-fields.ts');
    expect(toPlatformLink({ platform: '', label: 'x', url: '' })).toBeNull();
    expect(toPlatformLink({ platform: 'codex', label: 'stale', url: ' ' })).toEqual({ platform: 'codex', label: null, url: null });
    expect(toPlatformLink({ platform: 'other', label: ' Windsurf ', url: 'https://w.test' })).toEqual({
      platform: 'other',
      label: 'Windsurf',
      url: 'https://w.test',
    });
  });

  it('names Other by its label', async () => {
    const { platformName } = await import('../src/domain/brief.ts');
    expect(platformName({ platform: 'other', label: 'Windsurf' })).toBe('Windsurf');
    expect(platformName({ platform: 'claude_code', label: null })).toBe('Claude Code');
  });
});
