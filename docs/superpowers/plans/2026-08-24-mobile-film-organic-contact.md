# Mobile Film and Organic Contact Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable preference-aware Hero video on mobile, restyle the selected Hero and mobile quick-contact pairs as “stone and sprout” controls, and remove the tax identifier from the Footer only.

**Architecture:** Keep media preference logic inside `HeroMedia`, extending its existing hook pattern with a small Save-Data observer. Keep contact data and links unchanged; scope the new visual treatment through an explicit modifier class passed only by `Hero` and `MobileQuoteBar`. Remove only the Footer rendering of `contact.taxId`, leaving `ContactActions` and the source data intact.

**Tech Stack:** React 19, Vite 8, Vitest + Testing Library, CSS, Playwright Chromium.

---

## File map

- Modify `src/components/home/HeroMedia.jsx`: decide whether to mount the film from reduced-motion and Save-Data preferences, not viewport width.
- Modify `src/components/home/HeroMedia.test.jsx`: cover mobile playback, reduced motion, Save-Data, load failure, and preference listener cleanup.
- Modify `src/components/ui/LeafContactLinks.jsx`: render the shared stone-and-sprout modifier and decorative arrows without changing link data.
- Modify `src/components/ui/LeafContactLinks.test.jsx`: verify modifier, icons, arrows, links, and text.
- Modify `src/components/home/Hero.jsx`: opt the Hero pair into the stone-and-sprout modifier.
- Modify `src/components/layout/MobileQuoteBar.jsx`: opt the fixed mobile pair into the same modifier while retaining its visibility controller.
- Modify `src/styles/layout.css`: replace the old paired-leaf geometry with the shared stone base, organic action surfaces, and restrained states.
- Modify `src/styles/responsive.css`: preserve compact geometry and disable transforms under reduced motion.
- Modify `src/styles/layout.test.js` and `src/styles/responsive.test.js`: enforce the visual and reduced-motion contracts.
- Modify `src/components/layout/SiteFooter.jsx` and `src/App.test.jsx`: remove only the Footer tax identifier.
- Modify `e2e/responsive.spec.js`: verify mobile film, preference fallbacks, CTA geometry, footer removal, and breakpoint safety in Chromium.

### Task 1: Preference-aware mobile Hero film

**Files:**
- Modify: `src/components/home/HeroMedia.test.jsx`
- Modify: `src/components/home/HeroMedia.jsx`

- [ ] **Step 1: Write the failing mobile and Save-Data tests**

Replace the poster-only mobile expectation and add Save-Data coverage:

```jsx
test('mounts the film on a 390px viewport when motion and data preferences allow it', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  mockMotionPreference(false)
  mockConnectionPreference(false)

  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(screen.getByTestId('hero-video')).toHaveAttribute('autoplay')
  expect(screen.getByTestId('hero-video')).toHaveAttribute('playsinline')
})

test('uses only the responsive poster when Save-Data is enabled', () => {
  mockMotionPreference(false)
  mockConnectionPreference(true)

  render(
    <HeroMedia
      image={siteContent.hero.image}
      alt={siteContent.hero.alt}
      videoSrc="/hero.mp4"
    />,
  )

  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: siteContent.hero.alt })).toBeInTheDocument()
})
```

Add this helper near `mockMotionPreference` and restore the original descriptor in `afterEach`:

```jsx
const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection')

function mockConnectionPreference(saveData) {
  const connection = {
    saveData,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: connection,
  })
  return connection
}

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection)
  else delete navigator.connection
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm test -- --run src/components/home/HeroMedia.test.jsx
```

Expected: the mobile test fails because `.hero__video` is absent, and the Save-Data test fails because the video is still present.

- [ ] **Step 3: Implement the Save-Data hook and remove viewport suppression**

In `HeroMedia.jsx`, remove `mobileViewportQuery` and the mobile media-preference call. Add:

```jsx
function getDataSavingPreference() {
  if (typeof navigator === 'undefined') return false
  return navigator.connection?.saveData === true
}

function useDataSavingPreference() {
  const [saveData, setSaveData] = useState(getDataSavingPreference)

  useEffect(() => {
    const connection = navigator.connection
    if (!connection?.addEventListener) return undefined

    const updatePreference = () => setSaveData(getDataSavingPreference())
    connection.addEventListener('change', updatePreference)
    return () => connection.removeEventListener('change', updatePreference)
  }, [])

  return saveData
}
```

Then use:

