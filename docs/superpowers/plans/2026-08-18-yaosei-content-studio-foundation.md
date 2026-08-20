# Yaosei Content Studio Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private single-admin content studio that manages projects, immutable fact-card versions, image uploads, and publication/privacy permissions without changing the public brand website.

**Architecture:** Keep the existing React/Vite/HashRouter site and mount a separate `#/studio/*` application shell with no public header or footer. Use Supabase Auth, Postgres, and a private Storage bucket; keep all authorization in RLS and expose only the publishable anon key to the browser.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest, React Testing Library, Supabase JS 2.112.3, Supabase CLI 2.114.0, Zod 4.4.3, PostgreSQL/pgTAP, native CSS.

---

## Delivery boundary

This plan ends with a working, testable private asset-and-fact library. It does not call an AI provider, create social drafts, render branded post images, export ZIP files, schedule jobs, or notify LINE.

## File map

- `package.json`, `package-lock.json`: Supabase, Zod, CLI scripts and pinned dependencies.
- `.env.example`: public browser configuration only; no production secret values.
- `supabase/config.toml`: reproducible local Supabase stack.
- `supabase/migrations/202608180001_studio_foundation.sql`: admin, project, fact version, asset, bucket and RLS schema.
- `supabase/migrations/202608180002_save_fact_version.sql`: atomic fact-version RPC.
- `supabase/tests/studio_foundation.test.sql`: pgTAP schema and RLS coverage.
- `src/studio/config/env.js`: validated browser environment.
- `src/studio/lib/supabase.js`: single browser Supabase client.
- `src/studio/auth/*`: session, admin guard and login.
- `src/studio/StudioApp.jsx`, `src/studio/components/StudioShell.jsx`: private routes and layout.
- `src/studio/schemas/project.js`, `src/studio/api/projects.js`: fact contract and repository.
- `src/studio/pages/StudioProjectsPage.jsx`, `src/studio/pages/StudioProjectEditorPage.jsx`: project UI.
- `src/studio/schemas/asset.js`, `src/studio/api/assets.js`: file contract and private Storage repository.
- `src/studio/components/AssetUploader.jsx`, `src/studio/components/AssetLibrary.jsx`: upload and permission UI.
- `src/styles/studio.css`: scoped responsive studio styling.
- Co-located `*.test.{js,jsx}` files: unit and UI tests.
- `README.md`: local Studio setup and verification.

