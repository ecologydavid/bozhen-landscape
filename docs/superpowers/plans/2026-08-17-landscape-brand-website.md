# 柏鎮園藝假山水 React 形象報價網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立森林精品風格的 React JavaScript 靜態形象網站，包含作品先行首頁、案例總覽、案例內頁、簡短報價表單與示意聯絡互動。

**Architecture:** 使用 Vite 建置 React SPA，React Router 負責四類路由，內容集中在靜態資料模組，共用導覽、案例卡片、圖片備援、提示訊息與報價 CTA。原生 CSS Variables 與 Intersection Observer 處理視覺系統和動畫，不加入 UI 或動畫框架。

**Tech Stack:** React、Vite、React Router、Vitest、Testing Library、ESLint、原生 CSS、Vercel SPA rewrite

---

## File Structure

```text
index.html                         HTML 入口與 noscript 說明
package.json                       套件與指令
vite.config.js                     Vite 與 Vitest 設定
eslint.config.js                   React ESLint 設定
vercel.json                        SPA fallback rewrite
src/main.jsx                       BrowserRouter 與 React 入口
src/App.jsx                        路由表
src/data/services.js               四項服務
src/data/projects.js               六個示意案例
src/data/processSteps.js           五階段服務流程
src/data/siteContent.js            品牌、客群、聯絡與選項文字
src/utils/quoteValidation.js       報價表單驗證
src/hooks/useReveal.js             Intersection Observer
src/components/layout/SiteHeader.jsx
src/components/layout/SiteFooter.jsx
src/components/layout/MobileQuoteBar.jsx
src/components/ui/BrandImage.jsx
src/components/ui/FeedbackToast.jsx
src/components/ui/ProjectCard.jsx
src/components/ui/Reveal.jsx
src/components/home/Hero.jsx
src/components/home/ServiceOverview.jsx
src/components/home/FeaturedProjects.jsx
src/components/home/BrandStory.jsx
src/components/home/WorkProcess.jsx
src/components/home/ClientTypes.jsx
src/components/home/QuoteForm.jsx
src/components/home/ContactActions.jsx
src/pages/HomePage.jsx
src/pages/ProjectsPage.jsx
src/pages/ProjectDetailPage.jsx
src/pages/NotFoundPage.jsx
src/styles/tokens.css               色彩、字體、間距與 reset
src/styles/layout.css               導覽、頁尾、網格與共用容器
src/styles/home.css                 首頁區塊與表單
src/styles/projects.css             案例總覽與內頁
src/styles/responsive.css           平板、手機與 reduced-motion
src/test/setup.js                   Testing Library 設定
src/**/*.test.{js,jsx}              單元與整合測試
README.md                           開發、建置、素材替換說明
```

### Task 1: Bootstrap React, Vite, linting, and the first route smoke test

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/test/setup.js`
- Test: `src/App.test.jsx`

- [ ] **Step 1: Initialize packages and scripts**

Run:

```powershell
npm init -y
npm install react react-dom react-router-dom
npm install -D vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js globals eslint-plugin-react-hooks eslint-plugin-react-refresh
npm pkg set type=module
npm pkg set scripts.dev=vite scripts.build="vite build" scripts.preview="vite preview" scripts.test="vitest" scripts.lint="eslint ."
```

Expected: `package.json` contains `dev`, `build`, `preview`, `test`, and `lint` scripts.

- [ ] **Step 2: Add Vite, Vitest, ESLint, and test setup**

Create `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
```

Create `eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
```

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Write the failing app smoke test**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders the brand and primary quote action', () => {
  render(<MemoryRouter><App /></MemoryRouter>)
  expect(screen.getByText('柏鎮園藝')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '取得專屬報價' })).toHaveAttribute('href', '#quote')
})
```

- [ ] **Step 4: Run the test and verify failure**

Run: `npm test -- --run src/App.test.jsx`

Expected: FAIL because `App.jsx` does not yet render the brand or quote action.

- [ ] **Step 5: Add the minimal app entry**

Create `src/App.jsx`:

```jsx
export default function App() {
  return (
    <main>
      <p>柏鎮園藝</p>
      <a href="#quote">取得專屬報價</a>
    </main>
  )
}
```

