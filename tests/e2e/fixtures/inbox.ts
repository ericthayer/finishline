import '../../../src/ui/tokens/tokens.css';
import '../../../src/ui/styles/components.css';
import '../../../src/ui/styles/screens.css';
import '../../../src/ui/components/index.ts';
import indexHtml from '../../../index.html?raw';
import { bindCaptureShortcut, wireCapture } from '../../../src/app/capture.ts';
import { showInbox } from '../../../src/app/inbox.ts';
import { fixtureShell } from './shell.ts';
import { project } from '../../fixtures.ts';
import { memoryRepo } from './memory-repo.ts';

const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
for (const tpl of parsed.querySelectorAll('template')) document.body.append(document.importNode(tpl, true));

const params = new URLSearchParams(location.search);
const seed = params.has('empty')
  ? []
  : [
      { project: project({ id: 'a', slug: 'devlog', name: 'DevLog', summary: 'A weekly digest of what my agents shipped', outcome: null, nextAction: null, createdAt: '2026-10-08T09:00:00Z' }), criteria: [] },
      {
        project: project({ id: 'b', slug: 'univia', name: 'Univia', summary: null, outcome: 'Course planner students actually use', nextAction: null, createdAt: '2026-10-01T09:00:00Z' }),
        criteria: [{ id: 'c1', text: 'Deployed to Netlify', position: 0, doneAt: null }],
      },
      { project: project({ id: 'c', slug: 'stacker', name: 'Stacker', summary: 'Bolt prototype for stacking UI cards', outcome: null, nextAction: null, createdAt: '2026-08-02T09:00:00Z' }), criteria: [] },
    ];
const repo = memoryRepo(seed, params.get('fail'));
const now = (): Date => new Date('2026-10-10T12:00:00Z');

const host = document.getElementById('app');
if (host) {
  const shell = fixtureShell(host, 'inbox');
  const inbox = showInbox(shell.main, repo, now);
  let captured = false;
  wireCapture(shell.capture.form, repo, () => {
    captured = true;
  });
  shell.capture.addEventListener('fl-capture-closed', () => {
    if (captured) void inbox.refresh();
    captured = false;
  });
  bindCaptureShortcut(shell.capture);
  void inbox.refresh().then(() => {
    document.body.dataset['ready'] = 'true';
  });
}