Reference the official Supabase guidance for [local CLI development](https://supabase.com/docs/guides/local-development), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [pgTAP tests](https://supabase.com/docs/guides/local-development/cli/testing-and-linting).

### Task 1: Add validated Studio configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.env.example`
- Create: `src/studio/config/env.test.js`
- Create: `src/studio/config/env.js`

- [ ] **Step 1: Install exact dependencies**

```powershell
npm install @supabase/supabase-js@2.112.3 zod@4.4.3
npm install --save-dev supabase@2.114.0
```

Expected: exit 0; the lockfile pins all three versions.

- [ ] **Step 2: Write the failing environment test**

Create `src/studio/config/env.test.js`:

```js
import { describe, expect, test } from 'vitest'
import { readStudioEnv } from './env'

describe('readStudioEnv', () => {
  test('returns validated public settings', () => {
    expect(readStudioEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-at-least-20-chars',
    })).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'publishable-key-at-least-20-chars',
    })
  })

  test('rejects service-role material in browser configuration', () => {
    expect(() => readStudioEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role.secret-value',
    })).toThrow(/publishable/i)
  })
})
```

- [ ] **Step 3: Verify the test fails**

Run `npm test -- --run src/studio/config/env.test.js`.

Expected: FAIL because `./env` does not exist.

- [ ] **Step 4: Implement environment validation and scripts**

Create `src/studio/config/env.js`:

```js
import { z } from 'zod'

const studioEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).refine(
    (value) => !value.toLowerCase().includes('service_role'),
    'Browser configuration must use a publishable key',
  ),
})

export function readStudioEnv(source = import.meta.env) {
  const parsed = studioEnvSchema.parse(source)
  return {
    supabaseUrl: parsed.VITE_SUPABASE_URL,
    supabasePublishableKey: parsed.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}
```

Create `.env.example`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-local-publishable-key
```

Add to `package.json` scripts:

```json
"supabase:start": "supabase start",
"supabase:stop": "supabase stop",
"supabase:reset": "supabase db reset --local",
"test:db": "supabase test db --local"
```

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- --run src/studio/config/env.test.js
npm run lint
git add package.json package-lock.json .env.example src/studio/config
git commit -m "build: add studio environment foundation"
```

Expected: focused tests and lint pass; commit succeeds.

### Task 2: Create the database, private bucket, and RLS boundary

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202608180001_studio_foundation.sql`
- Create: `supabase/tests/studio_foundation.test.sql`

- [ ] **Step 1: Initialize local Supabase**

Run `npx supabase init`.

Expected: `supabase/config.toml` exists and contains no credential.

- [ ] **Step 2: Write the failing pgTAP contract**

Create `supabase/tests/studio_foundation.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
select has_table('public', 'studio_admins');
select has_table('public', 'studio_projects');
select has_table('public', 'studio_project_fact_versions');
select has_table('public', 'studio_assets');
select has_column('studio_assets', 'permission_status');
select has_column('studio_assets', 'privacy_flags');
select col_not_null('studio_project_fact_versions', 'facts');
select has_index('public', 'studio_project_fact_versions', 'studio_fact_one_current');
select results_eq($$select relrowsecurity from pg_class where oid = 'public.studio_admins'::regclass$$, array[true], 'admin RLS enabled');
select results_eq($$select relrowsecurity from pg_class where oid = 'public.studio_projects'::regclass$$, array[true], 'project RLS enabled');
select results_eq($$select relrowsecurity from pg_class where oid = 'public.studio_project_fact_versions'::regclass$$, array[true], 'fact RLS enabled');
select results_eq($$select relrowsecurity from pg_class where oid = 'public.studio_assets'::regclass$$, array[true], 'asset RLS enabled');
select results_eq($$select public.is_studio_admin()$$, array[false], 'anon is not admin');
select results_eq($$select public.is_supported_studio_image('image/jpeg')$$, array[true], 'JPEG accepted');
select results_eq($$select public.is_supported_studio_image('video/mp4')$$, array[false], 'video rejected');
select * from finish();
rollback;
```

- [ ] **Step 3: Verify the database test fails**

```powershell
npm run supabase:start
npm run test:db
```

Expected: FAIL because the Studio schema does not exist.

- [ ] **Step 4: Implement the foundation migration**

Create `supabase/migrations/202608180001_studio_foundation.sql`:

```sql
create extension if not exists pgcrypto with schema extensions;
create type public.studio_audience as enum ('builder', 'corporate', 'luxury_home');
create type public.studio_project_status as enum ('draft', 'ready', 'archived');
create type public.studio_asset_permission as enum ('unconfirmed', 'publishable', 'needs_redaction', 'forbidden');
create type public.studio_asset_processing as enum ('uploaded', 'processing', 'ready', 'quarantined', 'failed');

create table public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_studio_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.studio_admins where user_id = (select auth.uid())); $$;
revoke all on function public.is_studio_admin() from public;
grant execute on function public.is_studio_admin() to anon, authenticated;

create or replace function public.is_supported_studio_image(content_type text)
returns boolean language sql immutable
as $$ select content_type = any (array['image/jpeg','image/png','image/webp','image/heic','image/heif']); $$;

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
create unique index studio_fact_one_current on public.studio_project_fact_versions(project_id) where is_current;

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

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger studio_projects_touch before update on public.studio_projects for each row execute function public.touch_updated_at();
create trigger studio_assets_touch before update on public.studio_assets for each row execute function public.touch_updated_at();

