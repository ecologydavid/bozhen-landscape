create or replace function public.studio_save_fact_version(target_project_id uuid, next_facts jsonb)
returns public.studio_project_fact_versions
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  saved public.studio_project_fact_versions;
  next_version integer;
begin
  if not public.is_studio_admin() then
    raise exception using
      errcode = '42501',
      message = 'Studio administrator access is required.';
  end if;

  if next_facts is null or pg_catalog.jsonb_typeof(next_facts) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Studio facts must be a JSON object.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_project_id::text, 0)
  );

  select fact_version.*
  into saved
  from public.studio_project_fact_versions as fact_version
  where fact_version.project_id = target_project_id
    and fact_version.is_current;

  if found and saved.facts = next_facts then
    return saved;
  end if;

  select coalesce(max(fact_version.version), 0) + 1
  into next_version
  from public.studio_project_fact_versions as fact_version
  where fact_version.project_id = target_project_id;

  update public.studio_project_fact_versions
  set is_current = false
  where project_id = target_project_id
    and is_current;

  insert into public.studio_project_fact_versions (project_id, version, facts, is_current)
  values (target_project_id, next_version, next_facts, true)
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.studio_save_fact_version(uuid, jsonb) from public;
revoke all on function public.studio_save_fact_version(uuid, jsonb) from anon;
grant execute on function public.studio_save_fact_version(uuid, jsonb) to authenticated;
