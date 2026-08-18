# Yaosei Weekly Draft Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-controlled weekly process that prepares three FB/IG/Threads packages plus four Threads-only drafts, records every skipped/failed slot, and sends one LINE review notification without publishing externally.

**Architecture:** Store scheduling preferences and run history in Supabase, expose token-authenticated idempotent automation endpoints, and let n8n call a weekly-plan endpoint then process each slot. Reuse the Plan 2 generation state machine with explicit target platforms; LINE notification is a non-blocking final step.

**Tech Stack:** Supabase/Postgres, existing Node/Vercel server modules, n8n workflow export, LINE Messaging API, React/Vitest/Playwright.

---

## Delivery boundary

This plan never connects to Facebook, Instagram, Threads, Meta Business, or a social publishing API. It creates reviewable drafts only.

## File map

- `supabase/migrations/202608180006_weekly_automation.sql`: singleton settings, run/slot history and notification status.
- `supabase/tests/weekly_automation.test.sql`: enable/disable, uniqueness and RLS tests.
- `server/automation/buildWeeklyPlan.js`: seven-slot plan and rolling quota selection.
- `server/automation/runWeeklySlot.js`: target-platform call into Plan 2.
- `server/http/automationAuth.js`: constant-time automation-token authentication.
- `api/automation/weekly-plan.js`, `api/automation/generate-slot.js`, `api/automation/finish-run.js`: idempotent workflow endpoints.
- `automation/n8n/weekly-drafts.workflow.json`: Monday schedule and slot loop.
- `automation/n8n/weekly-drafts-error.workflow.json`: terminal error recorder.
- `automation/n8n/README.md`: import, credentials, timezone, activation and rollback.
- `server/notifications/line.js`: one-to-one push message with retry key.
- `src/studio/api/automation.js`, `src/studio/pages/StudioSettingsPage.jsx`: toggle, fixed schedule display and status UI.
- `e2e/studio-automation.spec.js`: disabled/enabled/idempotent/notification path.

Every `server/**/*.test.js` file begins with `// @vitest-environment node`; React tests use jsdom.