alter table public.studio_admins enable row level security;
alter table public.studio_projects enable row level security;
alter table public.studio_project_fact_versions enable row level security;
alter table public.studio_assets enable row level security;
create policy "admin reads own membership" on public.studio_admins for select to authenticated using (user_id = (select auth.uid()));
create policy "admin manages projects" on public.studio_projects for all to authenticated using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));
create policy "admin manages facts" on public.studio_project_fact_versions for all to authenticated using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));
create policy "admin manages assets" on public.studio_assets for all to authenticated using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-assets','studio-assets',false,26214400,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin reads studio objects" on storage.objects for select to authenticated using (bucket_id = 'studio-assets' and (select public.is_studio_admin()));
create policy "admin uploads studio objects" on storage.objects for insert to authenticated with check (bucket_id = 'studio-assets' and (select public.is_studio_admin()));
create policy "admin updates studio objects" on storage.objects for update to authenticated using (bucket_id = 'studio-assets' and (select public.is_studio_admin())) with check (bucket_id = 'studio-assets' and (select public.is_studio_admin()));
create policy "admin deletes studio objects" on storage.objects for delete to authenticated using (bucket_id = 'studio-assets' and (select public.is_studio_admin()));
```

- [ ] **Step 5: Reset, test, lint, and commit**

```powershell
npm run supabase:reset
npm run test:db
npx supabase db lint --local --level error
git add supabase package.json package-lock.json
git commit -m "feat: add studio database foundation"
```

Expected: all 15 assertions pass and DB lint reports no error.

### Task 3: Protect a separate Studio route

**Files:**
- Modify: `src/App.jsx:1-35`
- Create: `src/studio/StudioRoot.jsx`
- Create: `src/studio/lib/supabase.js`
- Create: `src/studio/auth/StudioAuthProvider.jsx`
- Create: `src/studio/auth/RequireStudioAdmin.jsx`
- Create: `src/studio/pages/StudioLoginPage.jsx`
- Create: `src/studio/StudioApp.jsx`
- Create: `src/studio/StudioApp.test.jsx`

- [ ] **Step 1: Write failing route tests**

Create `src/studio/StudioApp.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import StudioApp from './StudioApp'

vi.mock('./auth/StudioAuthProvider', () => ({ useStudioAuth: vi.fn() }))
import { useStudioAuth } from './auth/StudioAuthProvider'

test('shows login to an anonymous visitor', () => {
  useStudioAuth.mockReturnValue({ status: 'anonymous', signIn: vi.fn() })
  render(<MemoryRouter initialEntries={['/studio']}><StudioApp /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '內容工作室登入' })).toBeInTheDocument()
})

test('shows workspace only to the admin', () => {
  useStudioAuth.mockReturnValue({ status: 'admin', user: { email: 'admin@example.com' } })
  render(<MemoryRouter initialEntries={['/studio']}><StudioApp /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '內容工作室' })).toBeInTheDocument()
})
```

Add an `src/App.test.jsx` assertion that `/studio` does not render the public `主要導覽`.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/StudioApp.test.jsx src/App.test.jsx`.

Expected: FAIL because Studio auth and routes do not exist.

- [ ] **Step 3: Implement client and auth state**

Create `src/studio/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'
import { readStudioEnv } from '../config/env'
const { supabaseUrl, supabasePublishableKey } = readStudioEnv()
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

`StudioAuthProvider.jsx` must call `supabase.auth.getSession()`, subscribe to `onAuthStateChange`, query `studio_admins` for the current user, expose `loading | anonymous | forbidden | admin | error`, and unsubscribe on cleanup. Expose `signIn(email,password)` through `signInWithPassword` and `signOut()` through `supabase.auth.signOut()`.

- [ ] **Step 4: Implement login, guard, and route split**

`RequireStudioAdmin.jsx` renders a loading message, `<Navigate to="/studio/login" replace />` for anonymous users, a forbidden message for non-admin users, an error message for auth failure, and `<Outlet />` only for admins.

`StudioLoginPage.jsx` uses associated email/password controls, disables submit while pending, and shows `登入失敗，請確認帳號與密碼。` without logging credentials.

Create `StudioApp.jsx`:

```jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import RequireStudioAdmin from './auth/RequireStudioAdmin'
import StudioLoginPage from './pages/StudioLoginPage'
import StudioShell from './components/StudioShell'

