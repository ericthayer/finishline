# Finishlyne — MVP Spec

> Ideas are cheap. Finished projects are valuable.
> **Less starting. More shipping.**

**Status:** v0.3 (decisions 1–2 confirmed) · 2026-10-10 · Owner: Eric
**Sources:** merges Eric's *Product Development Plan v1.0* with Claude's spec v0.1. The differences and the call made on each are in [PLAN-COMPARISON.md](./PLAN-COMPARISON.md).
**Repo state at writing:** empty (LICENSE only). Everything below is greenfield.
**Naming:** "Finishlyne" is the product name (renamed from "Finishline" on 2026-10-10). Check domain, app-store and trademark conflicts before a public launch.

---

## 1. Product thesis

Finishlyne is a **personal command center** for developers and designers whose projects start across AI coding platforms (Claude, Codex, Google AI Studio, Bolt…). Starting is now cheap, so projects pile up without a path to completion. Finishlyne gives every promising idea a home, a next step and a path to done. It owns three things GitHub and the agent platforms don't:

| Finishlyne owns | GitHub owns | Agent platforms own |
|---|---|---|
| Intent (outcome, definition of done) | Repo identity, code, branches, commits | The working session |
| Priority (what deserves attention now) | Issues, PRs | Platform-specific context |
| Continuity (where it stands, what to tell the agent next) | Activity history | — |

**The MVP proves one loop:** capture → prioritize → resume → make progress → ship or intentionally archive.

**Primary user:** a solo developer, product designer or design engineer who experiments across several AI coding platforms and keeps code in GitHub.

**Primary job:** "Open Finishlyne, know within 60 seconds what to work on and exactly what to paste into my agent."

### Principles

1. **Project-first, agent-agnostic.** The record persists whichever platform does the work.
2. **Completion over activity.** Optimize for shipping and deliberate archiving, not projects created or boxes checked.
3. **Lightweight by default.** Capture takes seconds and needs only a name. No planning rituals.
4. **GitHub is the source of truth for code.** Finishlyne never duplicates or overrides repo facts.
5. **One explicit next action** on every open project.
6. **Private personal workspace.** No teams, roles or admin in the MVP.
7. **Forced choices beat optional ones.** Gates and caps make decisions happen; fields alone don't.

### Premise critique (applied in this spec)

1. **An exit that isn't Shipped needs a reason.** `Archived` requires a one-line reason. Quitting on purpose is closure; a silent archive is just a quieter graveyard.
2. **"Decide what deserves attention" needs a mechanism.** A **hard WIP cap on Active (default 3)** plus a ranked Ready queue. Activating a fourth project means pausing one.
3. **"Shipped" must be defined before work starts.** A short **ship checklist (3–7 items)** is required to leave Idea. Unchecked items *are* "what remains", which answers the Resume question without tickets.
4. **GitHub activity is a weak staleness signal for this audience.** Bolt and AI Studio work can be busy with zero commits; Claude Code and Codex push to throwaway branches. Staleness reads **progress events** (checkpoints, next-action completions, lifecycle moves, pushes to any branch of a linked repo), not the default branch.
5. **Resume context rots unless writing it is nearly free.** A 30-second **Park** step at the end of each session, required when pausing.
6. **An OAuth App can't be least-privilege.** Reading private repos needs the `repo` scope, which also grants write access to all of them. Use a **GitHub App** with read-only, per-repo permissions (§7).
7. **"Grow into an orchestration platform" shouldn't shape v1.** The one concession: an append-only **event log** from day one. Future integrations (an MCP server, agent hooks) read and write it. Nothing else is built speculatively.

---

## 2. Jobs to be done

- Capture an idea before it's forgotten.
- See all projects; tell active work apart from paused or merely planned.
- Know the next concrete action for each project.
- Know where a project lives and which AI platform was used last.
- Resume without rebuilding context from old chats.
- Notice stale projects and deliberately resume, pause or archive them.

---

## 3. Domain model

Single-user experience, multi-account safe: every row carries `user_id`, and Postgres row-level security enforces `user_id = auth.uid()`. Use stable IDs; treat repo names and URLs as mutable and key on GitHub's numeric IDs.

