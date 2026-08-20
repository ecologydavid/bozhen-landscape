# Yaosei Review and Export Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the single admin inspect source evidence, edit or partially regenerate each platform draft, approve immutable versions, and download production-ready images/text as a ZIP package.

**Architecture:** Keep review state in Supabase with optimistic version checks and append-only audit events. Render A/B/C artwork as real DOM templates using the site's self-hosted fonts and deterministic CSS, then rasterize only approved templates in the authenticated browser; no generative image editing is used.

**Tech Stack:** React 19, Supabase, OpenAI-backed partial rewrite endpoint from Plan 2, Fontsource 5.3.0, html-to-image 1.11.13, JSZip 3.10.1, Playwright 1.62.1, Vitest/RTL, native CSS.

---

## Delivery boundary

This plan completes manual review and download. It does not create weekly n8n jobs, LINE notifications, or publish to Meta platforms.

## File map

- `supabase/migrations/202608180004_review_export.sql`: reviews, audit, exports and concurrency-safe RPCs.
- `supabase/tests/review_export.test.sql`: transition, immutability and RLS tests.
- `src/studio/api/review.js`: queue/detail/version/review repository.
- `src/studio/pages/StudioReviewQueuePage.jsx`: status queue.
- `src/studio/pages/StudioReviewPage.jsx`: three-column workbench.
- `src/studio/components/PlatformTabs.jsx`, `DraftEditor.jsx`, `AssetPicker.jsx`, `CropControl.jsx`, `SourceInspector.jsx`, `QualityPanel.jsx`: bounded review units.
- `server/content/regenerateSelection.js`, `api/studio/regenerate.js`: selected-field rewrite only.
- `src/studio/artwork/RealWorkArtwork.jsx`, `EditorialArtwork.jsx`, `KnowledgeArtwork.jsx`: 1080×1350 templates.
- `src/studio/artwork/ArtworkPreview.jsx`, `src/styles/studio-artwork.css`: preview and export-safe styling.
- `src/studio/export/renderArtwork.js`, `buildContentZip.js`: PNG and ZIP creation.
- `src/studio/components/ExportPackageButton.jsx`: approval-gated export.
- `server/quality/editDistance.js`, `scripts/report-content-calibration.mjs`: 20-package acceptance report.
- `playwright.config.js`, `e2e/studio-review.spec.js`: end-to-end review/export path.

Every `server/**/*.test.js` file begins with `// @vitest-environment node`; React tests use jsdom.

### Task 1: Add append-only reviews, audit events, and guarded transitions

**Files:**
- Create: `supabase/migrations/202608180004_review_export.sql`
- Create: `supabase/tests/review_export.test.sql`

- [ ] **Step 1: Write the failing pgTAP transition contract**

Assert tables `studio_reviews`, `studio_audit_events`, `studio_exports` exist with RLS; direct UPDATE/DELETE on draft versions and audit events is rejected; `studio_save_admin_draft`, `studio_request_changes`, and `studio_approve_package` functions exist; approving with a stale expected version fails; approval requires all present platform variants to have current versions and passing quality.

- [ ] **Step 2: Verify failure**

Run `npm run test:db`.

Expected: FAIL because review persistence/functions do not exist.

- [ ] **Step 3: Implement review and audit tables**

```sql
create type public.studio_review_action as enum ('changes_requested','approved');

create table public.studio_reviews (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.studio_content_packages(id) on delete cascade,
  platform public.studio_platform,
  action public.studio_review_action not null,
  reason text,
  reviewed_draft_version_id uuid references public.studio_draft_versions(id),
  edit_ratio numeric(6,5),
  core_angle_changed boolean not null default false,
  reviewed_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.studio_audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.studio_exports (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.studio_content_packages(id),
  manifest jsonb not null,
  exported_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
```

Enable RLS and admin select/insert policies. Add triggers that raise `draft versions are append-only` or `audit events are append-only` on UPDATE/DELETE. Add an `AFTER UPDATE OF permission_status, privacy_flags` trigger on `studio_assets` that records old/new values in `studio_audit_events`. Existing approved package rows may change only through security-invoker RPCs.

