import { planCriteria } from '../domain/gates.ts';
import { slugify, uniqueSlug } from '../domain/slug.ts';
import type { AgentPlatformId, Project } from '../domain/types.ts';
import type { Backend } from './client.ts';
import { toProject, type ProjectRow } from './overview.ts';

// Project writes for capture and triage. RLS scopes every query to the signed-in user;
// status changes go through public.transition_project(), which re-checks every gate.

/** A new idea. Creating always starts at Idea; the other fields are optional context. */
export interface CaptureInput {
  name: string;
  summary?: string;
  outcome?: string;
}

/** Words-only edit. Status is never written here; it moves through promote and archive. */
export interface EditInput {
  name: string;
  summary: string;
  outcome: string;
  nextAction: string;
}

export interface CriterionRecord {
  id: string;
  text: string;
  position: number;
  doneAt: string | null;
}

export interface Idea {
  project: Project;
  criteria: CriterionRecord[];
}

/** A project as the list shows it: its current platform and first linked repo, when set. */
export interface ProjectListing {
  project: Project;
  platform: AgentPlatformId | null;
  repo: string | null;
}

export interface PromoteInput {
  outcome: string;
  nextAction: string;
  criteria: readonly string[];
}

/** The seam the Inbox and capture talk to. Supabase in the app, in-memory in e2e fixtures. */
export interface ProjectsRepo {
  listIdeas(): Promise<Idea[]>;
  /** Every project the user owns, any status. */
  listProjects(): Promise<ProjectListing[]>;
  capture(input: CaptureInput): Promise<Project>;
  /** Saves name, summary, outcome and next action. The slug, and so the link, never changes. */
  update(id: string, input: EditInput): Promise<void>;
  /** Saves the Ready gate fields, then moves the idea to Ready. */
  promote(id: string, input: PromoteInput): Promise<void>;
  archive(id: string, reason: string): Promise<void>;
}

/** Error from a write. `message` is the raw database text; gate codes are parsed by callers. */
export class RepoError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

interface DbError {
  message: string;
  code: string;
}

function fail(error: DbError): never {
  throw new RepoError(error.message, error.code);
}

const UNIQUE_VIOLATION = '23505';
/** Form fields are text; the database wants NULL for "not set". */
const orNull = (value: string | undefined): string | null => value?.trim() || null;
const CAPTURE_ATTEMPTS = 3;

interface CriterionRow {
  id: string;
  project_id: string;
  text: string;
  position: number;
  done_at: string | null;
}

export function supabaseProjects(backend: Backend): ProjectsRepo {
  const { db } = backend;

  const takenSlugs = async (base: string): Promise<Set<string>> => {
    const { data, error } = await db.from('projects').select('slug').like('slug', `${base}%`);
    if (error) fail(error);
    return new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
  };

  return {
    async listIdeas() {
      const ideas = await db.from('projects').select('*').eq('status', 'idea').order('created_at', { ascending: false });
      if (ideas.error) fail(ideas.error);
      const projects = ((ideas.data ?? []) as ProjectRow[]).map(toProject);
      const byProject = new Map<string, CriterionRecord[]>(projects.map((p) => [p.id, []]));
      if (projects.length) {
        const criteria = await db
          .from('ship_criteria')
          .select('id, project_id, text, position, done_at')
          .in('project_id', projects.map((p) => p.id))
          .order('position');
        if (criteria.error) fail(criteria.error);
        for (const c of (criteria.data ?? []) as CriterionRow[]) {
          byProject.get(c.project_id)?.push({ id: c.id, text: c.text, position: c.position, doneAt: c.done_at });
        }
      }
      return projects.map((project) => ({ project, criteria: byProject.get(project.id) ?? [] }));
    },

    async listProjects() {
      const [projects, platforms, repos] = await Promise.all([
        db.from('projects').select('*').order('name'),
        db.from('project_platforms').select('project_id, platform').eq('role', 'current'),
        db.from('repo_links').select('project_id, full_name').order('linked_at'),
      ]);
      for (const r of [projects, platforms, repos]) if (r.error) fail(r.error);

      const platformByProject = new Map<string, AgentPlatformId>();
      for (const p of (platforms.data ?? []) as { project_id: string; platform: AgentPlatformId }[]) {
        platformByProject.set(p.project_id, p.platform);
      }
      const repoByProject = new Map<string, string>();
      for (const r of (repos.data ?? []) as { project_id: string; full_name: string }[]) {
        if (!repoByProject.has(r.project_id)) repoByProject.set(r.project_id, r.full_name);
      }
      return ((projects.data ?? []) as ProjectRow[]).map((row) => ({
        project: toProject(row),
        platform: platformByProject.get(row.id) ?? null,
        repo: repoByProject.get(row.id) ?? null,
      }));
    },

    async capture({ name, summary, outcome }) {
      const base = slugify(name);
      let last: DbError | null = null;
      // Two tabs can race for the same slug; the unique index decides and we take the next one.
      for (let attempt = 0; attempt < CAPTURE_ATTEMPTS; attempt++) {
        const slug = uniqueSlug(base, await takenSlugs(base));
        const { data, error } = await db
          .from('projects')
          .insert({ name: name.trim(), slug, summary: orNull(summary), outcome: orNull(outcome) })
          .select('*')
          .single();
        if (!error) return toProject(data as ProjectRow);
        if (error.code !== UNIQUE_VIOLATION) fail(error);
        last = error;
      }
      return fail(last ?? { message: 'Could not capture this idea.', code: 'unknown' });
    },

    async update(id, { name, summary, outcome, nextAction }) {
      const saved = await db
        .from('projects')
        .update({ name: name.trim(), summary: orNull(summary), outcome: orNull(outcome), next_action: orNull(nextAction) })
        .eq('id', id);
      if (saved.error) fail(saved.error);
    },

    async promote(id, { outcome, nextAction, criteria }) {
      const saved = await db.from('projects').update({ outcome: outcome.trim(), next_action: nextAction.trim() }).eq('id', id);
      if (saved.error) fail(saved.error);

      const current = await db.from('ship_criteria').select('id, text, position').eq('project_id', id);
      if (current.error) fail(current.error);
      const plan = planCriteria((current.data ?? []) as { id: string; text: string; position: number }[], criteria);
      if (plan.remove.length) {
        const removed = await db.from('ship_criteria').delete().in('id', plan.remove);
        if (removed.error) fail(removed.error);
      }
      const moved = await Promise.all(plan.update.map((u) => db.from('ship_criteria').update({ position: u.position }).eq('id', u.id)));
      const moveError = moved.find((r) => r.error)?.error;
      if (moveError) fail(moveError);
      if (plan.insert.length) {
        const added = await db.from('ship_criteria').insert(plan.insert.map((c) => ({ project_id: id, ...c })));
        if (added.error) fail(added.error);
      }

      const ready = await db.rpc('transition_project', { p_project_id: id, p_to: 'ready' });
      if (ready.error) fail(ready.error);
    },

    async archive(id, reason) {
      const { error } = await db.rpc('transition_project', { p_project_id: id, p_to: 'archived', p_archived_reason: reason.trim() });
      if (error) fail(error);
    },
  };
}
