begin;

create extension if not exists pgtap with schema extensions;
select plan(123);

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
select has_index('public', 'studio_admins', 'studio_admins_singleton', 'Studio admin membership has a singleton index');
select has_index('public', 'studio_project_fact_versions', 'studio_fact_versions_created_by_idx', 'fact provenance index exists');

select ok(
  to_regprocedure('public.studio_save_fact_version(uuid,jsonb)') is not null,
  'fact-version save RPC exists with the public two-argument signature'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and procedure.prorettype = 'public.studio_project_fact_versions'::regtype
  ),
  'fact-version save RPC returns a fact-version row'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and not procedure.prosecdef
      and procedure.proconfig @> array['search_path=pg_catalog, public, pg_temp']
  ),
  'fact-version save RPC is security invoker with a locked search path'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and has_function_privilege('authenticated', procedure.oid, 'execute')
      and not has_function_privilege('anon', procedure.oid, 'execute')
      and not has_function_privilege('service_role', procedure.oid, 'execute')
      and not exists (
        select 1
        from aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )
  ),
  'fact-version save RPC is executable only by authenticated users'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    cross join lateral (
      select regexp_replace(lower(pg_get_functiondef(procedure.oid)), '[[:space:]]+', ' ', 'g') as definition
    ) as function_definition
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and function_definition.definition like '%pg_advisory_xact_lock%'
      and function_definition.definition like '%hashtextextended(target_project_id::text, 0)%'
  ),
  'fact-version save RPC takes a transaction advisory lock derived from the project id'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    cross join lateral (
      select regexp_replace(lower(pg_get_functiondef(procedure.oid)), '[[:space:]]+', ' ', 'g') as definition
    ) as function_definition
    cross join lateral (
      select
        position('pg_advisory_xact_lock' in function_definition.definition) as lock_position,
        position('from public.studio_project_fact_versions' in function_definition.definition) as first_fact_state_read_position,
        position('and fact_version.is_current' in function_definition.definition) as current_lookup_position,
        position('max(fact_version.version)' in function_definition.definition) as max_version_position
    ) as positions
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and positions.lock_position > 0
      and positions.first_fact_state_read_position > positions.lock_position
      and positions.current_lookup_position > positions.lock_position
      and positions.max_version_position > positions.lock_position
  ),
  'fact-version save RPC locks before every fact-table access, including current lookup and max-version calculation'
);
select ok(
  exists (
    select 1
    from pg_proc as procedure
    cross join lateral (
      select regexp_replace(lower(pg_get_functiondef(procedure.oid)), '[[:space:]]+', ' ', 'g') as definition
    ) as function_definition
    where procedure.oid = to_regprocedure('public.studio_save_fact_version(uuid,jsonb)')
      and function_definition.definition like '%update public.studio_project_fact_versions set is_current = false%'
      and function_definition.definition like '%insert into public.studio_project_fact_versions (project_id, version, facts, is_current)%'
      and function_definition.definition not like '%set id =%'
      and function_definition.definition not like '%set project_id =%'
      and function_definition.definition not like '%set version =%'
      and function_definition.definition not like '%set facts =%'
      and function_definition.definition not like '%set created_by =%'
      and function_definition.definition not like '%set created_at =%'
      and function_definition.definition not like '%insert into public.studio_project_fact_versions (project_id, version, facts, is_current, created_by)%'
  ),
  'fact-version save RPC uses only the current marker update and default provenance insert'
);

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
  cross join unnest(array['public.studio_admins', 'public.studio_projects', 'public.studio_assets']) as relation_name
) and has_table_privilege('anon', 'public.studio_project_fact_versions', 'select')
  and has_table_privilege('anon', 'public.studio_project_fact_versions', 'insert')
  and not has_table_privilege('anon', 'public.studio_project_fact_versions', 'update')
  and not has_table_privilege('anon', 'public.studio_project_fact_versions', 'delete')
  and has_table_privilege('authenticated', 'public.studio_project_fact_versions', 'select')
  and has_table_privilege('authenticated', 'public.studio_project_fact_versions', 'insert')
  and not has_table_privilege('authenticated', 'public.studio_project_fact_versions', 'delete'), 'API table privileges keep facts append-only while RLS protects access');
