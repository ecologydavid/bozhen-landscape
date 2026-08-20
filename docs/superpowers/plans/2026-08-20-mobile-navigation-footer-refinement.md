# Mobile Navigation and Footer Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved A-style full-width mobile editorial navigation, replace fragile leaf glyphs with the existing sprout language, and restore the obscured Footer without deploying or pushing.

**Architecture:** Keep the existing `SiteHeader` focus/inert state machine and change only its presentational content: a responsive garden visual is passed from `App`, rows expand to the drawer width, and the drawer reveals left-to-right. Standardize interactive botanical icons through `LeafIcon` and fix the Footer at the stacking-context boundary rather than hiding the symptom with arbitrary height cuts.

**Tech Stack:** React 19, React Router HashRouter, Vite, Vitest/Testing Library, CSS, Playwright Chromium.

---

## File map

- `src/components/ui/LeafIcon.jsx`: exposes a stable icon-name marker and remains the single SVG source.
- `src/components/ui/LeafIcon.test.jsx`: verifies sprout geometry and icon-name marker.
- `src/components/ui/LeafContactLinks.jsx`: uses sprout for both direct-contact buttons.
- `src/components/ui/ProjectCard.jsx`, `src/components/home/Hero.jsx`, `src/components/home/WorkProcess.jsx`, `src/components/home/ContactActions.jsx`, `src/data/services.js`: remove fragile leaf/arrowLeaf usage from visible UI.
- `src/App.jsx`: passes approved garden media to `SiteHeader`.
- `src/components/layout/SiteHeader.jsx`: renders the full-width editorial index and garden visual while preserving behavior.
- `src/components/layout/SiteHeader.test.jsx`: verifies all four full rows, garden visual, and sprout icons.
- `src/styles/mobile-navigation.css`: implements full-width rows, staggered row states, garden visual, and contact treatment.
- `src/styles/responsive.css`: implements the 88–90vw left-to-right drawer geometry and compact mobile Footer rhythm.
- `src/styles/layout.css`: creates a Footer stacking layer above the fixed scene background.
- `src/styles/layout.test.js`, `src/styles/responsive.test.js`: lock the drawer and Footer contracts.
- `e2e/site.spec.js`: verifies no overflow, menu geometry, Footer visibility, and fixed-bar clearance at real breakpoints.

### Task 1: Standardize interactive botanical icons

**Files:**
- Modify: `src/components/ui/LeafIcon.jsx`
- Modify: `src/components/ui/LeafIcon.test.jsx`
- Modify: `src/components/ui/LeafContactLinks.jsx`
- Modify: `src/components/ui/ProjectCard.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/home/WorkProcess.jsx`
- Modify: `src/components/home/ContactActions.jsx`
- Modify: `src/data/services.js`

- [ ] **Step 1: Write the failing icon contract**

Add this assertion to `LeafIcon.test.jsx` before implementation:

```jsx
test('identifies the approved sprout glyph for visual consistency', () => {
  const { container } = render(<LeafIcon name="sprout" />)
  expect(container.querySelector('svg')).toHaveAttribute('data-icon', 'sprout')
  expect(container.querySelectorAll('path')).toHaveLength(4)
})
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm test -- --run src/components/ui/LeafIcon.test.jsx`

Expected: FAIL because the SVG has no `data-icon` attribute.

- [ ] **Step 3: Implement the icon marker and replace fragile usages**

Add `data-icon={name}` to the `LeafIcon` SVG. Replace visible `name="leaf"` and `name="arrowLeaf"` props with `name="sprout"`; change the planting service icon from `'leaf'` to `'sprout'`. Keep the legacy path definitions temporarily to avoid an unrelated public API removal.

- [ ] **Step 4: Verify no fragile glyph is rendered by production components**

Run:

```powershell
rg -n 'name="(leaf|arrowLeaf)"|icon:\s*''(leaf|arrowLeaf)''' src/components src/data/services.js
npm test -- --run src/components/ui/LeafIcon.test.jsx src/components/ui/LeafContactLinks.test.jsx
```

Expected: `rg` returns no production usage and focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/components src/data/services.js
git commit -m "fix: unify interactive plant icons"
```

### Task 2: Build the approved A-style mobile editorial drawer

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/SiteHeader.jsx`
- Modify: `src/components/layout/SiteHeader.test.jsx`
- Modify: `src/styles/mobile-navigation.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write the failing structural tests**

Extend the first `SiteHeader.test.jsx` test with:

```jsx
expect(container.querySelectorAll('.site-nav__item')).toHaveLength(4)
expect(container.querySelectorAll('.site-nav__item [data-icon="sprout"]')).toHaveLength(4)
expect(screen.getByRole('img', { name: '導覽中的彰化私人住宅庭園實景' })).toBeInTheDocument()
expect(screen.getByText('把自然，安放進日常')).toBeInTheDocument()
```

Render the component with `navigationImage={siteContent.hero.image}` and `navigationImageAlt={siteContent.hero.alt}`.

- [ ] **Step 2: Run the header test and observe RED**

Run: `npm test -- --run src/components/layout/SiteHeader.test.jsx`

Expected: FAIL because the navigation visual and unified row icons do not exist.

- [ ] **Step 3: Add the responsive garden visual without changing menu behavior**

Pass `siteContent.hero.image` and `siteContent.hero.alt` from `App` to `SiteHeader`. Import `BrandImage` in `SiteHeader` and render after `.site-nav__index`:

```jsx
<div className="site-nav__visual">
  <BrandImage
    src={navigationImage}
    alt={`導覽中的${navigationImageAlt}`}
    sizes="(max-width: 768px) 72vw, 1px"
    loading="eager"
    decoding="async"
  />
  <span>把自然，安放進日常</span>