export default function StudioApp() {
  return (
    <Routes>
      <Route path="login" element={<StudioLoginPage />} />
      <Route element={<RequireStudioAdmin />}>
        <Route element={<StudioShell />}><Route index element={<h1>內容工作室</h1>} /></Route>
      </Route>
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  )
}
```

Create `src/studio/StudioRoot.jsx`:

```jsx
import { StudioAuthProvider } from './auth/StudioAuthProvider'
import StudioApp from './StudioApp'

export default function StudioRoot() {
  return <StudioAuthProvider><StudioApp /></StudioAuthProvider>
}
```

In `App.jsx`, lazy-import `StudioRoot`, use `useLocation()`, and return it inside `<Suspense fallback={<p>正在載入內容工作室…</p>}>` when `pathname.startsWith('/studio')`; otherwise keep the public shell unchanged. Do not wrap the public application in `StudioAuthProvider`: Supabase configuration must be loaded only when a Studio route is opened.

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- --run src/studio/StudioApp.test.jsx src/App.test.jsx
npm run lint
npm run build
git add src/App.jsx src/studio
git commit -m "feat: protect the private content studio"
```

### Task 4: Build the responsive Studio shell

**Files:**
- Create: `src/studio/components/StudioShell.jsx`
- Create: `src/studio/components/StudioShell.test.jsx`
- Create: `src/styles/studio.css`
- Modify: `src/main.jsx`

- [ ] **Step 1: Write the failing navigation test**

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import StudioShell from './StudioShell'

vi.mock('../auth/StudioAuthProvider', () => ({
  useStudioAuth: () => ({ user: { email: 'admin@example.com' }, signOut: vi.fn() }),
}))

test('exposes private workspace navigation', () => {
  render(<MemoryRouter><StudioShell /></MemoryRouter>)
  expect(screen.getByRole('navigation', { name: '內容工作室導覽' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '案場素材' })).toHaveAttribute('href', '/studio/projects')
  expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/components/StudioShell.test.jsx`.

Expected: FAIL because the shell is incomplete or missing.

- [ ] **Step 3: Implement the shell**

`StudioShell.jsx` must render a skip link, an `aside` with `曜聖｜內容工作室`, NavLinks for `案場素材`, `待審核`, `已核准`, and `設定`, a `<main><Outlet /></main>`, the signed-in email, and a sign-out button. Use only `studio-*` class names.

- [ ] **Step 4: Add scoped responsive rules**

Create `src/styles/studio.css`:

```css
.studio-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  background: var(--ivory-100);
}

.studio-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 24px 18px;
  background: var(--forest-900);
  color: var(--ivory-50);
}

.studio-main {
  width: min(1440px, 100%);
  padding: clamp(20px, 4vw, 48px);
}

.studio-nav-link {
  display: flex;
  min-height: 44px;
  align-items: center;
  padding-inline: 14px;
  border-radius: 10px;
}

.studio-nav-link.active {
  background: var(--gold-400);
  color: var(--forest-950);
}

@media (max-width: 760px) {
  .studio-shell { grid-template-columns: 1fr; }
  .studio-sidebar { position: static; height: auto; }
  .studio-nav { display: flex; overflow-x: auto; }
  .studio-main { padding: 18px; }
}
```

Import `./styles/studio.css` after existing styles in `main.jsx`.

- [ ] **Step 5: Verify and commit**

Run the focused test, lint, and build. Then:

```powershell
git add src/studio/components/StudioShell.jsx src/studio/components/StudioShell.test.jsx src/styles/studio.css src/main.jsx
git commit -m "feat: add responsive studio shell"
```

### Task 5: Add project and immutable fact-card repositories

**Files:**
- Create: `src/studio/schemas/project.test.js`
- Create: `src/studio/schemas/project.js`
- Create: `src/studio/api/projects.test.js`
- Create: `src/studio/api/projects.js`
- Create: `supabase/migrations/202608180002_save_fact_version.sql`
- Modify: `supabase/tests/studio_foundation.test.sql`

- [ ] **Step 1: Write failing schema and repository tests**

```js
import { expect, test } from 'vitest'
import { projectInputSchema, projectFactsSchema } from './project'