Create `src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
)
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="柏鎮園藝提供庭園設計、植栽綠化、假山水景與後續養護服務。" />
    <title>柏鎮園藝｜庭園設計・假山水景</title>
  </head>
  <body>
    <noscript>此網站需要啟用 JavaScript 才能瀏覽完整內容。</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run src/App.test.jsx && npm run lint && npm run build`

Expected: one passing test, lint exits 0, and `dist/` is created.

```powershell
git add package.json package-lock.json vite.config.js eslint.config.js index.html src/main.jsx src/App.jsx src/test/setup.js src/App.test.jsx
git commit -m "chore: bootstrap React landscape site"
```

### Task 2: Define static services, projects, process, and site content

**Files:**
- Create: `src/data/services.js`
- Create: `src/data/projects.js`
- Create: `src/data/processSteps.js`
- Create: `src/data/siteContent.js`
- Test: `src/data/projects.test.js`

- [ ] **Step 1: Write data-contract tests**

Create `src/data/projects.test.js`:

```js
import { projects } from './projects'

test('project slugs are unique and required content is present', () => {
  const slugs = projects.map((project) => project.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
  expect(projects).toHaveLength(6)
  for (const project of projects) {
    expect(project).toEqual(expect.objectContaining({
      slug: expect.any(String),
      title: expect.any(String),
      category: expect.any(String),
      location: expect.any(String),
      heroImage: expect.any(String),
      gallery: expect.any(Array),
      clientNeed: expect.any(String),
      designApproach: expect.any(String),
      materials: expect.any(Array),
      featured: expect.any(Boolean),
    }))
    expect(project.gallery.length).toBeGreaterThanOrEqual(3)
  }
})

test('exactly three projects are featured', () => {
  expect(projects.filter((project) => project.featured)).toHaveLength(3)
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --run src/data/projects.test.js`

Expected: FAIL because the data modules do not exist.

- [ ] **Step 3: Add services, process, and site content**

Create `src/data/services.js`:

```js
export const services = [
  { id: 'garden', number: '01', title: '庭園設計', summary: '從日照、風向與生活動線出發，規劃自然融入建築的庭園。' },
  { id: 'planting', number: '02', title: '植栽綠化', summary: '依環境條件配置植栽層次，兼顧四季景觀與後續照護。' },
  { id: 'waterscape', number: '03', title: '假山水景', summary: '運用自然石、流水與細緻工法，建立具有生命感的水景。' },
  { id: 'care', number: '04', title: '後續養護', summary: '提供修剪、植栽照料與水景維護，讓景觀長期保持平衡。' },
]
```

Create `src/data/processSteps.js`:

```js
export const processSteps = [
  ['01', '需求了解', '了解空間、風格、預算與使用方式。'],
  ['02', '現場評估', '確認尺度、日照、排水與施工條件。'],
  ['03', '規劃報價', '提出設計方向、材料配置與工程預算。'],
  ['04', '專業施工', '依工序完成植栽、石景、水景與細節。'],
  ['05', '後續養護', '提供照護建議與定期維護選項。'],
]
```

Create `src/data/siteContent.js`:

```js
export const siteContent = {
  brand: '柏鎮園藝',
  hero: {
    eyebrow: 'Landscape Craftsmanship',
    title: '讓自然，成為生活的風景',
    description: '庭園設計・植栽綠化・假山水景・後續養護',
    image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1800&q=86',
  },
  clients: ['私人住宅', '別墅透天', '社區公設', '企業商空'],
  serviceTypes: ['庭園設計', '植栽綠化', '假山水景', '後續養護'],
  budgetRanges: ['50 萬以下', '50–100 萬', '100–300 萬', '300 萬以上', '希望現場評估'],
}
```

- [ ] **Step 4: Add six complete project records**

Create `src/data/projects.js` with six objects using these exact slugs and categories:

```js
const image = (id, width = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=84`

export const projectCategories = ['全部', '住宅庭園', '植栽綠化', '假山水景', '商業／社區']

