import type { ProjectListing, ProjectsRepo } from '../data/projects.ts';
import { explainGate } from '../domain/gates.ts';
import { checkTransition, DEFAULT_WIP_CAP } from '../domain/lifecycle.ts';
import {
  DEFAULT_STATUSES,
  filterProjects,
  toProjectRows,
  type ProjectFilter,
} from '../state/projects-model.ts';
import type { ArchiveDetail } from '../ui/components/archive-dialog.ts';
import type { CreateDetail } from '../ui/components/create-project-dialog.ts';
import type { EditDetail } from '../ui/components/edit-project-dialog.ts';
import type { PauseDetail } from '../ui/components/pause-project-dialog.ts';
import type { RowAction } from '../ui/components/table.ts';
import { mountProjects } from '../ui/screens/projects.ts';
import type { ProjectStatus } from '../domain/types.ts';
import { saveError } from './errors.ts';

export interface ProjectsController {
  refresh(): Promise<void>;
}

export type ProjectsSource = Pick<ProjectsRepo, 'listProjects' | 'capture' | 'update' | 'move' | 'archive'>;

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

  const find = (id: string): ProjectListing | undefined => listings.find((l) => l.project.id === id);

  // Start and Resume check the gates here, so a full lane explains itself before any write.
  // The database re-checks every gate; this only saves a round trip and gives the same copy.
  const start = (id: string, name: string, listing: ProjectListing): void => {
    const activeCount = listings.filter((l) => l.project.status === 'active').length;
    const check = checkTransition(listing.project, 'active', { activeCount, wipCap: DEFAULT_WIP_CAP, shipCriteria: [] });
    if (!check.ok) {
      screen.announce(check.failures.map((f) => explainGate(f, 'active')).join(' '));
      return;
    }
    repo.move(id, { to: 'active' }).then(
      () => void settle(`“${name}” is Active.`),
      (error: unknown) => screen.announce(saveError(error, 'active')),
    );
  };

  const screen = mountProjects(main, {
    onAction(id: string, action: RowAction) {
      const listing = find(id);
      if (!listing) return;
      const { project } = listing;
      if (action === 'edit') {
        screen.edit.edit({
          id,
          name: project.name,
          status: project.status,
          summary: project.summary ?? '',
          outcome: project.outcome ?? '',
          nextAction: project.nextAction ?? '',
        });
      } else if (action === 'start' || action === 'resume') {
        start(id, project.name, listing);
      } else if (action === 'pause') {
        screen.pause.pause({ id, name: project.name, nextAction: project.nextAction ?? '' });
      } else {
        screen.archive.confirm({ id, name: project.name });
      }
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

  const nameOf = (id: string): string => find(id)?.project.name ?? 'Project';

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

  screen.pause.addEventListener('fl-project-pause-submit', (event) => {
    const { id, checkpointSummary, nextAction } = (event as CustomEvent<PauseDetail>).detail;
    const name = nameOf(id);
    repo.move(id, { to: 'paused', checkpointSummary, nextAction }).then(
      () => {
        screen.pause.close();
        void settle(`“${name}” paused.`);
      },
      (error: unknown) => screen.pause.fail(saveError(error, 'paused')),
    );
  });

  screen.archive.addEventListener('fl-archive-submit', (event) => {
    const { id, reason } = (event as CustomEvent<ArchiveDetail>).detail;
    const name = nameOf(id);
    repo.archive(id, reason).then(
      () => {
        screen.archive.close();
        void settle(`“${name}” archived.`);
      },
      (error: unknown) => screen.archive.fail(saveError(error, 'archived')),
    );
  });

  void refresh();
  return { refresh };
}
