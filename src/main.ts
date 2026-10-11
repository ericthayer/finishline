import './ui/tokens/tokens.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/components/index.ts';

import { bindCaptureShortcut, wireCapture } from './app/capture.ts';
import type { InboxController } from './app/inbox.ts';
import { startRouter, type Route } from './app/router.ts';
import { mountShell, type Shell } from './app/shell.ts';
import { createBackend, readConfig, type Backend } from './data/client.ts';
import { DEFAULT_WIP_CAP } from './domain/lifecycle.ts';
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
    else if (route.name === 'inbox') lazy(route, import('./app/inbox.ts'), (m, s) => (inbox = m.showInbox(s.main, repo)));
    else if (route.name === 'projects') {
      const q = new URLSearchParams(location.search).get('q') ?? '';
      lazy(route, import('./app/projects.ts'), (m, s) => m.showProjects(s.main, repo, q));
    } else if (route.name === 'archive') lazy(route, import('./app/archive.ts'), (m, s) => m.showArchive(s.main, repo));
    else if (route.name === 'settings') lazy(route, import('./app/settings.ts'), (m, s) => m.showSettings(s.main, repo));
    else renderPlaceholder(shell.main, route.name);
  };

  // Screens other than Overview ship as their own chunks. Mount only if the user hasn't moved on.
  const lazy = <M>(route: Route, load: Promise<M>, mount: (m: M, s: Shell) => void): void => {
    const s = shell;
    load.then(
      (m) => {
        if (s && shell === s && current === route) mount(m, s);
      },
      () => {
        if (s && shell === s && current === route) renderPlaceholder(s.main, 'load-failed');
      },
    );
  };

  const showOverview = async (s: Shell): Promise<void> => {
    renderOverviewLoading(s.main);
    try {
      const data = await loadOverview(backend);
      if (current?.name !== 'overview') return;
      const cap = await repo.loadWipCap().catch(() => DEFAULT_WIP_CAP);
      if (current?.name !== 'overview') return;
      renderOverview(s.main, s.feed, buildOverview(data, new Date(), cap));
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
