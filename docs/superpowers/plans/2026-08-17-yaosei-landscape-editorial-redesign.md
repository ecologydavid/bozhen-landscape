# Yaosei Landscape Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder-photo React site with the approved mobile rounded-canvas and desktop landscape-editorial design, using curated real Yaosei projects and truthful natural commercial retouching.

**Architecture:** Keep the existing Vite, React Router, static GitHub Pages architecture. Centralize brand/contact copy in `siteContent`, project copy in `projects`, and asset resolution in a small `projectMedia` module; Google Drive remains a read-only source and the browser receives only optimized local WebP assets.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest, Testing Library, CSS, Sharp for local image conversion, Google Drive connector for source media, OpenAI image editing for approved cover retouching.

---

## File map

- Create `scripts/project-asset-manifest.mjs`: exact Drive-source-to-output mapping for 26 selected photos.
- Create `scripts/build-project-assets.mjs`: orientation correction, resize and WebP conversion.
- Create `src/data/projectMedia.js`: Vite asset lookup with an explicit missing-file error.
- Create `src/data/projectMedia.test.js`: media lookup behavior.
- Create `src/components/ui/BrandImage.test.jsx`: image fallback behavior.
- Create `src/assets/projects/*.webp`: 26 optimized real project images.
- Modify `.gitignore`: keep downloaded originals and editing work files out of Git.
- Modify `package.json` and lockfile: add Sharp and an asset build command.
- Modify `src/data/projects.js` and `src/data/projects.test.js`: replace fictional cases with six real projects.
- Modify `src/data/siteContent.js` and `src/data/siteContent.test.js`: approved headline and real hero asset.
- Modify `src/components/layout/SiteHeader.jsx` and tests: editorial header and complete mobile close behavior.
- Modify `src/pages/HomePage.jsx`, home components and tests: works-first editorial sequence.
- Modify `src/pages/ProjectsPage.jsx`, `src/pages/ProjectDetailPage.jsx`, `src/components/ui/ProjectCard.jsx` and tests: real cases and editorial metadata.
- Modify `src/styles/tokens.css`, `layout.css`, `home.css`, `projects.css`, `responsive.css`: approved visual system and responsive behavior.
- Modify `index.html`: approved page title, description and font preconnect/imports.

### Task 1: Curate, retouch and optimize real project media

**Files:**
- Create: `scripts/project-asset-manifest.mjs`
- Create: `scripts/build-project-assets.mjs`
- Create: `src/assets/projects/*.webp`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add exact source media manifest**

Create `scripts/project-asset-manifest.mjs` with these 26 entries:

```js
export const projectAssetManifest = [
  ['changhua-residence', 'IMG_8382.HEIC', 'changhua-residence-01.webp'],
  ['changhua-residence', 'IMG_8380.HEIC', 'changhua-residence-02.webp'],
  ['changhua-residence', 'IMG_8396.HEIC', 'changhua-residence-03.webp'],
  ['changhua-residence', 'IMG_8398.HEIC', 'changhua-residence-04.webp'],
  ['changhua-residence', 'IMG_8399.HEIC', 'changhua-residence-05.webp'],
  ['tianzhong-courtyard', 'IMG_1181.HEIC', 'tianzhong-courtyard-01.webp'],
  ['tianzhong-courtyard', 'IMG_1182.HEIC', 'tianzhong-courtyard-02.webp'],
  ['tianzhong-courtyard', 'IMG_1183.HEIC', 'tianzhong-courtyard-03.webp'],
  ['tianzhong-courtyard', 'IMG_1232.HEIC', 'tianzhong-courtyard-04.webp'],
  ['nantun-residence', 'IMG_9887.JPG', 'nantun-residence-01.webp'],
  ['nantun-residence', 'IMG_9886.JPG', 'nantun-residence-02.webp'],
  ['nantun-residence', 'IMG_9888.JPG', 'nantun-residence-03.webp'],
  ['nantun-residence', 'IMG_9868.HEIC', 'nantun-residence-04.webp'],
  ['nantun-residence', 'IMG_9891.HEIC', 'nantun-residence-05.webp'],
  ['taoyuan-greenwall', 'IMG_8593.HEIC', 'taoyuan-greenwall-01.webp'],
  ['taoyuan-greenwall', 'IMG_8594.HEIC', 'taoyuan-greenwall-02.webp'],
  ['taichung-maintenance', 'IMG_0328.HEIC', 'taichung-maintenance-01.webp'],
  ['taichung-maintenance', 'IMG_0399.HEIC', 'taichung-maintenance-02.webp'],
  ['taichung-maintenance', 'IMG_0400.HEIC', 'taichung-maintenance-03.webp'],
  ['taichung-maintenance', 'IMG_0401.HEIC', 'taichung-maintenance-04.webp'],
  ['taichung-maintenance', 'IMG_9144.HEIC', 'taichung-maintenance-05.webp'],
  ['puli-winery', 'IMG_1585.HEIC', 'puli-winery-01.webp'],
  ['puli-winery', 'IMG_1591.HEIC', 'puli-winery-02.webp'],
  ['puli-winery', 'IMG_1595.HEIC', 'puli-winery-03.webp'],
  ['puli-winery', 'IMG_1247.HEIC', 'puli-winery-04.webp'],
  ['puli-winery', 'IMG_1250.HEIC', 'puli-winery-05.webp'],
].map(([folder, source, output]) => ({ folder, source, output }))
```

