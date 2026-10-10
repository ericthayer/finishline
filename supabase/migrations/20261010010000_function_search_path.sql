-- Pin search_path on every function (Supabase advisor 0011). An empty path
-- means a caller's role or session settings can't redirect a name lookup.
alter function public.set_updated_at() set search_path = '';
alter function public.progress_event_types() set search_path = '';
alter function public.guard_project_status() set search_path = '';
alter function public.limit_ship_criteria() set search_path = '';
alter function public.apply_project_event() set search_path = '';
alter function public.transition_project set search_path = '';
alter function public.checkpoint_event() set search_path = '';
