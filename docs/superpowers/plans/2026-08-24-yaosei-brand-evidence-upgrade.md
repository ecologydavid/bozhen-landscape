# 曜聖景觀動態品牌與案例證據 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以一段真實假山水工程影片、可掃讀案例證據與三則庭園知識內容，完成可在本機驗收的曜聖景觀品牌首頁升級。

**Architecture:** 保留既有 React／HashRouter／一屏一景架構；Hero 以獨立媒體元件在靜態 `BrandImage` 上漸進增強影片，確保失敗與低動態模式可退回照片。案例證據維持在 `projects.js` 單一資料來源，首頁卡片與案例頁共同消費；庭園誌則以獨立資料檔與首頁元件呈現，不建立空文章路由。

**Tech Stack:** React 19、React Router、CSS、Vitest／Testing Library、Playwright、Vite、FFmpeg（只用於產生已提交的網站影片資產）

---

### Task 1: 建立 Hero 影片資產與漸進式媒體元件

**Files:**
- Create: `src/assets/hero/nantun-water-garden.mp4`
- Create: `src/components/home/HeroMedia.jsx`
- Create: `src/components/home/HeroMedia.test.jsx`
- Modify: `src/components/home/Hero.jsx`
- Modify: `src/data/siteContent.js`

- [ ] **Step 1: 寫入失敗測試，固定影片、靜態備援與低動態行為**

```jsx
test('renders a muted inline loop and keeps the poster image underneath', () => {
  render(<HeroMedia image={hero.image} alt={hero.alt} videoSrc="/hero.mp4" />)
  const video = screen.getByTestId('hero-video')
  expect(video).toHaveAttribute('autoplay')
  expect(video).toHaveAttribute('loop')
  expect(video).toHaveAttribute('playsinline')
  expect(video).toHaveProperty('muted', true)
  expect(screen.getByRole('img', { name: hero.alt })).toBeInTheDocument()
})

test('does not mount video when reduced motion is requested', () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  render(<HeroMedia image={hero.image} alt={hero.alt} videoSrc="/hero.mp4" />)
  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 執行測試並確認因元件不存在而失敗**

Run: `npm test -- --run src/components/home/HeroMedia.test.jsx`

Expected: FAIL，顯示無法解析 `HeroMedia.jsx`。

- [ ] **Step 3: 轉製 8–10 秒靜音影片**

Run: `ffmpeg -ss 0 -t 9 -i "C:\Users\David\Downloads\IMG_9890.MOV" -an -vf "scale=1280:-2:flags=lanczos,fps=24" -c:v libx264 -preset slow -crf 28 -movflags +faststart -pix_fmt yuv420p src/assets/hero/nantun-water-garden.mp4`

Expected: 產出可解碼的 1280px MP4，檔案小於 2.5 MB；若系統沒有 ffmpeg，以一次性 `ffmpeg-static` 執行同一組參數，不加入 runtime dependency。

- [ ] **Step 4: 實作元件與 Hero 串接**

```jsx
export default function HeroMedia({ image, alt, videoSrc }) {
  const reducedMotion = useReducedMotion()
  const [videoFailed, setVideoFailed] = useState(false)
  return (
    <div className="hero__media">
      <BrandImage className="hero__image" src={image} alt={alt} loading="eager" decoding="async" fetchPriority="high" />
      {!reducedMotion && !videoFailed ? (
        <video data-testid="hero-video" className="hero__video" src={videoSrc} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" onError={() => setVideoFailed(true)} />
      ) : null}
      <div className="hero__shade" aria-hidden="true" />
      <span className="hero__sun" aria-hidden="true" />
    </div>
  )
}
```

在 `siteContent.hero` 新增 `videoSrc`，並讓 `Hero.jsx` 以 `<HeroMedia {...hero} />` 取代原媒體節點；保留既有文案、連絡按鈕與尺寸屬性。

- [ ] **Step 5: 執行針對性測試並提交**

Run: `npm test -- --run src/components/home/HeroMedia.test.jsx src/pages/HomePage.test.jsx`

Expected: PASS。

```bash
git add src/assets/hero src/components/home/HeroMedia.jsx src/components/home/HeroMedia.test.jsx src/components/home/Hero.jsx src/data/siteContent.js
git commit -m "feat: add real landscape hero film"
```

### Task 2: 補齊案例證據資料與作品卡內容

**Files:**
- Modify: `src/data/projects.js`
- Modify: `src/data/projects.test.js`
- Modify: `src/components/ui/ProjectCard.jsx`
- Create: `src/components/ui/ProjectCard.test.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: 寫入資料與卡片失敗測試**