```ts
type ProjectStatus = 'idea' | 'ready' | 'active' | 'paused' | 'shipped' | 'archived';

type AgentPlatformId =
  | 'claude_code' | 'claude_ai' | 'codex' | 'google_ai_studio' | 'bolt'
  | 'lovable' | 'v0' | 'cursor' | 'replit' | 'other';

interface Project {
  id: string;
  name: string;                    // only required field at capture
  outcome: string | null;          // one line: the intended result (optional at capture)
  summary: string | null;          // one line: what it is
  status: ProjectStatus;
  statusChangedAt: string;
  nextAction: string | null;       // exactly one, imperative, concrete
  agentInstructions: string | null;// standing markdown: conventions, don'ts, stack notes
  focusRank: number | null;        // ordering within Ready
  reviewOn: string | null;         // date; required when paused
  lastReviewedAt: string | null;   // "reviewed, still right" (snoozes stale prompts; see §6)
  lastProgressAt: string;          // denormalized from events, drives staleness
  shippedAt: string | null;
  shippedUrl: string | null;
  archivedAt: string | null;
  archivedReason: string | null;   // required when archived
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ShipCriterion { id: string; projectId: string; text: string; doneAt: string | null; position: number; } // cap 10

interface Decision { id: string; projectId: string; text: string; rationale: string | null; supersededBy: string | null; createdAt: string; }

interface Blocker { id: string; projectId: string; text: string; kind: 'decision' | 'technical' | 'external'; resolvedAt: string | null; createdAt: string; }

interface ProjectPlatform {            // where the work happens (user-maintained, not telemetry)
  projectId: string;
  platform: AgentPlatformId;
  label: string | null;                // for 'other'
  url: string | null;                  // deep link: Bolt project, AI Studio app, Claude project
  role: 'origin' | 'current' | 'past'; // exactly one 'current' at a time
  lastUsedAt: string | null;
}

interface Checkpoint {                 // the Park note; latest one = "current state"
  id: string;
  projectId: string;
  platform: AgentPlatformId | null;
  summary: string;                     // what happened
  nextActionSet: string;               // snapshot of next action at park time
  createdAt: string;
}

interface RepoLink {                   // one or more per project
  id: string;
  projectId: string;
  githubRepoId: number;                // stable across renames
  fullName: string;                    // owner/name (cached, mutable)
  defaultBranch: string;               // cached
  trackedBranch: string | null;        // null = default branch
  installationId: number;
  lastPushAt: string | null;           // any branch
  lastSyncedAt: string | null;         // shown in UI wherever GitHub data appears
  linkedAt: string;
}

interface IssueLink { repoLinkId: string; number: number; title: string; state: 'open' | 'closed'; kind: 'issue' | 'pr'; updatedAt: string; } // cached

type ProjectEvent =
  | { type: 'status_changed'; from: ProjectStatus; to: ProjectStatus }
  | { type: 'next_action_completed'; text: string }
  | { type: 'checkpoint_added'; checkpointId: string }
  | { type: 'ship_criterion_done'; criterionId: string }
  | { type: 'reviewed' }
  | { type: 'github_push'; repoLinkId: string; branch: string; sha: string }
  | { type: 'github_pr_merged'; repoLinkId: string; number: number };
// stored as: { id, projectId, occurredAt, source: 'user' | 'github', payload: ProjectEvent }
```

**Data ownership**

- Finishlyne is authoritative for intent, lifecycle, priority, blockers, decisions and resume context.
- GitHub is authoritative for repo identity and activity. Cached GitHub fields are never treated as project data and always show their sync time.
- Platform selection is user-maintained metadata, never inferred.

**Deliberate choices**

- **No separate Inbox entity.** An inbox item is a Project in `idea`; the Inbox screen is a filtered view.
- **One next action, not a list.** A list is a backlog. Completing it prompts for the next one; history lives in events.
- **Blockers and decisions are rows, not a text blob,** so each can be resolved or superseded on its own.
- **"Current state" is the latest checkpoint,** so it carries history for free.
- **Agent instructions are one markdown field,** pasted into agents verbatim.
- **Progress events update `lastProgressAt`; edits don't.** Renaming, retagging or editing text isn't progress.

---

## 4. Lifecycle

```
           ┌──────────── reopen ────────────┐
           ▼                                │
 idea ──► ready ──► active ──► shipped ─────┤
  │         │        ▲   │                  │
  │         │        │   ▼                  │
  │         │        └ paused               │
  └─────────┴────────────┴──► archived ─────┘
```

| Transition | Gate (enforced in UI and in a DB function) |
|---|---|
| capture → idea | Name only |
| idea → ready | `outcome`, ≥1 ship criterion, `nextAction` set |
| ready → active | Active count < WIP cap (default 3); otherwise pause one in the same flow |
| active → paused | Checkpoint written in this flow; `reviewOn` set (default +14 days) |
| paused → active | WIP cap check |
| active → shipped | All ship criteria checked, or an explicit "ship anyway"; optional `shippedUrl` |
| any open → archived | `archivedReason` required |
| shipped/archived → ready | Allowed (reopen) |

