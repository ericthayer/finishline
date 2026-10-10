import type {
  AgentPlatformId,
  Blocker,
  Checkpoint,
  CommitSummary,
  Decision,
  Project,
  RepoLink,
  ShipCriterion,
} from './types.ts';

// Agent handoff brief (SPEC §5). Plain markdown, one template for every platform.
// Empty sections are omitted so the brief never carries placeholder noise.

export const PLATFORM_LABELS: Readonly<Record<AgentPlatformId, string>> = {
  claude_code: 'Claude Code',
  claude_ai: 'Claude',
  codex: 'Codex',
  google_ai_studio: 'Google AI Studio',
  bolt: 'Bolt',
  lovable: 'Lovable',
  v0: 'v0',
  cursor: 'Cursor',
  replit: 'Replit',
  other: 'Other',
};

export const BRIEF_DECISION_LIMIT = 5;
export const BRIEF_COMMIT_LIMIT = 5;

export interface BriefInput {
  project: Pick<Project, 'name' | 'summary' | 'outcome' | 'nextAction' | 'agentInstructions'>;
  latestCheckpoint?: Pick<Checkpoint, 'platform' | 'summary' | 'createdAt'> | null;
  shipCriteria?: readonly Pick<ShipCriterion, 'text' | 'doneAt' | 'position'>[];
  decisions?: readonly Pick<Decision, 'text' | 'rationale' | 'supersededBy' | 'createdAt'>[];
  blockers?: readonly Pick<Blocker, 'text' | 'resolvedAt'>[];
  repo?: Pick<RepoLink, 'fullName' | 'trackedBranch' | 'defaultBranch'> | null;
  recentCommits?: readonly CommitSummary[];
  includeCommits?: boolean;
  now: Date;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relativeDate(iso: string, now: Date): string {
  const days = Math.round((Date.parse(iso) - now.getTime()) / 86_400_000);
  return rtf.format(days, 'day');
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function section(title: string, body: string | null | undefined): string | null {
  const trimmed = body?.trim();
  return trimmed ? `## ${title}\n${trimmed}` : null;
}

export function buildBrief(input: BriefInput): string {
  const { project, now } = input;
  const parts: (string | null)[] = [];

  parts.push(`# Resuming: ${project.name}` + (project.summary ? `\n${oneLine(project.summary)}` : ''));
  parts.push(section('Outcome', project.outcome));

  const where: string[] = [];
  const cp = input.latestCheckpoint;
  if (cp) {
    const place = cp.platform ? `${PLATFORM_LABELS[cp.platform]}, ` : '';
    where.push(`Last session (${place}${relativeDate(cp.createdAt, now)}): ${oneLine(cp.summary)}`);
  }
  if (input.repo) {
    where.push(`Repo: ${input.repo.fullName} · branch ${input.repo.trackedBranch ?? input.repo.defaultBranch}`);
  }
  const commits = input.includeCommits ? (input.recentCommits ?? []).slice(0, BRIEF_COMMIT_LIMIT) : [];
  if (commits.length > 0) {
    where.push('Recent commits:', ...commits.map((c) => `- ${c.sha.slice(0, 7)} ${oneLine(c.message.split('\n')[0] ?? '')}`));
  }
  parts.push(section('Where it stands', where.join('\n')));

  const criteria = [...(input.shipCriteria ?? [])].sort((a, b) => a.position - b.position);
  parts.push(
    section('Done when', criteria.map((c) => `- [${c.doneAt ? 'x' : ' '}] ${oneLine(c.text)}`).join('\n')),
  );

  const decisions = (input.decisions ?? [])
    .filter((d) => d.supersededBy === null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, BRIEF_DECISION_LIMIT);
  parts.push(
    section(
      "Decisions already made (don't relitigate)",
      decisions.map((d) => `- ${oneLine(d.text)}` + (d.rationale ? ` — ${oneLine(d.rationale)}` : '')).join('\n'),
    ),
  );

  const blockers = (input.blockers ?? []).filter((b) => b.resolvedAt === null);
  parts.push(section('Open blockers', blockers.map((b) => `- ${oneLine(b.text)}`).join('\n')));

  parts.push(section('Do this next', project.nextAction));
  parts.push(section('Working instructions', project.agentInstructions));

  return parts.filter((p): p is string => p !== null).join('\n\n') + '\n';
}
