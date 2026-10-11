import type { ActivitySource } from '../data/activity.ts';
import { buildTimeline } from '../state/activity-model.ts';
import { mountActivity } from '../ui/screens/activity.ts';

/** Mounts the Recent activity timeline into `main`. */
export function showActivity(main: HTMLElement, source: ActivitySource, now: () => Date = () => new Date()): void {
  const screen = mountActivity(main);
  const load = (): void => {
    screen.setLoading();
    source.loadActivity().then(
      (data) => screen.show(buildTimeline(data, now())),
      (error: unknown) => screen.setError(error instanceof Error ? error.message : String(error), load),
    );
  };
  load();
}