---

## 5. Information architecture and screens

| Screen | Route | Purpose |
|---|---|---|
| **Overview** (Focus home) | `/` | Decide what to work on |
| **Projects** | `/projects` | Searchable list of everything |
| **Project detail** (Resume) | `/p/:slug` | Resume in under 60 s |
| **Inbox** | `/inbox` | Triage ideas |
| **Archive** | `/archive` | Shipped and archived projects, out of the way |
| **Settings** | `/settings` | GitHub connect/disconnect, stale thresholds, WIP cap |

Global quick capture: shortcut `/` from any screen.

### Overview (`/`)

Not a kanban board. Kanban invites ticket management; this is a decision screen.

1. **Now:** Active projects (≤ WIP cap) as cards with name, next action, staleness, platform chip and `Resume`. A missing next action shows a prompt in its place.
2. **Needs a decision:** stale Active, Ready gone cold, Paused past review date, Ideas past triage age. Each shows its valid moves inline (*Resume / Pause*, *Activate / Demote*, *Promote / Archive*) plus *Reviewed, still right* where allowed.
3. **Up next:** Ready queue, drag to rank (keyboard alternative: move up/down buttons).
4. **Inbox:** count and a capture field.

### Projects (`/projects`)

Columns: name, status, next action, platform, repo, last progress. Filter by status, search by name. Shipped and archived are hidden by default behind a toggle.

### Project detail / Resume (`/p/:slug`) — the centerpiece

Each section answers one question, in the order you ask them.

| # | Section | Question it answers | Content |
|---|---|---|---|
| 1 | **Header** | What is this? | Name, summary, outcome, status pill, staleness badge ("Last progress 9 days ago"), current-platform chip (deep link), repo · branch link |
| 2 | **Next action** (hero) | What do I do right now? | Large editable text. `Done` → inline prompt for the next one |
| 3 | **Agent handoff** | What do I tell my agent? | Generated brief, `Copy` button (shortcut `c`). Toggle: include recent commits |
| 4 | **What remains** | How far from done? | Ship checklist with progress (e.g. 4/6) |
| 5 | **Blockers** | What's in the way? | Open blockers; resolve inline |
| 6 | **Where it stands** | What happened last? | Latest checkpoint, last 5 commits / merged PRs (with sync time), open linked issues |
| 7 | **Decisions** | What did I already settle? | Latest 5, expandable; supersede rather than edit |
| 8 | **Agent instructions** | How should the agent work here? | Standing markdown, collapsed by default |

Sticky action bar: **Park**, **Change status**, **Open in {current platform}**.

#### Agent handoff brief (generated, plain markdown)

```md
# Resuming: {name}
{summary}

## Outcome
{outcome}

## Where it stands
Last session ({checkpoint.platform}, {relative date}): {checkpoint.summary}
Repo: {fullName} · branch {trackedBranch}
Recent commits:
- {sha7} {message}   (optional)

## Done when
- [x] {criterion}
- [ ] {criterion}

## Decisions already made (don't relitigate)
- {decision} — {rationale}

## Open blockers
- {blocker}

## Do this next
{nextAction}

## Working instructions
{agentInstructions}
```

One template for every platform in the MVP. Platform-specific variants come only if a platform demonstrably mishandles the generic one.

#### Park flow (≤30 seconds)

A modal with three fields; focus starts on the first. **What happened** (required) · **Next action** (prefilled, required) · **New blocker** (optional). The platform defaults to the current one. Submitting writes a Checkpoint and a `checkpoint_added` event.

---

## 6. Stale detection

Computed when read, from `lastProgressAt`, `statusChangedAt`, `reviewOn` and `lastReviewedAt`; never stored. Thresholds are user settings with the defaults below. The Settings UI for them can follow in a later phase.

| Status | Clock starts at | Fresh | Stale | Cold → prompt |
|---|---|---|---|---|
| active | `lastProgressAt` | < 7 d | 7–20 d | ≥ 21 d: "Pause or archive?" |
| ready | later of `statusChangedAt`, `lastReviewedAt` | < 14 d | 14–29 d | ≥ 30 d: "Activate or demote to idea?" |
| paused | `reviewOn` | before | on/after | 30 d past: "Resume or archive?" |
| idea | later of `createdAt`, `lastReviewedAt` | < 30 d | ≥ 30 d | "Promote or archive?" |
| shipped, archived | — | never stale | | |