test('accepts a complete builder project', () => {
  expect(projectInputSchema.parse({
    internalName: '二林企業廠區', publicName: '中部企業廠區景觀',
    region: '彰化', audience: 'builder', siteType: '企業廠區',
  }).audience).toBe('builder')
})

test('requires at least one verified service', () => {
  expect(() => projectFactsSchema.parse({
    clientNeed: '改善入口動線與企業門面。', services: [],
    constraints: ['施工期間維持通行'], approach: ['分區施工'],
    verifiedMaterials: [], results: ['完成入口景觀整理'],
    publicCta: '歡迎洽詢景觀規劃', forbiddenDetails: [],
  })).toThrow(/services/)
})
```

In `projects.test.js`, mock Supabase and assert `saveFactVersion(client, projectId, facts)` calls `client.rpc('studio_save_fact_version', { target_project_id: projectId, next_facts: facts })` once.

- [ ] **Step 2: Verify failure**

Run:

```powershell
npm test -- --run src/studio/schemas/project.test.js src/studio/api/projects.test.js
```

Expected: FAIL because schemas and repository do not exist.

- [ ] **Step 3: Implement schemas and repository**

Create `src/studio/schemas/project.js`:

```js
import { z } from 'zod'

export const audiences = ['builder', 'corporate', 'luxury_home']
export const projectInputSchema = z.object({
  internalName: z.string().trim().min(2).max(120),
  publicName: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(80),
  audience: z.enum(audiences),
  siteType: z.string().trim().min(2).max(80),
})

export const projectFactsSchema = z.object({
  clientNeed: z.string().trim().min(10).max(800),
  services: z.array(z.string().trim().min(2).max(100)).min(1),
  constraints: z.array(z.string().trim().min(2).max(240)),
  approach: z.array(z.string().trim().min(2).max(240)).min(1),
  verifiedMaterials: z.array(z.string().trim().min(2).max(120)),
  results: z.array(z.string().trim().min(2).max(240)).min(1),
  publicCta: z.string().trim().min(2).max(160),
  forbiddenDetails: z.array(z.string().trim().min(2).max(240)),
})
```

Create `projects.js` with exported `listProjects`, `getProject`, `createProject`, `updateProject`, `getCurrentFacts`, and `saveFactVersion`. Each takes the Supabase client first, uses explicit field lists, parses input, and throws returned errors.

- [ ] **Step 4: Implement the atomic fact-version RPC**

Create `supabase/migrations/202608180002_save_fact_version.sql`:

```sql
create or replace function public.studio_save_fact_version(target_project_id uuid, next_facts jsonb)
returns public.studio_project_fact_versions
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  next_version integer;
  saved public.studio_project_fact_versions;
begin
  if not public.is_studio_admin() then
    raise exception 'studio admin required' using errcode = '42501';
  end if;
  if jsonb_typeof(next_facts) <> 'object' then
    raise exception 'facts must be an object' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_project_id::text, 0));
  select coalesce(max(version), 0) + 1 into next_version
  from public.studio_project_fact_versions where project_id = target_project_id;
  update public.studio_project_fact_versions set is_current = false
  where project_id = target_project_id and is_current;
  insert into public.studio_project_fact_versions(project_id, version, facts, is_current)
  values (target_project_id, next_version, next_facts, true)
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.studio_save_fact_version(uuid, jsonb) from public;
grant execute on function public.studio_save_fact_version(uuid, jsonb) to authenticated;
```

Increase the pgTAP plan and assert the RPC exists and sequential calls leave one `is_current = true` row.

- [ ] **Step 5: Verify and commit**

Run schema/repository tests, Supabase reset, DB tests, and lint. Commit:

```powershell
git add src/studio/schemas/project* src/studio/api/projects* supabase
git commit -m "feat: add versioned project fact cards"
```

### Task 6: Build project list and fact-card editor

**Files:**
- Modify: `src/studio/StudioApp.jsx`
- Create: `src/studio/pages/StudioProjectsPage.jsx`
- Create: `src/studio/pages/StudioProjectsPage.test.jsx`
- Create: `src/studio/pages/StudioProjectEditorPage.jsx`
- Create: `src/studio/pages/StudioProjectEditorPage.test.jsx`
- Modify: `src/styles/studio.css`

- [ ] **Step 1: Write failing user-flow tests**

Mock repository calls and assert:

```jsx
test('lists audience and readiness for every project', async () => {
  listProjects.mockResolvedValue([{ id: 'p1', public_name: '中部企業廠區景觀', audience: 'builder', status: 'ready' }])
  render(<MemoryRouter><StudioProjectsPage /></MemoryRouter>)
  expect(await screen.findByText('中部企業廠區景觀')).toBeInTheDocument()
  expect(screen.getByText('建商')).toBeInTheDocument()
  expect(screen.getByText('可生成')).toBeInTheDocument()
})