- [ ] **Step 2: Download read-only originals into the ignored workbench**

Use the connected Google Drive folder IDs recorded in the approved design work. Save each file to `workbench/landscape-originals/<folder>/<source>`. If a selected image is visibly unfinished, badly obstructed or unrelated after conversion, replace it only with the next image from the same Drive case and update the manifest in the same commit.

- [ ] **Step 3: Apply natural commercial AI retouching to the six cover candidates**

Edit `IMG_8382`, `IMG_1181`, `IMG_9887`, `IMG_8593`, `IMG_0328` and `IMG_1585` with this exact instruction, saving each result as `<original-stem>.png` under the matching folder in `workbench/landscape-edited`:

```text
Natural commercial retouch of this real completed landscape photograph. Correct exposure, white balance, lens distortion, horizontal and vertical perspective, noise and highlight recovery. Remove only small loose tools, cables, trash and sensor spots. Preserve every plant, rock, water feature, path, building element, spatial dimension, season and completed-work condition exactly. Do not add vegetation, redesign the garden, change plant maturity, alter the sky into a different weather event, or create any feature that was not present. Keep the result photorealistic and editorial, with restrained greens and natural stone color.
```

Reject any edit that changes a major plant, stone, water feature, path or building element; use the unedited original for that cover instead.

- [ ] **Step 4: Add the deterministic WebP build script**

Create `scripts/build-project-assets.mjs`:

```js
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { projectAssetManifest } from './project-asset-manifest.mjs'

const originalRoot = path.resolve('workbench/landscape-originals')
const editedRoot = path.resolve('workbench/landscape-edited')
const outputRoot = path.resolve('src/assets/projects')

async function existingInput(folder, source) {
  const stem = path.parse(source).name
  const candidates = [
    path.join(editedRoot, folder, `${stem}.png`),
    path.join(editedRoot, folder, `${stem}.jpg`),
    path.join(originalRoot, folder, source),
  ]
  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      continue
    }
  }
  throw new Error(`Missing source asset: ${folder}/${source}`)
}

await mkdir(outputRoot, { recursive: true })

for (const item of projectAssetManifest) {
  const input = await existingInput(item.folder, item.source)
  const output = path.join(outputRoot, item.output)
  await sharp(input)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 5, smartSubsample: true })
    .toFile(output)
}

console.log(`Built ${projectAssetManifest.length} project assets.`)
```

- [ ] **Step 5: Configure local-only work files and asset command**

Append `workbench/` to `.gitignore`. Add `"assets:build": "node scripts/build-project-assets.mjs"` to `scripts` and add `sharp` as a development dependency using:

```powershell
npm install --save-dev sharp
npm run assets:build
```

Expected: `Built 26 project assets.` and 26 WebP files in `src/assets/projects`.

- [ ] **Step 6: Inspect output dimensions and file size**