```jsx
const reducedMotion = useMediaPreference(reducedMotionQuery)
const saveData = useDataSavingPreference()
const [videoFailed, setVideoFailed] = useState(false)
const [videoReady, setVideoReady] = useState(false)
const shouldPlayVideo = Boolean(videoSrc) && !reducedMotion && !saveData && !videoFailed
```

Keep `muted`, `loop`, `playsInline`, `autoPlay`, `preload="metadata"`, poster rendering, readiness fade, and error fallback unchanged.

- [ ] **Step 4: Run focused and related tests and verify GREEN**

Run:

```powershell
npm test -- --run src/components/home/HeroMedia.test.jsx src/components/home/Hero.test.jsx
```

Expected: all selected tests pass with no warnings.

- [ ] **Step 5: Commit the media behavior**

```powershell
git add src/components/home/HeroMedia.jsx src/components/home/HeroMedia.test.jsx
git commit -m "feat: enable adaptive mobile hero film"
```

### Task 2: “Stone and sprout” contact component

**Files:**
- Modify: `src/components/ui/LeafContactLinks.test.jsx`
- Modify: `src/components/ui/LeafContactLinks.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/layout/MobileQuoteBar.jsx`

- [ ] **Step 1: Write failing component tests for the explicit modifier and arrows**

Add these assertions:

```jsx
test('renders the stone-and-sprout modifier with two decorative arrows', () => {
  const { container } = render(
    <LeafContactLinks
      contact={siteContent.contact}
      className="leaf-contact-links--stone-sprout"
    />,
  )

  expect(container.querySelector('.leaf-contact-links')).toHaveClass(
    'leaf-contact-links--stone-sprout',
  )
  expect(container.querySelectorAll('.leaf-contact-links__arrow')).toHaveLength(2)
  expect(container.querySelectorAll('.leaf-icon')).toHaveLength(2)
})
```

In `Hero.test.jsx` and `MobileQuoteBar.test.jsx`, assert the rendered contact wrapper contains `leaf-contact-links--stone-sprout`.

- [ ] **Step 2: Run the component tests and verify RED**

Run:

```powershell
npm test -- --run src/components/ui/LeafContactLinks.test.jsx src/components/home/Hero.test.jsx src/components/layout/MobileQuoteBar.test.jsx
```

Expected: tests fail because the modifier is not supplied and decorative arrows do not exist.

- [ ] **Step 3: Add arrows and opt in only the approved surfaces**

In each link in `LeafContactLinks.jsx`, append:

```jsx
<span className="leaf-contact-links__arrow" aria-hidden="true">↗</span>
```

In `Hero.jsx`, render:

```jsx
<LeafContactLinks
  contact={contact}
  className="leaf-contact-links--stone-sprout"
/>
```

In `MobileQuoteBar.jsx`, render:

```jsx
<LeafContactLinks
  contact={contact}
  className="leaf-contact-links--mobile leaf-contact-links--stone-sprout"
/>
```

Do not change either URL, label, `target`, `rel`, or the mobile visibility logic.

- [ ] **Step 4: Run the component tests and verify GREEN**

Run:

