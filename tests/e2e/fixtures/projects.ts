import '../../../src/ui/tokens/tokens.css';
import '../../../src/ui/styles/components.css';
import '../../../src/ui/styles/screens.css';
import '../../../src/ui/components/index.ts';
import indexHtml from '../../../index.html?raw';
import type { ProjectListing, ProjectsRepo } from '../../../src/data/projects.ts';
import { mountShell } from '../../../src/app/shell.ts';
import { showProjects } from '../../../src/app/projects.ts';
import { project } from '../../fixtures.ts';

const parsed = new DOMParser().parseFromString(indexHtml, 'text/html');
for (const tpl of parsed.querySelectorAll('template')) document.body.append(document.importNode(tpl, true));

const params = new URLSearchParams(location.search);
const listings: ProjectListing[] = params.has('empty')
  ? []
  : [
      { project: project({ id: 'a', slug: 'devlog', name: 'DevLog', status: 'active', focusRank: 1, nextAction: 'Fix the timezone bug in the weekly digest.', lastProgressAt: '2026-10-10T08:00:00Z' }), platform: 'claude_code', repo: 'ericthayer/devlog' },
      { project: project({ id: 'b', slug: 'univia', name: 'Univia', status: 'ready', nextAction: 'Write the first migration for courses.' }), platform: null, repo: null },
      { project: project({ id: 'c', slug: 'stacker', name: 'Stacker', status: 'paused', reviewOn: '2026-09-01', nextAction: 'Decide: keep the Bolt prototype or rebuild.' }), platform: 'bolt', repo: null },
      { project: project({ id: 'd', slug: 'portfolio', name: 'Portfolio v3', status: 'shipped', shippedAt: '2026-10-03T00:00:00Z' }), platform: null, repo: 'ericthayer/portfolio' },
      { project: project({ id: 'e', slug: 'old-idea', name: 'Old idea', status: 'archived', archivedReason: 'Superseded' }), platform: null, repo: null },
      { project: project({ id: 'f', slug: 'ideas-board', name: 'Ideas board', status: 'idea', nextAction: null }), platform: null, repo: null },
    ];

const repo: Pick<ProjectsRepo, 'listProjects'> = {
  async listProjects() {
    if (params.has('fail')) throw new Error('Network down');
    return listings;
  },
};

const host = document.getElementById('app');
if (host) {
  const shell = mountShell(host, { displayName: 'Eric' }, () => undefined);
  shell.setRoute({ name: 'projects', params: {} });
  shell.setAside(false);
  void showProjects(shell.main, repo, params.get('q') ?? '', () => new Date('2026-10-10T12:00:00Z')).refresh().then(() => {
    document.body.dataset['ready'] = 'true';
  });
}