Run:

```powershell
node -e "import('sharp').then(async({default:s})=>{const{readdir}=await import('node:fs/promises');for(const f of await readdir('src/assets/projects')){const m=await s('src/assets/projects/'+f).metadata();console.log(f,m.width,m.height)}})"
```

Expected: 26 rows, every image width and height greater than zero, longest side no greater than 1920px.

- [ ] **Step 7: Commit the asset pipeline and optimized assets**

```powershell
git add -- .gitignore package.json package-lock.json scripts/project-asset-manifest.mjs scripts/build-project-assets.mjs src/assets/projects
git commit -m "feat: add curated Yaosei project media"
```

### Task 2: Replace fictional project content with real cases

**Files:**
- Create: `src/data/projectMedia.js`
- Create: `src/data/projectMedia.test.js`
- Modify: `src/data/projects.js`
- Modify: `src/data/projects.test.js`
- Modify: `src/data/siteContent.js`
- Modify: `src/data/siteContent.test.js`

- [ ] **Step 1: Write failing media and project-data tests**

Add assertions that all five approved filters exist, all six cases have unique slugs, all image URLs end in WebP, every gallery has at least two images, and exactly three projects are featured:

```js
expect(projectCategories).toEqual([
  '全部',
  '住宅庭園',
  '商業綠化',
  '假山水景',
  '養護工程',
])
expect(projects).toHaveLength(6)
expect(projects.filter((project) => project.featured)).toHaveLength(3)
for (const project of projects) {
  expect(project.heroImage).toMatch(/\.webp$/)
  expect(project.gallery.length).toBeGreaterThanOrEqual(2)
  expect(project.gallery.every((image) => image.endsWith('.webp'))).toBe(true)
  expect(project.alt).toEqual(expect.any(String))
  expect(project.services.length).toBeGreaterThan(0)
}
```

Create `src/data/projectMedia.test.js` to verify `media('changhua-residence-01.webp')` returns a URL and a missing name throws `Missing project media`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run src/data/projectMedia.test.js src/data/projects.test.js src/data/siteContent.test.js`

Expected: FAIL because `projectMedia.js` and the real project fields do not exist.

- [ ] **Step 3: Add the media lookup boundary**

Create `src/data/projectMedia.js`:

```js
const files = import.meta.glob('../assets/projects/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function media(filename) {
  const key = `../assets/projects/${filename}`
  const url = files[key]
  if (!url) throw new Error(`Missing project media: ${filename}`)
  return url
}
```

- [ ] **Step 4: Replace `projects.js` with six real records**

Use these exact records and the matching media filenames from Task 1:

```js
export const projectCategories = ['全部', '住宅庭園', '商業綠化', '假山水景', '養護工程']

