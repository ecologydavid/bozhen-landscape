# Yaosei Content Generation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn one approved project fact card and publishable real images into traceable FB/IG/Threads draft variants with deterministic image preparation and two-stage quality checks.

**Architecture:** Add server-only modules and Vercel API handlers that use the Supabase service role after independently authenticating the caller as the Studio admin. Process one asset/job per bounded request, store every input version and output, use OpenAI Responses structured outputs for vision/text, and never use an image-generation endpoint.

**Tech Stack:** Existing React/Vite app, Node/Vercel Functions, Supabase, Sharp 0.35.3, heic-convert 2.1.0, OpenAI JS 7.5.0, Zod 4.4.3, Vitest.

---

## Delivery boundary

This plan adds manual draft generation and the underlying generation jobs. Review editing, approval, branded PNG export, ZIP export, weekly scheduling, and LINE notification remain in Plans 3 and 4.

## File map

- `supabase/migrations/202608180003_generation_pipeline.sql`: jobs, briefs, packages, variants, versions, brand rules, asset processing fields, RLS.
- `supabase/tests/generation_pipeline.test.sql`: schema, state and idempotency contracts.
- `.env.example`: server-only variable names without values.
- `server/config/env.js`: service-side secrets validation.
- `server/lib/supabaseAdmin.js`, `server/lib/openai.js`: server clients.
- `server/http/auth.js`, `server/http/respond.js`: admin bearer authentication and JSON responses.
- `server/images/dhash.js`, `server/images/processAsset.js`, `server/images/analyzeAsset.js`: deterministic processing and AI observation.
- `server/content/allocation.js`, `server/content/prompt.js`, `server/content/generateDraft.js`: audience/style allocation and fact-bound drafting.
- `server/quality/deterministicChecks.js`, `server/quality/verifyDraft.js`: hard rules and semantic verifier.
- `server/generation/runGenerationJob.js`: idempotent state machine.
- `api/studio/assets/process.js`, `api/studio/generate.js`: authenticated endpoints.
- `src/studio/api/generation.js`, `src/studio/components/GenerateContentPanel.jsx`: manual Studio trigger and status.
- Co-located tests: server unit/integration and UI behavior.

Every `server/**/*.test.js` file begins with `// @vitest-environment node`; browser/Studio tests keep the repository's default jsdom environment.

