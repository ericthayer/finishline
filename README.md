# Finishline

> Ideas are cheap. Finished projects are valuable. **Less starting. More shipping.**

A personal command center for projects born from agentic development: capture ideas, cap what's active, and resume any project with a brief you can paste straight into your coding agent.

- **Spec:** [docs/SPEC.md](docs/SPEC.md)
- **Account setup:** [docs/SETUP.md](docs/SETUP.md)

## Develop

```sh
npm install
npm run check   # typecheck + tests + build
npm run dev
```

## Layout

```
src/domain/            pure TypeScript: types, lifecycle gates, stale engine, handoff brief
supabase/migrations/   Postgres schema, row-level security, transition_project()
tests/                 Vitest; schema tests run the real migration in PGlite
```