const projectDefinitions = [
  { slug: 'changhua-private-residence', title: '彰化私人住宅庭園', category: '住宅庭園', location: '彰化', featured: true, images: ['changhua-residence-01.webp','changhua-residence-02.webp','changhua-residence-03.webp','changhua-residence-04.webp','changhua-residence-05.webp'], summary: '以植栽層次與清楚動線，讓住宅日常擁有安定而易於照護的庭園。', clientNeed: '整理住宅戶外空間的視線、動線與植栽層次，同時維持日常使用便利。', designApproach: '依採光與尺度配置耐候植栽，保留呼吸感並降低後續養護負擔。', services: ['庭園設計','植栽綠化'], alt: '彰化私人住宅完成後的庭園植栽與步道' },
  { slug: 'tianzhong-private-courtyard', title: '田中私人庭院', category: '住宅庭園', location: '彰化田中', featured: true, images: ['tianzhong-courtyard-01.webp','tianzhong-courtyard-02.webp','tianzhong-courtyard-03.webp','tianzhong-courtyard-04.webp'], summary: '以自然材質與綠意重新梳理私人庭院，建立安靜、親近生活的戶外角落。', clientNeed: '在有限庭院尺度中增加綠意、改善視線並保留自在通行空間。', designApproach: '用簡潔植栽組合與自然材質形成前後景，讓庭院在不同觀看距離都有層次。', services: ['庭園設計','植栽綠化'], alt: '彰化田中私人庭院的植栽與自然材質配置' },
  { slug: 'nantun-rock-water-garden', title: '南屯私人宅假山水景', category: '假山水景', location: '台中南屯', featured: true, images: ['nantun-residence-01.webp','nantun-residence-02.webp','nantun-residence-03.webp','nantun-residence-04.webp','nantun-residence-05.webp'], summary: '在住宅露台中整合假山、水池、踏石與植栽，形成可近觀也可遠賞的主景。', clientNeed: '希望露台具備明確主景與水聲，同時保持日常通行和休憩的完整性。', designApproach: '依現場視角排列景石與水景高低，利用踏石和植栽銜接建築與庭園。', services: ['假山水景','庭園設計'], alt: '台中南屯私人住宅露台的假山水池與踏石庭園' },
  { slug: 'taoyuan-school-green-wall', title: '桃園校園植生牆', category: '商業綠化', location: '桃園', featured: false, images: ['taoyuan-greenwall-01.webp','taoyuan-greenwall-02.webp'], summary: '以立體綠化增加校園空間的自然感，在有限平面中創造更完整的綠意視野。', clientNeed: '在不占用主要活動面積的前提下，提高校園空間的綠覆感與識別度。', designApproach: '依牆面條件與養護需求選擇植栽，配置灌溉與可替換的模組化植生單元。', services: ['植栽綠化','養護管理'], alt: '桃園學校完成後的模組化植生牆' },
  { slug: 'taichung-garden-maintenance', title: '台中庭園修剪維護', category: '養護工程', location: '台中', featured: false, images: ['taichung-maintenance-01.webp','taichung-maintenance-02.webp','taichung-maintenance-03.webp','taichung-maintenance-04.webp','taichung-maintenance-05.webp'], summary: '透過修剪、整枝與環境整理，恢復庭園原有輪廓並維持健康生長。', clientNeed: '改善枝葉過密、視線受阻與整體輪廓鬆散的狀態。', designApproach: '依樹種與生長狀況分段整枝，保留自然樹形並清理影響通行的枝葉。', services: ['修剪維護','養護管理'], alt: '台中庭園完成修剪維護後的樹形與環境' },
  { slug: 'puli-winery-landscape', title: '埔里酒廠景觀整理', category: '商業綠化', location: '南投埔里', featured: false, images: ['puli-winery-01.webp','puli-winery-02.webp','puli-winery-03.webp','puli-winery-04.webp','puli-winery-05.webp'], summary: '整理公共場域植栽與景觀界面，兼顧人流、辨識度與長期維護。', clientNeed: '在人流頻繁的商業場域中改善植栽景觀，並保留清楚安全的參觀動線。', designApproach: '依公共空間使用強度配置耐候植栽，透過修整與補植建立一致的景觀輪廓。', services: ['商業綠化','養護管理'], alt: '南投埔里酒廠完成景觀整理後的公共綠化空間' },
]

export const projects = projectDefinitions.map((project) => ({
  ...project,
  heroImage: media(project.images[0]),
  gallery: project.images.map(media),
  materials: project.services,
}))
```

Import `media` from `./projectMedia` at the top.

- [ ] **Step 5: Point the homepage hero to the first real residential image**

Set `siteContent.hero.title` to `把自然，安放進日常`, set the description to `庭園設計・植栽綠化・假山水景・後續養護`, and set `image` and `alt` from `media('changhua-residence-01.webp')` and `彰化私人住宅庭園實景`.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- --run src/data/projectMedia.test.js src/data/projects.test.js src/data/siteContent.test.js`

Expected: PASS.

```powershell
git add -- src/data/projectMedia.js src/data/projectMedia.test.js src/data/projects.js src/data/projects.test.js src/data/siteContent.js src/data/siteContent.test.js
git commit -m "feat: replace placeholder cases with real projects"
```

### Task 3: Build the editorial shell, typography and mobile navigation