</div>
```

Change each row icon to `<LeafIcon name="sprout" />`. Do not change focus trapping, route-change cleanup, Escape behavior, contact hrefs, or menu state callbacks.

- [ ] **Step 4: Implement the A visual system**

In `mobile-navigation.css`, make `.site-nav__index` and `.site-nav__visual` `width:100%`; set mobile rows to at least `82px`; add the garden visual at `118px` height with an 8–10px radius, dark image gradient, and overlaid serif tagline. Set row hover/focus to a localized translucent moss surface, gold hairline, and white-on-moss sprout state.

In `responsive.css`, preserve `inset:12px 12px 12px max(52px,14vw)` and change the closed/open transition to:

```css
.site-nav {
  clip-path: inset(0 100% 0 0 round var(--canvas-radius));
  opacity: 0;
  transform: translateX(-24px);
}
.site-nav.is-open {
  clip-path: inset(0 0 0 0 round var(--canvas-radius));
  opacity: 1;
  transform: translateX(0);
}
```

Retain immediate visibility on open and delayed hidden visibility on close.

- [ ] **Step 5: Run focused tests and static CSS checks**

Run:

```powershell
npm test -- --run src/components/layout/SiteHeader.test.jsx src/styles/responsive.test.js src/styles/layout.test.js
npm run lint
```

Expected: all focused tests and lint pass.

- [ ] **Step 6: Commit**

```powershell
git add src/App.jsx src/components/layout/SiteHeader.jsx src/components/layout/SiteHeader.test.jsx src/styles/mobile-navigation.css src/styles/responsive.css
git commit -m "feat: expand mobile navigation into editorial index"
```

### Task 3: Restore Footer stacking and compact the mobile rhythm

**Files:**
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/styles/layout.test.js`
- Modify: `src/styles/responsive.test.js`

- [ ] **Step 1: Write failing stacking and spacing tests**

Add to `layout.test.js`:

```js
test('keeps the Footer above the fixed scene environment', () => {
  expect(stylesheet).toMatch(
    /\.site-footer \{[\s\S]*?position: relative;[\s\S]*?z-index: 2;[\s\S]*?background: var\(--forest-950\);/,
  )
})
```

Add to `responsive.test.js`:

```js
test('uses a compact mobile Footer rhythm above the contact safe area', () => {
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.site-footer \{[\s\S]*?padding: 56px 24px 24px;/,
  )
  expect(stylesheet).toMatch(
    /@media \(max-width: 768px\) \{[\s\S]*?\.site-footer__inner \{[\s\S]*?gap: 30px;[\s\S]*?padding-bottom: 40px;/,
  )
})
```

- [ ] **Step 2: Run the tests and observe RED**

Run: `npm test -- --run src/styles/layout.test.js src/styles/responsive.test.js`

Expected: FAIL because Footer stacking and mobile rhythm are not defined.

- [ ] **Step 3: Fix the root stacking issue and mobile proportions**

Add `position:relative` and `z-index:2` to `.site-footer` before its existing background declaration. Under `@media (max-width:768px)`, set Footer padding to `56px 24px 24px`; reduce `.site-footer__inner` to `gap:30px` and `padding-bottom:40px`. Under 560px, keep one column but reduce its gap to `28px` and do not restore the former 64px top padding.

- [ ] **Step 4: Run focused and full unit gates**

Run:

```powershell
npm test -- --run src/styles/layout.test.js src/styles/responsive.test.js
npm test -- --run
```

Expected: focused and full Vitest suites pass.

- [ ] **Step 5: Commit**

```powershell
git add src/styles/layout.css src/styles/responsive.css src/styles/layout.test.js src/styles/responsive.test.js
git commit -m "fix: restore visible compact site footer"
```

### Task 4: Browser regression and local handoff

**Files:**
- Modify: `e2e/site.spec.js`

- [ ] **Step 1: Add the failing browser contract**

Add one parameterized test for 320×800, 390×844, 768×1024, 769×1024, 1280×900, and 1920×1080. For mobile widths, open the menu and assert all four `.site-nav__item` boxes have at least 82px height, equal right edges, and no horizontal overflow. At every width, scroll to the Footer and assert `.site-footer__brand`, `.site-footer__services`, `.site-footer__links`, `.site-footer__contact`, and `.site-footer__bottom` are visible. On mobile, assert the fixed contact bar does not intersect `.site-footer__bottom`.

- [ ] **Step 2: Run the focused E2E test and observe RED if any contract is unmet**

Run: `npx playwright test e2e/site.spec.js --grep "editorial drawer and visible Footer"`

Expected before final CSS corrections: FAIL on at least the Footer visual/geometry contract or missing test selectors.

- [ ] **Step 3: Make the smallest CSS correction required by real Chromium**

Only adjust drawer row width/padding, Footer z-index/spacing, or mobile safe-area padding when the browser failure identifies a concrete overlap or overflow. Do not change content, routes, or external links.

- [ ] **Step 4: Run final local gates**

Run:

```powershell
npm test -- --run
npm run lint
npm run build
npm run fonts:check
npx playwright test
git diff --check
git status --short
```

Expected: all tests, lint, build, font budget, browser matrix, and diff check pass; only intended source/test/docs changes are present.

- [ ] **Step 5: Commit the browser guard**

```powershell
git add e2e/site.spec.js
git commit -m "test: guard mobile navigation and footer geometry"
```

- [ ] **Step 6: Start the local preview and hand it to the user**

Run `npm run dev -- --host 127.0.0.1 --port 4174`, reload the existing local browser tab, open the menu at a mobile width, then scroll the home page and a project page to the Footer. Keep the page open for user review. Do not deploy, merge, or push.

