-- Finishline init schema. See docs/SPEC.md §3–§4.
-- Every table is owned by one user and protected by row-level security.
-- Status changes go through public.transition_project(); direct updates to
-- projects.status are rejected so the lifecycle gates can't be bypassed.

-- ─── Types ────────────────────────────────────────────────────────────────
create type public.project_status as enum ('idea', 'ready', 'active', 'paused', 'shipped', 'archived');
create type public.agent_platform as enum (
  'claude_code', 'claude_ai', 'codex', 'google_ai_studio', 'bolt',
  'lovable', 'v0', 'cursor', 'replit', 'other'
);
create type public.blocker_kind as enum ('decision', 'technical', 'external');
create type public.platform_role as enum ('origin', 'current', 'past');
create type public.event_source as enum ('user', 'github');

-- ─── Helpers ──────────────────────────────────────────────────────────────
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Keep in sync with PROGRESS_EVENT_TYPES in src/domain/events.ts.
create function public.progress_event_types() returns text[]
language sql immutable as $$
  select array['status_changed', 'next_action_completed', 'checkpoint_added',
               'ship_criterion_done', 'github_push', 'github_pr_merged']
$$;

-- ─── Settings ─────────────────────────────────────────────────────────────
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  wip_cap int not null default 3 check (wip_cap between 1 and 10),
  stale_thresholds jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Projects ─────────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  outcome text,
  summary text,
  status public.project_status not null default 'idea',
  status_changed_at timestamptz not null default now(),
  next_action text,
  agent_instructions text,
  focus_rank int,
  review_on date,
  last_reviewed_at timestamptz,
  last_progress_at timestamptz not null default now(),
  shipped_at timestamptz,
  shipped_url text,
  archived_at timestamptz,
  archived_reason text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  unique (id, user_id),
  constraint archived_has_reason check (status <> 'archived' or length(btrim(coalesce(archived_reason, ''))) > 0),
  constraint paused_has_review_date check (status <> 'paused' or review_on is not null)
);
create index projects_user_status_idx on public.projects (user_id, status);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- New projects always start as ideas; status only changes via transition_project().
create function public.guard_project_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'idea';
    new.status_changed_at := now();
  elsif new.status is distinct from old.status
        and coalesce(current_setting('finishline.in_transition', true), '') <> 'on' then
    raise exception 'GATE:USE_TRANSITION' using hint = 'Change status with public.transition_project()';
  end if;
  return new;
end $$;

create trigger projects_status_guard before insert or update on public.projects
  for each row execute function public.guard_project_status();

-- ─── Project children ─────────────────────────────────────────────────────
-- (project_id, user_id) references projects (id, user_id) so a row can never
-- be attached to another user's project, even with a guessed project id.

create table public.ship_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  text text not null check (length(btrim(text)) > 0),
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index ship_criteria_project_idx on public.ship_criteria (project_id, position);

-- Cap of 10 criteria per project (SPEC §3).
create function public.limit_ship_criteria() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.ship_criteria where project_id = new.project_id) >= 10 then
    raise exception 'GATE:SHIP_CRITERIA_LIMIT';
  end if;
  return new;
end $$;
create trigger ship_criteria_limit before insert on public.ship_criteria
  for each row execute function public.limit_ship_criteria();

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  text text not null check (length(btrim(text)) > 0),
  rationale text,
  superseded_by uuid references public.decisions (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index decisions_project_idx on public.decisions (project_id, created_at desc);

create table public.blockers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  text text not null check (length(btrim(text)) > 0),
  kind public.blocker_kind not null default 'technical',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index blockers_open_idx on public.blockers (project_id) where resolved_at is null;

create table public.project_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  platform public.agent_platform not null,
  label text,
  url text check (url is null or url ~* '^https://'),
  role public.platform_role not null default 'current',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  constraint other_has_label check (platform <> 'other' or length(btrim(coalesce(label, ''))) > 0)
);
create unique index project_platforms_one_current on public.project_platforms (project_id) where role = 'current';

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  platform public.agent_platform,
  summary text not null check (length(btrim(summary)) > 0),
  next_action_set text not null check (length(btrim(next_action_set)) > 0),
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);
create index checkpoints_project_idx on public.checkpoints (project_id, created_at desc);