**Files:**
- Modify: `index.html`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/components/layout/SiteHeader.jsx`
- Modify: `src/components/layout/SiteHeader.test.jsx`

- [ ] **Step 1: Extend the header test for Escape and backdrop closing**

After opening the menu, press Escape and assert `nav-open` is removed. Reopen it, click the element named `關閉主要導覽`, and assert the navigation no longer has `is-open`.

- [ ] **Step 2: Run the header test and verify failure**

Run: `npm test -- --run src/components/layout/SiteHeader.test.jsx`

Expected: FAIL because the named backdrop control does not exist.

- [ ] **Step 3: Add the navigation backdrop control**

Render this immediately before the `nav` element and keep the existing close behavior:

```jsx
<button
  className={`nav-backdrop${menuOpen ? ' is-visible' : ''}`}
  type="button"
  aria-label="關閉主要導覽"
  tabIndex={menuOpen ? 0 : -1}
  onClick={closeMenu}
/>
```

- [ ] **Step 4: Apply approved tokens and fonts**

Set the root tokens to the approved palette and wider desktop container:

```css
:root {
  --ink-950: #171a17;
  --paper: #f4f3ec;
  --paper-bright: #fbfaf5;
  --moss-800: #315743;
  --leaf-500: #8ea38f;
  --sun-500: #e8a448;
  --fog-300: #d8d9d2;
  --font-display: 'Noto Serif TC', 'Songti TC', 'PMingLiU', serif;
  --font-body: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif;
  --font-editorial: 'Cormorant Garamond', Georgia, serif;
  --container: min(1480px, calc(100% - 64px));
  --canvas-radius: 26px;
  --forest-950: var(--ink-950);
  --forest-900: #233c30;
  --forest-850: #294a39;
  --forest-800: var(--moss-800);
  --forest-700: #4f755e;
  --graphite-950: var(--ink-950);
  --graphite-900: #30342f;
  --graphite-800: #4c504b;
  --sage-500: var(--leaf-500);
  --sage-300: #bdc9bc;
  --ivory-100: var(--paper);
  --ivory-50: var(--paper-bright);
  --gold-500: var(--sun-500);
  --gold-400: #efb15d;
  --gold-200: #f3d4a5;
  --ink: var(--ink-950);
  --muted: #697069;
  --line: rgba(23, 26, 23, 0.15);
  --line-light: rgba(244, 243, 236, 0.2);
  --font-serif: var(--font-display);
  --font-sans: var(--font-body);
}
```

Load Noto Serif TC, Noto Sans TC and Cormorant Garamond from Google Fonts in `index.html`, and set the document title to `曜聖景觀｜庭園設計・植栽綠化・假山水景`.

- [ ] **Step 5: Implement desktop editorial shell and mobile rounded canvas**

Update `layout.css` and `responsive.css` so desktop uses the wide container and mobile uses:

```css
@media (max-width: 768px) {
  body { background: var(--ink-950); padding: 12px 12px calc(80px + env(safe-area-inset-bottom)); }
  .site-shell { min-width: 0; overflow: clip; border-radius: var(--canvas-radius); background: var(--paper-bright); box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34); }
  .site-header__inner { width: calc(100% - 28px); min-width: 0; }
  .brand-mark { min-width: 0; max-width: calc(100% - 56px); }
  .brand-mark__wording { overflow: hidden; }
  .brand-mark__wording small { overflow: hidden; text-overflow: ellipsis; }
  .nav-backdrop { position: fixed; inset: 0; visibility: hidden; background: rgba(23, 26, 23, 0.42); opacity: 0; }
  .nav-backdrop.is-visible { visibility: visible; opacity: 1; }
}
```

Retain the existing 44px controls, body scroll lock, `100dvh` menu and reduced-motion behavior.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- --run src/components/layout/SiteHeader.test.jsx src/App.test.jsx`

Expected: PASS.

```powershell
git add -- index.html src/styles/tokens.css src/styles/layout.css src/styles/responsive.css src/components/layout/SiteHeader.jsx src/components/layout/SiteHeader.test.jsx
git commit -m "feat: add Yaosei editorial site shell"
```

### Task 4: Recompose the works-first homepage

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.test.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/components/home/FeaturedProjects.jsx`
- Modify: `src/components/home/ServiceOverview.jsx`
- Modify: `src/components/home/BrandStory.jsx`
- Modify: `src/components/home/ContactActions.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Update the homepage test to the approved content order**

