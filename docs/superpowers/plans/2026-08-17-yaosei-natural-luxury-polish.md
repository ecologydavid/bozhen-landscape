# Yaosei Natural Luxury Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing React presentation layer into the approved「自然生活精品」system, removing the mobile navigation voids, thin typography, decorative numbering, rough image crops, and generic buttons while preserving all real company data and direct contact links.

**Architecture:** Keep content in `src/data` and render it through pure React presentation components. Add one reusable leaf icon, enrich services/projects with display metadata, and let CSS own all layout, shape, shadow, and motion behavior. No API, global store, form, or generated project image is introduced.

**Tech Stack:** React 19, React Router 7, Vite 8, CSS, Vitest, React Testing Library, Fontsource self-hosted WOFF2 packages, bundled Playwright for rendered QA.

---

## File map

- `package.json`, `package-lock.json`: self-hosted font packages.
- `src/main.jsx`: font CSS imports before application styles.
- `src/data/siteContent.js`: menu feature image/copy.
- `src/data/services.js`: service image, English craft label, and action label.
- `src/data/projects.js`: per-project `focalPoint` values.
- `src/components/ui/LeafIcon.jsx`: reusable decorative leaf line icon.
- `src/components/layout/SiteHeader.jsx`: full-canvas mobile navigation.
- `src/components/home/Hero.jsx`: field note and interlocking leaf CTAs.
- `src/components/home/ServiceOverview.jsx`: real-image service cards without ordinal numbers.
- `src/components/home/WorkProcess.jsx`: ordered stepping-stone process.
- `src/components/ui/ProjectCard.jsx`: project metadata and focal image positioning without decorative indexes.
- `src/components/home/FeaturedProjects.jsx`, `src/pages/ProjectsPage.jsx`: remove the `index` prop.
- `src/styles/tokens.css`: type, radius, shadow, and motion tokens.
- `src/styles/layout.css`: header, menu sheet, leaf buttons, footer consistency.
- `src/styles/home.css`: hero, services, process, and motion.
- `src/styles/projects.css`: project card and gallery image treatment.
- `src/styles/responsive.css`: 360–1024 responsive transformations and reduced motion.
- Existing co-located tests: behavioral regression coverage.

### Task 1: Self-host the approved font families

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.html`
- Modify: `src/main.jsx`
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Install exact local font packages**

Run:

```powershell
npm install @fontsource/lxgw-wenkai-tc@5.3.0 @fontsource/noto-sans-tc@5.3.0 @fontsource-variable/manrope@5.3.0
```

Expected: exit 0; the three packages appear in `dependencies`, and no external font URL is added.

- [ ] **Step 2: Import only the approved weights in `src/main.jsx`**

Insert before `./styles/tokens.css`:

```jsx
import '@fontsource/lxgw-wenkai-tc/700.css'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/500.css'
import '@fontsource/noto-sans-tc/700.css'
import '@fontsource-variable/manrope/wght.css'
```

- [ ] **Step 3: Replace the typography and geometry tokens**

Update the relevant `:root` declarations in `src/styles/tokens.css` to:

```css
--font-display: 'LXGW WenKai TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif;
--font-body: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif;
--font-utility: 'Manrope Variable', 'Noto Sans TC', sans-serif;
--radius-control: 8px;
--radius-panel: 10px;
--radius-image: 12px;
--canvas-radius: 12px;
--shadow-rest: 0 8px 18px rgba(49, 70, 58, 0.06);
--shadow-hover: 0 24px 52px rgba(49, 70, 58, 0.18);
--header-height: 68px;
--header-height-scrolled: 56px;
```

Change heading defaults to:

```css
h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.22;
  letter-spacing: 0.01em;
}

body {
  font-family: var(--font-body);
  font-weight: 400;
}

.section-label {
  font-family: var(--font-utility);
  font-weight: 700;
}
```

- [ ] **Step 4: Build and verify fonts are emitted locally**

Run:

```powershell
npm run build
rg -n "fonts\.googleapis|fonts\.gstatic" src dist
Get-ChildItem dist\assets -Filter '*.woff2' | Select-Object -First 5 Name
```

Expected: build passes; `rg` returns no matches; local `.woff2` assets exist.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json index.html src/main.jsx src/styles/tokens.css
git commit -m "feat: self-host Yaosei typography"
```

### Task 2: Enrich presentation data without mixing it into UI components

