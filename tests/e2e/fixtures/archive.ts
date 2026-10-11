import '../../../src/ui/tokens/tokens.css';
import '../../../src/ui/styles/components.css';
import '../../../src/ui/styles/screens.css';
import '../../../src/ui/components/index.ts';
import indexHtml from '../../../index.html?raw';
import { showArchive } from '../../../src/app/archive.ts';
import { fixtureShell } from './shell.ts';
import { project } from '../../fixtures.ts';
import { memoryRepo } from './memory-repo.ts';

const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
for (const tpl of parsed.querySelectorAll('template')) document.body.append(document.importNode(tpl, true));

const params = new URLSearchParams(location.search);
const closed = (overrides: Parameters<typeof project>[0]) => ({ project: project(overrides), criteria: [] });
const seed = params.has('empty')
  ? [closed({ id: 'o', slug: 'devlog', name: 'DevLog', status: 'active' })]
  : [
      closed({ id: 'o', slug: 'devlog', name: 'DevLog', status: 'active' }),
      closed({ id: 'a', slug: 'portfolio-v3', name: 'Portfolio v3', status: 'shipped', shippedAt: '2026-10-08T09:00:00Z', shippedUrl: 'https://ericthayer.design' }),
      closed({ id: 'b', slug: 'stacker', name: 'Stacker', status: 'archived', archivedAt: '2026-09-02T09:00:00Z', archivedReason: 'Superseded by Finishlyne lanes', nextAction: null }),
      closed({ id: 'c', slug: 'univia', name: 'Univia', status: 'shipped', shippedAt: '2026-08-20T09:00:00Z', nextAction: 'Write release notes' }),
    ];
const now = (): Date => new Date('2026-10-10T12:00:00Z');

const host = document.getElementById('app');
if (host) {
  const shell = fixtureShell(host, 'archive');
  showArchive(shell.main, memoryRepo(seed, params.get('fail')), now);
  document.body.dataset['ready'] = 'true';
}
