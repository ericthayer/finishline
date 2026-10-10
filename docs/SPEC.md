# Finishline — MVP Spec

> Ideas are cheap. Finished projects are valuable.

**Status:** Draft v0.1 · 2026-10-10 · Owner: Eric
**Repo state at writing:** empty (LICENSE only). Everything below is greenfield.

---

## 1. Product thesis

Finishline is a **single-user command center** for projects born from agentic development. It owns three things GitHub and the agent platforms don't:

| Finishline owns | GitHub owns | Agent platforms own |
|---|---|---|
| Intent (goal, definition of done) | Code, branches, commits | The working session |
| Priority (what deserves attention now) | Issues, PRs | Platform-specific context |
| Continuity (where it stands, what to tell the agent next) | Activity history | — |

**The organizing unit is the Project.** Tools, repos and platforms are attributes of a project, never the other way round.

**Primary job:** "Open Finishline, know within 60 seconds what to work on and exactly what to paste into my agent."

### Premise critique (read before building)

These are gaps in the original vision that, unaddressed, turn Finishline into a nicer-looking graveyard.

1. **The lifecycle has no exit except Shipped.** Projects you will never finish stay Paused forever, and the graveyard just moves from GitHub into Finishline. **Fix:** add a terminal `Dropped` state with a required one-line reason. Killing a project on purpose is closure, and closure is the product.
2. **"Decide what deserves attention" has no mechanism.** The feature list tracks state but never forces a choice. **Fix:** a hard **WIP cap on Active (default 3)** and a ranked Ready queue. Activating a fourth project requires pausing one. This one constraint is worth more than every other feature combined.
3. **"Shipped" is undefined.** Without a definition of done, nothing ever ships; it just gets polished. **Fix:** a short **ship checklist (3–7 items)** is required to leave Idea. Unchecked items *are* "what remains", which answers the Resume question without introducing tickets.
4. **GitHub activity is a weak staleness signal for this audience.** A Bolt or AI Studio project can be hot with zero commits; Claude Code and Codex push to throwaway branches constantly. **Fix:** staleness is computed from *progress events* (checkpoints, next-action completions, lifecycle moves, and pushes to any branch of a linked repo), not from the default branch alone.
5. **Manual resume context rots unless writing it is nearly free.** **Fix:** a 30-second **Park** flow at the end of each session (what happened, next action, any blocker). Pausing a project requires one.
6. **"GitHub OAuth" is the wrong primitive.** An OAuth App cannot read private repos without the `repo` scope, which grants full **write** access to every private repo you own. **Fix:** register a **GitHub App** with read-only, per-repo permissions (see §6).
7. **"Grow into an orchestration platform" should not shape v1.** The only concession now: every meaningful change is written to an append-only **event log**. That log is the substrate future integrations (an MCP server, agent hooks) read and write. Nothing else is built speculatively.

---

## 2. Domain model

Single-user. Every row carries `user_id`; Postgres row-level security enforces `user_id = auth.uid()`.