export const projects = [
  ['moss-courtyard', '苔庭・靜水之間', '住宅庭園', '台中', 'photo-1585320806297-9794b3e4eeae', true],
  ['stone-waterfall', '疊石・山澗水景', '假山水景', '彰化', 'photo-1584464491033-06628f3a6b7b', true],
  ['green-balcony', '城市中的綠意陽台', '植栽綠化', '台中', 'photo-1416879595882-3373a0480b5b', true],
  ['villa-garden', '別墅四季庭園', '住宅庭園', '南投', 'photo-1558521958-0a228e77e984', false],
  ['community-landscape', '社區迎賓景觀', '商業／社區', '台中', 'photo-1580137189272-c9379f8864fd', false],
  ['pond-renewal', '老水池再生計畫', '假山水景', '苗栗', 'photo-1586348943529-beaae6c28db9', false],
].map(([slug, title, category, location, photoId, featured], index) => ({
  slug,
  title,
  category,
  location,
  featured,
  summary: '以自然比例重新整理空間層次，讓植栽、石景與人的生活彼此連結。',
  heroImage: image(photoId),
  gallery: [image(photoId, 1200), image('1416879595882-3373a0480b5b', 1200), image('1585320806297-9794b3e4eeae', 1200)],
  clientNeed: '希望改善原有空間動線，同時保留自然、安定且容易照護的景觀感受。',
  designApproach: '依現場尺度與採光配置植栽、自然石及水景，透過留白建立沉靜層次。',
  materials: ['自然石', '耐候植栽', index % 2 === 0 ? '景觀照明' : '循環水系統'],
}))
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run src/data/projects.test.js`

Expected: two passing tests.

```powershell
git add src/data
git commit -m "feat: add landscape service and project content"
```

### Task 3: Build the shared site shell and feedback primitives

**Files:**
- Create: `src/components/layout/SiteHeader.jsx`
- Create: `src/components/layout/SiteFooter.jsx`
- Create: `src/components/layout/MobileQuoteBar.jsx`
- Create: `src/components/ui/FeedbackToast.jsx`
- Create: `src/components/ui/BrandImage.jsx`
- Create: `src/hooks/useReveal.js`
- Create: `src/components/ui/Reveal.jsx`
- Test: `src/components/layout/SiteHeader.test.jsx`

- [ ] **Step 1: Write the header behavior test**

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SiteHeader from './SiteHeader'

test('opens the mobile navigation and exposes site links', async () => {
  render(<MemoryRouter><SiteHeader /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: '開啟選單' }))
  expect(screen.getByRole('navigation', { name: '主要導覽' })).toHaveClass('is-open')
  expect(screen.getByRole('link', { name: '案例作品' })).toHaveAttribute('href', '/projects')
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --run src/components/layout/SiteHeader.test.jsx`

Expected: FAIL because `SiteHeader.jsx` does not exist.

- [ ] **Step 3: Implement the header and layout components**

Implement `SiteHeader.jsx` with `useState`, `useEffect` scroll detection, a `/` brand link, `/#services`, `/projects`, `/#about`, and `/#quote` links. The menu button must toggle `aria-expanded`, change its accessible name between `開啟選單` and `關閉選單`, and close after a navigation click.

Implement `SiteFooter.jsx` with the four service names, route links, copyright text, and buttons that call an `onUnavailable` callback for LINE and Email.

Implement `MobileQuoteBar.jsx` as an `<a href="/#quote">取得報價</a>` element.

Implement `FeedbackToast.jsx` as an `aria-live="polite"` region that renders the provided message and a close button only when `message` is non-empty.

- [ ] **Step 4: Implement image and reveal primitives**

`BrandImage.jsx` must keep local error state, render an `<img>` with supplied `src` and `alt`, and replace it after `onError` with:

```jsx
<div className="image-fallback" role="img" aria-label={`${alt}（圖片暫時無法顯示）`}>
  <span>柏鎮園藝</span><strong>{alt}</strong>
</div>
```

`useReveal.js` must return `[ref, visible]`, immediately set `visible` when `matchMedia('(prefers-reduced-motion: reduce)')` matches, and otherwise observe at `threshold: 0.14` before disconnecting.

