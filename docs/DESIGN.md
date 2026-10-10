# Finishline design spec

**Status:** draft for approval (2026-10-10). Once approved, the visual language below is locked; changes go through this doc.

**Live spec:** [Finishline design system](https://claude.ai/artifact/H24xMhZE5icRofmFfSeJ7P) (brand book, tokens, every component with previews, the Resume screen).

## Direction

The running track and the timing board. Three lanes are the WIP cap, split times are days since progress, and finish-tape yellow marks the one thing to do next. Everything else is calm, so the yellow means something.

| Decision | Choice | Why |
|---|---|---|
| Accent | `signal` yellow, only on the Next action band and filled WIP lanes | One loud thing per screen is the product's thesis |
| Primary | `brand` cobalt, one primary button per view | Separates "act" (blue) from "attend" (yellow) |
| Type | Archivo Narrow (display), Archivo (text), IBM Plex Mono (brief, SHAs) | Condensed numerals read like a timing board; one family keeps weight low |
| Shape | 2/4/8px radii, 1px hairlines, no card shadows | Precise, tool-like; elevation is reserved for dialogs |
| Overview | Decision list (Now, Needs a decision, Up next, Inbox) | No kanban: the spec rejects ticketing |
| Celebration | None | Shipping is its own reward; no gamification |

## Principles

1. **Resume beats overview.** The Resume screen is the hero: name, next action, handoff brief, then context.
2. **Colour never carries meaning alone.** Status and staleness always pair colour with a word and a glyph.
3. **Gates explain themselves.** Errors say what to add ("Add an outcome to move this to Ready").
4. **WCAG 2.2 AA in both themes.** Text 4.5:1 on every surface; focus rings and UI parts 3:1, including inside the yellow band (`focus-on-signal`).

## Files

| Path | Role |
|---|---|
| `design/tokens.json` | Source of truth for colour (light + dark), type, spacing, radius, motion |
| `design/build-tokens.mjs` | Compiles tokens to CSS custom properties and `.style` type classes |
| `src/ui/tokens/tokens.css` | Generated; never edit. `npm run tokens` rebuilds, a test fails if it drifts |
| `src/ui/styles/components.css` | Locked component styles (`fl-*` classes), token values only |
| `design/reference/components.js` | Reference Custom Elements from the spec; Phase 1 ports these to TypeScript in `src/ui/` |

## Theming

Light is the default (`:root`). Set `data-theme="dark"` or `data-theme="light"` on `<html>`: follow `prefers-color-scheme` unless the user picked a theme. Dark is designed, not inverted: surfaces go blue-black, `brand` lightens, `signal` stays the same yellow.

## Components

Button, Field, StatusPill, StaleBadge, NextAction, HandoffBrief, WipLanes, ProjectCard, ShipChecklist, ParkDialog, plus the Resume screen composition. Light-DOM Custom Elements; data enters via attributes, properties and `textContent`, never `innerHTML`. APIs and events are documented per component in the live spec.

## Open

- No logo yet; the wordmark is "Finishline" in `display-xl`.
- Fonts load from Google Fonts for now; self-host before launch.