- [ ] **Step 4: Implement exact RPC semantics**

`studio_save_admin_draft(variant_id, expected_current_version_id, next_content, next_source_map)` locks the variant, compares expected current ID, inserts version `max+1` with `created_by='admin'`, updates the current pointer, writes an audit event, and returns the new version.

`studio_request_changes(package_id, platform_or_null, reason)` requires nonblank reason, inserts a review and audit event, and changes the package to `changes_requested`.

`studio_approve_package(package_id, expected_versions jsonb, edit_ratio, core_angle_changed)` locks the package, requires `quality_report->>'passed' = 'true'`, checks every current version ID against the JSON map, inserts the review and audit event, and changes status to `approved`. Re-approval of an unchanged approved package is rejected.

- [ ] **Step 5: Test and commit**

```powershell
npm run supabase:reset
npm run test:db
npx supabase db lint --local --level error
git add supabase
git commit -m "feat: add guarded content review transitions"
```

### Task 2: Build review repositories and queue

**Files:**
- Create: `src/studio/api/review.test.js`
- Create: `src/studio/api/review.js`
- Create: `src/studio/pages/StudioReviewQueuePage.jsx`
- Create: `src/studio/pages/StudioReviewQueuePage.test.jsx`
- Modify: `src/studio/StudioApp.jsx`

- [ ] **Step 1: Write failing repository and queue tests**

Assert `listReviewPackages(client, status)` requests explicit nested fields, sorts oldest pending first, and never downloads original files. UI tests cover loading, empty, retry, audience/style labels, package status, project name, and navigation to `/studio/review/:packageId`.

- [ ] **Step 2: Verify failure**

Run the two focused files. Expected: FAIL because review modules do not exist.

- [ ] **Step 3: Implement repository**

Export `listReviewPackages`, `getReviewPackage`, `saveAdminDraft`, `requestChanges`, `approvePackage`, and `recordExport`. Use RPCs for mutations and include current draft content/source maps, quality report, locked facts, selected asset metadata, and signed processed-image URLs in detail loading.

- [ ] **Step 4: Implement queue and routes**

Add routes for `review`, `review/:packageId`, and `approved`. The queue exposes status filters `待審核`, `需修改`, `已核准`; shows target audience and visual style; and leaves list scroll position intact after returning from detail.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, and build. Commit:

```powershell
git commit -m "feat: add review queue and repositories"
```

### Task 3: Build the three-column review workbench

**Files:**
- Create: `src/studio/pages/StudioReviewPage.jsx`
- Create: `src/studio/pages/StudioReviewPage.test.jsx`
- Create: `src/studio/components/PlatformTabs.jsx`
- Create: `src/studio/components/DraftEditor.jsx`
- Create: `src/studio/components/AssetPicker.jsx`
- Create: `src/studio/components/CropControl.jsx`
- Create: `src/studio/components/SourceInspector.jsx`
- Create: `src/studio/components/QualityPanel.jsx`
- Modify: `src/styles/studio.css`

- [ ] **Step 1: Write failing workbench tests**