```js
for (const project of projects) {
  expect(project.maintenanceNote.trim()).not.toBe('')
  expect(project.summary.trim()).not.toBe('')
  expect(project.services.length).toBeGreaterThan(0)
}
```

```jsx
expect(screen.getByText(project.summary)).toBeInTheDocument()
expect(screen.getAllByRole('listitem')).toHaveLength(2)
```

- [ ] **Step 2: 執行測試並確認缺少養護欄位與摘要 UI**

Run: `npm test -- --run src/data/projects.test.js src/components/ui/ProjectCard.test.jsx`

Expected: FAIL，指出 `maintenanceNote` 或摘要／標籤不存在。

- [ ] **Step 3: 為六個既有案例加入誠實養護方向**

每筆 `projectDefinitions` 加入 `maintenanceNote`，內容只描述現有植栽、鋪面、水循環、灌溉或公共動線的維持原則；不新增面積、工期、年份、預算或植物品種。

- [ ] **Step 4: 將卡片改為影像＋編輯式證據層**

```jsx
<div className="project-card__content">
  <div className="project-card__body">...</div>
  <p className="project-card__summary">{project.summary}</p>
  <ul className="project-card__services">
    {project.services.slice(0, 2).map((service) => <li key={service}>{service}</li>)}
  </ul>
</div>
```

CSS 保持標籤單行、卡片無水平溢位、摘要最多形成自然的三行閱讀；桌機首頁一大兩小編排與案例列表奇偶比例不變。

- [ ] **Step 5: 執行測試並提交**

Run: `npm test -- --run src/data/projects.test.js src/components/ui/ProjectCard.test.jsx src/pages/ProjectsPage.test.jsx`

Expected: PASS。

```bash
git add src/data/projects.js src/data/projects.test.js src/components/ui/ProjectCard.jsx src/components/ui/ProjectCard.test.jsx src/styles/home.css src/styles/projects.css src/styles/responsive.css
git commit -m "feat: surface evidence on project cards"
```

### Task 3: 在案例頁加入四欄工程摘要

**Files:**
- Modify: `src/pages/ProjectDetailPage.jsx`
- Modify: `src/pages/ProjectDetailPage.test.jsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: 寫入四個欄位的失敗測試**

```jsx
expect(screen.getByRole('region', { name: '案例工程摘要' })).toBeInTheDocument()
expect(screen.getByText('空間類型')).toBeInTheDocument()
expect(screen.getByText('工程地區')).toBeInTheDocument()
expect(screen.getByText('服務範圍')).toBeInTheDocument()
expect(screen.getByText('養護方向')).toBeInTheDocument()
expect(screen.getByText(project.maintenanceNote)).toBeInTheDocument()
```

- [ ] **Step 2: 執行測試並確認摘要區尚未存在**

Run: `npm test -- --run src/pages/ProjectDetailPage.test.jsx`

Expected: FAIL，找不到「案例工程摘要」。

- [ ] **Step 3: 在 Hero 與敘事之間實作摘要列**

```jsx
<section className="project-facts" aria-label="案例工程摘要">
  <div className="container project-facts__grid">
    <dl><dt>空間類型</dt><dd>{project.category}</dd></dl>
    <dl><dt>工程地區</dt><dd>{project.location}</dd></dl>
    <dl><dt>服務範圍</dt><dd>{project.services.join('・')}</dd></dl>
    <dl><dt>養護方向</dt><dd>{project.maintenanceNote}</dd></dl>
  </div>
</section>
```

桌機四欄、768px 以下兩欄、560px 以下單欄；使用細線、編號感間距與深淺字重，不做厚重卡片。

- [ ] **Step 4: 執行測試並提交**

Run: `npm test -- --run src/pages/ProjectDetailPage.test.jsx src/styles/projects.test.js src/styles/responsive.test.js`

Expected: PASS。

```bash
git add src/pages/ProjectDetailPage.jsx src/pages/ProjectDetailPage.test.jsx src/styles/projects.css src/styles/responsive.css
git commit -m "feat: add project evidence summary"
```

### Task 4: 新增曜聖庭園誌

**Files:**
- Create: `src/data/gardenNotes.js`
- Create: `src/data/gardenNotes.test.js`
- Create: `src/components/home/GardenJournal.jsx`
- Create: `src/components/home/GardenJournal.test.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.test.jsx`
- Modify: `src/styles/home.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: 寫入三則完整內容與無空連結測試**

