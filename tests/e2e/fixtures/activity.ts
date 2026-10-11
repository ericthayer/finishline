import '../../../src/ui/tokens/tokens.css';
import '../../../src/ui/styles/components.css';
import '../../../src/ui/styles/screens.css';
import '../../../src/ui/components/index.ts';
import indexHtml from '../../../index.html?raw';
import { showActivity } from '../../../src/app/activity.ts';
import type { ActivityData } from '../../../src/data/activity.ts';
import { FIXTURE_NOW, fixtureShell } from './shell.ts';

const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
for (const tpl of parsed.querySelectorAll('template')) document.body.append(document.importNode(tpl, true));

const params = new URLSearchParams(location.search);
const data: ActivityData = params.has('empty')
  ? { events: [], projects: new Map() }
  : {
      projects: new Map([
        ['a', { name: 'Finishlyne', slug: 'finishlyne' }],
        ['b', { name: 'DevLog', slug: 'devlog' }],
      ]),
      events: [
        { projectId: 'a', occurredAt: '2026-10-10T11:00:00Z', source: 'github', payload: { type: 'github_push', repoLinkId: 'r', branch: 'main', sha: 'abc' } },
        { projectId: 'a', occurredAt: '2026-10-10T09:30:00Z', source: 'user', payload: { type: 'status_changed', from: 'ready', to: 'active' } },
        { projectId: 'b', occurredAt: '2026-10-09T16:10:00Z', source: 'user', payload: { type: 'status_changed', from: 'active', to: 'paused' } },
        { projectId: 'b', occurredAt: '2026-10-06T10:00:00Z', source: 'github', payload: { type: 'github_pr_merged', repoLinkId: 'r', number: 12 } },
      ],
    };

const host = document.getElementById('app');
if (host) {
  const shell = fixtureShell(host, 'activity');
  showActivity(
    shell.main,
    { loadActivity: () => (params.has('fail') ? Promise.reject(new Error('Network down.')) : Promise.resolve(data)) },
    () => FIXTURE_NOW,
  );
  document.body.dataset['ready'] = 'true';
}
