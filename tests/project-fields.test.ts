import { describe, expect, it } from 'vitest';
import { checkProjectFields, NAME_EMPTY_COPY } from '../src/domain/project-fields.ts';
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
