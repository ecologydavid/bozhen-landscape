# Yaosei Japanese Scroll Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing React site into the approved「一屏一景」Japanese editorial landscape experience while preserving the printed Yaosei business-card identity, direct LINE/phone conversion, and real project facts.

**Architecture:** Keep the existing React Router and data-driven page structure. Add a small scene-state layer powered by IntersectionObserver, reusable SVG plant icons, and focused presentation components; CSS owns gradients, sticky scenes, responsive transformations, and reduced-motion fallbacks. The existing curated Drive-derived images remain local, while the asset builder emits WebP and AVIF without modifying Drive originals.

**Tech Stack:** React 19, React Router 7, Vite 8, native CSS, Vitest, React Testing Library, Sharp, self-hosted Fontsource WOFF2 packages, Playwright Chromium, GitHub Pages.

---

## Scope split

This plan implements the public website and the local approved-asset pipeline. It does **not** implement automatic Google Drive synchronization, AI auto-publishing, analytics, CRM, or a quote form. Selecting and AI-retouching additional Drive files remains an explicit human-review content operation; this plan ensures the public site can accept approved outputs safely.

## Baseline and repository safety

- `npm run build` currently passes.
- The unscoped `npm test -- --run` can discover sibling `.worktrees` tests; Task 1 isolates this repository before feature work.
- The untracked `規劃圖/` directory is user-owned. Never stage, move, rename, or delete it.
- Work on branch `codex/yaosei-brand-refresh`; do not merge or deploy until the complete verification task passes.

## File map

- `package.json`, `package-lock.json`: local fonts and Playwright scripts.
- `vite.config.js`, `vite.config.test.js`: root-only Vitest discovery.
- `eslint.config.js`: ignore worktrees and generated workbench folders.
- `src/main.jsx`: font and new scene/navigation stylesheet imports.
- `src/data/homeScenes.js`: ordered five-scene presentation data.
- `src/data/navigation.js`: numbered Chinese/English navigation labels.
- `src/data/services.js`, `src/data/projects.js`: visual metadata and image focal points.
- `src/hooks/useActiveScene.js`: dominant scene observation.
- `src/components/ui/LeafIcon.jsx`: unified SVG plant icon vocabulary.
- `src/components/ui/BrandImage.jsx`: WebP/AVIF `<picture>` with existing fallback behavior.
- `src/components/ui/LeafContactLinks.jsx`: reusable asymmetric LINE/phone leaf pair.
- `src/components/home/ScrollEnvironment.jsx`: decorative scene background layers.
- Existing home components: semantic scene markers and approved content hierarchy.
- `src/components/layout/SiteHeader.jsx`: refined mobile navigation and focus handling.
- `src/components/routing/ScrollToHash.jsx`: focus the requested section after navigation.
- `src/styles/tokens.css`: brand, font, radius, shadow, and timing tokens.
- `src/styles/scene.css`: environment gradients and one-screen-one-scene behavior.
- `src/styles/mobile-navigation.css`: mobile menu and double-leaf controls.
- Existing layout/home/projects/responsive CSS: component-specific polish and breakpoint rules.
- `scripts/build-project-assets.mjs`, `scripts/project-asset-manifest.mjs`: approved WebP/AVIF output.
- `.github/workflows/deploy-pages.yml`: browser QA before deployment.
- `playwright.config.js`, `e2e/responsive.spec.js`: overflow, navigation, reduced-motion, and contact regression checks.
- `README.md`: truthful maintenance, asset, QA, and deployment guidance.

### Task 1: Isolate tests and lint from sibling worktrees

**Files:**
- Modify: `vite.config.test.js`
- Modify: `vite.config.js`
- Modify: `eslint.config.js`

- [ ] **Step 1: Write the failing configuration assertions**

Append to `vite.config.test.js`:

```js
test('scopes unit tests to this worktree only', () => {
  expect(config.test.include).toEqual(['src/**/*.{test,spec}.{js,jsx}'])
  expect(config.test.exclude).toContain('**/.worktrees/**')
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
npx vitest run vite.config.test.js
```

Expected: FAIL because `config.test.include` and the `.worktrees` exclusion are not defined.

- [ ] **Step 3: Scope Vitest and ESLint**

Replace the `test` block in `vite.config.js` with:

```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.js',
  css: true,
  include: ['src/**/*.{test,spec}.{js,jsx}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.worktrees/**',
    '**/.superpowers/**',
    '**/workbench/**',
  ],
},
```

Change the first object in `eslint.config.js` to:

```js
{
  ignores: ['dist', '.worktrees', '.superpowers', 'workbench'],
},
```

- [ ] **Step 4: Run the root verification baseline**

Run:

```powershell
npm test -- --run
npm run lint
npm run build
```

Expected: the test output contains only `src/` paths; 10 root test files pass; lint and build exit 0.

- [ ] **Step 5: Commit**

```powershell
git add vite.config.js vite.config.test.js eslint.config.js
git commit -m "test: isolate public site verification"
```

### Task 2: Self-host the approved typography and create real SVG leaf icons

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.jsx`
- Modify: `src/styles/tokens.css`
- Create: `src/components/ui/LeafIcon.jsx`
- Create: `src/components/ui/LeafIcon.test.jsx`

- [ ] **Step 1: Install exact local font packages**

Run:

```powershell
npm install @fontsource/noto-serif-tc@5.3.0 @fontsource/noto-sans-tc@5.3.0 @fontsource-variable/manrope@5.3.0
```

Expected: exit 0; the three packages are recorded in `dependencies` and no external font URL is introduced.

- [ ] **Step 2: Write the failing SVG icon tests**

Create `src/components/ui/LeafIcon.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import LeafIcon from './LeafIcon'