`Reveal.jsx` must render a configurable element with `reveal` and `is-visible` classes.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run src/components/layout/SiteHeader.test.jsx && npm run lint`

Expected: test passes and lint exits 0.

```powershell
git add src/components src/hooks
git commit -m "feat: add shared site shell and feedback components"
```

### Task 4: Build the works-first homepage narrative

**Files:**
- Create: `src/components/ui/ProjectCard.jsx`
- Create: `src/components/home/Hero.jsx`
- Create: `src/components/home/ServiceOverview.jsx`
- Create: `src/components/home/FeaturedProjects.jsx`
- Create: `src/components/home/BrandStory.jsx`
- Create: `src/components/home/WorkProcess.jsx`
- Create: `src/components/home/ClientTypes.jsx`
- Create: `src/pages/HomePage.jsx`
- Test: `src/pages/HomePage.test.jsx`

- [ ] **Step 1: Write the homepage content and order test**

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

test('renders the approved works-first homepage sections', () => {
  render(<MemoryRouter><HomePage onUnavailable={() => {}} /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '讓自然，成為生活的風景' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '以專業工法，完成自然的尺度' })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /查看案例/ })).toHaveLength(3)
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run src/pages/HomePage.test.jsx`

Expected: FAIL because homepage components do not exist.

- [ ] **Step 3: Implement the hero, services, and featured projects**

`Hero.jsx` must use `siteContent.hero`, render the image through `BrandImage`, and include `href="#quote"` CTA text `取得專屬報價`.

`ServiceOverview.jsx` must render `services` inside `<section id="services">` with heading `以專業工法，完成自然的尺度`.

`ProjectCard.jsx` must link to `/projects/${project.slug}`, render the project image, category, title, location, and accessible link label `查看案例：${project.title}`.

`FeaturedProjects.jsx` must filter `projects` by `featured` and render exactly three cards plus a `/projects` link.

- [ ] **Step 4: Implement narrative, process, client, and homepage composition**

`BrandStory.jsx` must use `<section id="about">`, the heading `讓庭園隨時間，長成生活的一部分`, one large image, and two short paragraphs about site conditions and craftsmanship.

`WorkProcess.jsx` must render all five `processSteps` as an ordered list.

`ClientTypes.jsx` must render the four client types from `siteContent.clients` and the heading `從私人庭園，到共享空間`.

`HomePage.jsx` must render, in this exact order: `Hero`, `ServiceOverview`, `FeaturedProjects`, `BrandStory`, `WorkProcess`, `ClientTypes`.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --run src/pages/HomePage.test.jsx`

Expected: homepage narrative test passes with the approved works-first section order.

```powershell
git add src/components/home src/components/ui/ProjectCard.jsx src/pages/HomePage.jsx
git commit -m "feat: build works-first homepage content"
```

### Task 5: Add quote validation, the quote form, and unavailable contact actions

**Files:**
- Create: `src/utils/quoteValidation.js`
- Create: `src/utils/quoteValidation.test.js`
- Create: `src/components/home/QuoteForm.jsx`
- Create: `src/components/home/QuoteForm.test.jsx`
- Create: `src/components/home/ContactActions.jsx`
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Write validation unit tests**

```js
import { validateQuote } from './quoteValidation'

test('requires the five approved quote fields', () => {
  expect(validateQuote({})).toEqual(expect.objectContaining({
    name: '請填寫姓名', phone: '請填寫電話', region: '請填寫地區',
    serviceType: '請選擇需求類型', budget: '請選擇預算範圍',
  }))
})

test('validates phone and optional email formats', () => {
  expect(validateQuote({ name: '王先生', phone: 'abc', region: '台中', serviceType: '庭園設計', budget: '50–100 萬', email: 'bad' }))
    .toEqual(expect.objectContaining({ phone: '請填寫有效電話', email: '請填寫有效 Email' }))
})
```

- [ ] **Step 2: Verify failure and implement validator**

Run: `npm test -- --run src/utils/quoteValidation.test.js`

Expected: FAIL because the utility is missing.

Create `src/utils/quoteValidation.js`:

```js
export function validateQuote(values) {
  const errors = {}
  if (!values.name?.trim()) errors.name = '請填寫姓名'
  if (!values.phone?.trim()) errors.phone = '請填寫電話'
  else if (!/^[0-9+()\-\s]{8,20}$/.test(values.phone)) errors.phone = '請填寫有效電話'
  if (!values.region?.trim()) errors.region = '請填寫地區'
  if (!values.serviceType) errors.serviceType = '請選擇需求類型'
  if (!values.budget) errors.budget = '請選擇預算範圍'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = '請填寫有效 Email'
  return errors
}
```

- [ ] **Step 3: Write form interaction tests**

Create `src/components/home/QuoteForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import QuoteForm from './QuoteForm'