Assert a full package shows FB/IG/Threads tabs while a Threads-only package shows one tab; selecting a claim shows its fact paths and values; changing the lead image and focal crop remains scoped to the active platform; blocked quality issues are visible; `核准整份完稿` is disabled when any included variant is blocking; mobile layout preserves all controls and source evidence.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/pages/StudioReviewPage.test.jsx`.

Expected: FAIL because the workbench does not exist.

- [ ] **Step 3: Implement focused components**

`PlatformTabs` owns only active platform selection. `DraftEditor` renders title/body/hashtags/alt text and maps claim sentences to selectable marks. `AssetPicker` lists only ready/publishable processed images from the locked project and changing the lead image creates an unsaved draft change. `CropControl` exposes horizontal/vertical focal positions from 0–100 and previews `object-position`. `SourceInspector` resolves `facts.*` paths without evaluating code. `QualityPanel` displays deterministic and semantic issue codes, source status, image permission, and buttons for package approval or platform-specific return.

- [ ] **Step 4: Implement responsive layout and state**

Desktop uses `210px minmax(0,1fr) 300px`. Below 980px stack sidebar/quality under content; below 620px stack image/editor. Keep unsaved text, selected asset ID, and crop coordinates per platform when switching tabs; warn before navigation and never autosave partial changes. Saving creates one new draft version containing text plus media/template configuration.

- [ ] **Step 5: Verify and commit**

Run focused/all Studio tests, lint, build, and commit:

```powershell
git commit -m "feat: add source-aware review workbench"
```

### Task 4: Add manual edits and selection-only regeneration

**Files:**
- Create: `server/content/regenerateSelection.test.js`
- Create: `server/content/regenerateSelection.js`
- Create: `api/studio/regenerate.js`
- Modify: `src/studio/components/DraftEditor.jsx`
- Create: `src/studio/components/DraftEditor.test.jsx`

- [ ] **Step 1: Write failing version and partial-rewrite tests**

Assert manual save sends expected current version and creates a new version; stale save returns conflict without losing local text; regeneration receives only selected field/paragraph plus facts and surrounding context; returned replacement changes only that selection and updates only its source-map entries.

- [ ] **Step 2: Verify failure**

Run server and component focused tests. Expected: FAIL because partial regeneration is missing.

- [ ] **Step 3: Implement structured partial regeneration**

Define output `{ replacement, claims[] }` where every claim has valid `facts.*` paths. Send locked facts, platform, full current copy as read-only context, selected text, and optional admin instruction. The developer prompt forbids changing other fields. Run deterministic/source checks on the merged result before saving.

- [ ] **Step 4: Implement endpoint and editor actions**

`POST /api/studio/regenerate` accepts `{ variantId, expectedVersionId, field, selectionStart, selectionEnd, instruction }`, authenticates admin, validates bounds, regenerates, calls `studio_save_admin_draft`, and returns the new version. `DraftEditor` provides `儲存修改` and `重生選取內容`; it preserves local edits on 409 and offers `重新載入最新版` explicitly.

- [ ] **Step 5: Verify and commit**

Run focused tests, all tests, lint, and commit:

```powershell
git commit -m "feat: add versioned edits and partial regeneration"
```

### Task 5: Implement deterministic A/B/C artwork templates

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.html`
- Modify: `src/main.jsx`
- Create: `src/studio/artwork/RealWorkArtwork.jsx`
- Create: `src/studio/artwork/EditorialArtwork.jsx`
- Create: `src/studio/artwork/KnowledgeArtwork.jsx`
- Create: `src/studio/artwork/ArtworkPreview.jsx`
- Create: `src/studio/artwork/ArtworkPreview.test.jsx`
- Create: `src/styles/studio-artwork.css`

- [ ] **Step 1: Install exact self-hosted font dependencies**

```powershell
npm install @fontsource/noto-sans-tc@5.3.0 @fontsource/noto-serif-tc@5.3.0 @fontsource/cormorant-garamond@5.3.0
```

Expected: the fonts are bundled by Vite; no network request is needed during preview/export.

- [ ] **Step 2: Write failing template-contract tests**

Assert every template exposes `data-export-width="1080"`, `data-export-height="1350"`, uses the supplied real image URL, renders `曜聖景觀`, does not use `contenteditable`, and reports overflow instead of shrinking body text below 32px or metadata below 22px.

- [ ] **Step 3: Verify failure**

Run `npm test -- --run src/studio/artwork/ArtworkPreview.test.jsx`.

Expected: FAIL because templates do not exist.

- [ ] **Step 4: Implement fonts, templates, and export-safe CSS**

Remove the Google Fonts/preconnect links from `index.html`. Import the exact 400/500/600 weights used by the public site and Studio before local styles in `src/main.jsx`:

