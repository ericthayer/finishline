import type { CaptureDialog } from '../ui/components/capture-dialog.ts';
import type { Route } from './router.ts';
import { cloneTemplate, slot } from './templates.ts';

export interface Shell {
  main: HTMLElement;
  feed: HTMLElement;
  /** Quick capture, opened with `/` from any screen. */
  capture: CaptureDialog;
  setRoute(route: Route): void;
  /** Hides the activity rail on screens that do not use it. */
  setAside(visible: boolean): void;
}

/** Mounts the app shell (rail, top bar, main, activity rail) into `host`. */
export function mountShell(host: HTMLElement, user: { displayName: string }, onSignOut: () => void): Shell {
  const fragment = cloneTemplate('tpl-shell');
  const body = slot(fragment, 'body');
  const aside = slot(fragment, 'aside');
  const main = slot(fragment, 'main');
  const feed = slot(fragment, 'feed');
  const avatar = slot(fragment, 'avatar');
  const capture = slot<CaptureDialog>(fragment, 'capture');
  avatar.textContent = user.displayName.slice(0, 1).toUpperCase();
  avatar.setAttribute('aria-label', `Signed in as ${user.displayName}`);
  fragment.querySelector('[data-action="sign-out"]')?.addEventListener('click', onSignOut);
  const links = [...fragment.querySelectorAll<HTMLAnchorElement>('a[data-route]')];
  host.replaceChildren(fragment);

  return {
    main,
    feed,
    capture,
    setRoute(route) {
      for (const link of links) {
        const current = (link.dataset['route'] ?? '').split(' ').includes(route.name);
        if (current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
    setAside(visible) {
      aside.hidden = !visible;
      body.classList.toggle('fl-app__body--full', !visible);
    },
  };
}
