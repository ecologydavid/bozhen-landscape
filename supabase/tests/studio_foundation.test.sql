begin;

create extension if not exists pgtap with schema extensions;
select plan(84);

select ok(exists (select 1 from pg_extension where extname = 'pgcrypto' and extnamespace = 'extensions'::regnamespace), 'pgcrypto is enabled in the extensions schema');
select results_eq($$ select unnest(enum_range(null::public.studio_audience))::text $$, array['builder', 'corporate', 'luxury_home'], 'studio_audience values match the Studio contract');
select results_eq($$ select unnest(enum_range(null::public.studio_project_status))::text $$, array['draft', 'ready', 'archived'], 'studio_project_status values match the Studio contract');
select results_eq($$ select unnest(enum_range(null::public.studio_asset_permission))::text $$, array['unconfirmed', 'publishable', 'needs_redaction', 'forbidden'], 'studio_asset_permission values match the Studio contract');
select results_eq($$ select unnest(enum_range(null::public.studio_asset_processing))::text $$, array['uploaded', 'processing', 'ready', 'quarantined', 'failed'], 'studio_asset_processing values match the Studio contract');

select has_table('public', 'studio_admins', 'Studio admin membership table exists');
select has_table('public', 'studio_projects', 'Studio projects table exists');
select has_table('public', 'studio_project_fact_versions', 'Studio fact versions table exists');
select has_table('public', 'studio_assets', 'Studio assets table exists');
select results_eq(
  $$ select column_name::text collate "default" from information_schema.columns where table_schema = 'public' and table_name = 'studio_admins' order by ordinal_position $$,
  array['user_id', 'created_at'],
  'studio_admins columns match the contract'
);
select results_eq(
  $$ select column_name::text collate "default" from information_schema.columns where table_schema = 'public' and table_name = 'studio_projects' order by ordinal_position $$,
  array['id', 'internal_name', 'public_name', 'region', 'audience', 'site_type', 'status', 'created_at', 'updated_at'],
  'studio_projects columns match the contract'
);
select results_eq(
  $$ select column_name::text collate "default" from information_schema.columns where table_schema = 'public' and table_name = 'studio_project_fact_versions' order by ordinal_position $$,
  array['id', 'project_id', 'version', 'facts', 'is_current', 'created_by', 'created_at'],
  'studio_project_fact_versions columns match the contract'
);
select results_eq(
  $$ select column_name::text collate "default" from information_schema.columns where table_schema = 'public' and table_name = 'studio_assets' order by ordinal_position $$,
  array['id', 'project_id', 'storage_path', 'original_name', 'mime_type', 'size_bytes', 'width', 'height', 'permission_status', 'privacy_flags', 'processing_status', 'created_at', 'updated_at'],
  'studio_assets columns match the client contract and omit created_by'
);
select col_is_pk('public', 'studio_admins', 'user_id', 'studio_admins user_id is its primary key');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.studio_project_fact_versions'::regclass
    and contype = 'f'
    and confrelid = 'public.studio_projects'::regclass
    and confdeltype = 'c'
), 'fact versions cascade when their project is deleted');
select col_not_null('public', 'studio_project_fact_versions', 'facts', 'fact versions require facts');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.studio_assets'::regclass and contype = 'u'
    and conkey = array[(select attnum from pg_attribute where attrelid = 'public.studio_assets'::regclass and attname = 'storage_path')]
), 'asset storage paths are unique');
select has_index('public', 'studio_assets', 'studio_assets_project_created_id_idx', 'asset pagination index exists');
select has_index('public', 'studio_project_fact_versions', 'studio_fact_one_current', 'one-current-fact index exists');
select ok(position('WHERE is_current' in pg_get_indexdef('public.studio_fact_one_current'::regclass)) > 0, 'one-current-fact index is partial');