Use the official OpenAI documentation for [Responses structured outputs with Zod](https://developers.openai.com/api/docs/guides/structured-outputs) and [image inputs](https://developers.openai.com/api/docs/guides/images-vision). The model is configurable through `OPENAI_MODEL`; initialize production with `gpt-5.6-terra`. Do not call image generation or image edit APIs.

### Task 1: Add generation persistence and immutable state

**Files:**
- Create: `supabase/migrations/202608180003_generation_pipeline.sql`
- Create: `supabase/tests/generation_pipeline.test.sql`

- [ ] **Step 1: Write the failing pgTAP contract**

Create `supabase/tests/generation_pipeline.test.sql` with assertions for tables `studio_content_briefs`, `studio_generation_jobs`, `studio_content_packages`, `studio_platform_variants`, `studio_draft_versions`, and `studio_brand_rules`; assert RLS is active; assert `studio_generation_jobs_idempotency_key_key` exists; assert `studio_assets` has `master_path`, `thumbnail_path`, `dhash`, `technical_score`, and `vision_analysis`.

- [ ] **Step 2: Verify the database test fails**

Run `npm run test:db`.

Expected: FAIL because generation tables and columns do not exist.

- [ ] **Step 3: Implement the migration**

Create enums and tables with this contract:

```sql
create type public.studio_platform as enum ('facebook', 'instagram', 'threads');
create type public.studio_visual_style as enum ('real_work', 'editorial', 'knowledge_card');
create type public.studio_job_status as enum ('queued', 'processing', 'quality_check', 'ready_for_review', 'needs_facts', 'failed');
create type public.studio_package_status as enum ('generating', 'ready_for_review', 'changes_requested', 'approved', 'exported', 'failed');

alter table public.studio_assets
  add column master_path text,
  add column thumbnail_path text,
  add column dhash text,
  add column technical_score numeric(5,2),
  add column vision_analysis jsonb,
  add column last_used_at timestamptz;

create table public.studio_content_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  fact_version_id uuid not null references public.studio_project_fact_versions(id),
  audience public.studio_audience not null,
  visual_style public.studio_visual_style not null,
  angle text not null check (char_length(angle) between 2 and 160),
  cta text not null check (char_length(cta) between 2 and 160),
  target_platforms public.studio_platform[] not null default array['facebook','instagram','threads']::public.studio_platform[] check (cardinality(target_platforms) > 0),
  selected_asset_ids uuid[] not null check (cardinality(selected_asset_ids) > 0),
  created_at timestamptz not null default now()
);

create table public.studio_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  content_brief_id uuid not null references public.studio_content_briefs(id) on delete cascade,
  idempotency_key text not null unique,
  trigger_type text not null check (trigger_type in ('manual','weekly')),
  status public.studio_job_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  locked_fact_version_id uuid not null references public.studio_project_fact_versions(id),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.studio_content_packages (
  id uuid primary key default gen_random_uuid(),
  generation_job_id uuid not null unique references public.studio_generation_jobs(id) on delete cascade,
  project_id uuid not null references public.studio_projects(id),
  fact_version_id uuid not null references public.studio_project_fact_versions(id),
  title text not null,
  suggested_publish_date date not null,
  suggested_publish_time time not null default '10:00',
  status public.studio_package_status not null default 'generating',
  quality_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_platform_variants (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.studio_content_packages(id) on delete cascade,
  platform public.studio_platform not null,
  current_draft_version_id uuid,
  created_at timestamptz not null default now(),
  unique (package_id, platform)
);

create table public.studio_draft_versions (
  id uuid primary key default gen_random_uuid(),
  platform_variant_id uuid not null references public.studio_platform_variants(id) on delete cascade,
  version integer not null check (version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  source_map jsonb not null check (jsonb_typeof(source_map) = 'array'),
  created_by text not null check (created_by in ('ai','admin')),
  created_at timestamptz not null default now(),
  unique (platform_variant_id, version)
);

alter table public.studio_platform_variants
  add constraint studio_variant_current_version_fk
  foreign key (current_draft_version_id) references public.studio_draft_versions(id);

create table public.studio_brand_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null check (rule_type in ('banned_phrase','preferred_term','cta','approved_example')),
  value text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (rule_type, value)
);

insert into public.studio_brand_rules(rule_type, value) values
('banned_phrase','不只是'), ('banned_phrase','更是'), ('banned_phrase','匠心打造'),
('banned_phrase','療癒秘境'), ('banned_phrase','完美融合'), ('banned_phrase','注入靈魂');
```

Add `touch_updated_at` to packages, enable RLS on all new tables, and add the same `is_studio_admin()` all-operation policy used in Plan 1.

- [ ] **Step 4: Complete schema tests**

Add pgTAP checks that attempts to insert a fourth job attempt fail, duplicate idempotency keys fail, invalid platform/status enum values fail, and anonymous callers see zero rows.

- [ ] **Step 5: Reset, test, lint, and commit**

```powershell
npm run supabase:reset
npm run test:db
npx supabase db lint --local --level error
git add supabase
git commit -m "feat: add content generation persistence"
```

### Task 2: Add authenticated server foundations

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `server/config/env.test.js`
- Create: `server/config/env.js`
- Create: `server/lib/supabaseAdmin.js`
- Create: `server/lib/openai.js`
- Create: `server/http/auth.test.js`
- Create: `server/http/auth.js`
- Create: `server/http/respond.js`

- [ ] **Step 1: Install OpenAI SDK and write failing server-env/auth tests**

```powershell
npm install openai@7.5.0
```

Test that server env rejects missing `SUPABASE_SERVICE_ROLE_KEY` and accepts `OPENAI_MODEL=gpt-5.6-terra`. Test that `assertStudioAdmin(request, deps)` rejects no bearer token, rejects a session user absent from `studio_admins`, and returns the user for a configured admin.

- [ ] **Step 2: Verify failure**

Run:

```powershell
npm test -- --run server/config/env.test.js server/http/auth.test.js
```

Expected: FAIL because server modules are missing.

- [ ] **Step 3: Implement secret validation and clients**

Append variable names to `.env.example`:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=server-side-copy-of-publishable-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
OPENAI_API_KEY=server-only-openai-key
OPENAI_MODEL=gpt-5.6-terra
STUDIO_AUTOMATION_TOKEN=server-only-random-token
```

`server/config/env.js` uses Zod to validate `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `STUDIO_AUTOMATION_TOKEN`. It must throw during server startup and never serialize secret values into errors.

`supabaseAdmin.js` creates a service-role client with session persistence disabled. `openai.js` creates one `OpenAI` client and exports the configured model separately.

- [ ] **Step 4: Implement bearer authentication before service-role work**

`assertStudioAdmin` must extract `Authorization: Bearer <token>`, create a publishable-key client carrying that header, call `auth.getUser(token)`, then query `studio_admins` with the user-scoped client. Only after both checks pass may a handler use `supabaseAdmin`. `respond.js` exports `json(res,status,body)`, `methodNotAllowed`, and `safeError` that logs an error ID but returns no stack or secret.

- [ ] **Step 5: Verify and commit**

Run focused tests and lint. Commit server foundations and dependency changes:

```powershell
git commit -m "feat: add authenticated generation server"
```

### Task 3: Process real images deterministically

**Files:**
- Create: `server/images/dhash.test.js`
- Create: `server/images/dhash.js`
- Create: `server/images/processAsset.test.js`
- Create: `server/images/processAsset.js`
- Create: `api/studio/assets/process.js`

- [ ] **Step 1: Write failing hash and processing tests**

Create images in memory with `sharp({ create: ... }).jpeg().toBuffer()`. Assert identical images have identical dHash, a different image has a different dHash, output master fits inside 2400×2400, thumbnail fits inside 640×640, output is WebP, and metadata contains no EXIF block.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run server/images/dhash.test.js server/images/processAsset.test.js`.

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement dHash**

`createDhash(buffer)` resizes to 9×8, converts to grayscale raw pixels, compares each pixel with its right neighbor, packs 64 booleans into a 16-character hexadecimal string, and exports `hammingDistance(a,b)`.

- [ ] **Step 4: Implement one-asset processing and endpoint**

`processAsset({ assetId, supabase })` loads the asset row, marks it `processing`, downloads `raw` content, converts HEIC/HEIF to JPEG with `heic-convert`, rotates from orientation, creates a 2400px WebP master and 640px WebP thumbnail without `withMetadata()`, computes dimensions/dHash/technical score, uploads to `processed/${projectId}/${assetId}/master.webp` and `thumbnail.webp`, then marks the row `ready`. Compute technical score as `0.50 × resolution + 0.30 × sharpness + 0.20 × exposure`: resolution is `min(longEdge / 2400, 1) × 100`; sharpness is `min(sharp.stats().entropy / 8, 1) × 100`; exposure is `max(0, 100 - abs(channelMean - 127.5) / 127.5 × 100)`. On corrupt/unsupported content mark `quarantined`; on transient storage error mark `failed` and rethrow.

`api/studio/assets/process.js` accepts POST `{ assetId }`, authenticates with `assertStudioAdmin`, calls the processor, and returns `{ assetId, processingStatus, width, height }`. Other methods return 405.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, build, and a local JPEG integration call. Commit:

```powershell
git commit -m "feat: process studio images deterministically"
```

### Task 4: Analyze composition and privacy without altering the scene

**Files:**
- Create: `server/images/assetVisionSchema.js`
- Create: `server/images/analyzeAsset.test.js`
- Create: `server/images/analyzeAsset.js`
- Modify: `server/images/processAsset.js`

- [ ] **Step 1: Write the failing structured-analysis test**

Inject a fake OpenAI client and assert `analyzeAsset` passes one signed master URL as `input_image`, parses `compositionScore`, `summary`, and privacy booleans, and refuses `unconfirmed` or `forbidden` assets before any AI call.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run server/images/analyzeAsset.test.js`.

Expected: FAIL because analysis modules do not exist.

- [ ] **Step 3: Define the strict result schema**

```js
import { z } from 'zod'

export const assetVisionSchema = z.object({
  compositionScore: z.number().min(0).max(100),
  summary: z.string().min(1).max(300),
  visibleElements: z.array(z.string().min(1).max(80)).max(20),
  possibleFace: z.boolean(),
  possibleLicensePlate: z.boolean(),
  possibleAddressOrDocument: z.boolean(),
  visibleText: z.array(z.string().max(120)).max(20),
  uncertaintyNotes: z.array(z.string().max(200)).max(10),
})
```

- [ ] **Step 4: Implement Responses structured output**

Use `openai.responses.parse` and `zodTextFormat(assetVisionSchema, 'asset_vision')`. The input contains a developer instruction stating that observations are not engineering facts and the user content contains one `input_text` plus one signed `input_image` with `detail: 'high'`. Convert the three privacy booleans into `privacy_flags`; never request bounding boxes, removal, fill, or image editing. Persist analysis only when permission is `publishable` or `needs_redaction`.

- [ ] **Step 5: Verify and commit**

Run the focused test and a mocked end-to-end asset processing test. Commit:

```powershell
git add server/images
git commit -m "feat: flag image composition and privacy risks"
```

### Task 5: Allocate audience, visual style, angle, and assets

**Files:**
- Create: `server/content/allocation.test.js`
- Create: `server/content/allocation.js`
- Create: `server/content/selectAssets.test.js`
- Create: `server/content/selectAssets.js`

- [ ] **Step 1: Write failing rolling-quota tests**

Test that the next audience corrects toward `builder: 0.5`, `corporate: 0.3`, `luxury_home: 0.2`; the next visual style corrects toward `real_work: 0.3`, `editorial: 0.6`, `knowledge_card: 0.1`; a recently used lead image is excluded for 30 days; and exact/near dHash duplicates are not selected together.

- [ ] **Step 2: Verify failure**

Run the two focused test files. Expected: FAIL because allocation does not exist.

- [ ] **Step 3: Implement deterministic rolling allocation**

Export `chooseWeightedDeficit(history, targets)` where `targets` sum to 1. Compute `targetCount = (history.length + 1) * weight`, subtract actual count, choose the greatest deficit, and resolve ties by a stable configured priority. Apply over the latest 20 packages.

Export exact target constants:

```js
export const audienceTargets = { builder: 0.5, corporate: 0.3, luxury_home: 0.2 }
export const visualTargets = { real_work: 0.3, editorial: 0.6, knowledge_card: 0.1 }
```

- [ ] **Step 4: Implement asset eligibility and ranking**

Filter to `processing_status = ready`, `permission_status = publishable`, no unresolved privacy flag, and `last_used_at` older than 30 days. Group by dHash distance ≤ 5 and keep the highest `0.55 * technicalScore + 0.45 * compositionScore` member. Return up to five assets and fail with code `INSUFFICIENT_PUBLISHABLE_ASSETS` when none remain.

- [ ] **Step 5: Verify and commit**

Run tests and commit:

```powershell
git add server/content/allocation* server/content/selectAssets*
git commit -m "feat: allocate content mix and eligible assets"
```

### Task 6: Generate fact-bound platform drafts

**Files:**
- Create: `server/content/draftSchema.js`
- Create: `server/content/prompt.test.js`
- Create: `server/content/prompt.js`
- Create: `server/content/generateDraft.test.js`
- Create: `server/content/generateDraft.js`

- [ ] **Step 1: Write failing prompt and output tests**

Assert the prompt includes the locked fact version, audience, visual style, banned phrases, platform rules, and explicit instruction to return `needsFacts` rather than infer missing information. Assert generated Facebook, Instagram, and Threads content includes a source map whose `factPath` exists in the supplied fact object.

- [ ] **Step 2: Verify failure**

Run prompt and draft tests. Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Define the strict draft schema**

```js
import { z } from 'zod'

const claimSchema = z.object({
  sentence: z.string().min(1),
  factPaths: z.array(z.string().regex(/^facts\./)).min(1),
})

const platformCopySchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'threads']),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(1800),
  hashtags: z.array(z.string().regex(/^#/)).max(8),
  altText: z.string().min(1).max(500),
  claims: z.array(claimSchema),
})

export const draftPackageSchema = z.object({
  needsFacts: z.boolean(),
  missingFacts: z.array(z.string().max(160)),
  angle: z.string().min(1).max(160),
  variants: z.array(platformCopySchema).min(1).max(3),
})
```

- [ ] **Step 4: Implement the fact-bound writer**

Build a developer prompt with the approved Taiwanese Traditional Chinese voice, three customer priorities, platform differences, banned phrases, no invented quotes/materials/plants/results, and one-idea-per-post. Send only the locked fact JSON, approved asset observations, audience, style, angle, CTA, requested `targetPlatforms`, and active brand rules. Require exactly one unique variant for every requested platform and none for unrequested platforms. Call `openai.responses.parse` with `zodTextFormat(draftPackageSchema, 'social_draft')`; return `output_parsed` and reject refusals or missing output.

- [ ] **Step 5: Verify and commit**

Run the focused tests, lint, and commit:

```powershell
git add server/content
git commit -m "feat: generate traceable platform drafts"
```

### Task 7: Block untraceable, repetitive, or AI-sounding drafts

**Files:**
- Create: `server/quality/deterministicChecks.test.js`
- Create: `server/quality/deterministicChecks.js`
- Create: `server/quality/verifierSchema.js`
- Create: `server/quality/verifyDraft.test.js`
- Create: `server/quality/verifyDraft.js`

- [ ] **Step 1: Write failing hard-gate tests**

Test banned phrases, excessive exclamation/emoji, invalid source paths, a claim sentence absent from the body, identical FB/IG bodies, Threads over 500 characters, unresolved privacy flags, and duplicate lead image. Each failure returns a stable code such as `BANNED_PHRASE`, `SOURCE_PATH_INVALID`, or `PRIVACY_UNRESOLVED`.

- [ ] **Step 2: Verify failure**

Run the quality tests. Expected: FAIL because checks do not exist.

- [ ] **Step 3: Implement deterministic gates**

`runDeterministicChecks({ draft, facts, assets, brandRules, recentPackages })` returns `{ passed, issues }`. Validate fact paths by traversing `facts`; normalize punctuation and whitespace before duplicate comparison; cap FB at 1800, IG at 1200, Threads at 500; cap hashtags at 5 by policy even though the schema allows 8; and block assets that are not currently publishable/ready.

- [ ] **Step 4: Implement independent semantic verification**

Define a structured verifier result with `verdict: pass | block`, issue codes, affected platform, exact sentence, and explanation. Send the draft and locked facts to a second Responses call with instructions to detect unsupported claims, invented client emotion/quote, generic AI phrasing, and mismatch with the chosen audience. The verifier may block but never rewrite. `runQualityGate` passes only when deterministic and semantic checks both pass.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, and commit:

```powershell
git add server/quality
git commit -m "feat: enforce draft quality gates"
```

### Task 8: Orchestrate an idempotent manual generation job

**Files:**
- Create: `server/generation/runGenerationJob.test.js`
- Create: `server/generation/runGenerationJob.js`
- Create: `api/studio/generate.js`
- Create: `src/studio/api/generation.test.js`
- Create: `src/studio/api/generation.js`

- [ ] **Step 1: Write failing state-machine tests**

Assert a job locks the current fact version, increments attempts before external work, changes `queued → processing → quality_check → ready_for_review`, stores one package and three variants, reuses an existing terminal job for the same idempotency key, changes to `needs_facts` when the draft says `needsFacts`, retries only transient provider/storage codes with injected waits of 1 and 4 seconds, and changes to `failed` with a safe code after the third failed attempt.

- [ ] **Step 2: Verify failure**

Run generation tests. Expected: FAIL because orchestration is missing.

- [ ] **Step 3: Implement orchestration**

`runGenerationJob({ projectId, requestedAudience, requestedStyle, targetPlatforms, suggestedPublishDate, triggerType, idempotencyKey, deps })` must:

1. Return an existing job for the idempotency key.
2. Load current fact version and eligible processed assets.
3. Create the brief and queued job in one RPC or compensated sequence.
4. Increment attempt and lock the fact version before AI calls.
5. Allocate missing audience/style, select assets, and draft.
6. Run both quality gates.
7. Save package, exactly the requested variants, suggested publish date/time, version 1 drafts, source maps, and quality report.
8. Set current version IDs and final job/package states.
9. Update selected assets' `last_used_at` only after draft persistence succeeds.

Wrap one-attempt execution in `runGenerationWithRetries`: retry only documented timeout, rate-limit, and temporary storage codes; increment the same job's `attempt_count`; wait 1 second before attempt 2 and 4 seconds before attempt 3 through an injected `sleep` dependency; do not retry validation, insufficient facts/assets, refusal, privacy, or quality failures.

- [ ] **Step 4: Add authenticated endpoint and browser repository**

`api/studio/generate.js` accepts POST `{ projectId, audience?, visualStyle?, idempotencyKey }`, authenticates the admin, selects the next Monday/Wednesday/Friday at 10:00 Asia/Taipei as a non-binding manual-package suggestion, calls the job runner with all three target platforms and `triggerType: 'manual'`, and returns 202 with `{ jobId, status }`. `src/studio/api/generation.js` obtains the current session token, sends JSON, maps 401/403/409/422/500 to typed client errors, and never retries POST automatically.

- [ ] **Step 5: Verify and commit**

Run server/client tests, all tests, lint, and build. Commit:

```powershell
git commit -m "feat: orchestrate manual content generation"
```

### Task 9: Add manual generation UI and complete the pipeline gate

**Files:**
- Modify: `src/studio/pages/StudioProjectEditorPage.jsx`
- Create: `src/studio/components/GenerateContentPanel.jsx`
- Create: `src/studio/components/GenerateContentPanel.test.jsx`
- Modify: `src/styles/studio.css`
- Modify: `README.md`

- [ ] **Step 1: Write the failing UI behavior test**

Assert the button is disabled until current facts exist and at least one processed publishable asset is available; optional audience/style controls default to `依內容比例自動選擇`; one click creates one UUID idempotency key; 202 shows queued status; `needs_facts` links back to missing fact fields; and repeat click while pending does nothing.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/components/GenerateContentPanel.test.jsx`.

Expected: FAIL because the panel does not exist.

- [ ] **Step 3: Implement the panel and polling**

Embed the panel in the project editor. After 202, poll the job row through Supabase every 3 seconds while the tab is visible, stop on terminal states, stop on unmount, and show the stable failure code plus a manual retry button that creates a new idempotency key. Do not display raw server stack/error details.

- [ ] **Step 4: Document secrets and run verification**

Document that OpenAI and service-role keys exist only in Vercel/server/n8n secret stores. Run:

```powershell
npm run supabase:reset
npm run test:db
npm test -- --run
npm run lint
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Smoke-test and commit**

Using one builder project with a complete fact card and three publishable photos, process assets, generate a package, inspect that three variants exist, verify every claim source path resolves, and confirm no image-generation API was called. Commit:

```powershell
git add src/studio README.md
git commit -m "feat: add manual content generation controls"
```

## Plan 2 completion gate

Do not begin Plan 3 until one complete project can produce a `ready_for_review` package with three platform variants, every engineering claim has a valid fact path, unresolved privacy or banned language blocks readiness, retries do not duplicate packages, and processed images are deterministic derivatives of real uploads.
