// Finishline components: vanilla Custom Elements (light DOM). Attributes and properties below.
export type ProjectStatus = 'idea' | 'ready' | 'active' | 'paused' | 'shipped' | 'archived';
export type StaleLevel = 'fresh' | 'stale' | 'cold' | 'none';

/** Native <button class="fl-btn fl-btn--…">. */
export interface ButtonProps { variant: 'primary' | 'secondary' | 'quiet' | 'danger' | 'on-signal'; disabled?: boolean }
/** <div class="fl-field" data-invalid?> with label, input|textarea, small. */
export interface FieldProps { label: string; help?: string; invalid?: boolean }
/** <fl-status-pill status> */
export interface StatusPillProps { status: ProjectStatus }
/** <fl-stale-badge level days label> */
export interface StaleBadgeProps { level: StaleLevel; days: number; label?: string }
/** <fl-next-action text> · events: fl-next-done {text}, fl-next-add */
export interface NextActionProps { text?: string }
/** <fl-handoff-brief> · properties brief, briefWithCommits · event: fl-brief-copied {text} */
export interface HandoffBriefProps { brief: string; briefWithCommits?: string }
/** <fl-wip-lanes cap> · property projects */
export interface WipLanesProps { cap: number; projects: string[] }
/** <fl-project-card …> */
export interface ProjectCardProps { name: string; href: string; status: ProjectStatus; next?: string; days: number; level: StaleLevel; platform?: string; repo?: string }
/** <fl-ship-checklist> · property items · event: fl-criterion-toggle {index, done} */
export interface ShipChecklistProps { items: { text: string; done: boolean }[] }
/** <fl-park-dialog next open? inline?> · methods open(), close() · event: fl-park {summary, next, blocker} */
export interface ParkDialogProps { next: string; open?: boolean; inline?: boolean }
