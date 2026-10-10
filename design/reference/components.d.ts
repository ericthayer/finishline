// Finishline components: vanilla Custom Elements (light DOM). Attributes and properties below.
export type ProjectStatus = 'idea' | 'ready' | 'active' | 'paused' | 'shipped' | 'archived';
export type StaleLevel = 'fresh' | 'stale' | 'cold';
export type Tone = 'positive' | 'warning' | 'danger';
export type IconName =
  | 'overview' | 'projects' | 'inbox' | 'activity' | 'shipped' | 'settings' | 'sun' | 'moon' | 'search' | 'bell'
  | 'help' | 'plus' | 'export' | 'share' | 'more' | 'filter' | 'lanes' | 'alert' | 'calendar' | 'bookmark'
  | 'commit' | 'checkCircle' | 'pauseCircle' | 'arrow';
export type FeedKind = 'checkpoint' | 'push' | 'status' | 'paused' | 'shipped' | 'stale' | 'cold';

/** Native <button class="fl-btn fl-btn--…"> or <button class="fl-iconbtn" aria-label data-dot?>. */
export interface ButtonProps { variant: 'primary' | 'secondary' | 'quiet' | 'danger' | 'on-signal'; disabled?: boolean }
/** <div class="fl-field" data-invalid?> with label, input|textarea, small. */
export interface FieldProps { label: string; help?: string; invalid?: boolean }
/** <fl-icon name> · decorative */
export interface IconProps { name: IconName }
/** <fl-status-pill status> */
export interface StatusPillProps { status: ProjectStatus }
/** <fl-stale-badge level days label?> */
export interface StaleBadgeProps { level: StaleLevel; days: number; label?: string }
/** <fl-kpi label icon? value unit? delta? tone? meta?> */
export interface KpiProps { label: string; icon?: IconName; value: string; unit?: string; delta?: string; tone?: Tone; meta?: string }
/** <fl-wip-lanes cap> · property projects */
export interface WipLanesProps { cap: number; projects: string[] }
/** <fl-project-card lane name? …> · no name renders the open lane */
export interface ProjectCardProps { lane: number; name?: string; href?: string; status?: ProjectStatus; next?: string; days?: number; level?: StaleLevel; platform?: string; repo?: string }
/** <fl-stage-bars> · property stages */
export interface StageBarsProps { stages: { status: Exclude<ProjectStatus, 'archived'>; count: number }[] }
/** <fl-finish-rate shipped archived delta? tone?> */
export interface FinishRateProps { shipped: number; archived: number; delta?: string; tone?: Tone }
/** <fl-activity-feed> · property items */
export interface ActivityFeedProps { items: { kind: FeedKind; title: string; meta?: string; key?: string }[] }
/** <fl-project-table caption?> · property rows */
export interface ProjectTableProps {
  caption?: string;
  rows: { name: string; key?: string; href?: string; status: ProjectStatus; next?: string; platform?: string; days: number; level: StaleLevel; updated?: string }[];
}
/** <fl-theme-toggle> · sets data-theme on <html>, remembers it · event: fl-theme-change {theme} */
export interface ThemeToggleProps {}
/** <fl-next-action text> · events: fl-next-done {text}, fl-next-add */
export interface NextActionProps { text?: string }
/** <fl-handoff-brief> · properties brief, briefWithCommits · event: fl-brief-copied {text} */
export interface HandoffBriefProps { brief: string; briefWithCommits?: string }
/** <fl-ship-checklist> · property items · event: fl-criterion-toggle {index, done} */
export interface ShipChecklistProps { items: { text: string; done: boolean }[] }
/** <fl-park-dialog next open? inline?> · methods open(), close() · event: fl-park {summary, next, blocker} */
export interface ParkDialogProps { next: string; open?: boolean; inline?: boolean }