```js
expect(gardenNotes.map(({ title }) => title)).toEqual(['庭園排水', '樹木修剪', '假山水景養護'])
gardenNotes.forEach((note) => expect(note.body.length).toBeGreaterThan(35))
```

```jsx
expect(screen.getByRole('heading', { name: '曜聖庭園誌' })).toBeInTheDocument()
expect(screen.getAllByRole('article')).toHaveLength(3)
expect(container.querySelector('.garden-journal a')).not.toBeInTheDocument()
```

- [ ] **Step 2: 執行測試並確認資料與元件不存在**

Run: `npm test -- --run src/data/gardenNotes.test.js src/components/home/GardenJournal.test.jsx`

Expected: FAIL，顯示模組無法解析。

- [ ] **Step 3: 建立資料與一大兩小的雜誌編排**

```js
export const gardenNotes = [
  { number: '01', title: '庭園排水', body: '先觀察雨後積水位置、地面坡度與落水方向，再安排鋪面縫隙、植栽區與排水路徑，讓好看的庭園也能承受日常氣候。', image: media('changhua-residence-04.webp') },
  { number: '02', title: '樹木修剪', body: '修剪應配合樹勢、生長季、採光與通風分段處理；保留健康骨架，比一次重剪換取短期整齊，更能維持長期樹形。', image: media('tianzhong-courtyard-04.webp') },
  { number: '03', title: '假山水景養護', body: '定期清理落葉、檢查循環水與泵浦，並留意石材表面與水質變化，才能維持水聲、景石輪廓與庭園的安定感。', image: media('nantun-residence-02.webp') },
]
```

`GardenJournal` 使用 `BrandImage`、完整文字、章節號碼與語意化 `article`；放入 `craft-care-bridge` 的最前方，不增加新的 scene ID，避免干擾既有五段場景觀察器。

- [ ] **Step 4: 執行測試並提交**

Run: `npm test -- --run src/data/gardenNotes.test.js src/components/home/GardenJournal.test.jsx src/pages/HomePage.test.jsx`

Expected: PASS。

```bash
git add src/data/gardenNotes.js src/data/gardenNotes.test.js src/components/home/GardenJournal.jsx src/components/home/GardenJournal.test.jsx src/pages/HomePage.jsx src/pages/HomePage.test.jsx src/styles/home.css src/styles/responsive.css
git commit -m "feat: publish garden knowledge journal"
```

### Task 5: 完成整合、效能與本機瀏覽器驗收

**Files:**
- Modify: `e2e/responsive.spec.js`
- Modify: `src/styles/home.test.js`
- Modify: `src/styles/projects.test.js`
- Modify: `src/styles/responsive.test.js`

- [ ] **Step 1: 新增瀏覽器回歸檢查**

在既有 Playwright 規格加入：360／390／768／769／1280／1920 首頁無水平溢位；Hero 影片或 poster 填滿媒體框；固定聯絡列不遮住 Hero 操作；作品標籤不超出卡片；庭園誌三篇可見；案例摘要在行動版與桌機皆在 viewport 內。

- [ ] **Step 2: 跑完整自動驗證**

Run:

```bash
npm test -- --run
npm run lint
npm run build
npm run fonts:check
npm run test:e2e
git diff --check
```

Expected: 全部 exit 0；production build 成功；字體預算通過；無測試失敗。

- [ ] **Step 3: 用真 Chromium 人工驗收互動**

檢查 `/#/`、`/#/projects`、`/#/projects/nantun-rock-water-garden`：影片自動靜音循環、失敗與低動態回退照片、手機導覽不破版、LINE／電話仍可聚焦、五段背景漸變連續、頁尾無多餘空間。瀏覽器 console、failed requests 與 4xx 必須為空。

- [ ] **Step 4: 提交測試與整合修正**

```bash
git add e2e/responsive.spec.js src/styles/home.test.js src/styles/projects.test.js src/styles/responsive.test.js
git commit -m "test: cover brand evidence upgrade"
```

- [ ] **Step 5: 開啟第一個本地產品預覽**

Run: `npm run preview -- --host 127.0.0.1 --port 4174`

Expected: `http://127.0.0.1:4174/#/` 可操作；不 push、不部署。