```ts
type ProjectStatus = 'idea' | 'ready' | 'active' | 'paused' | 'shipped' | 'dropped';

type AgentPlatformId =
  | 'claude_code' | 'claude_ai' | 'codex' | 'google_ai_studio' | 'bolt'
  | 'lovable' | 'v0' | 'cursor' | 'replit' | 'other';

interface Project {
  id: string;
  name: string;                    // only required field at capture
  summary: string | null;          // one line: "what it is"
  goal: string | null;             // why it exists / the outcome
  status: ProjectStatus;
  statusChangedAt: string;
  nextAction: string | null;       // exactly one, imperative, concrete
  agentInstructions: string | null;// standing markdown: conventions, don'ts, stack notes
  focusRank: number | null;        // ordering within Ready
  reviewOn: string | null;         // date; required when paused
  shippedUrl: string | null;
  droppedReason: string | null;    // required when dropped
  lastProgressAt: string;          // denormalized from events, drives staleness
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ShipCriterion { id: string; projectId: string; text: string; doneAt: string | null; position: number; } // cap 10

interface Decision { id: string; projectId: string; text: string; rationale: string | null; supersededBy: string | null; createdAt: string; }

interface Blocker { id: string; projectId: string; text: string; kind: 'decision' | 'technical' | 'external'; resolvedAt: string | null; createdAt: string; }

interface ProjectPlatform {           // where the work happens
  projectId: string;
  platform: AgentPlatformId;
  label: string | null;               // for 'other'
  url: string | null;                 // deep link: Bolt project, AI Studio app, Claude project
  role: 'origin' | 'current' | 'past';// exactly one 'current' at a time
  lastUsedAt: string | null;
}

interface Checkpoint {                // the Park note
  id: string;
  projectId: string;
  platform: AgentPlatformId | null;   // where this session happened
  summary: string;                    // what happened
  nextActionSet: string;              // snapshot of next action at park time
  createdAt: string;
}

interface RepoLink {
  id: string;
  projectId: string;
  githubRepoId: number;               // stable across renames
  fullName: string;                   // owner/name (cached)
  trackedBranch: string | null;       // null = default branch
  installationId: number;
  lastPushAt: string | null;          // any branch
  lastSyncedAt: string | null;
}

interface IssueLink { repoLinkId: string; number: number; title: string; state: 'open' | 'closed'; kind: 'issue' | 'pr'; updatedAt: string; } // cached

type ProjectEvent =
  | { type: 'status_changed'; from: ProjectStatus; to: ProjectStatus }
  | { type: 'next_action_completed'; text: string }
  | { type: 'checkpoint_added'; checkpointId: string }
  | { type: 'ship_criterion_done'; criterionId: string }
  | { type: 'github_push'; repoLinkId: string; branch: string; sha: string }
  | { type: 'github_pr_merged'; repoLinkId: string; number: number };
// stored as: { id, projectId, occurredAt, source: 'user' | 'github', payload: ProjectEvent }
```

**Deliberate choices**

- **No separate Inbox entity.** An inbox item is a Project in `idea`. Capture needs only a name; one table, no promotion migration.
- **One next action, not a list.** A list is a backlog; a backlog is Jira. Completing it prompts for the next one; history lives in events.
- **Agent instructions are one markdown field**, not structured rows. It's pasted into agents verbatim; structure adds nothing.
- **Progress events update `lastProgressAt`; edits do not.** Renaming, retagging or editing the summary is not progress.

---

## 3. Lifecycle

```
           ┌──────────── reopen ────────────┐
           ▼                                │
 idea ──► ready ──► active ──► shipped ─────┤
  │         │        ▲   │                  │
  │         │        │   ▼                  │
  │         │        └ paused               │
  └─────────┴────────────┴──► dropped ──────┘
```

| Transition | Gate (enforced in UI and DB function) |
|---|---|
| idea → ready | `goal`, ≥1 ship criterion, `nextAction` set |
| ready → active | Active count < WIP cap (default 3); otherwise must pause one in the same flow |
| active → paused | Checkpoint written in this flow; `reviewOn` set (default +14 days) |
| paused → active | WIP cap check |
| active → shipped | All ship criteria checked, or explicit "ship anyway" confirm; optional `shippedUrl` |
| any open → dropped | `droppedReason` required |
| shipped/dropped → ready | Allowed (reopen); resets nothing |

---

## 4. Resume Project (the centerpiece)

Route: `/p/:slug`. Every section answers one question, in the order you ask them.

| # | Section | Question it answers | Content |
|---|---|---|---|
| 1 | **Header** | What is this? | Name, one-line summary, status pill, staleness badge ("Last progress 9 days ago"), current-platform chip (deep link, opens in new tab), repo · branch link |
| 2 | **Next action** (hero) | What do I do right now? | Large editable text. `Done` → inline prompt for the next one |
| 3 | **Agent handoff** | What do I tell my agent? | Generated prompt, `Copy` button (shortcut `c`). Toggle: include recent commits |
| 4 | **What remains** | How far from done? | Ship checklist with progress (e.g. 4/6) |
| 5 | **Blockers** | What's in the way? | Open blockers; resolve inline |
| 6 | **Where it stands** | What happened last? | Latest checkpoint, last 5 commits / merged PRs, open linked issues |
| 7 | **Decisions** | What did I already settle? | Latest 5, expandable; supersede instead of edit |
| 8 | **Agent instructions** | How should the agent work here? | Standing markdown, collapsed by default |

