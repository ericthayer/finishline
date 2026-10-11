import type { CaptureInput, Idea, ProjectsRepo, PromoteInput } from '../../../src/data/projects.ts';
import { slugify, uniqueSlug } from '../../../src/domain/slug.ts';
import type { Project } from '../../../src/domain/types.ts';
import { project } from '../../fixtures.ts';

/** In-memory ProjectsRepo for fixture pages. `?fail=archive` makes archive answer like the server would. */
export function memoryRepo(seed: Idea[], fail: string | null): ProjectsRepo {
  const ideas = [...seed];
  let n = 0;
  return {
    async listIdeas() {
      if (fail === 'list') throw new Error('Network down');
      return ideas.map((i) => ({ project: i.project, criteria: [...i.criteria] }));
    },
    async listProjects() {
      return ideas.map((i) => ({ project: i.project, platform: null, repo: null }));
    },
    async capture({ name, summary }: CaptureInput): Promise<Project> {
      const slug = uniqueSlug(slugify(name), new Set(ideas.map((i) => i.project.slug)));
      const created = new Date(Date.UTC(2026, 9, 10, 11, 30, n++)).toISOString();
      const p = project({ id: `new-${n}`, slug, name, summary: summary ?? null, outcome: null, nextAction: null, createdAt: created });
      ideas.push({ project: p, criteria: [] });
      return p;
    },
    async promote(id: string, _input: PromoteInput) {
      const index = ideas.findIndex((i) => i.project.id === id);
      if (index >= 0) ideas.splice(index, 1);
    },
    async archive(id: string) {
      if (fail === 'archive') throw new Error('GATE:NOT_FOUND');
      const index = ideas.findIndex((i) => i.project.id === id);
      if (index >= 0) ideas.splice(index, 1);
    },
  };
}