select ok(
  has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'is_current', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'id', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'project_id', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'version', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'facts', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'created_by', 'update')
  and not has_column_privilege('authenticated', 'public.studio_project_fact_versions', 'created_at', 'update'),
  'authenticated can update only the fact current marker'
);
select results_eq(
  $$ select policyname::text collate "default" from pg_policies where schemaname = 'public' and tablename in ('studio_admins', 'studio_projects', 'studio_project_fact_versions', 'studio_assets') order by policyname $$,
  array['admin appends facts', 'admin manages assets', 'admin manages projects', 'admin marks current facts', 'admin reads facts', 'admin reads own membership'],
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

-- The external sessions below are intentionally committed so pg_net can dispatch both
-- HTTP requests. All durable fixtures and pg_net responses are removed before the
-- ordinary transactional pgTAP fixture setup begins.
create temporary table studio_rpc_concurrency_state (
  jwt text not null,
  request_a bigint,
  request_b bigint,
  waiting_sessions integer
) on commit preserve rows;

delete from public.studio_projects where id = 'f2222222-2222-2222-2222-222222222222';
delete from public.studio_admins where user_id = 'f1111111-1111-1111-1111-111111111111';
delete from auth.users where id = 'f1111111-1111-1111-1111-111111111111';

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('f1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'studio-rpc-concurrency@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.studio_admins (user_id)
values ('f1111111-1111-1111-1111-111111111111');

insert into public.studio_projects (id, internal_name, public_name, region, audience, site_type)
values ('f2222222-2222-2222-2222-222222222222', 'RPC concurrency', 'RPC concurrency', 'Taipei', 'builder', 'Garden');

with token_parts as (
  select
    replace(replace(trim(trailing '=' from translate(encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'), 'base64'), '+/', '-_')), chr(10), ''), chr(13), '') as header_part,
    replace(replace(trim(trailing '=' from translate(encode(convert_to(jsonb_build_object('role', 'authenticated', 'sub', 'f1111111-1111-1111-1111-111111111111', 'aud', 'authenticated', 'exp', extract(epoch from clock_timestamp() + interval '5 minutes')::bigint)::text, 'utf8'), 'base64'), '+/', '-_')), chr(10), ''), chr(13), '') as payload_part
), token as (
  select header_part || '.' || payload_part || '.' || replace(replace(trim(trailing '=' from translate(encode(extensions.hmac(header_part || '.' || payload_part, current_setting('app.settings.jwt_secret'), 'sha256'), 'base64'), '+/', '-_')), chr(10), ''), chr(13), '') as value
  from token_parts
)
insert into studio_rpc_concurrency_state (jwt)
select value from token;

commit;

select ok(
  (select jwt !~ '[[:space:]]' and array_length(string_to_array(jwt, '.'), 1) = 3 from studio_rpc_concurrency_state),
  'concurrency test uses a nonempty, whitespace-free local authenticated JWT'
);

select pg_catalog.pg_advisory_lock(pg_catalog.hashtextextended('f2222222-2222-2222-2222-222222222222'::text, 0));

begin;

update studio_rpc_concurrency_state
set request_a = net.http_post(
  url := 'http://rest:3000/rpc/studio_save_fact_version',
  body := jsonb_build_object(
    'target_project_id', 'f2222222-2222-2222-2222-222222222222',
    'next_facts', '{"site":"concurrency","retry":"same-content"}'::jsonb
  ),
  headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || jwt),
  timeout_milliseconds := 10000
);

update studio_rpc_concurrency_state
set request_b = net.http_post(
  url := 'http://rest:3000/rpc/studio_save_fact_version',
  body := jsonb_build_object(
    'target_project_id', 'f2222222-2222-2222-2222-222222222222',
    'next_facts', '{"site":"concurrency","retry":"same-content"}'::jsonb
  ),
  headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || jwt),
  timeout_milliseconds := 10000
);

commit;

do $$
declare
  attempts integer := 0;
  waiters integer := 0;
begin
  loop
    perform pg_catalog.pg_stat_clear_snapshot();

    select count(*)
    into waiters
    from pg_stat_activity as activity
    where activity.datname = current_database()
      and activity.wait_event_type = 'Lock'
      and activity.wait_event = 'advisory'
      and activity.query like '%studio_save_fact_version%';

    exit when waiters >= 2 or attempts >= 50;
    perform pg_sleep(0.1);
    attempts := attempts + 1;
  end loop;

  update studio_rpc_concurrency_state set waiting_sessions = waiters;
end;
$$;

select is(
  (select waiting_sessions from studio_rpc_concurrency_state),
  2,
  'two independent authenticated API sessions wait on the project advisory lock before it is released'
);

select pg_catalog.pg_advisory_unlock(pg_catalog.hashtextextended('f2222222-2222-2222-2222-222222222222'::text, 0));

do $$
declare
  attempts integer := 0;
  completed integer := 0;
begin
  loop
    select count(*)
    into completed
    from net._http_response as response
    cross join studio_rpc_concurrency_state as state
    where response.id in (state.request_a, state.request_b);

    exit when completed = 2 or attempts >= 100;
    perform pg_sleep(0.1);
    attempts := attempts + 1;
  end loop;
end;
$$;

select is(
  (
    select count(*)
    from net._http_response as response
    cross join studio_rpc_concurrency_state as state
    where response.id in (state.request_a, state.request_b)
      and response.status_code = 200
  ),
  2::bigint,
  'both concurrent same-content RPC calls complete successfully'
);
select is(
  (
    select count(distinct response.content::jsonb ->> 'id')
    from net._http_response as response
    cross join studio_rpc_concurrency_state as state
    where response.id in (state.request_a, state.request_b)
  ),
  1::bigint,
  'concurrent same-content RPC calls return the same fact-version row'
);
select results_eq(
  $$
    select version, is_current
    from public.studio_project_fact_versions
    where project_id = 'f2222222-2222-2222-2222-222222222222'
    order by version
  $$,
  $$ values (1, true) $$,
  'concurrent same-content RPC calls leave exactly one current first version'
);

delete from net._http_response
where id in (select request_a from studio_rpc_concurrency_state union all select request_b from studio_rpc_concurrency_state);
delete from public.studio_projects where id = 'f2222222-2222-2222-2222-222222222222';
delete from public.studio_admins where user_id = 'f1111111-1111-1111-1111-111111111111';
delete from auth.users where id = 'f1111111-1111-1111-1111-111111111111';

begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'studio-admin@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'studio-member@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'other-user@example.test', 'not-a-password', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.studio_admins (user_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select throws_ok(
  $$ insert into public.studio_admins (user_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  '23505', null::text, 'service provisioning cannot register a second Studio admin'
);

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
select throws_ok(
  $$ select public.studio_save_fact_version('22222222-2222-2222-2222-222222222222', '{"site":"anon-rpc"}'::jsonb) $$,
  '42501', null::text, 'anon cannot execute the fact-version save RPC'
);
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
  $$ insert into public.studio_project_fact_versions (project_id, version, facts, is_current, created_by) values ('22222222-2222-2222-2222-222222222222', 2, '{"site":"anon"}'::jsonb, false, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501', null::text, 'anon cannot create Studio facts'
);
select throws_ok(
  $$ insert into public.studio_assets (project_id, storage_path, original_name, mime_type, size_bytes) values ('22222222-2222-2222-2222-222222222222', 'raw/anon-rls.jpg', 'anon-rls.jpg', 'image/jpeg', 1) $$,
  '42501', null::text, 'anon cannot create Studio assets'
);
select throws_ok(
  $$ insert into public.studio_admins (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501', null::text, 'anon cannot change Studio memberships'
);
select results_eq(
  $$ with project_update as (update public.studio_projects set public_name = 'Denied' where id = '22222222-2222-2222-2222-222222222222' returning 1), asset_update as (update public.studio_assets set original_name = 'denied.jpg' where storage_path = 'raw/seed.jpg' returning 1), project_delete as (delete from public.studio_projects where id = '22222222-2222-2222-2222-222222222222' returning 1) select * from project_update union all select * from asset_update union all select * from project_delete $$,
  array[]::integer[],
  'anon cannot update or delete protected project and asset data'
);
-- Fact updates are rejected by table/column privileges before RLS for anon.
select throws_ok(
  $$ update public.studio_project_fact_versions set facts = '{}'::jsonb where project_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null::text, 'anon has no fact update privilege'
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
select throws_ok(
  $$ select public.studio_save_fact_version('22222222-2222-2222-2222-222222222222', '{"site":"member-rpc"}'::jsonb) $$,
  '42501', 'Studio administrator access is required.', 'non-admin receives a safe fact-version save RPC rejection'
);
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
  $$ with project_update as (update public.studio_projects set public_name = 'Denied' where id = '22222222-2222-2222-2222-222222222222' returning 1), asset_update as (update public.studio_assets set original_name = 'denied.jpg' where storage_path = 'raw/seed.jpg' returning 1), project_delete as (delete from public.studio_projects where id = '22222222-2222-2222-2222-222222222222' returning 1) select * from project_update union all select * from asset_update union all select * from project_delete $$,
  array[]::integer[],
  'non-admin cannot update or delete protected project and asset data'
);
-- Fact updates are rejected by column privileges before RLS for non-admins.
select throws_ok(
  $$ update public.studio_project_fact_versions set facts = '{}'::jsonb where project_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null::text, 'non-admin has no fact content update privilege'
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
select throws_ok(
  $$ select public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', null::jsonb) $$,
  '22023', 'Studio facts must be a JSON object.', 'fact-version save RPC rejects SQL NULL facts'
);
select throws_ok(
  $$ select public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', 'null'::jsonb) $$,
  '22023', 'Studio facts must be a JSON object.', 'fact-version save RPC rejects JSON null facts'
);
select throws_ok(
  $$ select public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '[]'::jsonb) $$,
  '22023', 'Studio facts must be a JSON object.', 'fact-version save RPC rejects JSON arrays'
);
select throws_ok(
  $$ select public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '"scalar"'::jsonb) $$,
  '22023', 'Studio facts must be a JSON object.', 'fact-version save RPC rejects JSON scalars'
);

create temporary table studio_rpc_save_results (
  attempt text primary key,
  id uuid not null,
  version integer not null
);

select lives_ok(
  $$
    insert into studio_rpc_save_results (attempt, id, version)
    select 'first', saved.id, saved.version
    from public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"site":"rpc","budget":100}'::jsonb) as saved
  $$,
  'first fact-version save RPC call succeeds'
);
select results_eq(
  $$
    select saved.version, fact.is_current, fact.created_by
    from studio_rpc_save_results as saved
    join public.studio_project_fact_versions as fact on fact.id = saved.id
    where saved.attempt = 'first'
  $$,
  $$ values (1, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'first fact-version save RPC call creates version one as current with caller provenance'
);

select lives_ok(
  $$
    insert into studio_rpc_save_results (attempt, id, version)
    select 'same', saved.id, saved.version
    from public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"site":"rpc","budget":100}'::jsonb) as saved
  $$,
  'same-content sequential fact-version save RPC retry succeeds'
);
select results_eq(
  $$
    select first_save.id = retry_save.id,
      retry_save.version,
      (select count(*) from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
      (select count(*) from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and is_current)
    from studio_rpc_save_results as first_save
    cross join studio_rpc_save_results as retry_save
    where first_save.attempt = 'first' and retry_save.attempt = 'same'
  $$,
  $$ values (true, 1::integer, 1::bigint, 1::bigint) $$,
  'same-content sequential retry returns version one and leaves one current fact row'
);

select lives_ok(
  $$
    insert into studio_rpc_save_results (attempt, id, version)
    select 'reordered', saved.id, saved.version
    from public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"budget":100,"site":"rpc"}'::jsonb) as saved
  $$,
  'semantic JSONB-equality fact-version save RPC retry succeeds'
);
select results_eq(
  $$
    select first_save.id = reordered_save.id,
      reordered_save.version,
      (select count(*) from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')
    from studio_rpc_save_results as first_save
    cross join studio_rpc_save_results as reordered_save
    where first_save.attempt = 'first' and reordered_save.attempt = 'reordered'
  $$,
  $$ values (true, 1::integer, 1::bigint) $$,
  'different JSON object key order is content-idempotent'
);

select lives_ok(
  $$
    insert into studio_rpc_save_results (attempt, id, version)
    select 'changed', saved.id, saved.version
    from public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"site":"rpc","budget":200}'::jsonb) as saved
  $$,
  'changed-content fact-version save RPC call succeeds'
);
select results_eq(
  $$
    select (select version from studio_rpc_save_results where attempt = 'changed'), fact.version, fact.is_current
    from public.studio_project_fact_versions as fact
    where fact.project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    order by fact.version
  $$,
  $$ values (2::integer, 1::integer, false), (2::integer, 2::integer, true) $$,
  'changed content creates version two, clears the old current marker, and leaves one current row'
);

select lives_ok(
  $$
    insert into studio_rpc_save_results (attempt, id, version)
    select 'changed-retry', saved.id, saved.version
    from public.studio_save_fact_version('dddddddd-dddd-dddd-dddd-dddddddddddd', '{"site":"rpc","budget":200}'::jsonb) as saved
  $$,
  'same changed-content fact-version save RPC retry succeeds'
);
select results_eq(
  $$
    select changed_save.id = retry_save.id,
      retry_save.version,
      (select count(*) from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
      (select count(*) from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and is_current)
    from studio_rpc_save_results as changed_save
    cross join studio_rpc_save_results as retry_save
    where changed_save.attempt = 'changed' and retry_save.attempt = 'changed-retry'
  $$,
  $$ values (true, 2::integer, 2::bigint, 1::bigint) $$,
  'same changed-content retry returns version two without another fact row'
);

select lives_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts, is_current) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 3, '{"site":"admin"}'::jsonb, false) $$,
  'admin can create Studio facts'
);
select is((select created_by from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 3), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'admin fact creation records auth.uid by default');
select lives_ok(
  $$ update public.studio_project_fact_versions set is_current = false where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 2 $$,
  'admin can update a fact current marker'
);
select throws_ok(
  $$ update public.studio_project_fact_versions set facts = '{"site":"updated"}'::jsonb where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 2 $$,
  '42501', null::text, 'admin cannot rewrite Studio facts'
);
select throws_ok(
  $$ update public.studio_project_fact_versions set created_by = 'cccccccc-cccc-cccc-cccc-cccccccccccc' where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 2 $$,
  '42501', null::text, 'admin cannot forge fact provenance by updating created_by'
);
select throws_ok(
  $$ insert into public.studio_project_fact_versions (project_id, version, facts, is_current, created_by) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 4, '{"site":"forged"}'::jsonb, false, 'cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  '42501', null::text, 'admin cannot forge fact provenance on insert'
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
select throws_ok(
  $$ delete from public.studio_project_fact_versions where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and version = 1 $$,
  '42501', null::text, 'admin cannot delete Studio facts'
);
select lives_ok(
  $$ delete from public.studio_projects where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'admin can delete Studio projects'
);

select * from finish();
rollback;