```js
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/500.css'
import '@fontsource/noto-sans-tc/600.css'
import '@fontsource/noto-serif-tc/400.css'
import '@fontsource/noto-serif-tc/500.css'
import '@fontsource/noto-serif-tc/600.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
```

Implement three bounded templates:

- `RealWorkArtwork`: image occupies at least 85%; small brand badge and bottom project caption.
- `EditorialArtwork`: full image, controlled dark gradient, English brand label, one title of at most 36 Traditional Chinese characters.
- `KnowledgeArtwork`: image 54%, forest panel 46%, label, title, and one short explanatory paragraph.

All templates take `{ imageUrl, imageAlt, title, eyebrow, body, crop }`, apply crop as `object-position`, and set `crossOrigin="anonymous"` on images. No template adds, removes, or inpaints scene content. Create fixed 1080×1350 artwork rules with approved tokens, safe padding ≥ 64px, and explicit overflow detection through `ResizeObserver`; import after `studio.css`.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, build, confirm `rg -n "fonts.googleapis|fonts.gstatic" index.html src dist` has no matches, inspect all three templates at 100% scale, and commit:

```powershell
git commit -m "feat: add deterministic social artwork templates"
```

### Task 6: Export approved PNGs, text, manifest, and ZIP

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/studio/export/renderArtwork.test.js`
- Create: `src/studio/export/renderArtwork.js`
- Create: `src/studio/export/buildContentZip.test.js`
- Create: `src/studio/export/buildContentZip.js`
- Create: `src/studio/components/ExportPackageButton.jsx`
- Create: `src/studio/components/ExportPackageButton.test.jsx`

- [ ] **Step 1: Install pinned export dependencies**

```powershell
npm install html-to-image@1.11.13 jszip@3.10.1
```

- [ ] **Step 2: Write failing rendering/manifest tests**

Mock `toPng` and assert only an approved package renders, output uses 1080×1350 and `pixelRatio: 1`, waits for `document.fonts.ready` and image decode, and blocks overflow. Assert ZIP paths are `facebook/`, `instagram/`, `threads/`, plus `manifest.json`; every platform folder has UTF-8 `caption.txt` and `alt-text.txt`; image platforms include PNG files.

- [ ] **Step 3: Verify failure**

Run export tests. Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement renderer and ZIP builder**

`renderArtwork(element)` validates approval/overflow attributes, awaits fonts and all descendant image decodes, then calls `toPng(element,{ width:1080,height:1350,pixelRatio:1,cacheBust:true })`. `buildContentZip(packageData, renderedImages)` builds deterministic filenames using project slug, platform, and version; includes captions, alt text, selected asset IDs, fact version, draft version IDs, approval timestamp, and SHA-256 hashes in `manifest.json`.

`ExportPackageButton` is absent for non-approved packages. It offers each generated PNG/text file separately and `下載完整 ZIP`; all options use the same manifest/version IDs. After browser download succeeds, call `recordExport`; if recording fails, show `檔案已下載，但匯出紀錄尚未保存` without redownloading automatically.

- [ ] **Step 5: Verify and commit**

Run focused/all tests, lint, build, download one real package, inspect image dimensions and ZIP paths, then commit:

```powershell
git commit -m "feat: export approved social content packages"
```

### Task 7: Manage brand rules and approved examples

**Files:**
- Create: `supabase/migrations/202608180005_brand_rule_metadata.sql`
- Create: `src/studio/api/brandRules.test.js`
- Create: `src/studio/api/brandRules.js`
- Create: `src/studio/pages/StudioBrandRulesPage.jsx`
- Create: `src/studio/pages/StudioBrandRulesPage.test.jsx`
- Modify: `src/studio/pages/StudioReviewPage.jsx`
- Modify: `src/studio/StudioApp.jsx`

- [ ] **Step 1: Write failing brand-memory tests**

Assert the admin can list/add/deactivate banned phrases, preferred terms, and CTAs; cannot create an empty/duplicate active rule; and can add an approved current draft as an `approved_example` carrying package/platform/version IDs in audit metadata.

- [ ] **Step 2: Verify failure**

Run the two focused test files. Expected: FAIL because brand-rule repository/UI do not exist.

- [ ] **Step 3: Implement repository mutations**

Create the migration:

```sql
alter table public.studio_brand_rules
  add column metadata jsonb not null default '{}'::jsonb
  check (jsonb_typeof(metadata) = 'object');
