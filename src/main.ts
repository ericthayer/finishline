import './ui/tokens/tokens.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/components/index.ts';

import { startRouter, type Route } from './app/router.ts';
import { mountShell, type Shell } from './app/shell.ts';
import { createBackend, readConfig, type Backend } from './data/client.ts';
import { loadOverview } from './data/overview.ts';
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
  let shell: Shell | null = null;
  let current: Route | null = null;
  let routerStarted = false;

  const show = (route: Route): void => {
    current = route;
    if (!shell) return;
    shell.setRoute(route);
    shell.setAside(route.name === 'overview');
    if (route.name === 'overview') void showOverview(shell);
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
      shell = null;
      renderSignIn(root, () => signInWithGitHub(backend), state.error);
      return;
    }
    if (state.kind !== 'signed-in' || shell) return;
    // Drop the OAuth `?code=` from the address bar once the session exists.
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname);
    shell = mountShell(root, state, () => void signOut(backend));
    if (routerStarted && current) show(current);
    else {
      routerStarted = true;
      startRouter(show);
    }
  });
}
