import type { ProjectEventPayload } from '../domain/types.ts';
import type { Backend } from './client.ts';

// The Activity page: the latest events, newest first, with the project each belongs to.

export const ACTIVITY_LIMIT = 100;

export interface ActivityEvent {
  projectId: string;
  occurredAt: string;
  source: 'user' | 'github';
  payload: ProjectEventPayload;
}

export interface ActivityData {
  events: ActivityEvent[];
  projects: ReadonlyMap<string, { name: string; slug: string }>;
}

export interface ActivitySource {
  loadActivity(): Promise<ActivityData>;
}

export function supabaseActivity(backend: Backend): ActivitySource {
  return {
    async loadActivity() {
      const [events, projects] = await Promise.all([
        backend.db
          .from('project_events')
          .select('project_id, occurred_at, source, payload')
          .order('occurred_at', { ascending: false })
          .limit(ACTIVITY_LIMIT),
        backend.db.from('projects').select('id, name, slug'),
      ]);
      const failed = [events, projects].find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const rows = (events.data ?? []) as { project_id: string; occurred_at: string; source: 'user' | 'github'; payload: ProjectEventPayload }[];
      return {
        events: rows.map((e) => ({ projectId: e.project_id, occurredAt: e.occurred_at, source: e.source, payload: e.payload })),
        projects: new Map(((projects.data ?? []) as { id: string; name: string; slug: string }[]).map((p) => [p.id, { name: p.name, slug: p.slug }])),
      };
    },
  };
}