Assert the main heading is `把自然，安放進日常`, the first section after the hero is `作品，是最直接的回答`, the service heading follows it, exactly three featured links exist, and no submit button or form exists.

- [ ] **Step 2: Run the homepage test and verify failure**

Run: `npm test -- --run src/pages/HomePage.test.jsx`

Expected: FAIL because the old headline and section order remain.

- [ ] **Step 3: Reorder homepage units**

Use this exact order in `HomePage.jsx`:

```jsx
<main className="editorial-home">
  <Hero hero={hero} contact={contact} />
  <FeaturedProjects />
  <ServiceOverview />
  <BrandStory />
  <WorkProcess />
  <ClientTypes />
  <ContactActions brand={brand} contact={contact} />
</main>
```

- [ ] **Step 4: Convert the hero into the Garden Window composition**

Use `hero.alt` on `BrandImage`, keep only LINE and phone actions, add a visual-only sun mark, and use `GREEN YOUR LIFE` as the small English label. The image remains real project media and the headline remains `hero.title`.

- [ ] **Step 5: Apply asymmetrical editorial grids**

Implement a desktop 60/40 hero, asymmetric rounded image corners, an uneven three-project featured grid, restrained sunlight/fog gradients, and a single-column mobile canvas. Keep the existing service, process and contact semantic content; do not reintroduce a quote form.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- --run src/pages/HomePage.test.jsx src/App.test.jsx`

Expected: PASS.

```powershell
git add -- src/pages/HomePage.jsx src/pages/HomePage.test.jsx src/components/home/Hero.jsx src/components/home/FeaturedProjects.jsx src/components/home/ServiceOverview.jsx src/components/home/BrandStory.jsx src/components/home/ContactActions.jsx src/styles/home.css src/styles/responsive.css
git commit -m "feat: compose works-first editorial homepage"
```

### Task 5: Redesign project index and detail pages around real metadata

**Files:**
- Modify: `src/pages/ProjectsPage.jsx`
- Modify: `src/pages/ProjectsPage.test.jsx`
- Modify: `src/pages/ProjectDetailPage.jsx`
- Modify: `src/pages/ProjectDetailPage.test.jsx`
- Modify: `src/components/ui/ProjectCard.jsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Replace fictional page assertions**

Filter `假山水景` and assert only `南屯私人宅假山水景` remains. In the detail test, navigate to `/projects/nantun-rock-water-garden` and assert the heading, location, service labels and direct LINE link.

- [ ] **Step 2: Run focused page tests and verify failure**

Run: `npm test -- --run src/pages/ProjectsPage.test.jsx src/pages/ProjectDetailPage.test.jsx`

Expected: FAIL while tests still target fictional projects or the new service labels are absent.

- [ ] **Step 3: Render editorial metadata**

Update `ProjectCard` to show `project.category`, `project.title`, `project.location` and an editorial index supplied by the parent. Update detail pages to use `project.alt` for the hero and render `project.services` as the primary configuration list.

- [ ] **Step 4: Apply the editorial index and gallery layout**