-- ─── GitHub (cached metadata; GitHub stays authoritative) ─────────────────
create table public.repo_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  github_repo_id bigint not null,
  full_name text not null,
  default_branch text not null,
  tracked_branch text,
  installation_id bigint not null,
  last_push_at timestamptz,
  last_synced_at timestamptz,
  linked_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  unique (project_id, github_repo_id)
);
create index repo_links_repo_idx on public.repo_links (github_repo_id);

create table public.issue_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  repo_link_id uuid not null references public.repo_links (id) on delete cascade,
  number int not null,
  kind text not null check (kind in ('issue', 'pr')),
  title text not null,
  state text not null check (state in ('open', 'closed')),
  updated_at timestamptz not null default now(),
  unique (repo_link_id, number)
);

-- ─── Event log (append-only) ──────────────────────────────────────────────
create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  type text not null check (type in (
    'status_changed', 'next_action_completed', 'checkpoint_added', 'ship_criterion_done',
    'reviewed', 'github_push', 'github_pr_merged'
  )),
  payload jsonb not null default '{}'::jsonb,
  source public.event_source not null default 'user',
  occurred_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  constraint payload_type_matches check (payload->>'type' = type)
);
create index project_events_project_idx on public.project_events (project_id, occurred_at desc);

-- Progress events move last_progress_at; `reviewed` moves last_reviewed_at.
create function public.apply_project_event() returns trigger
language plpgsql as $$
begin
  if new.type = any (public.progress_event_types()) then
    update public.projects
       set last_progress_at = greatest(last_progress_at, new.occurred_at)
     where id = new.project_id;
  elsif new.type = 'reviewed' then
    update public.projects
       set last_reviewed_at = greatest(coalesce(last_reviewed_at, new.occurred_at), new.occurred_at)
     where id = new.project_id;
  end if;
  return new;
end $$;

create trigger project_events_apply after insert on public.project_events
  for each row execute function public.apply_project_event();

-- ─── Lifecycle ────────────────────────────────────────────────────────────
-- Mirrors checkTransition() in src/domain/lifecycle.ts. Runs as the caller,
-- so RLS still applies: you can only move your own projects.
create function public.transition_project(
  p_project_id uuid,
  p_to public.project_status,
  p_next_action text default null,
  p_checkpoint_summary text default null,
  p_checkpoint_platform public.agent_platform default null,
  p_review_on date default null,
  p_archived_reason text default null,
  p_shipped_url text default null,
  p_ship_anyway boolean default false
) returns public.projects
language plpgsql security invoker as $$
declare
  p public.projects;
  v_from public.project_status;
  v_next text;
  v_cap int;
  v_active int;
  v_remaining int;
  v_allowed public.project_status[];
  v_failures text[] := '{}';