test('does not save an incomplete fact card', async () => {
  render(<MemoryRouter><StudioProjectEditorPage /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: '儲存事實卡版本' }))
  expect(screen.getByText('至少填寫一項已確認服務')).toBeInTheDocument()
  expect(saveFactVersion).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Verify failure**

Run both new test files. Expected: missing components or assertions fail.

- [ ] **Step 3: Implement list and routes**

Add routes:

```jsx
<Route path="projects" element={<StudioProjectsPage />} />
<Route path="projects/new" element={<StudioProjectEditorPage mode="create" />} />
<Route path="projects/:projectId" element={<StudioProjectEditorPage mode="edit" />} />
```

The list shows public/internal name, audience, region, status, asset count, and a `新增案場` link. Distinguish loading, empty, and retryable error states.

- [ ] **Step 4: Implement structured editing**

Use controlled fields for metadata and array editors for services, constraints, approach, verified materials, results, and forbidden details. On save: parse both schemas, create/update metadata, save a fact version only after metadata succeeds, show the returned version, and preserve typed values on error. Add two-column desktop and one-column mobile rules; all labels are associated and controls are at least 44px high.

- [ ] **Step 5: Verify and commit**

Run new tests, existing public tests, lint, and build. Commit:

```powershell
git add src/studio/StudioApp.jsx src/studio/pages src/styles/studio.css
git commit -m "feat: add project and fact card editor"
```

### Task 7: Add private image upload with cleanup

**Files:**
- Create: `src/studio/schemas/asset.test.js`
- Create: `src/studio/schemas/asset.js`
- Create: `src/studio/api/assets.test.js`
- Create: `src/studio/api/assets.js`
- Create: `src/studio/components/AssetUploader.jsx`
- Create: `src/studio/components/AssetUploader.test.jsx`

- [ ] **Step 1: Write failing validation and rollback tests**

`asset.test.js` accepts JPEG/PNG/WebP/HEIC up to 25 MiB and rejects MP4 or larger files. `assets.test.js` asserts that when the database insert fails after Storage upload, `storage.remove([path])` runs before the error is rethrown. The component test asserts one failed file does not remove another successful upload.

- [ ] **Step 2: Verify failure**

```powershell
npm test -- --run src/studio/schemas/asset.test.js src/studio/api/assets.test.js src/studio/components/AssetUploader.test.jsx
```

Expected: FAIL because upload modules do not exist.

- [ ] **Step 3: Implement file validation**

Create `src/studio/schemas/asset.js`:

```js
import { z } from 'zod'

export const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const assetFileSchema = z.instanceof(File)
  .refine((file) => acceptedImageTypes.includes(file.type), '只接受 JPG、PNG、WebP 或 HEIC 圖片')
  .refine((file) => file.size <= 25 * 1024 * 1024, '單張圖片不得超過 25MB')
export const assetPermissionSchema = z.enum(['unconfirmed', 'publishable', 'needs_redaction', 'forbidden'])
```

- [ ] **Step 4: Implement repository and uploader**