**Files:**
- Modify: `src/data/services.js`
- Modify: `src/data/projects.js`
- Modify: `src/data/siteContent.js`
- Modify: `src/data/projects.test.js`
- Modify: `src/data/siteContent.test.js`
- Create: `src/data/services.test.js`

- [ ] **Step 1: Write failing data tests**

Create `src/data/services.test.js`:

```js
import { services } from './services'

test('services expose meaningful visual metadata without decorative numbering', () => {
  expect(services).toHaveLength(4)
  services.forEach((service) => {
    expect(service).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        summary: expect.any(String),
        tag: expect.any(String),
        image: expect.stringMatching(/\.webp$/),
        imageAlt: expect.any(String),
        linkLabel: expect.any(String),
      }),
    )
    expect(service).not.toHaveProperty('number')
  })
})
```

Add inside the project loop in `src/data/projects.test.js`:

```js
expect(project.focalPoint).toMatch(/^\d+% \d+%$/)
```

Add to `src/data/siteContent.test.js`:

```js
expect(siteContent.navigation).toEqual(
  expect.objectContaining({
    image: expect.stringMatching(/\.webp$/),
    alt: expect.any(String),
    eyebrow: 'SEASONAL FIELD NOTE',
  }),
)
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```powershell
npm test -- --run src/data/services.test.js src/data/projects.test.js src/data/siteContent.test.js
```

Expected: FAIL because `number` still exists and the new fields do not.

- [ ] **Step 3: Implement service metadata**

Replace `src/data/services.js` with:

```js
import { media } from './projectMedia'

export const services = [
  {
    id: 'garden',
    title: '庭園設計',
    tag: 'SPACE PLANNING',
    summary: '從日照、動線與生活方式出發，讓自然融入住宅尺度。',
    image: media('changhua-residence-02.webp'),
    imageAlt: '住宅庭園的石材鋪面與植栽配置',
    linkLabel: '了解設計內容',
  },
  {
    id: 'planting',
    title: '植栽綠化',
    tag: 'PLANTING',
    summary: '依環境條件配置植栽層次，兼顧四季景觀與後續照護。',
    image: media('taoyuan-greenwall-02.webp'),
    imageAlt: '校園植生牆的多層次綠化配置',
    linkLabel: '查看綠化案例',
  },
  {
    id: 'waterscape',
    title: '假山水景',
    tag: 'ROCK & WATER',
    summary: '運用自然石、流水與細緻工法，建立具有生命感的庭園水景。',
    image: media('nantun-residence-03.webp'),
    imageAlt: '私人住宅庭園中的假山水池',
    linkLabel: '查看水景案例',
  },
  {
    id: 'care',
    title: '後續養護',
    tag: 'MAINTENANCE',
    summary: '依季節修剪、植栽照料與水景維護，維持庭園長期平衡。',
    image: media('taichung-maintenance-04.webp'),
    imageAlt: '完成修剪養護的日式庭園',
    linkLabel: '了解養護方式',
  },
]
```

- [ ] **Step 4: Add project focal points and navigation feature data**

Add a `focalPoint` string to every object in `projectDefinitions`, starting with:

```js
focalPoint: '52% 48%', // changhua
focalPoint: '50% 55%', // tianzhong
focalPoint: '52% 56%', // nantun
focalPoint: '50% 50%', // taoyuan
focalPoint: '48% 52%', // taichung
focalPoint: '50% 54%', // puli
```

Add to `siteContent`:

```js
navigation: {
  eyebrow: 'SEASONAL FIELD NOTE',
  title: '從一座庭園，開始認識我們。',
  image: media('tianzhong-courtyard-03.webp'),
  alt: '田中私人庭院修剪養護後的實景',
},
```

- [ ] **Step 5: Run the tests and commit**

Run:

```powershell
npm test -- --run src/data/services.test.js src/data/projects.test.js src/data/siteContent.test.js
```

Expected: PASS.

```powershell
git add src/data/services.js src/data/services.test.js src/data/projects.js src/data/projects.test.js src/data/siteContent.js src/data/siteContent.test.js
git commit -m "feat: add landscape presentation metadata"
```

### Task 3: Add the reusable leaf mark and leaf action group

**Files:**
- Create: `src/components/ui/LeafIcon.jsx`
- Create: `src/components/ui/LeafIcon.test.jsx`
- Create: `src/components/ui/LeafActions.jsx`
- Create: `src/components/ui/LeafActions.test.jsx`

- [ ] **Step 1: Write failing UI tests**

Create `src/components/ui/LeafIcon.test.jsx`:

```jsx
import { render } from '@testing-library/react'
import LeafIcon from './LeafIcon'