Use the official LINE documentation for [push messages](https://developers.line.biz/en/reference/messaging-api/#send-push-message) and [sending messages](https://developers.line.biz/en/docs/messaging-api/sending-messages/). The recipient must add the LINE Official Account as a friend; credentials remain server-side.

### Task 1: Persist settings, runs, slots, and notification status

**Files:**
- Create: `supabase/migrations/202608180006_weekly_automation.sql`
- Create: `supabase/tests/weekly_automation.test.sql`

- [ ] **Step 1: Write the failing pgTAP contract**

Assert singleton table `studio_automation_settings`, tables `studio_automation_runs` and `studio_automation_slots`, RLS, unique `run_key`, unique `(run_id, slot_key)`, timezone default `Asia/Taipei`, local time default `08:00`, and disabled default.

- [ ] **Step 2: Verify failure**

Run `npm run test:db`.

Expected: FAIL because automation tables do not exist.

- [ ] **Step 3: Implement the automation migration**

```sql
create type public.studio_automation_run_status as enum ('planned','running','completed','completed_with_issues','failed');
create type public.studio_automation_slot_status as enum ('planned','queued','ready_for_review','skipped','failed');

create table public.studio_automation_settings (
  singleton boolean primary key default true check (singleton),
  weekly_drafts_enabled boolean not null default false,
  timezone text not null default 'Asia/Taipei' check (timezone = 'Asia/Taipei'),
  run_weekday smallint not null default 1 check (run_weekday between 1 and 7),
  run_local_time time not null default '08:00',
  line_notification_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.studio_automation_settings(singleton) values (true);

create table public.studio_automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  status public.studio_automation_run_status not null default 'planned',
  planned_count integer not null default 0,
  ready_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  notification_status text not null default 'not_requested' check (notification_status in ('not_requested','pending','sent','failed')),
  notification_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.studio_automation_slots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.studio_automation_runs(id) on delete cascade,
  slot_key text not null,
  target_date date not null,
  target_platforms public.studio_platform[] not null check (cardinality(target_platforms) > 0),
  project_id uuid references public.studio_projects(id),
  audience public.studio_audience,
  visual_style public.studio_visual_style,
  status public.studio_automation_slot_status not null default 'planned',
  generation_job_id uuid references public.studio_generation_jobs(id),
  reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, slot_key)
);
```

Attach updated-at triggers, enable RLS, and add admin policies. Add a server-only RPC `studio_claim_automation_run(run_key)` that returns the existing run or creates exactly one row under an advisory lock.

- [ ] **Step 4: Complete tests**

Assert direct anon/authenticated non-admin access is blocked, settings remain one row, duplicate run/slot keys fail, and `studio_claim_automation_run` is idempotent.

- [ ] **Step 5: Reset, test, lint, and commit**

```powershell
npm run supabase:reset
npm run test:db
npx supabase db lint --local --level error
git commit -m "feat: add weekly automation persistence"
```

### Task 2: Build the seven-slot weekly planner

**Files:**
- Create: `server/automation/buildWeeklyPlan.test.js`
- Create: `server/automation/buildWeeklyPlan.js`
- Modify: `server/generation/runGenerationJob.js`
- Modify: `server/generation/runGenerationJob.test.js`

- [ ] **Step 1: Write failing weekly-plan tests**

For a Monday date in `Asia/Taipei`, assert seven slots: Monday/Wednesday/Friday target all three platforms; Tuesday/Thursday/Saturday/Sunday target Threads only. Assert rolling audience/style deficits are honored, no project repeats within 14 days when alternatives exist, insufficient projects yield `skipped` with `INSUFFICIENT_ELIGIBLE_PROJECTS`, and no filler content is invented.

- [ ] **Step 2: Verify failure**

Run weekly planner and generation tests. Expected: FAIL because weekly planning/target platforms are incomplete.

- [ ] **Step 3: Implement exact slot construction**

```js
export const weeklySlots = [
  { offset: 0, key: 'mon', platforms: ['facebook', 'instagram', 'threads'] },
  { offset: 1, key: 'tue', platforms: ['threads'] },
  { offset: 2, key: 'wed', platforms: ['facebook', 'instagram', 'threads'] },
  { offset: 3, key: 'thu', platforms: ['threads'] },
  { offset: 4, key: 'fri', platforms: ['facebook', 'instagram', 'threads'] },
  { offset: 5, key: 'sat', platforms: ['threads'] },
  { offset: 6, key: 'sun', platforms: ['threads'] },
]
```

Use calendar-date arithmetic in `Asia/Taipei`, not server-local time. Select only ready projects with a current fact card and eligible publishable asset. Apply rolling 20-package 50/30/20 audience and 30/60/10 visual targets. Prefer unused project/angle combinations; mark a slot skipped when constraints cannot be met.

- [ ] **Step 4: Extend generation to explicit target platforms**

Add `targetPlatforms` to `runGenerationJob`, store it in the brief, validate unique allowed values, require generated variants to exactly match, and persist only those variants. Pass the slot `target_date` as `suggestedPublishDate`; existing manual calls pass all three platforms and keep previous behavior.

- [ ] **Step 5: Verify and commit**

Run focused/all server tests and commit:

```powershell
git commit -m "feat: plan weekly cross-platform drafts"
```

### Task 3: Add token-authenticated automation endpoints

**Files:**
- Create: `server/http/automationAuth.test.js`
- Create: `server/http/automationAuth.js`
- Create: `server/automation/runWeeklySlot.test.js`
- Create: `server/automation/runWeeklySlot.js`
- Create: `api/automation/weekly-plan.js`
- Create: `api/automation/generate-slot.js`
- Create: `api/automation/finish-run.js`

- [ ] **Step 1: Write failing auth and idempotency tests**

Assert missing/wrong `X-Studio-Automation-Token` returns 401 using constant-time comparison, valid token passes, duplicate `runKey` returns the same run/slots, duplicate slot call returns the same generation job, skipped slots return 200 without AI call, and finishing recomputes counts from slots rather than trusting request numbers.

- [ ] **Step 2: Verify failure**

Run the focused server tests. Expected: FAIL because endpoints/auth are missing.

- [ ] **Step 3: Implement constant-time token auth**

Hash received and configured tokens with SHA-256 into equal-length buffers, compare with `crypto.timingSafeEqual`, reject absent/empty input, and never log either token. This auth is separate from browser bearer auth.

- [ ] **Step 4: Implement endpoint contracts**

- `POST weekly-plan { runKey, weekStart }`: if disabled return 409 `AUTOMATION_DISABLED`; claim run, persist seven slots, return `{ runId, slots }`.
- `POST generate-slot { runId, slotId }`: lock slot; return existing terminal result; call generation with idempotency key `${runId}:${slotKey}` and target platforms; persist job/status/reason.
- `POST finish-run { runId }`: count slot states, set `completed` or `completed_with_issues`, mark notification pending when enabled, and return summary.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint, build, and commit:

```powershell
git commit -m "feat: add idempotent automation endpoints"
```

### Task 4: Commit importable n8n schedule and error workflows

**Files:**
- Create: `automation/n8n/weekly-drafts.workflow.json`
- Create: `automation/n8n/weekly-drafts-error.workflow.json`
- Create: `automation/n8n/README.md`

- [ ] **Step 1: Create an inactive workflow export with exact nodes**

Create the workflow in n8n, export its actual JSON, and commit the export inactive. Set name `曜聖｜每週社群備稿`, timezone `Asia/Taipei`, and nodes in this exact connected order: `Monday 08:00 → Build ISO Week Key → Create Weekly Plan → Split Slots → Generate Slot → Finish Run → Send LINE Summary`.

Configure the Schedule Trigger for Monday 08:00. `Build ISO Week Key` emits `runKey=YYYY-Www` and the Taipei Monday date. HTTP nodes use JSON, `X-Studio-Automation-Token`, 30-second timeout, and never contain literal token values in the export; attach a Header Auth credential named `Yaosei Studio Automation` after import. Validate the committed export with:

```powershell
$workflow = Get-Content -Raw automation\n8n\weekly-drafts.workflow.json | ConvertFrom-Json
if ($workflow.active -ne $false) { throw 'Workflow export must be inactive' }
if ($workflow.settings.timezone -ne 'Asia/Taipei') { throw 'Workflow timezone must be Asia/Taipei' }
$expectedNodes = 'Monday 08:00|Build ISO Week Key|Create Weekly Plan|Split Slots|Generate Slot|Finish Run|Send LINE Summary'
if (($workflow.nodes.name -join '|') -ne $expectedNodes) { throw 'Workflow nodes are missing or out of order' }
```

- [ ] **Step 2: Configure bounded retries and slot continuation**

`Create Weekly Plan` and `Generate Slot` retry network ambiguity, 429, and 5xx responses at most three times with a fixed 30-second wait. The server already performs bounded 1/4-second provider retries; n8n retries only protect the HTTP boundary. Because API calls are idempotent, retries reuse the same run/slot keys. A 409 disabled result stops successfully; a 422/skipped slot continues; terminal 4xx authentication/validation errors invoke the error workflow.

- [ ] **Step 3: Create the error workflow**

The error workflow uses Error Trigger, extracts workflow/execution/node/error code, calls a server endpoint or records a safe failure message in `studio_automation_runs`, and contains no photo URL, access token, caption body, or fact-card JSON.

- [ ] **Step 4: Write operational documentation**

Document import, create Header Auth credential, set base URL, select the error workflow, run manually while inactive, inspect seven slot rows, then activate. Document immediate rollback: deactivate main workflow and turn off `weekly_drafts_enabled`; existing drafts remain reviewable.

- [ ] **Step 5: Validate exports and commit**

Import both JSON files into a local n8n instance, execute with automation disabled and enabled, export again, verify no credentials/secrets appear with `rg -n "token|secret|Bearer" automation/n8n`, then commit:

```powershell
git commit -m "feat: add weekly draft n8n workflows"
```

### Task 5: Send one non-blocking LINE review notification

**Files:**
- Modify: `.env.example`
- Create: `server/notifications/line.test.js`
- Create: `server/notifications/line.js`
- Create: `api/automation/notify-line.js`
- Modify: `automation/n8n/weekly-drafts.workflow.json`
- Modify: `automation/n8n/README.md`

- [ ] **Step 1: Write failing LINE request tests**

Mock `fetch` and assert POST URL `https://api.line.me/v2/bot/message/push`, bearer channel token, UUID `X-Line-Retry-Key`, recipient ID, one text message, and no caption/photo/sensitive facts. Assert 200 returns sent; non-2xx returns a safe status without failing an already completed draft run.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run server/notifications/line.test.js`.

Expected: FAIL because the notifier does not exist.

- [ ] **Step 3: Implement secrets and push request**

Add names only:

```dotenv
LINE_CHANNEL_ACCESS_TOKEN=server-only-line-token
LINE_RECIPIENT_ID=server-only-line-user-id
STUDIO_REVIEW_BASE_URL=https://example.com/#/studio/review
```

`sendLineReviewSummary({ run, reviewUrl, fetchImpl })` sends: `本週備稿已完成：可審核 X 篇、略過 Y 篇、失敗 Z 篇。前往審核：<URL>`. Use `crypto.randomUUID()` as retry key and parse no response body unless JSON content type is present.

- [ ] **Step 4: Add endpoint and non-blocking workflow step**

`notify-line` authenticates automation token, returns 204 without sending when settings disable LINE, sends once when status is pending, stores `sent` or `failed`, and returns 200 for a LINE delivery failure so draft completion is not rolled back. The n8n final node always calls this endpoint after `finish-run`.

- [ ] **Step 5: Verify and commit**

Run unit tests and one sandbox/real Official Account smoke test after the recipient has added the account as a friend. Commit:

```powershell
git commit -m "feat: notify LINE when weekly drafts are ready"
```

### Task 6: Add admin automation settings and run history

**Files:**
- Create: `src/studio/api/automation.test.js`
- Create: `src/studio/api/automation.js`
- Create: `src/studio/pages/StudioSettingsPage.jsx`
- Create: `src/studio/pages/StudioSettingsPage.test.jsx`
- Modify: `src/studio/StudioApp.jsx`
- Modify: `src/styles/studio.css`

- [ ] **Step 1: Write failing UI tests**

Assert weekly drafts default off; enabling requires confirmation explaining that drafts are not published; the fixed schedule displays Monday 08:00 Asia/Taipei as read-only; LINE cannot enable until server configuration reports ready; run history shows counts/reasons; and disabling affects the next n8n call without deleting current drafts.

- [ ] **Step 2: Verify failure**

Run `npm test -- --run src/studio/pages/StudioSettingsPage.test.jsx src/studio/api/automation.test.js`.

Expected: FAIL because settings UI/repository do not exist.

- [ ] **Step 3: Implement repository and settings form**

Load/update only the singleton row with explicit fields. Render Monday 08:00 and Asia/Taipei as read-only text, plus weekly and LINE toggles and a save button. Confirm activation with the exact text `系統每週只會建立待審核草稿，不會發布到任何社群。`. Changing weekday/time is outside this MVP because the n8n trigger is intentionally fixed.

- [ ] **Step 4: Implement run history and route**

Show the latest 12 runs, start/completion time in Taipei, ready/skipped/failed counts, notification status, and expandable slot reason codes. Add `/studio/settings` route and link. Do not display raw server error messages or tokens.

- [ ] **Step 5: Verify and commit**

Run focused/all tests, lint, build, and commit:

```powershell
git commit -m "feat: add weekly automation controls"
```

### Task 7: Run end-to-end automation and operational gates

**Files:**
- Create: `e2e/studio-automation.spec.js`
- Modify: `README.md`

- [ ] **Step 1: Write the failing E2E scenarios**

Cover disabled run (no rows/jobs), enabled run (seven slots), three cross-platform and four Threads-only targets, insufficient素材 skips, duplicate workflow execution idempotency, one transient retry without duplicate package, notification failure not changing run completion, and Settings history rendering.

- [ ] **Step 2: Verify failure before final wiring**

Run `npm run test:e2e -- e2e/studio-automation.spec.js`.

Expected: FAIL at the first missing automation assertion.

- [ ] **Step 3: Document production checklist**

Document hosted Supabase migration, Vercel secrets, n8n credential/base URL/timezone/error workflow, LINE Official Account friendship, manual inactive execution, seven-slot inspection, notification check, activation, and rollback. State explicitly that no Meta token or social publishing permission is required in this phase.

- [ ] **Step 4: Run the complete MVP verification**

```powershell
npm run supabase:reset
npm run test:db
npm test -- --run
npm run lint
npm run build
npm run test:e2e
npm run quality:calibration
```

Expected: all automated gates pass; calibration passes only after at least 20 approved packages and ≥80% minor-edit approvals.

- [ ] **Step 5: Commit E2E and operations docs**

```powershell
git add e2e/studio-automation.spec.js README.md
git commit -m "test: verify weekly draft automation"
```

## Plan 4 completion gate

The MVP is complete only when the admin can enable/disable weekly preparation, exactly seven dated slots are created without duplicates, eligible slots generate correct target-platform drafts, shortages are visible instead of fabricated, one LINE summary is attempted, no social platform is contacted, and all review/export gates from Plan 3 remain green.