```

Export explicit list/insert/deactivate functions over `studio_brand_rules`. Deactivation sets `active=false` rather than deleting. Adding an approved example stores a concise label in `value`, the exact approved content plus package/platform/version IDs in `metadata`, and writes an audit event. Reject content from an unapproved package.

- [ ] **Step 4: Implement UI and review handoff**

Add `/studio/brand-rules` with grouped active/inactive rules and accessible add/deactivate controls. On an approved Review page, show `加入品牌範例`; require a short reason and never auto-add every approval. Generation reads only active rules.

- [ ] **Step 5: Verify and commit**

Run focused/all tests, DB tests, lint, and build. Commit:

```powershell
git commit -m "feat: manage studio brand writing rules"
```

### Task 8: Measure the 20-package calibration target

**Files:**
- Create: `server/quality/editDistance.test.js`
- Create: `server/quality/editDistance.js`
- Create: `scripts/report-content-calibration.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write the failing edit-ratio test**

Assert identical text is 0, fully different equal-length text is near 1, and Traditional Chinese punctuation/whitespace normalization prevents formatting-only changes from inflating the ratio.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run server/quality/editDistance.test.js`.

Expected: FAIL because the metric is missing.

- [ ] **Step 3: Implement deterministic calibration metric**

Normalize Unicode to NFC, collapse whitespace, and compute Levenshtein distance divided by the maximum normalized length. A package counts as `minor edit` only when every included platform ratio ≤ 0.20 and `core_angle_changed = false`.

- [ ] **Step 4: Implement report command**

`report-content-calibration.mjs` uses server Supabase credentials, loads the latest 20 approved packages with their version-1 and approved text, calculates platform/package ratios, groups results by the 50/30/20 audiences and 30/60/10 visual styles, prints counts, and exits 1 when fewer than 20 packages exist or minor-edit approval is below 80%.

Add `"quality:calibration": "node scripts/report-content-calibration.mjs"` and document safe execution.

- [ ] **Step 5: Verify and commit**

Run the unit test and the report against seeded fixtures. Commit:

```powershell
git commit -m "test: add content calibration report"
```

### Task 9: Add browser E2E and run the review/export gate

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.js`
- Create: `e2e/studio-review.spec.js`
- Modify: `README.md`

- [ ] **Step 1: Install Playwright and add scripts**

```powershell
npm install --save-dev @playwright/test@1.62.1
npx playwright install chromium
```

Add `"test:e2e": "playwright test"`.

- [ ] **Step 2: Write the failing end-to-end path**

Seed a local admin, one project, facts, processed publishable image, and ready package. Test login, queue open, platform switching, source inspection, manual edit save, stale-version conflict in a second page, platform return, re-open, package approval, PNG preview, ZIP download, and audit/export rows.

- [ ] **Step 3: Verify the E2E test fails before full wiring**

Run `npm run test:e2e -- e2e/studio-review.spec.js`.

Expected: FAIL at the first incomplete workbench/export assertion.

- [ ] **Step 4: Finish wiring and run the complete gate**

```powershell
npm run supabase:reset
npm run test:db
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

Expected: all commands pass; downloaded PNG is exactly 1080×1350 and ZIP contains all documented files.

- [ ] **Step 5: Commit E2E coverage and documentation**

```powershell
git add package.json package-lock.json playwright.config.js e2e README.md
git commit -m "test: cover studio review and export flow"
```

## Plan 3 completion gate

Do not begin Plan 4 until the admin can inspect fact evidence, save conflict-safe edits, regenerate only a selection, request changes, approve exact immutable versions, export correct A/B/C PNGs and ZIPs, and the calibration report can evaluate 20 approved packages against the 80% minor-edit target.