test('renders as a decorative icon', () => {
  const { container } = render(<LeafIcon />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
```

Create `src/components/ui/LeafActions.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import LeafActions from './LeafActions'

test('renders direct project and LINE actions', () => {
  render(
    <LeafActions
      projectsHref="/projects"
      lineHref="https://line.me/ti/p/~0921047049"
    />,
  )
  expect(screen.getByRole('link', { name: '瀏覽庭園作品' })).toHaveAttribute('href', '/projects')
  expect(screen.getByRole('link', { name: 'LINE 諮詢' })).toHaveAttribute('href', 'https://line.me/ti/p/~0921047049')
})
```

- [ ] **Step 2: Verify tests fail**

Run:

```powershell
npm test -- --run src/components/ui/LeafIcon.test.jsx src/components/ui/LeafActions.test.jsx
```

Expected: FAIL with unresolved component imports.

- [ ] **Step 3: Implement pure components**

Create `src/components/ui/LeafIcon.jsx`:

```jsx
export default function LeafIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 13C6 3 14 1 22 2c-1 8-7 13-16 12" />
      <path d="M5 12c4-3 8-5 14-8" />
    </svg>
  )
}
```

Create `src/components/ui/LeafActions.jsx`:

```jsx
import { Link } from 'react-router-dom'
import LeafIcon from './LeafIcon'

export default function LeafActions({ projectsHref, lineHref }) {
  return (
    <div className="leaf-actions">
      <Link className="leaf-action leaf-action--primary" to={projectsHref}>
        <LeafIcon />
        <span>瀏覽庭園作品</span>
      </Link>
      <a
        className="leaf-action leaf-action--secondary"
        href={lineHref}
        target="_blank"
        rel="noreferrer"
      >
        <LeafIcon />
        <span>LINE 諮詢</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npm test -- --run src/components/ui/LeafIcon.test.jsx src/components/ui/LeafActions.test.jsx
```

Expected: 2 tests PASS.

```powershell
git add src/components/ui/LeafIcon.jsx src/components/ui/LeafIcon.test.jsx src/components/ui/LeafActions.jsx src/components/ui/LeafActions.test.jsx
git commit -m "feat: add Yaosei leaf action primitives"
```

### Task 4: Rebuild the mobile navigation as a complete canvas

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/SiteHeader.jsx`
- Modify: `src/components/layout/SiteHeader.test.jsx`

- [ ] **Step 1: Extend the failing header test**

Render with `menuFeature={siteContent.navigation}` and add assertions after opening:

```jsx
expect(screen.getByRole('heading', { name: '探索曜聖' })).toBeInTheDocument()
expect(screen.getByText('SEASONAL FIELD NOTE')).toBeInTheDocument()
expect(screen.getByAltText('田中私人庭院修剪養護後的實景')).toBeInTheDocument()
expect(screen.getByRole('link', { name: '撥打電話' })).toHaveAttribute('href', 'tel:+886921047049')
expect(screen.queryByRole('button', { name: '關閉主要導覽' })).not.toBeInTheDocument()
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
npm test -- --run src/components/layout/SiteHeader.test.jsx
```

Expected: FAIL because the new menu content is absent and the old backdrop still exists.

- [ ] **Step 3: Pass menu feature data from `App.jsx`**

Change the header call to:

```jsx
<SiteHeader
  brand={brand}
  contact={contact}
  menuFeature={siteContent.navigation}
/>
```

- [ ] **Step 4: Replace the header navigation markup**

Use this navigation data:

```jsx
const navigation = [
  { label: '作品案例', english: 'PROJECTS', to: '/projects' },
  { label: '服務內容', english: 'SERVICES', to: '/#services' },
  { label: '關於曜聖', english: 'ABOUT', to: '/#about' },
  { label: '聯絡資訊', english: 'CONTACT', to: '/#contact' },
]
```

Change the component signature to `SiteHeader({ brand, contact, menuFeature })`, remove `nav-backdrop`, and render a desktop group plus a mobile group inside the same `nav`. This avoids changing the desktop header layout while giving mobile a complete canvas:

```jsx
<div className="site-nav__desktop">
  {navigation.slice(0, 3).map((item) => (
    <Link key={item.to} to={item.to} onClick={closeMenu}>{item.label}</Link>
  ))}
  <a className="site-nav__contact" href={contact.lineHref} target="_blank" rel="noreferrer">
    LINE 聯絡
  </a>
</div>
<div className="site-nav__mobile">
  <div className="site-nav__intro">
    <h2>探索曜聖</h2>
    <span>YAO SEI / MENU</span>
  </div>
  <div className="site-nav__links">
    {navigation.map((item) => (
      <Link key={item.to} to={item.to} onClick={closeMenu}>
        <LeafIcon />
        <span><strong>{item.label}</strong><small>{item.english}</small></span>
        <span aria-hidden="true">↗</span>
      </Link>
    ))}
  </div>
  <div className="site-nav__feature">
    <BrandImage src={menuFeature.image} alt={menuFeature.alt} />
    <div><small>{menuFeature.eyebrow}</small><strong>{menuFeature.title}</strong></div>
  </div>
  <div className="site-nav__contact-row">
    <a href={contact.lineHref} target="_blank" rel="noreferrer">LINE 聯絡</a>
    <a href={contact.phoneHref}>撥打電話</a>
  </div>
</div>
```

Import `BrandImage` and `LeafIcon`. Add an effect that calls `setMenuOpen(false)` when `location.pathname` or `location.hash` changes.

- [ ] **Step 5: Run the header and app tests**

Run:

```powershell
npm test -- --run src/components/layout/SiteHeader.test.jsx src/App.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/App.jsx src/components/layout/SiteHeader.jsx src/components/layout/SiteHeader.test.jsx
git commit -m "feat: rebuild full-canvas mobile navigation"
```

### Task 5: Recompose Hero with field note and leaf CTAs

**Files:**
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/pages/HomePage.test.jsx`

- [ ] **Step 1: Add failing homepage assertions**

Add:

```jsx
expect(screen.getByText('彰化・私人住宅庭園')).toBeInTheDocument()
expect(screen.getByRole('link', { name: '瀏覽庭園作品' })).toHaveAttribute('href', '/projects')
expect(screen.getByRole('link', { name: 'LINE 諮詢' })).toHaveAttribute(
  'href',
  'https://line.me/ti/p/~0921047049',
)
expect(document.querySelector('.hero__sun')).not.toBeInTheDocument()
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
npm test -- --run src/pages/HomePage.test.jsx
```

Expected: FAIL because the field note and leaf actions are absent.

- [ ] **Step 3: Replace Hero content**

Import `LeafActions`. Keep `BrandImage`, remove `.hero__sun`, add inside `.hero__media`:

```jsx
<span className="hero__field-note">彰化・私人住宅庭園</span>
```

Replace `.hero__actions` with:

```jsx
<LeafActions projectsHref="/projects" lineHref={contact.lineHref} />
```

Keep the existing direct phone link below the leaf group:

```jsx
<a className="hero__phone" href={contact.phoneHref}>
  撥打 {contact.mobile}
</a>
```

- [ ] **Step 4: Run test and commit**

```powershell
npm test -- --run src/pages/HomePage.test.jsx
git add src/components/home/Hero.jsx src/pages/HomePage.test.jsx
git commit -m "feat: compose natural luxury hero actions"
```

Expected: test passes; commit succeeds.

### Task 6: Replace hollow services and process grids

**Files:**
- Modify: `src/components/home/ServiceOverview.jsx`
- Modify: `src/components/home/WorkProcess.jsx`
- Create: `src/components/home/ServiceOverview.test.jsx`
- Create: `src/components/home/WorkProcess.test.jsx`

- [ ] **Step 1: Write failing component tests**

Create `ServiceOverview.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ServiceOverview from './ServiceOverview'

test('renders image-led services without decorative ordinals', () => {
  const { container } = render(<MemoryRouter><ServiceOverview /></MemoryRouter>)
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.getByRole('img', { name: /住宅庭園/ })).toBeInTheDocument()
  expect(screen.queryByText('01')).not.toBeInTheDocument()
  expect(container.querySelectorAll('.service-card__tag')).toHaveLength(4)
})
```

Create `WorkProcess.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import WorkProcess from './WorkProcess'

test('keeps the genuine five-step sequence as an ordered path', () => {
  const { container } = render(<WorkProcess />)
  expect(container.querySelector('ol.process-path')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(5)
  expect(screen.getByText('01')).toBeInTheDocument()
  expect(screen.getByText('05')).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
npm test -- --run src/components/home/ServiceOverview.test.jsx src/components/home/WorkProcess.test.jsx
```

Expected: FAIL because the new card/path classes are absent.

- [ ] **Step 3: Implement service cards**

Map services into:

```jsx
<Reveal as="article" className="service-card" key={service.id}>
  <div className="service-card__media">
    <BrandImage src={service.image} alt={service.imageAlt} loading="lazy" decoding="async" />
  </div>
  <div className="service-card__content">
    <span className="service-card__tag"><LeafIcon />{service.tag}</span>
    <h3>{service.title}</h3>
    <p>{service.summary}</p>
    <Link to="/projects" className="service-card__link">
      {service.linkLabel}<span aria-hidden="true">↗</span>
    </Link>
  </div>
</Reveal>
```

Import `Link`, `BrandImage`, and `LeafIcon`.

- [ ] **Step 4: Implement process stepping stones**

Rename `process-list` to `process-path`. Draw the route with the list's `::before` pseudo-element so the ordered list contains only valid `li` children:

```jsx
<ol className="process-path">
  {processSteps.map(([number, title, description]) => (
    <Reveal as="li" key={number}>
      <span className="process-step__stone">{number}</span>
      <div><h3>{title}</h3><p>{description}</p></div>
    </Reveal>
  ))}
</ol>
```

- [ ] **Step 5: Run tests and commit**

```powershell
npm test -- --run src/components/home/ServiceOverview.test.jsx src/components/home/WorkProcess.test.jsx src/pages/HomePage.test.jsx
git add src/components/home/ServiceOverview.jsx src/components/home/ServiceOverview.test.jsx src/components/home/WorkProcess.jsx src/components/home/WorkProcess.test.jsx
git commit -m "feat: redesign service and process storytelling"
```

Expected: all selected tests pass.

### Task 7: Remove decorative project indexes and add image focal points

**Files:**
- Modify: `src/components/ui/ProjectCard.jsx`
- Create: `src/components/ui/ProjectCard.test.jsx`
- Modify: `src/components/home/FeaturedProjects.jsx`
- Modify: `src/pages/ProjectsPage.jsx`
- Modify: `src/pages/ProjectsPage.test.jsx`

- [ ] **Step 1: Write failing card assertions**

Create `ProjectCard.test.jsx` using `projects[0]`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { projects } from '../../data/projects'
import ProjectCard from './ProjectCard'

test('renders meaningful project metadata and focal positioning', () => {
  const { container } = render(<MemoryRouter><ProjectCard project={projects[0]} /></MemoryRouter>)
  expect(screen.getByText('彰化・住宅庭園')).toBeInTheDocument()
  expect(screen.getByText('庭園整理')).toBeInTheDocument()
  expect(screen.getByText('植栽修剪')).toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveStyle({ objectPosition: projects[0].focalPoint })
  expect(container.querySelector('.project-card__index')).not.toBeInTheDocument()
})
```

Replace the old index assertion in `ProjectsPage.test.jsx` with:

```jsx
expect(container.querySelector('.project-card__index')).not.toBeInTheDocument()
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
npm test -- --run src/components/ui/ProjectCard.test.jsx src/pages/ProjectsPage.test.jsx
```

Expected: FAIL because indexes remain and focal position is not applied.

- [ ] **Step 3: Implement the new card body**

Remove `index` from the component signature. Apply:

```jsx
<BrandImage
  src={project.heroImage}
  alt={project.alt}
  style={{ objectPosition: project.focalPoint }}
  loading={priority ? 'eager' : 'lazy'}
  decoding="async"
  fetchPriority={priority ? 'high' : 'auto'}
/>
<span className="project-card__note">
  <LeafIcon />{project.location}・{project.category}
</span>
```

Replace the body with:

```jsx
<div className="project-card__body">
  <div className="project-card__meta">
    {project.services.slice(0, 2).map((service) => <span key={service}>{service}</span>)}
  </div>
  <div className="project-card__title-row">
    <h3>{project.title}</h3>
    <span className="project-card__arrow" aria-hidden="true">↗</span>
  </div>
</div>
```

Remove all `index={...}` props in `FeaturedProjects.jsx` and `ProjectsPage.jsx`.

- [ ] **Step 4: Run tests and commit**

```powershell
npm test -- --run src/components/ui/ProjectCard.test.jsx src/pages/ProjectsPage.test.jsx src/pages/HomePage.test.jsx
git add src/components/ui/ProjectCard.jsx src/components/ui/ProjectCard.test.jsx src/components/home/FeaturedProjects.jsx src/pages/ProjectsPage.jsx src/pages/ProjectsPage.test.jsx
git commit -m "feat: present projects with factual metadata"
```

Expected: all selected tests pass.

### Task 8: Implement header, menu, and leaf action styling

**Files:**
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Add leaf action geometry and header states**

Add to `layout.css`:

```css
.site-nav__desktop { display: flex; align-items: center; gap: 34px; }
.site-nav__mobile { display: none; }
.site-nav__desktop > a { font-size: .76rem; font-weight: 700; letter-spacing: .08em; }
.leaf-actions { display: flex; align-items: stretch; }
.leaf-action {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 20px;
  font-weight: 700;
  white-space: nowrap;
}
.leaf-action svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.leaf-action--primary {
  z-index: 1;
  border-radius: 12px 2px 12px 2px;
  background: var(--forest-800);
  color: var(--paper-bright);
  box-shadow: 5px 5px 0 rgba(49, 87, 67, 0.13);
}
.leaf-action--secondary {
  margin-left: -3px;
  border: 1px solid var(--sage-500);
  border-radius: 2px 12px 2px 12px;
  background: var(--paper-bright);
  color: var(--forest-900);
}
.site-header { height: var(--header-height); }
.site-header.is-scrolled { height: var(--header-height-scrolled); }
```

Update the existing header test's desktop/mobile duplicate link queries to `getAllByRole(...)` and assert that every matching LINE link has the official URL. CSS makes only the viewport-appropriate group visible, while JSDOM correctly retains both groups in the accessibility tree used by the unit test.

- [ ] **Step 2: Replace the mobile drawer rules**

In the `max-width: 768px` block, remove `.nav-backdrop` rules and replace `.site-nav` with:

```css
.site-nav {
  position: fixed;
  z-index: 3;
  inset: calc(12px + var(--header-height)) 12px 12px;
  display: block;
  visibility: hidden;
  overflow-y: auto;
  border-radius: 0 0 var(--radius-panel) var(--radius-panel);
  background: var(--paper-bright);
  color: var(--ink);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity 250ms ease, transform 250ms ease, visibility 250ms ease;
}
.site-nav.is-open { visibility: visible; opacity: 1; pointer-events: auto; transform: none; }
.site-nav__desktop { display: none; }
.site-nav__mobile { display: grid; min-height: 100%; grid-template-rows: auto 1fr minmax(130px, 23vh) auto; }
.site-nav__intro { display: flex; align-items: end; justify-content: space-between; padding: 20px 18px 14px; }
.site-nav__intro h2 { font-size: 1.5rem; }
.site-nav__intro span { font-family: var(--font-utility); font-size: .58rem; font-weight: 700; letter-spacing: .2em; }
.site-nav__links { display: flex; flex-direction: column; padding: 0 18px; }
.site-nav__links > a { display: grid; grid-template-columns: 36px 1fr auto; min-height: 68px; align-items: center; border-top: 1px solid var(--line); }
.site-nav__links strong { display: block; font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; }
.site-nav__links small { display: block; font-family: var(--font-utility); font-size: .56rem; font-weight: 700; letter-spacing: .15em; }
.site-nav__feature { position: relative; overflow: hidden; }
.site-nav__feature img { width: 100%; height: 100%; object-fit: cover; }
.site-nav__feature > div { position: absolute; inset: auto 18px 16px; color: white; }
.site-nav__contact-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--forest-950); }
.site-nav__contact-row a { display: grid; min-height: 50px; place-items: center; background: var(--forest-800); color: white; font-weight: 700; white-space: nowrap; }
```

- [ ] **Step 3: Run static checks and commit**

Run:

```powershell
npm test -- --run src/components/layout/SiteHeader.test.jsx src/components/ui/LeafActions.test.jsx
npm run lint
```

Expected: PASS.

```powershell
git add src/styles/layout.css src/styles/responsive.css
git commit -m "style: refine navigation and leaf actions"
```

### Task 9: Implement Hero, service cards, and stepping-stone motion

**Files:**
- Modify: `src/styles/home.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Replace the Hero geometry**

Use these key declarations:

```css
.hero { padding-top: calc(var(--header-height) + 12px); }
.hero__media { overflow: hidden; border-radius: var(--radius-image); }
.hero__field-note {
  position: absolute;
  z-index: 3;
  top: 16px;
  left: 16px;
  padding: 8px 10px;
  border-radius: var(--radius-control);
  background: rgba(245, 245, 239, .92);
  color: var(--forest-900);
  font-family: var(--font-utility);
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .1em;
}
.hero__sun { display: none; }
.hero h1 { font-weight: 700; }
.hero__description { font-weight: 500; }
```

- [ ] **Step 2: Replace service list/card rules**

```css
.service-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.service-card {
  position: relative;
  overflow: hidden;
  min-height: 360px;
  border: 1px solid var(--fog-300);
  border-radius: var(--radius-panel);
  background: var(--paper-bright);
  box-shadow: var(--shadow-rest);
  transition: transform 350ms var(--ease), box-shadow 350ms var(--ease);
}
.service-card:hover,
.service-card:focus-within { transform: translateY(-7px); box-shadow: var(--shadow-hover); }
.service-card__media { height: 170px; overflow: hidden; }
.service-card__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 550ms var(--ease); }
.service-card:hover img,
.service-card:focus-within img { transform: scale(1.035); }
.service-card__content { padding: 20px 18px 60px; }
.service-card__tag { display: flex; align-items: center; gap: 8px; color: #b87727; font-family: var(--font-utility); font-size: .58rem; font-weight: 700; }
.service-card h3 { margin: 14px 0 9px; font-size: 1.45rem; font-weight: 700; }
.service-card p { color: var(--muted); font-size: .8rem; font-weight: 500; }
.service-card__link { position: absolute; right: 18px; bottom: 15px; left: 18px; display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--line); font-weight: 700; }
```

- [ ] **Step 3: Replace process grid rules**

```css
.process-path { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; padding-top: 38px; }
.process-path::before { position: absolute; top: 59px; right: 7%; left: 7%; height: 2px; background: linear-gradient(90deg, var(--sage-300), var(--forest-800), var(--sage-300)); content: ''; }
.process-path li { position: relative; z-index: 1; text-align: center; }
.process-path li:nth-child(odd) { padding-top: 56px; }
.process-step__stone { display: grid; width: 48px; height: 42px; margin: 0 auto 17px; place-items: center; border-radius: 12px 3px 12px 3px; background: var(--forest-800); color: white; box-shadow: 5px 6px 0 rgba(255,255,255,.7), 0 13px 24px rgba(49,87,67,.17); font-family: var(--font-utility); font-weight: 700; transition: transform 300ms var(--ease); }
.process-path li:nth-child(even) .process-step__stone { border-radius: 3px 12px 3px 12px; background: var(--gold-500); color: var(--ink); }
.process-path li:hover .process-step__stone { transform: translateY(-5px) rotate(-2deg); }
.process-path h3 { font-weight: 700; }
.process-path p { color: var(--muted); font-size: .78rem; font-weight: 500; }
```

- [ ] **Step 4: Add responsive transformations**

At `max-width: 768px`, service cards become two columns and the process becomes a two-column stepping path. At `max-width: 560px`, use:

```css
.service-list { grid-template-columns: 1fr; }
.service-card { display: grid; grid-template-columns: 42% 58%; min-height: 250px; }
.service-card__media { height: 100%; }
.service-card__link { left: calc(42% + 18px); }
.process-path { grid-template-columns: 1fr; padding-top: 0; }
.process-path::before { display: none; }
.process-path li,
.process-path li:nth-child(odd) { display: grid; grid-template-columns: 56px 1fr; gap: 0 12px; padding: 12px 0; text-align: left; }
.process-step__stone { grid-row: 1 / 3; margin: 0; }
.process-path p { grid-column: 2; }
```

- [ ] **Step 5: Test, lint, and commit**

```powershell
npm test -- --run src/components/home/ServiceOverview.test.jsx src/components/home/WorkProcess.test.jsx src/pages/HomePage.test.jsx
npm run lint
git add src/styles/home.css src/styles/responsive.css
git commit -m "style: add layered landscape storytelling"
```

Expected: all checks pass.

### Task 10: Implement project catalogue image treatment

**Files:**
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Replace project card presentation rules**

```css
.project-card {
  overflow: hidden;
  border: 1px solid var(--fog-300);
  border-radius: var(--radius-panel);
  background: var(--paper-bright);
  box-shadow: var(--shadow-rest);
  transition: transform 350ms var(--ease), box-shadow 350ms var(--ease);
}
.project-card:hover,
.project-card:focus-within { transform: translateY(-6px); box-shadow: var(--shadow-hover); }
.project-card__media { position: relative; overflow: hidden; border-radius: var(--radius-image) var(--radius-image) 0 0; }
.project-card__media img { width: 100%; height: 100%; object-fit: cover; transition: transform 700ms var(--ease); }
.project-card:hover .project-card__media img,
.project-card:focus-within .project-card__media img { transform: scale(1.025); }
.project-card__note { position: absolute; top: 14px; left: 14px; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: var(--radius-control); background: rgba(247,247,242,.94); color: var(--forest-900); font-family: var(--font-utility); font-size: .58rem; font-weight: 700; }
.project-card__body { display: block; padding: 20px; }
.project-card__meta { display: flex; gap: 22px; color: var(--muted); font-family: var(--font-utility); font-size: .58rem; font-weight: 700; letter-spacing: .1em; }
.project-card__title-row { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: end; margin-top: 10px; }
.project-card__title-row h3 { font-weight: 700; }
.project-card__arrow { display: grid; width: 46px; height: 42px; place-items: center; border: 1px solid var(--sage-500); border-radius: 12px 2px 12px 2px; color: var(--forest-800); transition: transform 300ms ease, background 300ms ease, color 300ms ease; }
.project-card:hover .project-card__arrow { transform: translate(3px,-3px); background: var(--forest-800); color: white; }
```

- [ ] **Step 2: Preserve catalogue asymmetry and mobile 4:5 crops**

Keep the existing desktop 7/5 grid. Ensure both homepage and projects page use `aspect-ratio: 4 / 5` below 768px, and delete all `.project-card__index` rules.

- [ ] **Step 3: Run checks and commit**

```powershell
npm test -- --run src/components/ui/ProjectCard.test.jsx src/pages/ProjectsPage.test.jsx
npm run lint
npm run build
git add src/styles/projects.css src/styles/responsive.css
git commit -m "style: polish project image catalogue"
```

Expected: tests, lint, and production build pass.

### Task 11: Full responsive and interaction QA

**Files:**
- Modify only files needed for bugs found in this task.
- Do not add screenshots or temporary Playwright scripts to the repository.

- [ ] **Step 1: Run the full automated suite**

```powershell
npm test -- --run
npm run lint
npm run build
git diff --check
```

Expected: 0 failures and no whitespace errors.

- [ ] **Step 2: Verify no remote placeholders or remote fonts remain**

```powershell
rg -n "images\.unsplash\.com|drive\.google\.com|fonts\.googleapis|fonts\.gstatic" src dist
rg -n "border-radius:\s*(1[3-9]|[2-9][0-9]|50%)" src/styles
```

Expected: the first command has no matches. The radius audit has no matches for controls, panels, image frames, or buttons; any remaining match must be a documented non-interactive decorative mark and must not create a pill/card/container.

- [ ] **Step 3: Run rendered checks at the exact local URL**

Use `http://127.0.0.1:64912/` and check widths 360, 390, 768, 1024, 1440 for:

```text
#/ -> header -> open menu -> close with × -> reopen -> close with Escape
#/ -> leaf project action -> #/projects
#/projects -> filter 假山水景 -> one correct card remains
#/projects/nantun-rock-water-garden -> gallery and direct contact CTA
#/not-a-page -> branded error page
```

For every route assert:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
[...document.images].every((image) => !image.complete || image.naturalWidth > 0)
```

Also assert no framework overlay and no console warning/error.

- [ ] **Step 4: Compare screenshots with the approved companion designs**

Capture outside the repo:

```text
mobile-home-390.png
mobile-menu-open-390.png
desktop-home-1440.png
desktop-services-process-1440.png
desktop-projects-1440.png
```

Mismatch ledger must confirm: 6–12px radii, no top void, no empty menu quadrant, no CTA wrapping, strong 500–700 typography, real service images, process stepping stones, no project ordinal numbers, and restrained hover shadow.

- [ ] **Step 5: Fix any regression with a failing test first**

For each defect: add a focused Vitest/RTL assertion, run it to see FAIL, implement the smallest fix, rerun the focused test, then repeat the rendered interaction.

- [ ] **Step 6: Final commit**

```powershell
git add -- src package.json package-lock.json
git commit -m "fix: verify natural luxury layout across breakpoints"
git status --short
```

Expected: only the user-owned `規劃圖/` directory remains untracked; it is not staged or modified.