Desktop: use a 12-column project grid with alternating 7/5 spans and consistent baselines. Mobile: one column, 4:5 cover windows, no fixed pixel width. Detail galleries use the first image as the large anchor and all remaining images as contained supporting views.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --run src/pages/ProjectsPage.test.jsx src/pages/ProjectDetailPage.test.jsx src/data/projects.test.js`

Expected: PASS.

```powershell
git add -- src/pages/ProjectsPage.jsx src/pages/ProjectsPage.test.jsx src/pages/ProjectDetailPage.jsx src/pages/ProjectDetailPage.test.jsx src/components/ui/ProjectCard.jsx src/styles/projects.css src/styles/responsive.css
git commit -m "feat: redesign real project catalogue"
```

### Task 6: Harden image fallback, loading and accessibility

**Files:**
- Create: `src/components/ui/BrandImage.test.jsx`
- Modify: `src/components/ui/BrandImage.jsx`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Write failing fallback test**

Render `BrandImage` with a broken URL, fire the error event, and assert the fallback role has the accessible name `測試庭園（圖片暫時無法顯示）`. Rerender with a valid source and assert the image returns.

- [ ] **Step 2: Run the test and verify the reset behavior fails**

Run: `npm test -- --run src/components/ui/BrandImage.test.jsx`

Expected: FAIL if the fallback state does not reset correctly when `src` changes.

- [ ] **Step 3: Keep failure state scoped to the current source**

Retain the `failedSrc === src` model and merge caller `onError` safely:

```jsx
export default function BrandImage({ src, alt, onError, ...imageProps }) {
  const [failedSrc, setFailedSrc] = useState('')
  if (failedSrc === src) {
    return <div className="image-fallback" role="img" aria-label={`${alt}（圖片暫時無法顯示）`}><span>曜聖景觀</span><strong>{alt}</strong></div>
  }
  return <img {...imageProps} src={src} alt={alt} onError={(event) => { setFailedSrc(src); onError?.(event) }} />
}
```

- [ ] **Step 4: Confirm loading policy**

Hero and first featured cover use `fetchPriority="high"` and eager loading. All other gallery and index images use `loading="lazy"` and `decoding="async"`. Every image container has an explicit aspect ratio so loading cannot collapse its layout.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --run src/components/ui/BrandImage.test.jsx src/pages/HomePage.test.jsx src/pages/ProjectDetailPage.test.jsx`

Expected: PASS.

```powershell
git add -- src/components/ui/BrandImage.jsx src/components/ui/BrandImage.test.jsx src/styles/layout.css src/styles/responsive.css
git commit -m "fix: harden editorial image presentation"
```

### Task 7: Responsive, interaction and visual QA

**Files:**
- Modify after inspection only: `src/styles/tokens.css`, `src/styles/layout.css`, `src/styles/home.css`, `src/styles/projects.css`, `src/styles/responsive.css`
- Modify after failing evidence only: affected React component or test

- [ ] **Step 1: Start the local production-like server**

Run: `npm run dev -- --host 127.0.0.1 --port 64912`

Expected: Vite serves `http://127.0.0.1:64912/`.

- [ ] **Step 2: Inspect required routes at required widths**

Check `/`, `/projects`, `/projects/nantun-rock-water-garden` and an unknown route at 360, 390, 768, 1024 and 1440px. For each, inspect first screen and full scroll; open and close the mobile menu; activate phone and LINE controls without completing an external action.

- [ ] **Step 3: Verify overflow programmatically**

For every route and viewport, evaluate:

```js
({
  viewport: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
})
```

Expected: `overflow` is `false` everywhere.

- [ ] **Step 4: Fix only observed defects and rerun their focused tests**

Use fluid `clamp()` values, `min-width: 0`, `overflow-wrap: anywhere`, aspect ratios and grid span changes as needed. Do not hide meaningful content merely to remove overflow.

- [ ] **Step 5: Commit verified responsive fixes**

```powershell
git add -- src/styles/tokens.css src/styles/layout.css src/styles/home.css src/styles/projects.css src/styles/responsive.css src/components src/pages
git commit -m "fix: verify editorial layout across breakpoints"
```

Before committing, inspect `git diff --cached --name-only` and unstage any file not changed for responsive evidence.

### Task 8: Full verification and local handoff

**Files:**
- Modify only if a verification failure proves a defect.

- [ ] **Step 1: Run the full automated suite**

```powershell
npm test -- --run
npm run lint
npm run build
```

Expected: all Vitest files pass, ESLint exits 0, Vite production build exits 0.

- [ ] **Step 2: Verify the built asset policy**

Run: `rg -n "images\.unsplash\.com|drive\.google\.com" src dist`

Expected: no matches in runtime source or built output.

- [ ] **Step 3: Review final Git scope**

Run: `git status --short` and `git log --oneline -10`.

Expected: user-owned `規劃圖/` remains untouched; no downloaded originals or `workbench/` files are staged; implementation commits are visible.

- [ ] **Step 4: Open the local review URL**

Keep the verified server running at `http://127.0.0.1:64912/` and hand the user that URL for visual approval before any GitHub push or deployment.
