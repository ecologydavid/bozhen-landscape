create extension if not exists pgcrypto with schema extensions;

create type public.studio_audience as enum (
  'builder',
  'corporate',
  'luxury_home'
);

create type public.studio_project_status as enum (
  'draft',
  'ready',
  'archived'
);

create type public.studio_asset_permission as enum (
  'unconfirmed',
  'publishable',
  'needs_redaction',
  'forbidden'
);

create type public.studio_asset_processing as enum (
  'uploaded',
  'processing',
  'ready',
  'quarantined',
  'failed'
);

create table public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index studio_admins_singleton
  on public.studio_admins ((true));

create or replace function public.is_studio_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.studio_admins as studio_admin
    where studio_admin.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_supported_studio_image(content_type text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    content_type = any (array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]::text[]),
    false
  );
$$;

create table public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null check (char_length(internal_name) between 2 and 120),
  public_name text not null check (char_length(public_name) between 2 and 120),
  region text not null check (char_length(region) between 2 and 80),
  audience public.studio_audience not null,
  site_type text not null check (char_length(site_type) between 2 and 80),
  status public.studio_project_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_project_fact_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  version integer not null check (version > 0),
  facts jsonb not null check (jsonb_typeof(facts) = 'object'),
  is_current boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create unique index studio_fact_one_current
  on public.studio_project_fact_versions (project_id)
  where is_current;

create index studio_fact_versions_created_by_idx
  on public.studio_project_fact_versions (created_by);

create table public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (public.is_supported_studio_image(mime_type)),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  permission_status public.studio_asset_permission not null default 'unconfirmed',
  privacy_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(privacy_flags) = 'array'),
  processing_status public.studio_asset_processing not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_assets_project_created_id_idx
  on public.studio_assets (project_id, created_at desc, id desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger studio_projects_touch
before update on public.studio_projects
for each row execute function public.touch_updated_at();

create trigger studio_assets_touch
before update on public.studio_assets
for each row execute function public.touch_updated_at();

alter table public.studio_admins enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_project_fact_versions enable row level security;
alter table public.studio_assets enable row level security;

create policy "admin reads own membership"
on public.studio_admins
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "admin manages projects"
on public.studio_projects
for all
to authenticated
using ((select public.is_studio_admin()))
with check ((select public.is_studio_admin()));

create policy "admin reads facts"
on public.studio_project_fact_versions
for select
to authenticated
using ((select public.is_studio_admin()));

create policy "admin appends facts"
on public.studio_project_fact_versions
for insert
to authenticated
with check (
  (select public.is_studio_admin())
  and created_by = (select auth.uid())
);

create policy "admin marks current facts"
on public.studio_project_fact_versions
for update
to authenticated
using ((select public.is_studio_admin()))
with check ((select public.is_studio_admin()));

create policy "admin manages assets"
on public.studio_assets
for all
to authenticated
using ((select public.is_studio_admin()))
with check ((select public.is_studio_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-assets',
  'studio-assets',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "studio admin reads objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'studio-assets' and (select public.is_studio_admin()));

create policy "studio admin inserts objects"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'studio-assets' and (select public.is_studio_admin()));

create policy "studio admin updates objects"
on storage.objects
for update
to authenticated
using (bucket_id = 'studio-assets' and (select public.is_studio_admin()))
with check (bucket_id = 'studio-assets' and (select public.is_studio_admin()));

create policy "studio admin deletes objects"
on storage.objects
for delete
to authenticated
using (bucket_id = 'studio-assets' and (select public.is_studio_admin()));

grant usage on schema public to anon, authenticated;
grant usage on type public.studio_audience, public.studio_project_status,
  public.studio_asset_permission, public.studio_asset_processing to anon, authenticated;
grant select, insert, update, delete on table public.studio_admins,
  public.studio_projects, public.studio_assets to anon, authenticated;
revoke all on table public.studio_project_fact_versions from anon, authenticated;
grant select, insert on table public.studio_project_fact_versions to anon, authenticated;
grant update (is_current) on table public.studio_project_fact_versions to authenticated;

revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_admin() to anon, authenticated;
revoke all on function public.is_supported_studio_image(text) from public;
grant execute on function public.is_supported_studio_image(text) to anon, authenticated;
revoke all on function public.touch_updated_at() from public;
