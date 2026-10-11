import type { ProjectListing, ProjectsRepo } from '../data/projects.ts';
import {
  DEFAULT_STATUSES,
  filterProjects,
  toProjectRows,
  type ProjectFilter,
} from '../state/projects-model.ts';
import type { CreateDetail } from '../ui/components/create-project-dialog.ts';
import type { EditDetail } from '../ui/components/edit-project-dialog.ts';
import { mountProjects } from '../ui/screens/projects.ts';
import type { ProjectStatus } from '../domain/types.ts';
import { saveError } from './errors.ts';

export interface ProjectsController {
  refresh(): Promise<void>;
}

export type ProjectsSource = Pick<ProjectsRepo, 'listProjects' | 'capture' | 'update'>;

/** Mounts the Projects list into `main`. `initialQuery` comes from the top-bar search (`?q=`). */
export function showProjects(
  main: HTMLElement,
  repo: ProjectsSource,
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
    onEdit(id: string) {
      const listing = listings.find((l) => l.project.id === id);
      if (!listing) return;
      const { project } = listing;
      screen.edit.edit({
        id,
        name: project.name,
        status: project.status,
        summary: project.summary ?? '',
        outcome: project.outcome ?? '',
        nextAction: project.nextAction ?? '',
      });
    },
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

  // A save reloads the list and then moves focus to it, because the dialog's opener may be gone.
  const settle = async (message: string): Promise<void> => {
    screen.announce(message);
    await refresh();
    screen.focusList();
  };

  screen.create.addEventListener('fl-project-create-submit', (event) => {
    const { name, summary, outcome } = (event as CustomEvent<CreateDetail>).detail;
    repo.capture({ name, summary, outcome }).then(
      (project) => {
        screen.create.close();
        void settle(`“${project.name}” added as an idea.`);
      },
      (error: unknown) => screen.create.fail(saveError(error)),
    );
  });

  screen.edit.addEventListener('fl-project-edit-submit', (event) => {
    const { id, ...input } = (event as CustomEvent<EditDetail>).detail;
    repo.update(id, input).then(
      () => {
        screen.edit.close();
        void settle(`“${input.name}” saved.`);
      },
      (error: unknown) => screen.edit.fail(saveError(error)),
    );
  });

  void refresh();
  return { refresh };
}
