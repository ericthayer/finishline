import type { ProjectsRepo } from '../data/projects.ts';
import { buildArchive, type ArchiveItem } from '../state/archive-model.ts';
import type { ReopenRequest } from '../ui/components/archive-list.ts';
import { loadDialog } from '../ui/components/lazy.ts';
import type { ReopenDetail } from '../ui/components/reopen-dialog.ts';
import { mountArchive } from '../ui/screens/archive.ts';
import { saveError } from './errors.ts';

export type ArchiveSource = Pick<ProjectsRepo, 'listProjects' | 'reopen'>;

/**
 * Mounts the Archive into `main`. Reopen moves a project to Ready (SPEC §4), never straight
 * to Active, so the WIP cap is untouched; public.transition_project() re-checks the gate.
 */
export function showArchive(main: HTMLElement, repo: ArchiveSource, now: () => Date = () => new Date()): void {
  const screen = mountArchive(main);
  let items: ArchiveItem[] = [];
  let generation = 0;
  let lastIndex = 0;
  let loaded = false;

  const refresh = async (): Promise<void> => {
    const mine = ++generation;
    if (!loaded) screen.setLoading();
    try {
      const model = buildArchive(await repo.listProjects(), now());
      if (mine !== generation || !main.contains(screen.root)) return;
      items = model.items;
      loaded = true;
      screen.setItems(model);
    } catch (error) {
      if (mine !== generation) return;
      loaded = false;
      screen.setError(error instanceof Error ? error.message : String(error), () => void refresh());
    }
  };

  screen.root.addEventListener('fl-reopen', (event) => {
    const { id } = (event as CustomEvent<ReopenRequest>).detail;
    const index = items.findIndex((i) => i.id === id);
    const item = items[index];
    if (!item) return;
    lastIndex = index;
    void loadDialog('fl-reopen-dialog').then(() => screen.reopen.reopen(item));
  });

  screen.reopen.addEventListener('fl-reopen-submit', (event) => {
    const { id, nextAction } = (event as CustomEvent<ReopenDetail>).detail;
    const name = items.find((i) => i.id === id)?.name ?? 'Project';
    repo.reopen(id, nextAction).then(
      async () => {
        screen.reopen.close();
        screen.announce(`“${name}” reopened and moved to Ready.`);
        await refresh();
        screen.focusAfterMove(lastIndex);
      },
      (error: unknown) => screen.reopen.fail(saveError(error, 'ready')),
    );
  });

  void refresh();
}
