# Plan comparison: Eric's Product Development Plan v1.0 vs Claude's Spec v0.1

**Verdict: merge them.** About 80% of the two plans agree: the thesis, the project-first model, GitHub as the source of truth for code, a single-user scope, deferred agent integrations, a copyable resume brief, and building the lifecycle before GitHub. Your plan is stronger on **framing**: principles, brand, information architecture, acceptance criteria, a validation phase, disconnect and security, and risks. Mine is stronger on **mechanics**: lifecycle gates, the WIP cap, stale rules, the GitHub permission model, the Resume screen layout, the handoff template, and the Park flow. Neither one is complete alone. The merged spec is [`SPEC.md` v0.2](./SPEC.md).

## Where they align

| Topic | Both say |
|---|---|
| Thesis | Ideas are cheap, finished projects are valuable |
| Organizing unit | Project, with agent platform as metadata |
| Ownership split | GitHub owns code and activity; Finishlyne owns intent, priority, continuity |
| Scope | Personal, single-user, data isolated per user |
| Integrations | GitHub only; platform is a manual label; others only if they're needed |
| Resume | Brief generated from stored fields, copied into any agent |
| Sequence | Lifecycle before GitHub |
| Backend | Supabase Postgres + RLS, server-side token handling |
| Not a ticket tool | No Linear or Jira, no writes to repos, no orchestration |

## Where they differ

| # | Topic | Your plan | My spec | Merged call |
|---|---|---|---|---|
| 1 | Terminal state | `Archived`, hidden, no reason | `Dropped`, one-line reason required | **Your name, my rule:** `Archived` with a required one-line reason. The reason is what turns quitting into closure |
| 2 | Focus mechanism | `priority` field, "simple priority" | Hard WIP cap of 3 Active, ranked Ready queue | **Mine.** A priority field turns into a sorted backlog; that's the "becoming another backlog" risk your own plan lists. *Needs your call* |
| 3 | Definition of done | Free-text outcome, "record what shipped means" | Ship checklist of 3–7 items, required to leave Idea | **Both:** one-line `outcome` at capture (yours), checklist gate at Idea → Ready (mine). Capture stays a name only, as your Flow A requires |
| 4 | GitHub auth | OAuth, "least-privilege scopes" | GitHub App, read-only, per repo | **Mine.** An OAuth App can't be least-privilege: reading private repos needs `repo`, which includes write. A GitHub App is the only way to meet your own principle. *Needs your call* |
| 5 | GitHub depth | Repo picker + metadata display | + tracked branch, issue/PR links, webhooks, pushes feed staleness | **Mine, minus nothing.** Your original thread message asked for branches and issues; your doc dropped them |
| 6 | Data model shape | Flat text fields on `projects` (`blockers`, `current_state`, `resume_context`) | Small tables: decisions, blockers, checkpoints, ship criteria | **Mine.** Free-text blockers can't be resolved one at a time; `current_state` becomes the latest checkpoint, so it gets history for free |
| 7 | Event log | "Optional later" | Day one | **Mine.** Staleness and any future MCP/agent bridge both read from it. Adding it later means backfilling history you never recorded |
| 8 | Review | `last_reviewed_at` | Only `reviewOn` for Paused | **Yours added.** "Reviewed, still right" snoozes the stale prompt for Idea/Ready/Paused. It doesn't count as progress for Active |
| 9 | IA | Overview, Projects (search/filter), Detail, Inbox, Settings | Focus home, Resume, Archive | **Yours.** I left out a searchable all-projects list, which you need. Focus home = your Overview |
| 10 | Stale rules | "Simple default, configurable later" | Per-status thresholds table | **Mine,** shipped with defaults; settings UI can come later as you said |
| 11 | Resume screen | Fields listed, no layout | 8 ordered sections, handoff template, Park flow, agent-instructions field | **Mine.** Agent instructions were in your thread message but not in the doc |
| 12 | Phase order | 0 Foundation → 1 Tracking → 2 GitHub → 3 Resume loop → 4 Validation | 0 → 1 Lifecycle → 2 Resume → 3 GitHub → 4 Attention | **Mine, plus your Validation phase.** Your §14 first slice already puts the resume brief before GitHub, so your own plan agrees |
| 13 | Acceptance criteria | Explicit list, including disconnect, mobile, keyboard, empty/error states | Per-phase "done when" only | **Yours,** adopted in full |
| 14 | Shipped count | No gamification, streaks or scoring | "Running shipped count — the scoreboard" | **Yours.** I've dropped the scoreboard framing; Archive just lists projects |
| 15 | Stack | Supabase; UI framework open; visual system in a separate design spec | Vanilla Web Components + Supabase + Netlify | **Mine for code, yours for design:** the visual system gets locked in a separate design spec before any Phase 1 UI |
| 16 | Brand | Tagline "Less starting. More shipping.", name clearance note | None | **Yours** |

## Still open (need your call)

1. **WIP cap of 3 vs. a priority field** (#2).
2. **GitHub App vs. OAuth App** (#4).
3. **Visual design spec:** I recommend writing it before Phase 1, so the UI isn't styled twice.