test('keeps decorative plant icons out of the accessibility tree', () => {
  const { container } = render(<LeafIcon name="sprout" />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})

test('exposes a named icon when the icon carries meaning by itself', () => {
  render(<LeafIcon name="care" label="植栽養護" />)
  expect(screen.getByRole('img', { name: '植栽養護' })).toBeInTheDocument()
})
```

- [ ] **Step 3: Run the icon test and verify failure**

Run:

```powershell
npx vitest run src/components/ui/LeafIcon.test.jsx
```

Expected: FAIL because `LeafIcon.jsx` does not exist.

- [ ] **Step 4: Implement the icon vocabulary**

Create `src/components/ui/LeafIcon.jsx`:

```jsx
const iconPaths = {
  leaf: (
    <>
      <path d="M19.5 4.5C12 4.7 6.6 8.5 5.2 15.8c4.8 1.1 9.1-.1 11.8-3.3 1.8-2.1 2.6-4.8 2.5-8Z" />
      <path d="M5.3 18.8c2.6-4.2 6.1-7.3 10.8-9.4" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21V9.5" />
      <path d="M11.8 12.2C7.4 12.2 4.6 10 4 6c4.4-.2 7.2 1.8 7.8 6.2Z" />
      <path d="M12.2 8.9c.5-4 3.2-6.1 7.5-5.9-.4 4.1-3.1 6.1-7.5 5.9Z" />
      <path d="M6 21h12" />
    </>
  ),
  water: (
    <>
      <path d="M8.4 3.5C6 7 4.8 9.2 4.8 11.1a3.6 3.6 0 0 0 7.2 0c0-1.9-1.2-4.1-3.6-7.6Z" />
      <path d="M17.4 8.1c-1.9 2.8-2.9 4.6-2.9 6.1a2.9 2.9 0 0 0 5.8 0c0-1.5-1-3.3-2.9-6.1Z" />
    </>
  ),
  care: (
    <>
      <path d="M12 20V9" />
      <path d="M11.8 12C7.8 12 5.3 10 4.8 6.4c4-.2 6.5 1.6 7 5.6Z" />
      <path d="M12.2 9c.4-3.5 2.8-5.3 6.6-5.1-.4 3.6-2.7 5.3-6.6 5.1Z" />
      <path d="M3 21c2.2-2.4 4.3-3.2 6.5-2.5L12 20l2.5-1.5c2.2-.7 4.3.1 6.5 2.5" />
    </>
  ),
  arrowLeaf: (
    <>
      <path d="M5 15.5c6.6.8 11.3-2.5 13.8-9.8-7-.5-11.7 2.7-13.8 9.8Z" />
      <path d="m7 18 10-10M12.8 8H17v4.2" />
    </>
  ),
}

export default function LeafIcon({ name = 'leaf', label, className = '' }) {
  const paths = iconPaths[name]
  if (!paths) throw new Error(`Unknown leaf icon: ${name}`)

  return (
    <svg
      className={`leaf-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {paths}
    </svg>
  )
}
```

- [ ] **Step 5: Import fonts and replace design tokens**

Insert before the application CSS imports in `src/main.jsx`:

```jsx
import '@fontsource/noto-serif-tc/500.css'
import '@fontsource/noto-serif-tc/600.css'
import '@fontsource/noto-serif-tc/700.css'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/500.css'
import '@fontsource/noto-sans-tc/700.css'
import '@fontsource-variable/manrope/wght.css'
```

Replace the relevant `:root` declarations in `src/styles/tokens.css` with:

```css
--ink-950: #18221c;
--paper: #f3f1e9;
--paper-bright: #faf9f5;
--moss-800: #365a45;
--leaf-500: #75857d;
--sun-500: #efa94a;
--stone-400: #c9c4b9;
--font-display: 'Noto Serif TC', 'Songti TC', serif;
--font-body: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif;
--font-utility: 'Manrope Variable', 'Noto Sans TC', sans-serif;
--radius-control: 7px;
--radius-panel: 9px;
--radius-image: 10px;
--canvas-radius: 10px;
--shadow-rest: 0 10px 24px rgba(25, 35, 29, 0.08);
--shadow-hover: 0 24px 54px rgba(25, 35, 29, 0.16);
--scene-transition: 720ms;
--ease: cubic-bezier(0.22, 1, 0.36, 1);
--header-height: 72px;
```

Add:

```css
.leaf-icon {
  width: 1.25em;
  height: 1.25em;
  flex: 0 0 auto;
}
```

- [ ] **Step 6: Verify typography and icons**

Run:

```powershell
npx vitest run src/components/ui/LeafIcon.test.jsx
npm run build
rg -n "fonts\.googleapis|fonts\.gstatic" src dist
```

Expected: icon tests and build pass; `rg` returns no matches; local `.woff2` files exist in `dist/assets`.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json src/main.jsx src/styles/tokens.css src/components/ui/LeafIcon.jsx src/components/ui/LeafIcon.test.jsx
git commit -m "feat: add Yaosei typography and plant icons"
```

### Task 3: Define the five-scene contract in data

**Files:**
- Create: `src/data/homeScenes.js`
- Create: `src/data/homeScenes.test.js`

- [ ] **Step 1: Write the failing scene contract test**

Create `src/data/homeScenes.test.js`:

```js
import { homeScenes } from './homeScenes'

test('defines the approved one-screen-one-scene sequence', () => {
  expect(homeScenes.map((scene) => scene.id)).toEqual([
    'plant',
    'stone',
    'water',
    'craft',
    'care',
  ])
  expect(new Set(homeScenes.map((scene) => scene.sectionId)).size).toBe(5)
  homeScenes.forEach((scene) => {
    expect(scene).toEqual(expect.objectContaining({
      id: expect.any(String),
      sectionId: expect.any(String),
      label: expect.any(String),
      english: expect.any(String),
      tone: expect.any(String),
    }))
  })
})
```

- [ ] **Step 2: Run and verify failure**

Run:

```powershell
npx vitest run src/data/homeScenes.test.js
```

Expected: FAIL because `homeScenes.js` does not exist.

- [ ] **Step 3: Implement the scene data**

Create `src/data/homeScenes.js`:

```js
export const homeScenes = [
  { id: 'plant', sectionId: 'home', label: '植物', english: 'PLANT', tone: 'paper' },
  { id: 'stone', sectionId: 'works', label: '石組', english: 'STONE', tone: 'stone' },
  { id: 'water', sectionId: 'services', label: '水景', english: 'WATER', tone: 'moss' },
  { id: 'craft', sectionId: 'process', label: '造景', english: 'CRAFT', tone: 'ink' },
  { id: 'care', sectionId: 'contact', label: '養景', english: 'CARE', tone: 'amber' },
]
```

- [ ] **Step 4: Run and verify pass**

```powershell
npx vitest run src/data/homeScenes.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/homeScenes.js src/data/homeScenes.test.js
git commit -m "feat: define homepage scene sequence"
```

### Task 4: Build the progressive scene observer and environment layers

**Files:**
- Create: `src/hooks/useActiveScene.js`
- Create: `src/hooks/useActiveScene.test.jsx`
- Create: `src/components/home/ScrollEnvironment.jsx`
- Create: `src/components/home/ScrollEnvironment.test.jsx`
- Create: `src/styles/scene.css`
- Modify: `src/main.jsx`

- [ ] **Step 1: Write failing hook and layer tests**

Create `src/hooks/useActiveScene.test.jsx`:

```jsx
import { act, render, screen } from '@testing-library/react'
import { useActiveScene } from './useActiveScene'

let observerCallback

class ObserverMock {
  constructor(callback) { observerCallback = callback }
  observe() {}
  disconnect() {}
}

function Probe() {
  const active = useActiveScene(['plant', 'stone'])
  return <output>{active}</output>
}

test('activates the most visible scene', () => {
  window.IntersectionObserver = ObserverMock
  document.body.innerHTML = '<section data-scene="plant"></section><section data-scene="stone"></section>'
  render(<Probe />)
  const nodes = document.querySelectorAll('[data-scene]')
  act(() => observerCallback([
    { target: nodes[0], isIntersecting: true, intersectionRatio: 0.24 },
    { target: nodes[1], isIntersecting: true, intersectionRatio: 0.72 },
  ]))
  expect(screen.getByText('stone')).toBeInTheDocument()
})
```

Create `src/components/home/ScrollEnvironment.test.jsx`:

```jsx
import { render } from '@testing-library/react'
import ScrollEnvironment from './ScrollEnvironment'
import { homeScenes } from '../../data/homeScenes'

test('marks one decorative environment layer active', () => {
  const { container } = render(
    <ScrollEnvironment scenes={homeScenes} activeScene="water" />,
  )
  expect(container.querySelectorAll('.scene-environment__layer')).toHaveLength(5)
  expect(container.querySelector('[data-environment="water"]')).toHaveClass('is-active')
  expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
})
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/hooks/useActiveScene.test.jsx src/components/home/ScrollEnvironment.test.jsx
```

Expected: FAIL because the hook and component do not exist.

- [ ] **Step 3: Implement the observer hook**

Create `src/hooks/useActiveScene.js`:

```js
import { useEffect, useState } from 'react'

export function useActiveScene(sceneIds) {
  const [activeScene, setActiveScene] = useState(sceneIds[0])
  const sceneKey = sceneIds.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const nodes = [...document.querySelectorAll('[data-scene]')]
    const ratios = new Map(nodes.map((node) => [node, 0]))
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0)
      })
      const candidate = [...ratios.entries()]
        .sort(([, ratioA], [, ratioB]) => ratioB - ratioA)[0]
      if (candidate?.[1] > 0 && candidate[0].dataset.scene) {
        setActiveScene(candidate[0].dataset.scene)
      }
    }, {
      rootMargin: '-18% 0px -38% 0px',
      threshold: [0.2, 0.4, 0.6, 0.8],
    })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sceneKey])

  return activeScene
}
```

- [ ] **Step 4: Implement the decorative environment**

Create `src/components/home/ScrollEnvironment.jsx`:

```jsx
export default function ScrollEnvironment({ scenes, activeScene }) {
  return (
    <div className="scene-environment" aria-hidden="true">
      {scenes.map((scene) => (
        <span
          key={scene.id}
          className={`scene-environment__layer scene-environment__layer--${scene.tone}${activeScene === scene.id ? ' is-active' : ''}`}
          data-environment={scene.id}
        />
      ))}
      <span className="scene-environment__grain" />
    </div>
  )
}
```

Create `src/styles/scene.css`:

```css
.editorial-home {
  position: relative;
  isolation: isolate;
  background: transparent;
}

