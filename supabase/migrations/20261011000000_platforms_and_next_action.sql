-- Phase 1 close-out: set a project's current platform from create/edit (SPEC §3, §9),
-- and a hard guarantee that open work always has a next action.

-- Ready, Active and Paused need a next action. transition_project() already checks
-- this on the way in; the constraint also stops a plain UPDATE from blanking it later.
alter table public.projects
  add constraint open_has_next_action
  check (status not in ('ready', 'active', 'paused') or length(btrim(coalesce(next_action, ''))) > 0);

-- Sets the one 'current' platform row for a project. Same platform: updates the label
-- and deep link in place. Different platform: the old row becomes 'past' and a new
-- current row is added, so history is kept. Null platform: clears current (to 'past').
-- Runs as the caller, so RLS scopes every read and write to the user's own rows.
create function public.set_current_platform(
  p_project_id uuid,
  p_platform public.agent_platform,
  p_label text default null,
  p_url text default null
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_current public.project_platforms;
  v_label text := nullif(btrim(p_label), '');
  v_url text := nullif(btrim(p_url), '');
begin
  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'GATE:NOT_FOUND';
  end if;

  select * into v_current from public.project_platforms
   where project_id = p_project_id and role = 'current' for update;

  if found and p_platform is not distinct from v_current.platform then
    update public.project_platforms
       set label = case when p_platform = 'other' then v_label else null end, url = v_url
     where id = v_current.id;
    return;
  end if;

  if found then
    update public.project_platforms set role = 'past' where id = v_current.id;
  end if;

  if p_platform is not null then
    insert into public.project_platforms (project_id, platform, label, url, role, last_used_at)
    values (p_project_id, p_platform, case when p_platform = 'other' then v_label else null end, v_url, 'current', now());
  end if;
end $$;

revoke all on function public.set_current_platform from anon, authenticated, public;
grant execute on function public.set_current_platform to authenticated;
