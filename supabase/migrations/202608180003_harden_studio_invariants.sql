create or replace function public.studio_canonical_asset_storage_path(
  target_project_id uuid,
  target_asset_id uuid,
  target_mime_type text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select 'raw/' || target_project_id::text || '/' || target_asset_id::text || '.' || case target_mime_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    when 'image/heic' then 'heic'
    when 'image/heif' then 'heif'
    else 'invalid'
  end;
$$;

alter function public.studio_canonical_asset_storage_path(uuid, uuid, text) owner to postgres;
revoke all on function public.studio_canonical_asset_storage_path(uuid, uuid, text) from public, anon, service_role;
grant execute on function public.studio_canonical_asset_storage_path(uuid, uuid, text) to authenticated;

alter table public.studio_assets
  add constraint studio_assets_storage_path_canonical
  check (
    storage_path = public.studio_canonical_asset_storage_path(project_id, id, mime_type)
  );

drop policy if exists "admin appends facts" on public.studio_project_fact_versions;
drop policy if exists "admin marks current facts" on public.studio_project_fact_versions;

revoke all on table public.studio_project_fact_versions from anon, authenticated;
grant select on table public.studio_project_fact_versions to anon, authenticated;

create or replace function public.studio_save_fact_version(target_project_id uuid, next_facts jsonb)
returns public.studio_project_fact_versions
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  saved public.studio_project_fact_versions;
  next_version integer;
  caller_id uuid := auth.uid();
begin
  if caller_id is null or not public.is_studio_admin() then
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

  insert into public.studio_project_fact_versions (
    project_id,
    version,
    facts,
    is_current,
    created_by
  )
  values (target_project_id, next_version, next_facts, true, caller_id)
  returning * into saved;

  return saved;
end;
$$;

alter function public.studio_save_fact_version(uuid, jsonb) owner to postgres;
revoke all on function public.studio_save_fact_version(uuid, jsonb) from public, anon, service_role;
grant execute on function public.studio_save_fact_version(uuid, jsonb) to authenticated;

drop policy if exists "admin manages projects" on public.studio_projects;
create policy "admin reads projects"
on public.studio_projects
for select
to authenticated
using ((select public.is_studio_admin()));
create policy "admin creates projects"
on public.studio_projects
for insert
to authenticated
with check ((select public.is_studio_admin()));
create policy "admin updates projects"
on public.studio_projects
for update
to authenticated
using ((select public.is_studio_admin()))
with check ((select public.is_studio_admin()));

drop policy if exists "admin manages assets" on public.studio_assets;
create policy "admin reads assets"
on public.studio_assets
for select
to authenticated
using ((select public.is_studio_admin()));
create policy "admin creates assets"
on public.studio_assets
for insert
to authenticated
with check ((select public.is_studio_admin()));
create policy "admin updates assets"
on public.studio_assets
for update
to authenticated
using ((select public.is_studio_admin()))
with check ((select public.is_studio_admin()));

revoke delete on table public.studio_projects, public.studio_assets from anon, authenticated;