.scene-environment {
  position: fixed;
  z-index: -2;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.scene-environment__layer {
  position: absolute;
  inset: -8%;
  opacity: 0;
  transform: scale(1.035);
  transition: opacity var(--scene-transition) var(--ease), transform 1200ms var(--ease);
}

.scene-environment__layer.is-active {
  opacity: 1;
  transform: scale(1);
}

.scene-environment__layer--paper {
  background: radial-gradient(circle at 12% 16%, rgba(239, 169, 74, 0.12), transparent 28%), linear-gradient(145deg, #faf9f5, #e7e2d7);
}

.scene-environment__layer--stone {
  background: radial-gradient(circle at 78% 25%, rgba(117, 133, 125, 0.24), transparent 30%), linear-gradient(145deg, #e2ded3, #aaa79e);
}

.scene-environment__layer--moss {
  background: radial-gradient(circle at 30% 20%, rgba(201, 196, 185, 0.28), transparent 25%), linear-gradient(145deg, #7d897e, #365a45 62%, #293f32);
}

.scene-environment__layer--ink {
  background: radial-gradient(circle at 84% 16%, rgba(239, 169, 74, 0.09), transparent 25%), linear-gradient(145deg, #365a45, #263a2f 45%, #18221c);
}

.scene-environment__layer--amber {
  background: radial-gradient(circle at 74% 24%, rgba(239, 169, 74, 0.38), transparent 26%), linear-gradient(145deg, #18221c, #5d4c38 58%, #b7843f);
}

.scene-environment__grain {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(105deg, transparent 0 92px, rgba(255, 255, 255, 0.025) 93px 94px);
  mix-blend-mode: soft-light;
}

.scene-section {
  position: relative;
  background: transparent;
}

@media (min-width: 1025px) {
  .scene-section:not(.hero):not(.contact-panel) { min-height: 108svh; }
}

@media (prefers-reduced-motion: reduce) {
  .scene-environment__layer { transition: none; transform: none; }
}
```

Import `./styles/scene.css` after `tokens.css` in `src/main.jsx`.

- [ ] **Step 5: Run tests and build**

```powershell
npx vitest run src/hooks/useActiveScene.test.jsx src/components/home/ScrollEnvironment.test.jsx
npm run build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/hooks/useActiveScene.js src/hooks/useActiveScene.test.jsx src/components/home/ScrollEnvironment.jsx src/components/home/ScrollEnvironment.test.jsx src/styles/scene.css src/main.jsx
git commit -m "feat: add scroll scene environment"
```

### Task 5: Recompose the homepage into the approved five scenes

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.test.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/home/FeaturedProjects.jsx`
- Modify: `src/components/home/ServiceOverview.jsx`
- Modify: `src/components/home/WorkProcess.jsx`
- Modify: `src/components/home/ContactActions.jsx`

- [ ] **Step 1: Add failing order and scene-marker assertions**

Add to `src/pages/HomePage.test.jsx` after rendering:

```jsx
const sceneSections = [...container.querySelectorAll('[data-scene]')]
expect(sceneSections.map((section) => section.dataset.scene)).toEqual([
  'plant',
  'stone',
  'water',
  'craft',
  'care',
])
expect(container.querySelector('.editorial-home')).toHaveAttribute(
  'data-active-scene',
  'plant',
)
```

Change the render result declaration to `const { container } = render(...)`.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/pages/HomePage.test.jsx
```

Expected: FAIL because no scene attributes or active scene are rendered.

- [ ] **Step 3: Add semantic markers to the five primary sections**

Add these attributes to the root `<section>` elements:

```jsx
// Hero.jsx
<section className="hero scene-section" id="home" data-scene="plant" aria-labelledby="hero-title">

// FeaturedProjects.jsx
<section className="featured-projects section scene-section" id="works" data-scene="stone">

// ServiceOverview.jsx
<section className="services section scene-section" id="services" data-scene="water">

// WorkProcess.jsx
<section className="work-process section scene-section" id="process" data-scene="craft">

// ContactActions.jsx
<section className="contact-panel section scene-section" id="contact" data-scene="care">
```

- [ ] **Step 4: Activate the environment and approved section order**

Replace `HomePage.jsx` with:

```jsx
import Hero from '../components/home/Hero'
import ServiceOverview from '../components/home/ServiceOverview'
import FeaturedProjects from '../components/home/FeaturedProjects'
import BrandStory from '../components/home/BrandStory'
import WorkProcess from '../components/home/WorkProcess'
import ClientTypes from '../components/home/ClientTypes'
import ContactActions from '../components/home/ContactActions'
import ScrollEnvironment from '../components/home/ScrollEnvironment'
import { homeScenes } from '../data/homeScenes'
import { useActiveScene } from '../hooks/useActiveScene'

export default function HomePage({ brand, contact, hero }) {
  const activeScene = useActiveScene(homeScenes.map((scene) => scene.id))

  return (
    <main className="editorial-home" data-active-scene={activeScene}>
      <ScrollEnvironment scenes={homeScenes} activeScene={activeScene} />
      <Hero hero={hero} contact={contact} />
      <FeaturedProjects />
      <ServiceOverview />
      <WorkProcess />
      <BrandStory />
      <ClientTypes />
      <ContactActions brand={brand} contact={contact} />
    </main>
  )
}
```

- [ ] **Step 5: Run regression tests**

```powershell
npx vitest run src/pages/HomePage.test.jsx src/App.test.jsx
```

Expected: homepage and app tests pass with five ordered scene markers.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/HomePage.jsx src/pages/HomePage.test.jsx src/components/home/Hero.jsx src/components/home/FeaturedProjects.jsx src/components/home/ServiceOverview.jsx src/components/home/WorkProcess.jsx src/components/home/ContactActions.jsx
git commit -m "feat: compose the five-scene homepage"
```

### Task 6: Build reusable double-leaf LINE and phone actions

**Files:**
- Create: `src/components/ui/LeafContactLinks.jsx`
- Create: `src/components/ui/LeafContactLinks.test.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/layout/MobileQuoteBar.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write failing contact-link tests**

Create `src/components/ui/LeafContactLinks.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import LeafContactLinks from './LeafContactLinks'
import { siteContent } from '../../data/siteContent'

test('renders the approved LINE-first double-leaf contact pair', () => {
  render(<LeafContactLinks contact={siteContent.contact} />)
  const line = screen.getByRole('link', { name: 'LINE 聯絡' })
  const phone = screen.getByRole('link', { name: '撥打 0921-047-049' })
  expect(line).toHaveAttribute('href', siteContent.contact.lineHref)
  expect(phone).toHaveAttribute('href', siteContent.contact.phoneHref)
  expect(line.parentElement).toHaveClass('leaf-contact-links')
  expect(line).toHaveClass('leaf-contact-links__line')
})
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/components/ui/LeafContactLinks.test.jsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the reusable links with SVG icons**

Create `src/components/ui/LeafContactLinks.jsx`:

```jsx
import LeafIcon from './LeafIcon'

export default function LeafContactLinks({ contact, className = '' }) {
  return (
    <div className={`leaf-contact-links ${className}`.trim()}>
      <a
        className="leaf-contact-links__item leaf-contact-links__line"
        href={contact.lineHref}
        target="_blank"
        rel="noreferrer"
        aria-label="LINE 聯絡"
      >
        <LeafIcon name="sprout" />
        <span>LINE 聯絡</span>
      </a>
      <a
        className="leaf-contact-links__item leaf-contact-links__phone"
        href={contact.phoneHref}
        aria-label={`撥打 ${contact.mobile}`}
      >
        <LeafIcon name="leaf" />
        <span>撥打電話</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Use the pair in Hero and the mobile contact bar**

In `Hero.jsx`, import `Link`, `LeafContactLinks`, and `LeafIcon`, then replace `.hero__actions` with:

```jsx
<div className="hero__actions">
  <Link className="hero__projects-link" to="/projects">
    <LeafIcon name="arrowLeaf" />
    <span>瀏覽庭園作品</span>
  </Link>
  <LeafContactLinks contact={contact} />
</div>
```

Replace `MobileQuoteBar.jsx` with:

```jsx
import LeafContactLinks from '../ui/LeafContactLinks'

export default function MobileQuoteBar({ contact }) {
  return (
    <div className="mobile-contact-bar" aria-label="快速聯絡">
      <LeafContactLinks contact={contact} className="leaf-contact-links--mobile" />
    </div>
  )
}
```

- [ ] **Step 5: Add the exact asymmetric geometry**

Add to `src/styles/home.css`:

```css
.leaf-contact-links {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(0, 0.86fr);
  align-items: start;
  padding-top: 9px;
}

.leaf-contact-links::before {
  position: absolute;
  top: 1px;
  right: 2%;
  left: 2%;
  height: 22px;
  border-top: 1px solid rgba(54, 90, 69, 0.4);
  border-radius: 50% 50% 0 0;
  content: '';
  transform: rotate(-1.8deg);
}

.leaf-contact-links__item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-inline: 17px;
  border: 1px solid var(--moss-800);
  border-radius: 8px 24px 8px 5px;
  background: var(--moss-800);
  box-shadow: var(--shadow-rest);
  color: var(--paper-bright);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  transition: transform 220ms var(--ease), box-shadow 220ms var(--ease);
}

.leaf-contact-links__phone {
  z-index: 2;
  min-height: 48px;
  margin: 9px 0 0 -9px;
  border-radius: 22px 8px 5px 8px;
  background: var(--paper-bright);
  color: var(--moss-800);
}

.leaf-contact-links__item:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); }
.leaf-contact-links__item:active { transform: scale(0.98); }
```

Replace the existing mobile bar grid/link rules in `responsive.css` with a wrapper-only fixed position; keep sizing inside `.leaf-contact-links--mobile`:

```css
.mobile-contact-bar {
  position: fixed;
  z-index: 50;
  right: 20px;
  bottom: 0;
  left: 20px;
  display: none;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

@media (max-width: 768px) {
  .mobile-contact-bar { display: block; }
  .leaf-contact-links--mobile { width: min(100%, 430px); margin-inline: auto; }
}
```

- [ ] **Step 6: Verify links and responsive markup**

```powershell
npx vitest run src/components/ui/LeafContactLinks.test.jsx src/pages/HomePage.test.jsx src/App.test.jsx
npm run build
```

Expected: tests and build pass; no quote-form text is introduced.

- [ ] **Step 7: Commit**

```powershell
git add src/components/ui/LeafContactLinks.jsx src/components/ui/LeafContactLinks.test.jsx src/components/home/Hero.jsx src/components/layout/MobileQuoteBar.jsx src/styles/home.css src/styles/responsive.css
git commit -m "feat: add double-leaf contact actions"
```

### Task 7: Rebuild the mobile navigation as a refined Japanese index

**Files:**
- Create: `src/data/navigation.js`
- Modify: `src/components/layout/SiteHeader.jsx`
- Modify: `src/components/layout/SiteHeader.test.jsx`
- Modify: `src/components/routing/ScrollToHash.jsx`
- Modify: `src/App.test.jsx`
- Create: `src/styles/mobile-navigation.css`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/main.jsx`

- [ ] **Step 1: Extend the failing navigation behavior test**

Add these expectations after opening the menu in `SiteHeader.test.jsx`:

```jsx
expect(screen.getByText('01')).toBeInTheDocument()
expect(screen.getByText('PROJECTS')).toBeInTheDocument()
expect(screen.getByRole('link', { name: '撥打 0921-047-049' })).toHaveAttribute(
  'href',
  'tel:+886921047049',
)
expect(screen.getByRole('link', { name: '作品案例' })).toHaveFocus()
```

After Escape, add:

```jsx
expect(screen.getByRole('button', { name: '開啟選單' })).toHaveFocus()
```

Add to the hash-scroll test in `App.test.jsx`:

```jsx
expect(document.querySelector('#contact')).toHaveAttribute('tabindex', '-1')
expect(document.activeElement).toBe(document.querySelector('#contact'))
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/components/layout/SiteHeader.test.jsx src/App.test.jsx
```

Expected: FAIL because numbered labels, phone contact, and focus movement are absent.

- [ ] **Step 3: Create navigation data**

Create `src/data/navigation.js`:

```js
export const navigation = [
  { number: '01', label: '作品案例', english: 'PROJECTS', to: '/projects' },
  { number: '02', label: '服務內容', english: 'SERVICES', to: '/#services' },
  { number: '03', label: '關於曜聖', english: 'ABOUT', to: '/#about' },
  { number: '04', label: '聯絡資訊', english: 'CONTACT', to: '/#contact' },
]
```

- [ ] **Step 4: Refine the SiteHeader state and link markup**

In `SiteHeader.jsx`, import `useRef`, `navigation`, `LeafIcon`, and replace the local navigation constant. Add refs and focus-aware close logic inside the component:

```jsx
const toggleRef = useRef(null)
const firstLinkRef = useRef(null)
const returnFocusRef = useRef(false)

const closeMenu = ({ returnFocus = false } = {}) => {
  returnFocusRef.current = returnFocus
  setMenuOpen(false)
}
```

In the menu effect, after adding `nav-open`, call:

```jsx
firstLinkRef.current?.focus()
```

Use this Escape handler:

```jsx
const handleKeyDown = (event) => {
  if (event.key === 'Escape') closeMenu({ returnFocus: true })
}
```

Add a second effect:

```jsx
useEffect(() => {
  if (!menuOpen && returnFocusRef.current) {
    toggleRef.current?.focus()
    returnFocusRef.current = false
  }
}, [menuOpen])
```

Attach `ref={toggleRef}` to `.nav-toggle`. Change backdrop click to `onClick={() => closeMenu({ returnFocus: true })}`. Replace the nav children with:

```jsx
<div className="site-nav__meta" aria-hidden="true">
  <span>MENU / 網站導覽</span>
  <span>YAO SEI</span>
</div>
<div className="site-nav__index">
  {navigation.map((item, index) => (
    <Link
      key={item.to}
      ref={index === 0 ? firstLinkRef : undefined}
      className="site-nav__item"
      to={item.to}
      onClick={() => closeMenu()}
      aria-label={item.label}
    >
      <span className="site-nav__number">{item.number}</span>
      <span className="site-nav__wording">
        <strong>{item.label}</strong>
        <small>{item.english}</small>
      </span>
      <span className="site-nav__arrow"><LeafIcon name="arrowLeaf" /></span>
    </Link>
  ))}
</div>
<div className="site-nav__contacts">
  <a href={contact.lineHref} target="_blank" rel="noreferrer" aria-label="LINE 聯絡">
    <LeafIcon name="sprout" />
    <span>LINE 聯絡</span>
  </a>
  <a href={contact.phoneHref} aria-label={`撥打 ${contact.mobile}`}>
    <LeafIcon name="leaf" />
    <span>撥打電話</span>
  </a>
</div>
```

- [ ] **Step 5: Focus the hash target after route navigation**

In `ScrollToHash.jsx`, after `target.scrollIntoView(...)`, add:

```jsx
target.setAttribute('tabindex', '-1')
target.focus({ preventScroll: true })
```

Keep the current scroll reset behavior for routes without a hash.

- [ ] **Step 6: Implement the refined local leaf hover and double-leaf menu contacts**

Create `src/styles/mobile-navigation.css` with:

```css
.site-nav__meta,
.site-nav__number,
.site-nav__wording small,
.site-nav__arrow {
  display: none;
}

.site-nav__index {
  display: flex;
  align-items: center;
  gap: clamp(24px, 3vw, 46px);
}

.site-nav__item {
  font-size: 0.83rem;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.site-nav__wording strong { font-weight: 500; }
.site-nav__contacts { display: flex; }
.site-nav__contacts a:first-child {
  min-width: 132px;
  padding: 10px 14px;
  border: 1px solid rgba(49, 87, 67, 0.42);
  text-align: center;
}
.site-nav__contacts a:last-child,
.site-nav__contacts .leaf-icon { display: none; }

@media (max-width: 768px) {
  .site-nav__meta {
    display: flex;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-family: var(--font-utility);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.18em;
  }

  .site-nav__index { display: block; }

  .site-nav__item {
    position: relative;
    display: grid;
    min-height: 72px;
    grid-template-columns: 32px minmax(0, 1fr) 32px;
    gap: 10px;
    align-items: center;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    isolation: isolate;
  }

  .site-nav__item::before {
    position: absolute;
    z-index: -2;
    inset: 14px 35px 14px 38px;
    border-radius: 7px 28px 7px 28px;
    background: linear-gradient(100deg, rgba(54, 90, 69, 0.03), rgba(54, 90, 69, 0.14));
    content: '';
    opacity: 0;
    transform: translateX(-14px) scaleX(0.86);
    transform-origin: left;
    transition: opacity 250ms ease, transform 340ms var(--ease);
  }

  .site-nav__item::after {
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 47px;
    width: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--gold-400), transparent);
    content: '';
    transition: width 320ms var(--ease);
  }

  .site-nav__item:hover::before,
  .site-nav__item:focus-visible::before { opacity: 1; transform: none; }
  .site-nav__item:hover::after,
  .site-nav__item:focus-visible::after { width: 58%; }

  .site-nav__number {
    display: block;
    color: var(--gold-500);
    font-family: var(--font-utility);
    font-size: 0.58rem;
    font-weight: 700;
  }

  .site-nav__wording { transition: transform 280ms var(--ease); }
  .site-nav__wording strong { display: block; font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; }
  .site-nav__wording small { display: block; color: var(--muted); font-family: var(--font-utility); font-size: 0.48rem; letter-spacing: 0.17em; }
  .site-nav__arrow { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--moss-800); border-radius: 64% 36% 61% 39%; color: var(--moss-800); transform: rotate(-18deg); transition: background 240ms ease, color 240ms ease, transform 280ms var(--ease); }
  .site-nav__item:hover .site-nav__wording,
  .site-nav__item:focus-visible .site-nav__wording { transform: translateX(7px); }
  .site-nav__item:hover .site-nav__arrow,
  .site-nav__item:focus-visible .site-nav__arrow { background: var(--moss-800); color: var(--paper-bright); transform: rotate(0deg); }

  .site-nav__contacts {
    position: relative;
    display: grid;
    grid-template-columns: 1.14fr 0.86fr;
    margin-top: 18px;
    padding-top: 9px;
  }

  .site-nav__contacts a:last-child { display: flex; }
  .site-nav__contacts .leaf-icon { display: block; }

  .site-nav__contacts a {
    display: flex;
    min-height: 51px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 1px solid var(--moss-800);
    border-radius: 8px 24px 8px 5px;
    background: var(--moss-800);
    color: var(--paper-bright);
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .site-nav__contacts a + a {
    min-height: 47px;
    margin: 9px 0 0 -9px;
    border-radius: 22px 8px 5px 8px;
    background: var(--paper-bright);
    color: var(--moss-800);
  }
}
```

Import it after `layout.css` in `main.jsx`. Remove superseded mobile `.site-nav > a` and `.site-nav__contact` rules from `responsive.css`; keep positioning, visibility, and scroll locking there. Remove the old desktop `.site-nav__contact` rules from `layout.css`.

- [ ] **Step 7: Verify navigation behavior**

```powershell
npx vitest run src/components/layout/SiteHeader.test.jsx src/App.test.jsx
npm run lint
npm run build
```

Expected: tests, lint, and build pass; Escape and backdrop restore focus; links close the menu and focus the destination section. Update the pre-existing `SiteHeader.test.jsx` expectation from `案例作品` to `作品案例` so it matches `navigation.js`.

- [ ] **Step 8: Commit**

```powershell
git add src/data/navigation.js src/components/layout/SiteHeader.jsx src/components/layout/SiteHeader.test.jsx src/components/routing/ScrollToHash.jsx src/App.test.jsx src/styles/mobile-navigation.css src/styles/layout.css src/styles/responsive.css src/main.jsx
git commit -m "feat: refine mobile navigation interactions"
```

### Task 8: Polish the Hero and project catalogue without breaking image ratios

**Files:**
- Modify: `src/data/projects.js`
- Modify: `src/data/projects.test.js`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/ui/ProjectCard.jsx`
- Modify: `src/components/home/FeaturedProjects.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write failing focal-point assertions**

Inside the project loop in `projects.test.js`, add:

```js
expect(project.focalPoint).toMatch(/^\d+% \d+%$/)
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/data/projects.test.js
```

Expected: FAIL because projects have no `focalPoint`.

- [ ] **Step 3: Add explicit focal points to all six project source objects**

Add these values next to each project `featured` field, in current array order:

```js
focalPoint: '50% 52%',
focalPoint: '48% 54%',
focalPoint: '50% 48%',
focalPoint: '50% 46%',
focalPoint: '54% 50%',
focalPoint: '50% 55%',
```

Ensure the derived export object in `projects.js` includes:

```js
focalPoint: project.focalPoint,
```

- [ ] **Step 4: Apply focal points and SVG arrows in ProjectCard**

Import `LeafIcon`, set the media style, and replace the current arrow SVG:

```jsx
<div className="project-card__media" style={{ '--project-focus': project.focalPoint }}>
```

```jsx
<LeafIcon name="arrowLeaf" className="project-card__arrow" />
```

Add `id="works"` to `FeaturedProjects` if Task 5 did not already do so.

- [ ] **Step 5: Replace oversized organic radii with approved geometry**

In `home.css`, change Hero and featured work geometry to:

```css
.hero__layout { align-items: center; }
.hero__copy { transform: translateY(-4vh); }
.hero__media { min-height: 620px; border-radius: var(--radius-image); box-shadow: var(--shadow-rest); }
.hero__image { object-position: 50% 52%; }
.hero__sun { width: 54px; height: 54px; }
.project-card__media { border-radius: var(--radius-image); box-shadow: var(--shadow-rest); }
.project-card__media img { object-position: var(--project-focus, 50% 50%); }
.project-card__link:hover .project-card__media { box-shadow: var(--shadow-hover); }
.project-card__arrow { width: 25px; height: 25px; color: var(--gold-500); transition: transform 220ms var(--ease); }
.project-card__link:hover .project-card__arrow { transform: translate(4px, -2px) rotate(3deg); }
```

In `responsive.css`, keep the mobile Hero image minimum at 420px but use `border-radius: var(--radius-image)` and ensure `.hero__copy` resets `transform: none` below 768px. Use `aspect-ratio` rather than fixed heights for project cards below 768px.

- [ ] **Step 6: Run tests and build**

```powershell
npx vitest run src/data/projects.test.js src/pages/HomePage.test.jsx src/pages/ProjectsPage.test.jsx
npm run build
```

Expected: all pass; Vite emits the project assets and no CSS parse error occurs.

- [ ] **Step 7: Commit**

```powershell
git add src/data/projects.js src/data/projects.test.js src/components/home/Hero.jsx src/components/ui/ProjectCard.jsx src/components/home/FeaturedProjects.jsx src/styles/home.css src/styles/projects.css src/styles/responsive.css
git commit -m "feat: polish hero and project catalogue"
```

### Task 9: Replace empty service/process grids with crafted image and path components

**Files:**
- Modify: `src/data/services.js`
- Create: `src/data/services.test.js`
- Modify: `src/components/home/ServiceOverview.jsx`
- Modify: `src/components/home/WorkProcess.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write failing service metadata tests**

Create `src/data/services.test.js`:

```js
import { services } from './services'

test('services provide real imagery and a consistent plant icon', () => {
  expect(services).toHaveLength(4)
  services.forEach((service) => {
    expect(service).toEqual(expect.objectContaining({
      id: expect.any(String),
      title: expect.any(String),
      summary: expect.any(String),
      image: expect.anything(),
      imageAlt: expect.any(String),
      icon: expect.stringMatching(/^(sprout|leaf|water|care)$/),
    }))
  })
})
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/data/services.test.js
```

Expected: FAIL because visual metadata is absent.

- [ ] **Step 3: Add curated local imagery and icons**

Import `media` in `services.js` and add these fields to the four services in order:

```js
image: media('changhua-residence-02.webp'),
imageAlt: '住宅庭園與建築動線整合實景',
icon: 'sprout',
```

```js
image: media('taoyuan-greenwall-01.webp'),
imageAlt: '植生牆與多層次綠化實景',
icon: 'leaf',
```

```js
image: media('nantun-residence-01.webp'),
imageAlt: '自然石與流水構成的假山水景',
icon: 'water',
```

```js
image: media('taichung-maintenance-04.webp'),
imageAlt: '日式庭園修剪與石景養護實景',
icon: 'care',
```

- [ ] **Step 4: Render image-backed service cards**

In `ServiceOverview.jsx`, import `BrandImage` and `LeafIcon`. Replace each `.service-item` body with:

```jsx
<BrandImage
  className="service-item__image"
  src={service.image}
  alt={service.imageAlt}
  loading="lazy"
  decoding="async"
/>
<span className="service-item__veil" aria-hidden="true" />
<div className="service-item__content">
  <span className="service-item__number">{service.number}</span>
  <LeafIcon name={service.icon} />
  <h3>{service.title}</h3>
  <p>{service.summary}</p>
</div>
```

In `WorkProcess.jsx`, import `LeafIcon` and add before each number:

```jsx
<span className="process-list__marker" aria-hidden="true">
  <LeafIcon name="leaf" />
</span>
```

- [ ] **Step 5: Implement material cards and stone-path timing**

Replace the old service/process rules in `home.css` with:

```css
.service-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.service-item { position: relative; min-height: 360px; overflow: hidden; border-radius: var(--radius-panel); box-shadow: var(--shadow-rest); isolation: isolate; }
.service-item__image,
.service-item > picture { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; }
.service-item__image { object-fit: cover; transition: transform 700ms var(--ease); }
.service-item__veil { position: absolute; z-index: -1; inset: 0; background: linear-gradient(180deg, rgba(24, 34, 28, 0.04), rgba(24, 34, 28, 0.82)); }
.service-item__content { position: absolute; right: 0; bottom: 0; left: 0; padding: 24px; color: var(--paper-bright); }
.service-item__number { color: var(--gold-400); font-family: var(--font-utility); font-size: 0.68rem; }
.service-item__content .leaf-icon { margin: 22px 0 12px; color: var(--gold-400); }
.service-item__content p { margin-top: 10px; color: rgba(250, 249, 245, 0.72); font-size: 0.82rem; }
.service-item:hover .service-item__image { transform: scale(1.035); }

.process-list { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
.process-list::before { position: absolute; top: 20px; right: 5%; left: 5%; height: 1px; background: rgba(239, 169, 74, 0.42); content: ''; }
.process-list li { position: relative; min-height: 220px; padding: 58px 18px 18px 0; }
.process-list__marker { position: absolute; z-index: 1; top: 8px; left: 0; display: grid; width: 25px; height: 25px; place-items: center; background: var(--ink-950); color: var(--gold-400); }
.process-list h3 { margin: 14px 0 12px; }
.process-list p { color: rgba(250, 249, 245, 0.66); font-size: 0.8rem; }
```

At 768px in `responsive.css`, set `.service-list, .process-list { grid-template-columns: 1fr; }`, move the process connector to `top: 0; bottom: 0; left: 12px; width: 1px; height: auto`, and add left padding to each process item. Do not restore empty bordered cells.

- [ ] **Step 6: Run tests and build**

```powershell
npx vitest run src/data/services.test.js src/pages/HomePage.test.jsx
npm run build
```

Expected: tests and build pass; service images resolve from local media.

- [ ] **Step 7: Commit**

```powershell
git add src/data/services.js src/data/services.test.js src/components/home/ServiceOverview.jsx src/components/home/WorkProcess.jsx src/styles/home.css src/styles/responsive.css
git commit -m "feat: craft service cards and process path"
```

### Task 10: Preserve the printed card identity in About, Contact, and Footer

**Files:**
- Modify: `src/components/home/BrandStory.jsx`
- Modify: `src/components/home/ContactActions.jsx`
- Modify: `src/components/layout/SiteFooter.jsx`
- Modify: `src/App.test.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Add failing identity assertions**

Add to the first test in `App.test.jsx`:

```jsx
expect(screen.getByText('YAO SEI LIMITED COMPANY')).toBeInTheDocument()
expect(screen.getByText('統一編號 00111874')).toBeInTheDocument()
expect(screen.getAllByRole('link', { name: /a74964163285@gmail.com/ }).length).toBeGreaterThan(0)
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/App.test.jsx
```

Expected: at least the English name and accessible Email link assertion fail.

- [ ] **Step 3: Preserve explicit brand wording and SVG contact semantics**

In `ContactActions.jsx`, keep the printed company-card image. Import `LeafIcon`, delete `ArrowIcon`, and use `<LeafIcon name="sprout" />`, `<LeafIcon name="leaf" />`, and `<LeafIcon name="arrowLeaf" />` in the LINE, phone, and Email rows respectively. Give the Email anchor `aria-label={`Email ${contact.email}`}`.

In `SiteFooter.jsx`, add below the company name:

```jsx
<small className="site-footer__english-name">{brand.englishName}</small>
```

Change the Email link to:

```jsx
<a href={contact.emailHref} aria-label={`Email ${contact.email}`}>{contact.email}</a>
```

Keep the existing bottom text `統一編號 {contact.taxId}` exactly.

- [ ] **Step 4: Align BrandStory and Contact with the five-scene transition**

Keep `BrandStory` after Process. Remove the `<span className="brand-story__seal">...</span>` element and add `<span className="brand-story__sun" aria-hidden="true" />` after the image; this is the printed-card orange sun, not a replacement Logo.

Use this CSS:

```css
.brand-story__media,
.brand-story__media img { border-radius: var(--radius-image); }
.brand-story__sun { position: absolute; right: 24px; bottom: 24px; width: 48px; height: 48px; border-radius: 50%; background: var(--sun-500); box-shadow: 0 12px 30px rgba(239, 169, 74, 0.25); }
.contact-panel { background: rgba(24, 34, 28, 0.9); backdrop-filter: blur(10px); }
.contact-panel__brand img { border-radius: var(--radius-image); }
.contact-panel__actions span { white-space: nowrap; }
.contact-panel__actions small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-footer__english-name { display: block; margin: -8px 0 14px; color: rgba(250, 249, 245, 0.52); font-family: var(--font-utility); font-size: 0.58rem; letter-spacing: 0.12em; }
```

At 560px, set `.contact-panel__details { grid-template-columns: 1fr; }` and `.contact-panel__address { grid-column: auto; }` before allowing the address to wrap.

- [ ] **Step 5: Verify brand data and direct links**

```powershell
npx vitest run src/App.test.jsx src/data/siteContent.test.js src/pages/HomePage.test.jsx
npm run build
```

Expected: exact brand/contact tests and build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/components/home/BrandStory.jsx src/components/home/ContactActions.jsx src/components/layout/SiteFooter.jsx src/App.test.jsx src/styles/home.css src/styles/layout.css src/styles/responsive.css
git commit -m "feat: preserve printed brand identity on site"
```

### Task 11: Emit approved AVIF/WebP assets and render responsive pictures

**Files:**
- Modify: `scripts/project-asset-manifest.mjs`
- Modify: `scripts/build-project-assets.mjs`
- Modify: `src/data/projectMedia.js`
- Modify: `src/data/projectMedia.test.js`
- Modify: `src/components/ui/BrandImage.jsx`
- Modify: `src/components/ui/BrandImage.test.jsx`
- Create: `src/assets/projects/*.avif` generated assets
- Refresh: `src/assets/projects/*.webp` generated assets

- [ ] **Step 1: Write failing media-pair and picture tests**

Replace `projectMedia.test.js` with:

```js
import { media } from './projectMedia'

test('resolves approved WebP and AVIF project media', () => {
  expect(media('changhua-residence-01.webp')).toEqual(expect.objectContaining({
    src: expect.stringMatching(/\.webp$/),
    avifSrc: expect.stringMatching(/\.avif$/),
  }))
  expect(() => media('missing-project.webp')).toThrow('Missing project media')
})
```

Add to `BrandImage.test.jsx`:

```jsx
test('prefers AVIF while preserving the WebP fallback', () => {
  const { container } = render(
    <BrandImage
      src={{ src: '/garden.webp', avifSrc: '/garden.avif' }}
      alt="庭園"
    />,
  )
  expect(container.querySelector('source')).toHaveAttribute('srcset', '/garden.avif')
  expect(screen.getByRole('img', { name: '庭園' })).toHaveAttribute('src', '/garden.webp')
})
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run src/data/projectMedia.test.js src/components/ui/BrandImage.test.jsx
```

Expected: FAIL because `media()` returns a string and `BrandImage` does not render `<picture>`.

- [ ] **Step 3: Mark current selected assets approved**

Change the manifest mapping to:

```js
].map(([folder, source, output]) => ({
  folder,
  source,
  output,
  approved: true,
}))
```

These entries correspond to the already selected project images. New entries must not use `approved: true` until the human before/after review is complete.

- [ ] **Step 4: Generate both formats without changing Drive originals**

Replace the encoder call in `build-project-assets.mjs` with:

```js
if (!item.approved) {
  throw new Error(`Asset is not approved for public output: ${item.folder}/${item.source}`)
}

const stem = path.parse(item.output).name
const image = sharp(source, { unlimited: true })
  .rotate()
  .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })

await Promise.all([
  image.clone().webp({ quality: 78, effort: 6, smartSubsample: true }).toFile(path.join(outputRoot, `${stem}.webp`)),
  image.clone().avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' }).toFile(path.join(outputRoot, `${stem}.avif`)),
])
```

Remove the old `const output = path.join(outputRoot, item.output)` declaration and the single `.toFile(output)` chain. Keep all reads under `workbench/landscape-originals` or `workbench/landscape-edited`; never write to Google Drive.

- [ ] **Step 5: Return a media pair**

Replace `projectMedia.js` with:

```js
const webpFiles = import.meta.glob('../assets/projects/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

const avifFiles = import.meta.glob('../assets/projects/*.avif', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function media(filename) {
  const webpKey = `../assets/projects/${filename}`
  const avifFilename = filename.replace(/\.webp$/, '.avif')
  const avifKey = `../assets/projects/${avifFilename}`
  const src = webpFiles[webpKey]
  const avifSrc = avifFiles[avifKey]
  if (!src || !avifSrc) throw new Error(`Missing project media: ${filename}`)
  return { src, avifSrc }
}
```

Update project/site data tests that currently use `expect.stringMatching(/\.webp$/)` to assert `expect.objectContaining({ src: expect.stringMatching(/\.webp$/), avifSrc: expect.stringMatching(/\.avif$/) })`.

- [ ] **Step 6: Render picture sources while retaining error fallback**

Replace `BrandImage.jsx` with:

```jsx
import { useState } from 'react'

const normalizeSource = (source) => (
  typeof source === 'string' ? { src: source, avifSrc: '' } : source
)

export default function BrandImage({ src, alt, onError, className, ...imageProps }) {
  const media = normalizeSource(src)
  const [failedSrc, setFailedSrc] = useState('')
  const failed = failedSrc === media.src

  if (failed) {
    return (
      <div className={`image-fallback ${className ?? ''}`.trim()} role="img" aria-label={`${alt}（圖片暫時無法顯示）`}>
        <span>曜聖景觀</span>
        <strong>{alt}</strong>
      </div>
    )
  }

  return (
    <picture>
      {media.avifSrc ? <source srcSet={media.avifSrc} type="image/avif" /> : null}
      <img
        {...imageProps}
        className={className}
        src={media.src}
        alt={alt}
        onError={(event) => {
          setFailedSrc(media.src)
          onError?.(event)
        }}
      />
    </picture>
  )
}
```

- [ ] **Step 7: Build assets, run tests, and inspect bundle weights**

```powershell
npm run assets:build
npx vitest run src/data/projectMedia.test.js src/components/ui/BrandImage.test.jsx src/data/projects.test.js src/data/siteContent.test.js
npm run build
Get-ChildItem -LiteralPath dist\assets -File | Where-Object { $_.Extension -in '.webp', '.avif' } | Sort-Object Length -Descending | Select-Object -First 10 Name,Length
```

Expected: 26 AVIF and 26 WebP project assets exist; tests/build pass; the largest refreshed project asset is materially smaller than the previous ~1.16 MB maximum.

- [ ] **Step 8: Commit generated approved assets and code**

```powershell
git add scripts/project-asset-manifest.mjs scripts/build-project-assets.mjs src/data/projectMedia.js src/data/projectMedia.test.js src/components/ui/BrandImage.jsx src/components/ui/BrandImage.test.jsx src/data/projects.test.js src/data/siteContent.test.js src/assets/projects
git commit -m "perf: serve approved AVIF project media"
```

### Task 12: Add rendered responsive QA to CI

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.js`
- Create: `e2e/responsive.spec.js`
- Modify: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Install Playwright and add the script**

```powershell
npm install --save-dev @playwright/test@1.62.1
```

Add to `package.json` scripts:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 2: Create Playwright configuration**

Create `playwright.config.js`:

```js
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 3: Write responsive and interaction checks**

Create `e2e/responsive.spec.js`:

```js
import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
]

for (const viewport of viewports) {
  test(`${viewport.name} has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: '把自然，安放進日常' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    const contactLabels = page.locator('.leaf-contact-links__item span')
    for (let index = 0; index < await contactLabels.count(); index += 1) {
      await expect(contactLabels.nth(index)).toHaveCSS('white-space', 'nowrap')
    }
  })
}

test('mobile menu is full, refined, and keyboard-closeable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/')
  const toggle = page.getByRole('button', { name: '開啟選單' })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: '主要導覽' })
  await expect(navigation).toHaveClass(/is-open/)
  await expect(navigation.getByRole('link', { name: '作品案例' })).toBeFocused()
  await expect(navigation.getByRole('link', { name: 'LINE 聯絡' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: '撥打 0921-047-049' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)
})

test('reduced motion keeps all five scenes readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/')
  await expect(page.locator('[data-scene]')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: '直接與曜聖聯絡' })).toBeVisible()
})
```

- [ ] **Step 4: Run locally and use any failure to drive the final responsive cleanup**

```powershell
npx playwright install chromium
npm run test:e2e
```

Expected: the new browser suite runs at every required viewport. If an overflow, nav focus, or no-wrap assertion fails, use the exact failing viewport to adjust only the responsible rules in `responsive.css`, `mobile-navigation.css`, `home.css`, or `projects.css`; rerun until all tests pass.

- [ ] **Step 5: Add browser QA to GitHub Pages deployment**

Insert after the lint step in `.github/workflows/deploy-pages.yml`:

```yaml
      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Run rendered responsive tests
        run: npm run test:e2e
```

- [ ] **Step 6: Verify the complete CI-equivalent sequence**

```powershell
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json playwright.config.js e2e/responsive.spec.js .github/workflows/deploy-pages.yml src/styles/responsive.css src/styles/mobile-navigation.css src/styles/home.css src/styles/projects.css
git commit -m "test: guard responsive landscape experience"
```

### Task 13: Update maintenance documentation and perform final visual QA

**Files:**
- Modify: `README.md`
- Verify only: all implementation files

- [ ] **Step 1: Replace stale README claims**

Update README to state:

````markdown
## 目前功能

- React／HashRouter 靜態品牌網站，支援 GitHub Pages 子路徑。
- 一屏一景首頁：植物、石組、水景、造景、養景。
- 獨立案例總覽與案例詳情頁。
- 正式 LINE、手機、公司電話與 Email 直接聯絡。
- 無報價表單，不儲存訪客資料。
- 專案圖片由人工核准的 HEIC／JPG 原稿產出本地 AVIF／WebP；Google Drive 原稿不會被建置腳本修改。

## 本機驗證

```powershell
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

## 素材維護

1. 原稿只放在忽略版控的 `workbench/landscape-originals`。
2. 自然商業修美副本放在 `workbench/landscape-edited`。
3. 人工核准後才在 `scripts/project-asset-manifest.mjs` 設定 `approved: true`。
4. 執行 `npm run assets:build` 產生 AVIF／WebP。
5. 檢查修美前後對照與網站裁切後，再提交 `src/assets/projects`。
````

Keep the existing deployment section but change it to describe `.github/workflows/deploy-pages.yml` and GitHub Pages, not Vercel rewrites.

- [ ] **Step 2: Run static verification and repository hygiene checks**

```powershell
npm test -- --run
npm run lint
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected: all commands pass; `git diff --check` is empty; `規劃圖/` remains the only unrelated untracked path and is not staged.

- [ ] **Step 3: Perform browser visual QA at required sizes**

Using the Browser QA workflow, inspect `/`, `/projects`, and one project detail route at 360×800, 390×844, 768×1024, 1280×900, and 1920×1080. Confirm:

- no header/menu blank wedge or horizontal overflow;
- double-leaf buttons keep their 56:44 visual proportion and do not wrap;
- hover/focus affects the local leaf region rather than painting the full menu row;
- Hero right image fills its frame and text remains above the action group;
- section backgrounds bridge without hard color bands;
- service/process components do not resemble empty ordinal grids;
- business-card image, orange sun, company names, tax ID, and links remain accurate;
- reduced-motion mode shows every section without sticky gaps.

- [ ] **Step 4: Commit documentation**

```powershell
git add README.md
git commit -m "docs: document Yaosei site maintenance"
```

- [ ] **Step 5: Record the final readiness state**

Run:

```powershell
git log --oneline --decorate -14
git status --short
```

Expected: all feature commits are present; no tracked changes remain; no deployment or merge has occurred yet.