`uploadAsset(client, projectId, file)` must parse the file, create a UUID, derive a lowercase extension from a fixed MIME map, upload to `raw/${projectId}/${assetId}.${extension}` with `upsert: false`, insert `studio_assets` with `unconfirmed`, remove the uploaded object when insertion fails, and return the row.

`AssetUploader` supports multiple sequential files, displays per-file states, keeps successful uploads when another fails, and announces errors through `role="alert"`.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, and build. Commit:

```powershell
git add src/studio/schemas/asset* src/studio/api/assets* src/studio/components/AssetUploader*
git commit -m "feat: add private studio image uploads"
```

### Task 8: Add permission-aware asset library

**Files:**
- Modify: `src/studio/pages/StudioProjectEditorPage.jsx`
- Modify: `src/studio/api/assets.js`
- Create: `src/studio/components/AssetLibrary.jsx`
- Create: `src/studio/components/AssetLibrary.test.jsx`
- Modify: `src/styles/studio.css`

- [ ] **Step 1: Write failing permission tests**

Assert an `unconfirmed` asset displays `尚未確認`, a `forbidden` asset displays `不可用於生成`, and changing to `needs_redaction` calls `updateAssetPermission(client, assetId, 'needs_redaction')`.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/components/AssetLibrary.test.jsx`.

Expected: FAIL because the library does not exist.

- [ ] **Step 3: Implement signed previews and permission updates**

Add to `assets.js`:

```js
export async function createAssetPreviewUrl(client, storagePath) {
  const { data, error } = await client.storage.from('studio-assets').createSignedUrl(storagePath, 900)
  if (error) throw error
  return data.signedUrl
}

export async function updateAssetPermission(client, assetId, permissionStatus) {
  const status = assetPermissionSchema.parse(permissionStatus)
  const { data, error } = await client.from('studio_assets')
    .update({ permission_status: status })
    .eq('id', assetId)
    .select('id, permission_status, updated_at')
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Step 4: Implement the library and embed it**

Render a responsive grid with private signed thumbnails, filename, permission selector, processing state, and privacy flags. Never construct a public bucket URL. Require confirmation before changing to or from `forbidden`. Embed uploader and library below the fact card editor.

- [ ] **Step 5: Verify and commit**

Run focused tests, all Studio tests, public tests, lint, and build. Commit:

```powershell
git add src/studio/pages/StudioProjectEditorPage.jsx src/studio/api/assets.js src/studio/components/AssetLibrary* src/styles/studio.css
git commit -m "feat: add permission-aware asset library"
```

### Task 9: Document setup and run the foundation gate

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Document deterministic local setup**

Add:

```powershell
npm install
Copy-Item .env.example .env.local
npm run supabase:start
npm run supabase:reset
npm run dev
```

Document that the first admin is created in Supabase Auth, then registered with:

```sql
insert into public.studio_admins(user_id) values ('<Auth user UUID copied from the dashboard>');
```

State that the UUID comes from the local or hosted Auth dashboard and production keys are never committed.

- [ ] **Step 2: Ignore only local Supabase runtime state**

Append to `.gitignore`:

```gitignore
supabase/.temp/
supabase/.branches/
```

Do not ignore migrations, tests, config, or seed files.

- [ ] **Step 3: Run the complete gate**

```powershell
npm run supabase:reset
npm run test:db
npm test -- --run
npm run lint
npm run build
git status --short
```

Expected: DB reset and pgTAP pass; all tests, lint, and build pass; status contains only intended documentation changes.

- [ ] **Step 4: Manually smoke-test the private boundary**

Verify public routes are unchanged; anonymous Studio access redirects; a non-admin cannot read tables or Storage; the admin can create a project, save fact version 1, upload JPG and HEIC files, assign permissions, refresh, and keep the session.

- [ ] **Step 5: Commit documentation**

```powershell
git add README.md .gitignore
git commit -m "docs: add content studio local setup"
```

## Plan 1 completion gate

Do not begin Plan 2 until all DB/app tests pass, RLS blocks non-admins, the public website is unchanged, and one admin can create a project, save immutable facts, upload real images, and classify publication/privacy permission.