```powershell
npm test -- --run src/components/ui/LeafContactLinks.test.jsx src/components/home/Hero.test.jsx src/components/layout/MobileQuoteBar.test.jsx
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit the semantic component change**

```powershell
git add src/components/ui/LeafContactLinks.jsx src/components/ui/LeafContactLinks.test.jsx src/components/home/Hero.jsx src/components/home/Hero.test.jsx src/components/layout/MobileQuoteBar.jsx src/components/layout/MobileQuoteBar.test.jsx
git commit -m "feat: identify stone and sprout contacts"
```

### Task 3: Organic stone-base styling

**Files:**
- Modify: `src/styles/layout.test.js`
- Modify: `src/styles/responsive.test.js`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write failing CSS contract tests**

Add to `layout.test.js`:

```js
test('builds the contact pair on one organic stone base', () => {
  expect(stylesheet).toMatch(
    /\.leaf-contact-links--stone-sprout \{[\s\S]*?isolation: isolate;[\s\S]*?border-radius: 17px 25px 15px 21px;/,
  )
  expect(stylesheet).toMatch(
    /\.leaf-contact-links--stone-sprout::after \{[\s\S]*?transform: rotate\(6deg\);/,
  )
  expect(stylesheet).toMatch(
    /\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:hover \{[\s\S]*?translateY\(-2px\);/,
  )
  expect(stylesheet).toMatch(/\.leaf-contact-links__arrow \{[\s\S]*?white-space: nowrap;/)
})
```

Add to `responsive.test.js`:

```js
test('stops organic contact motion when reduced motion is preferred', () => {
  expect(stylesheet).toMatch(
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.leaf-contact-links--stone-sprout \.leaf-contact-links__item:hover,[\s\S]*?transform: none;/,
  )
})
```

- [ ] **Step 2: Run the CSS tests and verify RED**

Run:

```powershell
npm test -- --run src/styles/layout.test.js src/styles/responsive.test.js
```

Expected: both new tests fail because the modifier rules do not exist.

- [ ] **Step 3: Implement the approved visual system**

Replace the old arc/overlap rules with modifier-scoped rules in `layout.css`:

```css
.leaf-contact-links--stone-sprout {
  position: relative;
  isolation: isolate;
  gap: 0;
  padding: 7px;
  border: 1px solid rgba(49, 87, 67, 0.42);
  border-radius: 17px 25px 15px 21px;
  background: linear-gradient(145deg, rgba(218, 212, 198, 0.72), rgba(250, 249, 245, 0.94));
  box-shadow: 0 15px 28px rgba(30, 50, 40, 0.09);
}

.leaf-contact-links--stone-sprout::before {
  position: absolute;
  z-index: -1;
  inset: 5px -5px -5px 5px;
  border: 1px solid rgba(49, 87, 67, 0.15);
  border-radius: 15px 24px 17px 20px;
  content: '';
  pointer-events: none;
}

.leaf-contact-links--stone-sprout::after {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 1px;
  background: linear-gradient(transparent, var(--moss-800) 22%, var(--moss-800) 78%, transparent);
  content: '';
  opacity: 0.55;
  transform: rotate(6deg);
}

.leaf-contact-links--stone-sprout .leaf-contact-links__item {
  z-index: 1;
  min-height: 56px;
  margin: 0;
  border: 0;
  box-shadow: none;
}

.leaf-contact-links--stone-sprout .leaf-contact-links__line {
  border-radius: 11px 22px 12px 18px;
  background: linear-gradient(115deg, var(--forest-900), var(--moss-700));
  box-shadow: 0 8px 15px rgba(30, 59, 45, 0.12);
}

.leaf-contact-links--stone-sprout .leaf-contact-links__phone {
  margin-left: 9px;
  border: 1px solid rgba(49, 87, 67, 0.46);
  border-radius: 21px 11px 18px 12px;
  background: rgba(250, 249, 245, 0.72);
}

.leaf-contact-links--stone-sprout .leaf-contact-links__item:hover {
  box-shadow: 0 10px 20px rgba(30, 59, 45, 0.12);
  transform: translateY(-2px);
}

.leaf-contact-links--stone-sprout .leaf-contact-links__item:active {
  transform: scale(0.99);
}

.leaf-contact-links__arrow {
  flex: 0 0 auto;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition: transform 220ms var(--ease);
}

.leaf-contact-links--stone-sprout .leaf-contact-links__item:hover .leaf-contact-links__arrow {
  transform: translate(3px, -2px);
}
```

Keep `.leaf-contact-links` as the two-column layout and retain `white-space: nowrap` on the links. In the existing reduced-motion block in `responsive.css`, add:

```css
.leaf-contact-links--stone-sprout .leaf-contact-links__item:hover,
.leaf-contact-links--stone-sprout .leaf-contact-links__item:active,
.leaf-contact-links--stone-sprout .leaf-contact-links__item:hover .leaf-contact-links__arrow {
  transform: none;
}
```

- [ ] **Step 4: Run CSS and component tests and verify GREEN**

Run:

```powershell
npm test -- --run src/styles/layout.test.js src/styles/responsive.test.js src/components/ui/LeafContactLinks.test.jsx src/components/layout/MobileQuoteBar.test.jsx
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit the visual treatment**

```powershell
git add src/styles/layout.css src/styles/layout.test.js src/styles/responsive.css src/styles/responsive.test.js
git commit -m "feat: style organic stone contact actions"
```

### Task 4: Remove the tax identifier from the Footer only

**Files:**
- Modify: `src/App.test.jsx`
- Modify: `src/components/layout/SiteFooter.jsx`

- [ ] **Step 1: Write the failing Footer-scope assertion**

Replace the current combined Footer assertion in `App.test.jsx` with:

```jsx
expect(screen.queryByText('統一編號 00111874')).not.toBeInTheDocument()
expect(screen.getByText('統一編號')).toBeInTheDocument()
expect(screen.getByText('00111874')).toBeInTheDocument()
```

This proves the Footer string is removed while `ContactActions` still shows the company data.

- [ ] **Step 2: Run the App test and verify RED**

Run:

```powershell
npm test -- --run src/App.test.jsx
```

Expected: FAIL because `SiteFooter` still renders `統一編號 00111874`.

- [ ] **Step 3: Remove only the Footer line**

Change `SiteFooter.jsx` to:

```jsx
<div className="site-footer__bottom">
  <small>© {new Date().getFullYear()} {brand.name}</small>
</div>
```

Do not change `siteContent.contact.taxId` or `ContactActions.jsx`.

- [ ] **Step 4: Run the App test and verify GREEN**

Run:

```powershell
npm test -- --run src/App.test.jsx
```

Expected: all App tests pass.

- [ ] **Step 5: Commit the Footer change**

```powershell
git add src/App.test.jsx src/components/layout/SiteFooter.jsx
git commit -m "fix: remove tax identifier from footer"
```

### Task 5: Browser regressions and final local preview

**Files:**
- Modify: `e2e/responsive.spec.js`

- [ ] **Step 1: Add browser regression expectations for mobile film, Save-Data, organic controls, and Footer**

Add these tests before the performance block:

```js
test('390px plays the Hero film and keeps stone contacts inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  await expect(page.locator('.hero__video')).toBeVisible()
  await expect(page.locator('.hero__actions .leaf-contact-links')).toHaveClass(/leaf-contact-links--stone-sprout/)
  await expectVisibleContactPairToFit(page)
  await page.locator('#services').scrollIntoViewIfNeeded()
  await expect(page.locator('.mobile-contact-bar .leaf-contact-links')).toHaveClass(/leaf-contact-links--stone-sprout/)
  await expect(page.getByText('統一編號 00111874')).toHaveCount(0)
})

test('Save-Data keeps the mobile Hero static and does not request the film', async ({ page }) => {
  const filmRequests = []
  page.on('request', (request) => {
    if (request.url().includes('nantun-water-garden')) filmRequests.push(request.url())
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(homeUrl, { waitUntil: 'networkidle' })

  await expect(page.locator('.hero__image')).toBeVisible()
  await expect(page.locator('.hero__video')).toHaveCount(0)
  expect(filmRequests).toEqual([])
})
```

- [ ] **Step 2: Run the new browser regressions against the unit-tested implementation**

Run:

```powershell
npx playwright test -g "390px plays the Hero film|Save-Data keeps the mobile Hero static"
```

Expected: both browser tests pass. RED evidence for these behaviors was already captured by the focused unit and CSS tests in Tasks 1–4 before production code changed.

- [ ] **Step 3: Rebuild and run focused browser tests**

Run:

```powershell
npm run build
npx playwright test -g "390px plays the Hero film|Save-Data keeps the mobile Hero static|reduced motion keeps the Hero static|mobile performance budget"
```

Expected: selected tests pass; the 390px LCP remains at or below 2.5 seconds.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
npm test -- --run
npm run lint
npm run build
npm run fonts:check
npx playwright test --workers=1
git diff --check
```

Expected: zero failures, zero lint errors, production build succeeds, font budget passes, all Chromium tests pass without retries, and `git diff --check` is empty.

- [ ] **Step 5: Inspect the approved viewport matrix locally**

Open `http://127.0.0.1:4174/#/` and verify 320, 390, 560, 768, 769, 1280, and 1920 widths. Confirm:

```text
- normal mobile: muted inline film is visible and fills Hero media
- Save-Data/reduced motion: poster is visible and film is absent
- Hero and fixed contact pairs use one stone base and two organic surfaces
- LINE/phone labels stay on one line and do not overlap the fixed bar
- Footer ends after copyright with no “統一編號 00111874” line
- no horizontal overflow, console errors, or unexpected bottom gap
```

- [ ] **Step 6: Commit browser coverage**

```powershell
git add e2e/responsive.spec.js
git commit -m "test: cover adaptive mobile contact experience"
```

- [ ] **Step 7: Keep the branch and worktree for user review**

Do not push, merge, deploy, or remove the worktree. Leave the preview server on `http://127.0.0.1:4174/#/` and open that URL in the Codex browser.