Primary actions in a sticky bar: **Park** (checkpoint), **Change status**, **Open in {current platform}**.

### Agent handoff prompt (generated, plain markdown)

```md
# Resuming: {name}
{summary}

## Goal
{goal}

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

One template for all platforms in MVP. Platform-tuned variants ship only if a platform demonstrably mishandles the generic one.

### Park flow (≤30 seconds)

Modal, three fields, focus starts on the first: **What happened** (required) · **Next action** (prefilled, required) · **New blocker** (optional). Platform defaults to current. Submit writes a Checkpoint and a `checkpoint_added` event.

---

## 5. Attention: Focus home and stale detection

### Focus home (`/`)

Not a kanban board. Kanban invites ticket management; this is a decision screen.

1. **Now:** Active projects (≤ WIP cap) as cards: name, next action, staleness, platform chip, `Resume`.
2. **Needs a decision:** stale Active, Ready gone cold, Paused past review date, Ideas past triage age. Each with the two valid moves inline (e.g. *Resume / Pause*, *Activate / Demote*, *Promote / Drop*).
3. **Up next:** Ready queue, drag to rank.
4. **Inbox:** count + quick-capture field (global shortcut `/`).
5. Shipped and Dropped live under `/archive` with a running shipped count — the scoreboard.

### Stale rules

Computed at read time from `lastProgressAt`, `statusChangedAt`, `reviewOn`. Never stored. Thresholds are user settings; defaults below.

| Status | Signal | Fresh | Stale | Cold → prompt |
|---|---|---|---|---|
| active | days since `lastProgressAt` | < 7 | 7–20 | ≥ 21: "Pause or drop?" |
| ready | days since `statusChangedAt` | < 14 | 14–29 | ≥ 30: "Activate or demote to idea?" |
| paused | `reviewOn` vs today | before | on/after | 30 days past: "Resume or drop?" |
| idea | days since `createdAt`, never triaged | < 30 | ≥ 30 | "Promote or drop?" |
| shipped, dropped | — | never stale | | |

**Progress events** (update `lastProgressAt`): status change, next action completed, checkpoint added, ship criterion checked, push to **any** branch of a linked repo, PR merged. Any-branch is deliberate: agents work on generated branches (`claude/*`, `codex/*`).

---

## 6. GitHub integration

**Recommendation: GitHub App, not OAuth App.**

| | OAuth App | GitHub App (recommended) |
|---|---|---|
| Private repo read | `repo` scope = full read/write to all private repos | Read-only, per-repo, user picks repos at install |
| Tokens | Long-lived | Short-lived installation tokens (1h) |
| Webhooks | Per-repo, manual | Built in, app-level |
| Sign-in | Yes | Yes (App's user authorization flow) |

**App permissions (all read-only):** Metadata, Contents (commits), Issues, Pull requests.
**Webhook events:** `push`, `pull_request`, `issues`, `installation`, `installation_repositories`.
**Identity:** "Sign in with GitHub" through the App's user authorization; identity only.
**API calls:** server-side with installation tokens minted from the App private key. The browser never holds a GitHub token.

**Sync model:** webhooks are primary; Resume triggers a refresh if `lastSyncedAt` > 15 min old (covers missed deliveries). Store metadata only (sha, message, author date, PR/issue number/title/state). Never store code.

**Out of scope for MVP:** any write to GitHub (creating issues, commenting, writing a context file into the repo).

---

## 7. Stack (repo is empty, so this is the pick)

| Layer | Choice | Why |
|---|---|---|
| UI | **TypeScript strict + vanilla Custom Elements**, native ES modules, Vite for dev/build only | ~6 screens, form-heavy, no complex client state. Ships well under 50 KB gzipped, no framework churn, components portable to later surfaces (browser extension, VS Code webview, embedded widget) |
| State | ~1 KB in-house signal store (getter/setter + subscribe) per feature | Explicit data flow, no reactive framework |
| Styling | CSS custom-property tokens, `@container` queries, light/dark | Matches design-system practice; tokens become the system |
| Routing | `URLPattern` + History API | Native, no dependency |
| Backend | **Supabase**: Postgres + RLS, Auth (GitHub provider backed by the GitHub App), Edge Functions (Deno/TS) for webhook receiver and GitHub proxy | Auth, DB, functions in one managed service; RLS fits single-user perfectly |
| Hosting | Netlify (static) | Preview deploys per branch; zero ops |
| Tests | Vitest (logic: lifecycle gates, stale engine, prompt generator), Playwright (Resume + Park flows), axe in CI | Gates and staleness are pure functions; test them hard |

**Cost:** $0 on free tiers to start. Caveat: Supabase free projects pause after a week of inactivity, which would drop webhooks; move to Pro ($25/mo) once you depend on it daily.

**When React 19 would be the better pick:** if a second contributor joins soon, or the orchestration-platform ambition becomes near-term and you want its ecosystem (data grids, DnD, graph views). The domain layer (gates, stale engine, prompt generator) is framework-free either way, so the switch cost stays confined to the view layer.

**Module layout**

```
src/
  domain/      # pure TS: types, lifecycle gates, stale engine, prompt builder (no DOM)
  data/        # Supabase client, repositories per entity
  state/       # signal store, per-feature stores
  ui/
    tokens/    # CSS custom properties
    components/# fl-status-pill, fl-next-action, fl-handoff-prompt, fl-park-dialog, ...
    screens/   # focus-home, resume-project, archive, settings
supabase/
  migrations/
  functions/   # github-webhook, github-sync
```

---

## 8. Non-goals (MVP)

- Tickets, subtasks, sprints, estimates, story points, assignees, comments.
- Kanban boards or Gantt views.
- Multi-user, teams, sharing.
- Integrations with any agent platform (Claude, Codex, AI Studio, Bolt…). Platforms are manually selected with a deep link.
- Writing anything to GitHub.
- Storing or indexing code.
- AI-generated summaries or checkpoints.
- Time tracking.
- Notifications beyond in-app (email digest is Phase 4, optional).

The test for any future feature: *does it help decide what to work on next, or resume faster?* If not, it's out.

---

## 9. Phased build plan

Each phase ends usable. Dogfood from the end of Phase 1; Finishline's own build is project #1.

| Phase | Ships | Done when |
|---|---|---|
| **0. Foundation** | Vite + TS scaffold, tokens, Supabase project, schema + RLS migrations, GitHub App registered, sign-in, Netlify deploys, CI (typecheck, Vitest, axe) | Sign in with GitHub on a deployed preview, see an empty Focus home |
| **1. Capture + lifecycle** | Quick capture (`/`), project create/edit, lifecycle with all gates, next action, ship checklist, platforms with deep links, WIP cap, Dropped | Every existing side project entered; WIP cap enforced |
| **2. Resume** | Resume screen (all 8 sections minus GitHub data), decisions, blockers, agent instructions, Park flow, handoff prompt + copy | Open a project → copy the prompt in < 60 s |
| **3. GitHub** | App install flow, repo + branch linking, issue/PR association, webhooks, activity in Resume, pushes update `lastProgressAt` | A push from Claude Code on a `claude/*` branch freshens the project |
| **4. Attention** | Stale engine, Focus home "Needs a decision" lane, archive + shipped count, settings for thresholds, optional weekly digest email | A 10-minute weekly review clears every "Needs a decision" item |
| **Later (evidence-gated)** | **Finishline MCP server** (agents read resume context and write checkpoints themselves; most likely first integration and the bridge to orchestration), repo context file, AI-drafted checkpoints from commits, platform-specific prompt variants | Only when a phase-4 week shows the manual step is the actual friction |

### Success measures (personal)

- Projects shipped or dropped per quarter (closure rate) goes up.
- ≥ 80% of Active projects have progress within 7 days.
- Resume to copied prompt: median < 60 s.
- Zero projects in Paused without a review date.

---

## 10. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | GitHub App vs OAuth App | **GitHub App** (read-only, per-repo) |
| 2 | Add `Dropped` state and WIP cap | **Yes**, cap of 3 |
| 3 | Stack | **Vanilla Web Components + Supabase + Netlify** |
| 4 | "What remains" model | **Ship checklist (3–7 items, max 10)**, required to leave Idea |
| 5 | Tenancy | **Single-user** schema now; `user_id` everywhere keeps a later move to workspaces cheap |