select is((select relrowsecurity from pg_class where oid = 'public.studio_admins'::regclass), true, 'admin membership RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.studio_projects'::regclass), true, 'project RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.studio_project_fact_versions'::regclass), true, 'fact RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.studio_assets'::regclass), true, 'asset RLS is enabled');
select ok((
  select prosecdef and proconfig @> array['search_path=pg_catalog, public, pg_temp']
  from pg_proc where oid = 'public.is_studio_admin()'::regprocedure
), 'is_studio_admin is security definer with a locked search path');
select ok((
  select proconfig @> array['search_path=pg_catalog']
  from pg_proc where oid = 'public.is_supported_studio_image(text)'::regprocedure
), 'is_supported_studio_image has a locked search path');
select ok(
  has_function_privilege('anon', 'public.is_studio_admin()'::regprocedure, 'execute')
  and has_function_privilege('authenticated', 'public.is_studio_admin()'::regprocedure, 'execute')
  and not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) privilege
    where p.oid = 'public.is_studio_admin()'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'is_studio_admin is executable only through explicit API-role grants'
);
select ok(
  has_function_privilege('anon', 'public.is_supported_studio_image(text)'::regprocedure, 'execute')
  and has_function_privilege('authenticated', 'public.is_supported_studio_image(text)'::regprocedure, 'execute'),
  'image MIME predicate is executable by API roles'
);
select ok((
  select proconfig @> array['search_path=pg_catalog, pg_temp']
  from pg_proc where oid = 'public.touch_updated_at()'::regprocedure
), 'updated-at trigger function has a locked search path');
select results_eq(
  $$ select tgrelid::regclass::text from pg_trigger where tgname in ('studio_projects_touch', 'studio_assets_touch') and not tgisinternal order by tgname $$,
  array['studio_assets', 'studio_projects'],
  'updated-at triggers are attached to projects and assets'
);
select ok((
  select bool_and(has_table_privilege(role_name, relation_name, 'select') and has_table_privilege(role_name, relation_name, 'insert') and has_table_privilege(role_name, relation_name, 'update') and has_table_privilege(role_name, relation_name, 'delete'))
  from unnest(array['anon', 'authenticated']) as role_name
  cross join unnest(array['public.studio_admins', 'public.studio_projects', 'public.studio_project_fact_versions', 'public.studio_assets']) as relation_name
), 'API table privileges let RLS, not grants, decide Studio access');
select results_eq(
  $$ select policyname::text collate "default" from pg_policies where schemaname = 'public' and tablename in ('studio_admins', 'studio_projects', 'studio_project_fact_versions', 'studio_assets') order by policyname $$,
  array['admin manages assets', 'admin manages facts', 'admin manages projects', 'admin reads own membership'],
  'public Studio policies are limited to the single-admin boundary'
);
select results_eq(
  $$ select policyname::text collate "default" from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'studio admin %' order by policyname $$,
  array['studio admin deletes objects', 'studio admin inserts objects', 'studio admin reads objects', 'studio admin updates objects'],
  'private Studio bucket has all four admin-only Storage policies'
);
select is((select public from storage.buckets where id = 'studio-assets'), false, 'studio-assets bucket is private');
select is((select file_size_limit from storage.buckets where id = 'studio-assets'), 26214400::bigint, 'studio-assets bucket has a 25 MiB limit');
select results_eq(
  $$ select unnest(allowed_mime_types) from storage.buckets where id = 'studio-assets' order by 1 $$,
  array['image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp'],
  'studio-assets bucket limits uploads to supported image MIME types'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'studio-admin@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'studio-member@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'other-admin@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.studio_admins (user_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), ('cccccccc-cccc-cccc-cccc-cccccccccccc');

insert into public.studio_projects (id, internal_name, public_name, region, audience, site_type)
values ('22222222-2222-2222-2222-222222222222', 'Seed project', 'Seed project', 'Taipei', 'builder', 'Garden');

insert into public.studio_project_fact_versions (project_id, version, facts, created_by)
values ('22222222-2222-2222-2222-222222222222', 1, '{"site":"seed"}'::jsonb, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes)
values ('22222222-2222-2222-2222-222222222222', 'raw/seed.jpg', 'seed.jpg', 'image/jpeg', 1);

insert into storage.objects (bucket_id, name, owner_id)
values ('studio-assets', 'acceptance/seed.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select throws_ok(
  $$ insert into public.studio_projects (internal_name, public_name, region, audience, site_type) values ('x', 'Public name', 'Taipei', 'builder', 'Garden') $$,
  '23514', null::text, 'project names shorter than two characters are rejected'
);
select throws_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts, created_by) values ('22222222-2222-2222-2222-222222222222', 99, '[]'::jsonb, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '23514', null::text, 'fact versions require a JSON object'
);
select throws_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts, is_current, created_by) values ('22222222-2222-2222-2222-222222222222', 2, '{}'::jsonb, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '23505', null::text, 'only one current fact version is allowed per project'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes) values ('22222222-2222-2222-2222-222222222222', 'raw/invalid.mp4', 'invalid.mp4', 'video/mp4', 1) $$,
  '23514', null::text, 'unsupported asset MIME types are rejected'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes) values ('22222222-2222-2222-2222-222222222222', 'raw/too-large.jpg', 'too-large.jpg', 'image/jpeg', 26214401) $$,
  '23514', null::text, 'assets larger than 25 MiB are rejected'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes, width) values ('22222222-2222-2222-2222-222222222222', 'raw/no-width.jpg', 'no-width.jpg', 'image/jpeg', 1, 0) $$,
  '23514', null::text, 'non-positive asset dimensions are rejected'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes, privacy_flags) values ('22222222-2222-2222-2222-222222222222', 'raw/invalid-flags.jpg', 'invalid-flags.jpg', 'image/jpeg', 1, '{}'::jsonb) $$,
  '23514', null::text, 'asset privacy flags must be a JSON array'
);
select is(public.is_supported_studio_image('image/jpeg'), true, 'JPEG is a supported Studio image');
select is(public.is_supported_studio_image('image/heic'), true, 'HEIC is a supported Studio image');
select is(public.is_supported_studio_image('video/mp4'), false, 'video is not a supported Studio image');
select is(public.is_supported_studio_image(null), false, 'null is not a supported Studio image');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is(public.is_studio_admin(), false, 'anon is not a Studio admin');
select results_eq($$ select count(*) from public.studio_admins $$, array[0::bigint], 'anon cannot read Studio admin memberships');
select results_eq(
  $$ select count(*) from public.studio_projects union all select count(*) from public.studio_project_fact_versions union all select count(*) from public.studio_assets $$,
  array[0::bigint, 0::bigint, 0::bigint],
  'anon cannot read protected Studio data'
);
select throws_ok(
  $$ insert into public.studio_projects (internal_name, public_name, region, audience, site_type) values ('Anon project', 'Anon project', 'Taipei', 'builder', 'Garden') $$,
  '42501', null::text, 'anon cannot create Studio projects'
);
select throws_ok(
  $$ insert into public.studio_admins (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501', null::text, 'anon cannot change Studio memberships'
);
select results_eq(
  $$ with project_update as (update public.studio_projects set public_name = 'Denied' where id = '22222222-2222-2222-2222-222222222222' returning 1), fact_update as (update public.studio_project_fact_versions set facts = '{}'::jsonb where project_id = '22222222-2222-2222-2222-222222222222' returning 1), asset_update as (update public.studio_assets set original_name = 'denied.jpg' where storage_path = 'raw/seed.jpg' returning 1), project_delete as (delete from public.studio_projects where id = '22222222-2222-2222-2222-222222222222' returning 1) select * from project_update union all select * from fact_update union all select * from asset_update union all select * from project_delete $$,
  array[]::integer[],
  'anon cannot update or delete protected Studio data'
);
select results_eq($$ select count(*) from storage.objects where bucket_id = 'studio-assets' $$, array[0::bigint], 'anon cannot read Studio storage objects');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('studio-assets', 'acceptance/anon.jpg') $$,
  '42501', null::text, 'anon cannot create Studio storage objects'
);
select set_config('storage.allow_delete_query', 'true', true);
select results_eq(
  $$ with object_update as (update storage.objects set metadata = '{}'::jsonb where bucket_id = 'studio-assets' and name = 'acceptance/seed.jpg' returning 1), object_delete as (delete from storage.objects where bucket_id = 'studio-assets' and name = 'acceptance/seed.jpg' returning 1) select * from object_update union all select * from object_delete $$,
  array[]::integer[],
  'anon cannot update or delete Studio storage objects'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is(public.is_studio_admin(), false, 'non-admin authenticated user is not a Studio admin');
select results_eq($$ select count(*) from public.studio_admins $$, array[0::bigint], 'non-admin cannot read another user membership');
select results_eq(
  $$ select count(*) from public.studio_projects union all select count(*) from public.studio_project_fact_versions union all select count(*) from public.studio_assets $$,
  array[0::bigint, 0::bigint, 0::bigint],
  'non-admin cannot read protected Studio data'
);
select throws_ok(
  $$ insert into public.studio_projects (internal_name, public_name, region, audience, site_type) values ('Member project', 'Member project', 'Taipei', 'builder', 'Garden') $$,
  '42501', null::text, 'non-admin cannot create Studio projects'
);
select throws_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts) values ('22222222-2222-2222-2222-222222222222', 2, '{}'::jsonb) $$,
  '42501', null::text, 'non-admin cannot create Studio facts'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes) values ('22222222-2222-2222-2222-222222222222', 'raw/member.jpg', 'member.jpg', 'image/jpeg', 1) $$,
  '42501', null::text, 'non-admin cannot create Studio assets'
);
select results_eq(
  $$ with project_update as (update public.studio_projects set public_name = 'Denied' where id = '22222222-2222-2222-2222-222222222222' returning 1), fact_update as (update public.studio_project_fact_versions set facts = '{}'::jsonb where project_id = '22222222-2222-2222-2222-222222222222' returning 1), asset_update as (update public.studio_assets set original_name = 'denied.jpg' where storage_path = 'raw/seed.jpg' returning 1), project_delete as (delete from public.studio_projects where id = '22222222-2222-2222-2222-222222222222' returning 1) select * from project_update union all select * from fact_update union all select * from asset_update union all select * from project_delete $$,
  array[]::integer[],
  'non-admin cannot update or delete protected Studio data'
);
select results_eq($$ select count(*) from storage.objects where bucket_id = 'studio-assets' $$, array[0::bigint], 'non-admin cannot read Studio storage objects');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('studio-assets', 'acceptance/member.jpg') $$,
  '42501', null::text, 'non-admin cannot create Studio storage objects'
);
select results_eq(
  $$ with object_update as (update storage.objects set metadata = '{}'::jsonb where bucket_id = 'studio-assets' and name = 'acceptance/seed.jpg' returning 1), object_delete as (delete from storage.objects where bucket_id = 'studio-assets' and name = 'acceptance/seed.jpg' returning 1) select * from object_update union all select * from object_delete $$,
  array[]::integer[],
  'non-admin cannot update or delete Studio storage objects'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is(public.is_studio_admin(), true, 'registered authenticated user is a Studio admin');
select results_eq($$ select user_id from public.studio_admins order by user_id $$, array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid], 'admin can read only its own membership row');
select throws_ok(
  $$ insert into public.studio_admins (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501', null::text, 'admins cannot change Studio membership through the API'
);
select lives_ok(
  $$ insert into public.studio_projects (id, internal_name, public_name, region, audience, site_type) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Admin project', 'Admin project', 'Taichung', 'corporate', 'Courtyard') $$,
  'admin can create Studio projects'
);
select lives_ok(
  $$ update public.studio_projects set public_name = 'Updated project' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'admin can update Studio projects'
);
select results_eq(
  $$ select count(*) from public.studio_projects union all select count(*) from public.studio_project_fact_versions union all select count(*) from public.studio_assets $$,
  array[2::bigint, 1::bigint, 1::bigint],
  'admin can read Studio projects, facts, and assets'
);
select lives_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 1, '{"site":"admin"}'::jsonb) $$,
  'admin can create Studio facts'
);
select is((select created_by from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 1), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'admin fact creation records auth.uid by default');
select lives_ok(
  $$ update public.studio_project_fact_versions set facts = '{"site":"updated"}'::jsonb where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 1 $$,
  'admin can update Studio facts'
);
select lives_ok(
  $$ insert into public.studio_assets (id, project_id, storage_path, original_name, mime_type, size_bytes) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'raw/admin.jpg', 'admin.jpg', 'image/jpeg', 1) $$,
  'admin can create Studio assets'
);
select lives_ok(
  $$ update public.studio_assets set permission_status = 'publishable' where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' $$,
  'admin can update Studio assets'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('studio-assets', 'acceptance/admin.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'admin can create Studio storage objects'
);
select results_eq($$ select count(*) from storage.objects where bucket_id = 'studio-assets' and name = 'acceptance/admin.jpg' $$, array[1::bigint], 'admin can read Studio storage objects');
select lives_ok(
  $$ update storage.objects set metadata = '{"cacheControl":"3600"}'::jsonb where bucket_id = 'studio-assets' and name = 'acceptance/admin.jpg' $$,
  'admin can update Studio storage objects'
);
select set_config('storage.allow_delete_query', 'true', true);
select lives_ok(
  $$ delete from storage.objects where bucket_id = 'studio-assets' and name = 'acceptance/admin.jpg' $$,
  'admin can delete Studio storage objects'
);
select lives_ok(
  $$ delete from public.studio_assets where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' $$,
  'admin can delete Studio assets'
);
select lives_ok(
  $$ delete from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 1 $$,
  'admin can delete Studio facts'
);
select lives_ok(
  $$ delete from public.studio_projects where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'admin can delete Studio projects'
);

select * from finish();
rollback;
