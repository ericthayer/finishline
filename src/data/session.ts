import type { Session } from '@supabase/auth-js';
import { signal, type Signal } from '../state/signal.ts';
import type { Backend } from './client.ts';

export type SessionState =
  | { kind: 'loading' }
  | { kind: 'signed-out'; error?: string }
  | { kind: 'signed-in'; userId: string; displayName: string };

function toState(session: Session | null): SessionState {
  if (!session) return { kind: 'signed-out' };
  const meta = session.user.user_metadata;
  const name =
    (typeof meta['user_name'] === 'string' && meta['user_name']) ||
    (typeof meta['full_name'] === 'string' && meta['full_name']) ||
    session.user.email ||
    'You';
  return { kind: 'signed-in', userId: session.user.id, displayName: name };
}

/** Tracks the auth session. The OAuth callback (`?code=`) is exchanged during init. */
export function watchSession(backend: Backend): Signal<SessionState> {
  const state = signal<SessionState>({ kind: 'loading' });
  backend.auth.onAuthStateChange((_event, session) => state.set(toState(session)));
  void backend.auth.getSession().then(({ data, error }) => {
    state.set(error ? { kind: 'signed-out', error: error.message } : toState(data.session));
  });
  return state;
}

export async function signInWithGitHub(backend: Backend): Promise<string | null> {
  const { error } = await backend.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${location.origin}/` },
  });
  return error ? error.message : null;
}

export async function signOut(backend: Backend): Promise<void> {
  await backend.auth.signOut();
}
