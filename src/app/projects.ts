import type { ProjectListing, ProjectsRepo } from '../data/projects.ts';
import {
  DEFAULT_STATUSES,
  filterProjects,
  toProjectRows,
  type ProjectFilter,
} from '../state/projects-model.ts';
import { mountProjects } from '../ui/screens/projects.ts';
import type { ProjectStatus } from '../domain/types.ts';

export interface ProjectsController {
  refresh(): Promise<void>;
}

/** Mounts the Projects list into `main`. `initialQuery` comes from the top-bar search (`?q=`). */
export function showProjects(
  main: HTMLElement,
  repo: Pick<ProjectsRepo, 'listProjects'>,
  initialQuery: string,
  now: () => Date = () => new Date(),
): ProjectsController {
  let filter: ProjectFilter = { query: initialQuery, statuses: DEFAULT_STATUSES };
  let listings: ProjectListing[] = [];
  let loaded = false;
  let generation = 0;

  const paint = (): void => {
    if (!loaded) return;
    const shown = filterProjects(listings, filter);
    screen.show({
      total: listings.length,
      rows: toProjectRows(shown, now()),
      filter,
      filtered: shown.length !== listings.length,
    });
  };

  const refresh = async (): Promise<void> => {
    const mine = ++generation;
    if (!loaded) screen.setLoading();
    try {
      const next = await repo.listProjects();
      if (mine !== generation || !main.contains(screen.root)) return;
      listings = next;
      loaded = true;
      paint();
    } catch (error) {
      if (mine !== generation) return;
      screen.setError(error instanceof Error ? error.message : String(error));
    }
  };

  const screen = mountProjects(main, {
    onQuery(query) {
      filter = { ...filter, query };
      paint();
    },
    onToggle(status: ProjectStatus) {
      const statuses = new Set(filter.statuses);
      if (statuses.has(status)) statuses.delete(status);
      else statuses.add(status);
      filter = { ...filter, statuses };
      paint();
    },
    onReset() {
      filter = { query: '', statuses: DEFAULT_STATUSES };
      paint();
    },
    onRetry() {
      void refresh();
    },
  });

  void refresh();
  return { refresh };
}