test('shows inline errors and focuses the first invalid field', async () => {
  render(<QuoteForm onUnavailable={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: '送出報價需求' }))
  expect(screen.getByText('請填寫姓名')).toBeInTheDocument()
  expect(screen.getByLabelText('姓名')).toHaveFocus()
})

test('valid input displays the explicit demo-version message', async () => {
  const onUnavailable = vi.fn()
  render(<QuoteForm onUnavailable={onUnavailable} />)
  await userEvent.type(screen.getByLabelText('姓名'), '王先生')
  await userEvent.type(screen.getByLabelText('電話'), '0912-345-678')
  await userEvent.type(screen.getByLabelText('地區'), '台中市')
  await userEvent.selectOptions(screen.getByLabelText('需求類型'), '庭園設計')
  await userEvent.selectOptions(screen.getByLabelText('預算範圍'), '50–100 萬')
  await userEvent.click(screen.getByRole('button', { name: '送出報價需求' }))
  expect(onUnavailable).toHaveBeenCalledWith('目前為網站示意版本，正式上線後開放送出報價')
})
```

- [ ] **Step 4: Implement final form and contact actions**

`QuoteForm.jsx` must use controlled fields, `siteContent.serviceTypes`, `siteContent.budgetRanges`, `validateQuote`, inline `role="alert"` errors, and `errorRefs` to focus the first invalid control. It must not call `fetch`, `mailto:`, or an external URL.

`ContactActions.jsx` must render LINE and Email buttons. Each button calls `onUnavailable('LINE 聯絡功能將於正式上線時開放')` or `onUnavailable('Email 聯絡功能將於正式上線時開放')`.

Update `HomePage.jsx` to append `QuoteForm` and `ContactActions` after `ClientTypes`, pass the shared `onUnavailable` callback to both components, and preserve the approved works-first ordering.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run src/utils/quoteValidation.test.js src/components/home/QuoteForm.test.jsx`

Expected: all validation and form tests pass.

```powershell
git add src/utils src/components/home/QuoteForm.jsx src/components/home/QuoteForm.test.jsx src/components/home/ContactActions.jsx src/pages/HomePage.jsx
git commit -m "feat: add accessible quote form interactions"
```

### Task 6: Add project filtering, project details, routing, and 404 handling

**Files:**
- Create: `src/pages/ProjectsPage.jsx`
- Create: `src/pages/ProjectDetailPage.jsx`
- Create: `src/pages/NotFoundPage.jsx`
- Test: `src/pages/ProjectsPage.test.jsx`
- Test: `src/pages/ProjectDetailPage.test.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write route and filtering tests**

Create `src/pages/ProjectsPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from './ProjectsPage'

test('filters projects without navigating away', async () => {
  render(<MemoryRouter><ProjectsPage /></MemoryRouter>)
  const filter = screen.getByRole('button', { name: '假山水景' })
  await userEvent.click(filter)
  expect(filter).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('link', { name: '查看案例：疊石・山澗水景' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '查看案例：老水池再生計畫' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: '查看案例：苔庭・靜水之間' })).not.toBeInTheDocument()
})
```

Create `src/pages/ProjectDetailPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProjectDetailPage from './ProjectDetailPage'

test.each([
  ['/projects/moss-courtyard', '苔庭・靜水之間'],
  ['/projects/not-a-project', '找不到這個案例'],
])('renders %s correctly', (path, heading) => {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/projects/:slug" element={<ProjectDetailPage />} /></Routes></MemoryRouter>)
  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
})
```

- [ ] **Step 2: Verify failures**

Run: `npm test -- --run src/pages/ProjectsPage.test.jsx src/pages/ProjectDetailPage.test.jsx`

Expected: FAIL because project pages do not exist.

- [ ] **Step 3: Implement the project list and detail page**

`ProjectsPage.jsx` must keep an active category state initialized to `全部`, render all `projectCategories` as buttons, filter without navigation, and use `ProjectCard` for results.

`ProjectDetailPage.jsx` must read `slug` through `useParams`, find the matching project, render the hero, need, approach, materials, three-image gallery, and up to two related projects from the same category. Missing data renders the `找不到這個案例` state with links to `/projects` and `/#quote`.

`NotFoundPage.jsx` must render `這條路還沒有風景`, a `/` link, and a `/projects` link.

- [ ] **Step 4: Replace App with the final route tree and toast state**

