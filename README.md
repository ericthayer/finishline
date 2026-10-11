# Finishlyne

> Ideas are cheap. Finished projects are valuable. **Less starting. More shipping.**

A personal command center for projects born from agentic development: capture ideas, cap what's active, and resume any project with a brief you can paste straight into your coding agent.

- **Spec:** [docs/SPEC.md](docs/SPEC.md)
- **Account setup:** [docs/SETUP.md](docs/SETUP.md)

## Develop

```sh
npm install
npm run check     # typecheck + unit tests + build
npm run test:e2e  # Playwright + axe in dark and light, at 1280px and 2560px
npm run dev       # needs .env.local with the two VITE_SUPABASE_* values
```

## Commits and releases

Every PR title is a [Conventional Commit](https://www.conventionalcommits.org), because PRs are squash-merged and the title becomes the commit on `main`:

```
feat: add project list filters        → 0.1.0 → 0.2.0 at the next release (minor)
fix(inbox): keep focus after archive  → patch
feat!: change the lifecycle gates     → breaking (major once past 1.0)
docs, test, refactor, chore, ci, build, style, perf, revert → no version bump
```

`pr-title` CI fails a PR whose title doesn't match. `release` keeps a release PR open on `main` with the version bump in `package.json`, `CHANGELOG.md` entries and the next tag. Merging that PR tags `vX.Y.Z` and creates the GitHub Release.

## Layout

```
scripts/               CI helpers (PR title check); no dependencies
src/domain/            pure TypeScript: types, lifecycle gates, stale engine, handoff brief
src/data/              Supabase Auth + PostgREST clients, session, read models
src/state/             signal store, Overview view model
src/app/               router, shell, templates
src/ui/                tokens, component styles, Custom Elements, screens
supabase/migrations/   Postgres schema, row-level security, transition_project()
tests/                 Vitest; schema tests run the real migration in PGlite
tests/e2e/             Playwright + axe; fixtures render real screens with sample data
```