begin
  select * into p from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'GATE:NOT_FOUND';
  end if;
  v_from := p.status;

  v_allowed := case p.status
    when 'idea'     then array['ready', 'archived']::public.project_status[]
    when 'ready'    then array['active', 'idea', 'archived']::public.project_status[]
    when 'active'   then array['paused', 'shipped', 'archived']::public.project_status[]
    when 'paused'   then array['active', 'archived']::public.project_status[]
    when 'shipped'  then array['ready']::public.project_status[]
    when 'archived' then array['ready']::public.project_status[]
  end;
  if not (p_to = any (v_allowed)) then
    raise exception 'GATE:NOT_ALLOWED';
  end if;

  v_next := coalesce(nullif(btrim(p_next_action), ''), nullif(btrim(p.next_action), ''));

  if p_to in ('ready', 'active', 'paused') and v_next is null then
    v_failures := array_append(v_failures, 'MISSING_NEXT_ACTION');
  end if;

  if p.status = 'idea' and p_to = 'ready' then
    if nullif(btrim(p.outcome), '') is null then
      v_failures := array_append(v_failures, 'MISSING_OUTCOME');
    end if;
    if not exists (select 1 from public.ship_criteria where project_id = p.id) then
      v_failures := array_append(v_failures, 'MISSING_SHIP_CRITERIA');
    end if;
  end if;

  if p_to = 'active' then
    select coalesce((select wip_cap from public.user_settings where user_id = p.user_id), 3) into v_cap;
    select count(*) into v_active
      from public.projects
     where user_id = p.user_id and status = 'active' and id <> p.id;
    if v_active >= v_cap then
      v_failures := array_append(v_failures, 'WIP_CAP_REACHED');
    end if;
  end if;

  if p_to = 'paused' and nullif(btrim(p_checkpoint_summary), '') is null then
    v_failures := array_append(v_failures, 'MISSING_CHECKPOINT');
  end if;

  if p_to = 'shipped' and not p_ship_anyway then
    select count(*) into v_remaining
      from public.ship_criteria where project_id = p.id and done_at is null;
    if v_remaining > 0 then
      v_failures := array_append(v_failures, 'UNMET_SHIP_CRITERIA');
    end if;
  end if;

  if p_to = 'archived' and nullif(btrim(p_archived_reason), '') is null then
    v_failures := array_append(v_failures, 'MISSING_ARCHIVE_REASON');
  end if;

  if cardinality(v_failures) > 0 then
    raise exception 'GATE:%', array_to_string(v_failures, ',');
  end if;

  perform set_config('finishline.in_transition', 'on', true);

  update public.projects set
    status            = p_to,
    status_changed_at = now(),
    next_action       = coalesce(v_next, next_action),
    review_on         = case when p_to = 'paused' then coalesce(p_review_on, current_date + 14) else review_on end,
    shipped_at        = case when p_to = 'shipped' then now() else shipped_at end,
    shipped_url       = case when p_to = 'shipped' then p_shipped_url else shipped_url end,
    archived_at       = case when p_to = 'archived' then now() when p.status = 'archived' then null else archived_at end,
    archived_reason   = case when p_to = 'archived' then btrim(p_archived_reason) when p.status = 'archived' then null else archived_reason end
  where id = p.id
  returning * into p;

  perform set_config('finishline.in_transition', 'off', true);

  if p_to = 'paused' then
    insert into public.checkpoints (user_id, project_id, platform, summary, next_action_set)
    values (p.user_id, p.id, p_checkpoint_platform, btrim(p_checkpoint_summary), v_next);
    -- checkpoint_added event is written by the checkpoints trigger below.
  end if;

  insert into public.project_events (user_id, project_id, type, payload)
  values (p.user_id, p.id, 'status_changed',
          jsonb_build_object('type', 'status_changed', 'from', v_from, 'to', p_to));

  select * into p from public.projects where id = p.id;
  return p;
end $$;

-- Writing a checkpoint is progress.
create function public.checkpoint_event() returns trigger
language plpgsql as $$
begin
  insert into public.project_events (user_id, project_id, type, payload)
  values (new.user_id, new.project_id, 'checkpoint_added',
          jsonb_build_object('type', 'checkpoint_added', 'checkpointId', new.id));
  return new;
end $$;
create trigger checkpoints_event after insert on public.checkpoints
  for each row execute function public.checkpoint_event();

-- ─── Row-level security ───────────────────────────────────────────────────
alter table public.user_settings     enable row level security;
alter table public.projects          enable row level security;
alter table public.ship_criteria     enable row level security;
alter table public.decisions         enable row level security;
alter table public.blockers          enable row level security;
alter table public.project_platforms enable row level security;
alter table public.checkpoints       enable row level security;
alter table public.repo_links        enable row level security;
alter table public.issue_links       enable row level security;
alter table public.project_events    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['user_settings', 'projects', 'ship_criteria', 'decisions', 'blockers',
                           'project_platforms', 'checkpoints'] loop
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Repo links are created server-side after the GitHub App confirms the user can
-- see the repo; users can read them, retarget the tracked branch, or unlink.
create policy owner_read on public.repo_links for select to authenticated
  using (user_id = (select auth.uid()));
create policy owner_update on public.repo_links for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy owner_delete on public.repo_links for delete to authenticated
  using (user_id = (select auth.uid()));
create policy owner_read on public.issue_links for select to authenticated
  using (user_id = (select auth.uid()));

-- The event log is append-only for users; GitHub events arrive via the service role.
create policy owner_read on public.project_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy owner_append on public.project_events for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'user');

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.user_settings, public.projects, public.ship_criteria, public.decisions, public.blockers,
  public.project_platforms, public.checkpoints
  to authenticated;
grant select, delete on public.repo_links to authenticated;
grant update (tracked_branch) on public.repo_links to authenticated;
grant select on public.issue_links to authenticated;
grant select, insert on public.project_events to authenticated;
grant execute on function public.transition_project to authenticated;