`App.jsx` must own `feedbackMessage`, render `SiteHeader`, `Routes`, `SiteFooter`, `MobileQuoteBar`, and `FeedbackToast`. Routes must be `/`, `/projects`, `/projects/:slug`, and `*`. Pass the same `showUnavailable(message)` callback to `HomePage` and `SiteFooter`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run lint`

Expected: all tests pass and lint exits 0.

```powershell
git add src/App.jsx src/pages
git commit -m "feat: add project routes and branded not-found states"
```

### Task 7: Apply the forest-luxury design system and responsive behavior

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/home.css`
- Create: `src/styles/projects.css`
- Create: `src/styles/responsive.css`
- Modify: `src/main.jsx`

- [ ] **Step 1: Add tokens and reset**

`tokens.css` must define the approved colors, serif/sans font stacks, container width `min(1180px, calc(100% - 48px))`, focus ring, body background, typography scale with `clamp`, link/button reset, and `scroll-behavior: smooth`.

- [ ] **Step 2: Add layout and component styling**

`layout.css` must style transparent/scrolled headers, desktop and mobile nav, centered containers, section spacing, dark footer, toast, image fallback, mobile quote bar, and reveal states.

`home.css` must style a minimum `88svh` hero, dark gradient image overlay, gold outlined CTA, four-service grid, asymmetric featured grid, two-column brand story, five-step process, client strip, dark quote section, two-column form, field errors, and contact actions.

`projects.css` must style the projects masthead, filter controls, asymmetric project grid, project hero, narrative columns, materials list, gallery, related projects, and 404 page.

- [ ] **Step 3: Add responsive and motion rules**

`responsive.css` must include breakpoints at `1024px`, `768px`, and `560px`. At `768px` the navigation becomes a controlled overlay, service/project grids reduce columns, the form becomes one column, and `MobileQuoteBar` displays. Include:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
  .reveal { opacity: 1; transform: none; }
}
```

- [ ] **Step 4: Import all style files once**

Add to `src/main.jsx` before rendering:

```js
import './styles/tokens.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/projects.css'
import './styles/responsive.css'
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: tests pass, lint exits 0, and production build succeeds.

```powershell
git add src/styles src/main.jsx
git commit -m "style: apply forest luxury responsive design"
```

### Task 8: Add deployment fallback, documentation, and full browser QA

**Files:**
- Create: `vercel.json`
- Create: `README.md`
- Modify: any source or style file required by QA findings

- [ ] **Step 1: Add Vercel SPA fallback**

Create `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Document local development and content replacement**

`README.md` must contain these commands:

```powershell
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
npm run preview
```

It must explain that services live in `src/data/services.js`, cases in `src/data/projects.js`, brand copy in `src/data/siteContent.js`, and that formal LINE, Email, quote API, analytics, and Drive images are intentionally not connected in this release.

- [ ] **Step 3: Run the complete automated verification**

Run:

```powershell
npm test -- --run
npm run lint
npm run build
```

Expected: all tests pass, lint exits 0, and Vite reports a successful production build.

- [ ] **Step 4: Run browser QA at the five approved widths**

Start `npm run dev -- --host 127.0.0.1`. Inspect `/`, `/projects`, `/projects/moss-courtyard`, and `/projects/not-a-project` at widths `1440`, `1024`, `768`, `390`, and `360`.

For every view verify:

- no horizontal overflow;
- readable hero title and CTA;
- navigation and mobile menu do not obscure content;
- image fallbacks preserve layout;
- filters are keyboard operable;
- form errors appear inline and focus the first invalid field;
- valid form, LINE, and Email actions display the correct unavailable message;
- reduced-motion mode removes entrance movement;
- project detail refresh works with SPA fallback configuration.

- [ ] **Step 5: Fix all QA findings and rerun verification**

For each finding, add a focused regression test when behavior is involved, edit the smallest responsible component/style file, then rerun `npm test -- --run && npm run lint && npm run build`.

Expected: no known functional, responsive, accessibility, or build defects remain.

- [ ] **Step 6: Commit the verified site**

```powershell
git add README.md vercel.json src
git commit -m "docs: add deployment and content maintenance guide"
git status --short
```

Expected: only the pre-existing untracked `規劃圖/` directory remains; all website implementation and documentation are committed.