**Progress events** (these update `lastProgressAt`): status change, next action completed, checkpoint added, ship criterion checked, push to **any** branch of a linked repo, PR merged. Counting any branch is deliberate, because agents work on generated branches (`claude/*`, `codex/*`).

**Review** ("Reviewed, still right") resets the clock for idea and ready. For paused, it pushes `reviewOn` forward. It doesn't count as progress for active projects, because that would turn the stale signal into a snooze button.

---

## 7. GitHub integration

**Use a GitHub App, not an OAuth App.**

| | OAuth App | GitHub App (recommended) |
|---|---|---|
| Private repo read | `repo` scope = full read/write to all private repos | Read-only, per repo; you pick repos at install |
| Tokens | Long-lived | Short-lived installation tokens (1 h) |
| Webhooks | Per repo, set up manually | Built in, app-level |
| Sign-in | Yes | Yes (the App's user authorization flow) |

- **Permissions (all read-only):** Metadata, Contents (commits), Issues, Pull requests.
- **Webhook events:** `push`, `pull_request`, `issues`, `installation`, `installation_repositories`.
- **Identity:** "Sign in with GitHub" through the App's user authorization; identity only.
- **API calls:** made server-side with installation tokens minted from the App's private key. The browser never holds a GitHub token.
- **Repo picker:** lists only repos granted to the installation. A link to GitHub lets you add more repos.
- **Sync:** webhooks first. Opening a project refreshes it if `lastSyncedAt` is more than 15 min old, which covers missed deliveries. Only metadata is stored (sha, message, date, PR/issue number, title, state). Code is never stored.
- **Disconnect:** Settings → Disconnect does three things: it revokes the user authorization, prompts you to uninstall the App, and deletes cached GitHub data. Project records and RepoLink IDs are kept so a reconnect re-attaches them. An `installation.deleted` webhook does the same server-side.
- **Out of scope for MVP:** any write to GitHub.

---

## 8. Stack

| Layer | Choice | Why |
|---|---|---|
| UI | **TypeScript strict + vanilla Custom Elements**, native ES modules, Vite for dev/build only | About 6 form-heavy screens and simple client state. Ships well under 50 KB gzipped with no framework churn, and the components carry over to later surfaces (browser extension, VS Code webview) |
| State | ~1 KB in-house signal store (getter/setter + subscribe) per feature | Explicit data flow |
| Styling | CSS custom-property tokens, `@container` queries, light/dark | Tokens come from the design spec (§9, Phase 0) |
| Routing | `URLPattern` + History API | Native, no dependency |
| Backend | **Supabase**: Postgres + RLS, Auth (GitHub provider backed by the GitHub App), Edge Functions (Deno/TS) for the webhook receiver and GitHub proxy | Auth, database and functions in one managed service |
| Hosting | Netlify (static) | Preview deploy per branch |
| Tests | Vitest (lifecycle gates, stale engine, brief builder), Playwright (capture, Resume, Park, disconnect), axe in CI | Gates and staleness are pure functions, so test them hard |

**Cost:** $0 on free tiers. Supabase's free tier pauses projects after a week of inactivity, which would drop webhooks. Move to Pro ($25/mo) once you depend on it daily.

**When React 19 is the better pick:** if a second contributor joins, or the orchestration platform becomes near-term. The domain layer is framework-free, so a switch only costs the view layer.

```
src/
  domain/      # pure TS: types, lifecycle gates, stale engine, brief builder (no DOM)
  data/        # Supabase client, one repository per entity
  state/       # signal store, per-feature stores
  ui/
    tokens/    # CSS custom properties (from the design spec)
    components/# fl-status-pill, fl-next-action, fl-handoff-brief, fl-park-dialog, ...
    screens/   # overview, projects, project-detail, inbox, archive, settings
supabase/
  migrations/
  functions/   # github-webhook, github-sync
```

---

## 9. Build plan

Each phase ends usable. Dogfood from the end of Phase 1; Finishlyne's own build is project #1.

| Phase | Ships | Done when |
|---|---|---|
| **0. Foundation** | **Design spec** (tokens, type, color, components; locked before UI work), Vite + TS scaffold, Supabase schema + RLS, GitHub App registered, sign-in, Netlify deploys, CI (typecheck, Vitest, axe) | A signed-in user reaches a protected, empty Overview on a deployed preview |
| **1. Capture + lifecycle** | Quick capture, Inbox, Projects list with search/filter, project create/edit, all lifecycle gates, next action, ship checklist, platforms with deep links, WIP cap, Archive | The full lifecycle works without GitHub; every existing side project is entered |
| **2. Resume** | Project detail (all 8 sections except GitHub data), decisions, blockers, agent instructions, Park, handoff brief + copy | Open a paused project → copied brief in < 60 s → continue in another agent |
| **3. GitHub** | App install, repo picker, link/unlink, tracked branch, issue/PR links, webhooks, activity in detail view, pushes update staleness, disconnect | A push from Claude Code on a `claude/*` branch freshens the project; disconnect leaves projects intact |
| **4. Attention** | Stale engine, Overview "Needs a decision" lane, Review action, threshold and WIP settings | A 10-minute weekly review clears every "Needs a decision" item |
| **5. Validation** | Privacy (cross-account RLS tests), mobile, keyboard and screen reader, empty/loading/error states, a real week of personal use | Every acceptance criterion in §10 passes against real projects |
| **Later (evidence-gated)** | **Finishlyne MCP server** (agents read the brief and write checkpoints themselves; the likely first integration and the bridge to orchestration), repo context file, AI-drafted checkpoints, platform-specific brief variants | Only when a week of use shows the manual step is the real friction |

---

## 10. Acceptance criteria (MVP)

- Create, edit, search, filter, pause, ship and archive projects without leaving the workspace.
- Every lifecycle gate in §4 is enforced, including the WIP cap and required archive reason.
- Link one or more GitHub repos to a project through an authenticated repo picker.
- Every open project shows its next action, or a clear prompt to add one, in both the list and the detail view.
- The detail view gives enough context to resume without searching old chats; the brief copies in one action.
- Stale projects are flagged by the rules in §6 and can be resumed, paused, reviewed or archived from the Overview.
- One authenticated user can't read or modify another user's records (RLS tests in CI).
- Disconnecting GitHub invalidates credentials and deletes cached GitHub data without deleting projects.
- Works on desktop and mobile; meets WCAG 2.2 AA; fully keyboard-operable; status is never shown by color alone.
- Empty, loading and error states never block the main flow.

---

## 11. Non-goals (MVP)

- Tickets, subtasks, sprints, estimates, assignees, comments; replacing GitHub Issues, Linear or Jira.
- Kanban or Gantt views.
- Teams, sharing, roles, billing, admin.
- Integrations with any agent platform, and launching or orchestrating agents from Finishlyne.
- Writing anything to GitHub, or storing code.
- AI-generated summaries or checkpoints.
- Gamification: streaks, scores, productivity metrics, counters that celebrate volume.
- Time tracking. Notifications beyond in-app.

The test for any future feature: *does it help decide what to work on next, or resume faster?* If not, it's out.

---

## 12. Success measures (personal)

- **Activation:** at least 3 existing projects captured and 1 repo linked in the first session.
- **Closure:** projects shipped or archived with a reason each quarter goes up; nothing sits open with no state.
- **Focus:** ≥ 80% of Active projects show progress within 7 days.
- **Resume speed:** median < 60 s from opening a project to a copied brief.
- **Friction:** capture takes seconds; Park takes ≤ 30 s.
- **Hygiene:** no Paused project without a review date.

Avoid vanity metrics such as total ideas captured.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Becoming another backlog | One next action, WIP cap, no subtasks; Overview is a decision screen, not a list |
| Overbuilding integrations | GitHub plus manual platform labels; the MCP server only on evidence |
| Stale or misleading GitHub data | Cached facts kept apart from intent; sync time always shown; refresh when a project is opened |
| Credential exposure | GitHub App, read-only, short-lived tokens kept server-side; explicit disconnect |
| Resume context rot | Park required to pause; latest checkpoint is "current state" |
| Unclear finish line | Ship checklist required to leave Idea |
| Gates feel heavy | Capture stays a name only; gates apply only at Idea → Ready and later |

---

## 14. Decisions

| # | Decision | Status |
|---|---|---|
| 1 | GitHub App vs OAuth App | **Decided 2026-10-10: GitHub App** (read-only, per repo) |
| 2 | WIP cap vs priority field | **Decided 2026-10-10: WIP cap of 3** plus a ranked Ready queue |
| 3 | Stack | Default: **vanilla Web Components + Supabase + Netlify** |
| 4 | Design spec timing | Default: **before Phase 1 UI**, as part of Phase 0 |
| 5 | Tenancy | Default: **single-user** experience, RLS-isolated accounts |
