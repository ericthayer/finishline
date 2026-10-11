import './ui/tokens/tokens.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/components/index.ts';

import { bindCaptureShortcut, wireCapture } from './app/capture.ts';
import { showInbox, type InboxController } from './app/inbox.ts';
import { startRouter, type Route } from './app/router.ts';
import { mountShell, type Shell } from './app/shell.ts';
import { createBackend, readConfig, type Backend } from './data/client.ts';
import { loadOverview } from './data/overview.ts';
import { supabaseProjects } from './data/projects.ts';
import { signInWithGitHub, signOut, watchSession } from './data/session.ts';
import { buildOverview } from './state/overview-model.ts';
import { renderOverview, renderOverviewError, renderOverviewLoading } from './ui/screens/overview.ts';
import { renderPlaceholder } from './ui/screens/placeholder.ts';
import { renderSignIn } from './ui/screens/signin.ts';

const host = document.getElementById('app');
if (!host) throw new Error('Missing #app');

const config = readConfig();
if (!config) {
  renderSignIn(host, async () => 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
} else {
  start(host, createBackend(config));
}

function start(root: HTMLElement, backend: Backend): void {
  const repo = supabaseProjects(backend);
  let shell: Shell | null = null;
  let current: Route | null = null;
  let inbox: InboxController | null = null;
  let routerStarted = false;
  let unbindCapture: (() => void) | null = null;
  // Set when the quick-capture dialog saved something; the screen behind it refreshes on close.
  let capturedSinceOpen = false;

  const show = (route: Route): void => {
    current = route;
    if (!shell) return;
    shell.setRoute(route);
    shell.setAside(route.name === 'overview');
    inbox = null;
    if (route.name === 'overview') void showOverview(shell);
    else if (route.name === 'inbox') inbox = showInbox(shell.main, repo);
    else renderPlaceholder(shell.main, route.name);
  };

  const showOverview = async (s: Shell): Promise<void> => {
    renderOverviewLoading(s.main);
    try {
      const data = await loadOverview(backend);
      if (current?.name !== 'overview') return;
      renderOverview(s.main, s.feed, buildOverview(data, new Date()));
    } catch (error) {
      renderOverviewError(s.main, error instanceof Error ? error.message : String(error), () => void showOverview(s));
    }
  };

  watchSession(backend).subscribe((state) => {
    if (state.kind === 'signed-out') {
      unbindCapture?.();
      unbindCapture = null;
      shell = null;
      renderSignIn(root, () => signInWithGitHub(backend), state.error);
      return;
    }
    if (state.kind !== 'signed-in' || shell) return;
    // Drop the OAuth `?code=` from the address bar once the session exists.
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname);
    shell = mountShell(root, state, () => void signOut(backend));
    const capture = shell.capture;
    wireCapture(capture.form, repo, () => {
      capturedSinceOpen = true;
    });
    capture.addEventListener('fl-capture-closed', () => {
      if (!capturedSinceOpen || !shell) return;
      capturedSinceOpen = false;
      if (current?.name === 'inbox') void inbox?.refresh();
      else if (current?.name === 'overview') void showOverview(shell);
    });
    unbindCapture = bindCaptureShortcut(capture);
    if (routerStarted && current) show(current);
    else {
      routerStarted = true;
      startRouter(show);
    }
  });
}
