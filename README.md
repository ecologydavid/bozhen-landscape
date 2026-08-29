# 曜聖景觀形象網站

以 React、Vite 與原生 CSS 製作的靜態品牌網站，採 HashRouter 支援 GitHub Pages 子路徑部署。

## 目前功能

- React／HashRouter 靜態品牌網站，支援 GitHub Pages 子路徑。
- 一屏一景首頁：植物、石組、水景、造景、養景。
- 獨立案例總覽與案例詳情頁。
- 正式 LINE、手機、公司電話與 Email 直接聯絡。
- 無報價表單，不儲存訪客資料。
- 專案圖片由人工核准的 HEIC／JPG 原稿產出本地 AVIF／WebP；Google Drive 原稿不會被建置腳本修改。
- 26 張核准作品各自提供 480／768／1280／1920 四種最大尺寸 tier 與 AVIF／WebP fallback，共 208 個公開衍生圖；`srcset` 寬度由建置時解碼所得的實際像素 metadata 產生。

## 環境需求

- Node.js 24.x（與 GitHub Pages workflow 使用的版本一致）。
- npm。

## 本機開發

```powershell
npm install
npm run dev
```

## GA4 埋點

將 `.env.example` 複製為 `.env`，填入 GA4 的 `VITE_GA_MEASUREMENT_ID`（格式 `G-XXXXXXXXXX`）後重新啟動 Vite。未設定時不會載入 Google Analytics，適合本機預覽。

目前事件包含：`page_view`、`navigation_toggle`、`navigation_click`、`view_projects_click`、`contact_click`（LINE／電話／Email）與 `social_click`（Facebook／Instagram）。事件會附帶互動位置，例如 `hero`、`header`、`contact_section`、`footer`、`mobile_sticky`。

## 本機驗證

```powershell
npm test -- --run
npm run lint
npm run build
# 首次執行瀏覽器測試前，只需安裝一次 Chromium
npx playwright install chromium
npm run test:e2e
```

## 素材維護

1. 原稿只放在忽略版控的 `workbench/landscape-originals`。
2. 自然商業修美副本放在 `workbench/landscape-edited`。
3. 人工核准後才在 `scripts/project-asset-manifest.mjs` 設定 `approved: true`。
4. 執行 `npm run assets:build`，原子化產生四種 responsive tier 的 AVIF／WebP 與實際寬度 metadata；所有檔案驗證成功後才會替換公開目錄。
5. 檢查修美前後對照與網站裁切後，再提交 `src/assets/projects`。

`npm run assets:build` 是素材維護者重新產圖時使用的指令。全新 clone 不包含已忽略版控的私有 `workbench/landscape-originals` 原稿，因此直接執行會出現 `Missing source`；一般開發與 `npm run build` 會直接使用已提交至 `src/assets/projects` 的 AVIF／WebP，不需要原稿。

## 內容維護

- 服務項目：`src/data/services.js`
- 案例內容與圖片：`src/data/projects.js`
- 品牌與聯絡資料：`src/data/siteContent.js`
- 服務流程：`src/data/processSteps.js`
- 核准素材清單：`scripts/project-asset-manifest.mjs`

## 部署

正式站由 `.github/workflows/deploy-pages.yml` 部署至 GitHub Pages。推送到 `master`，或在 GitHub Actions 手動執行 workflow 時，流程會安裝相依套件、執行單元測試、程式碼檢查、正式建置與 Playwright 響應式測試；全部通過後才上傳 `dist/` 並發布。

網站使用 HashRouter，因此首頁、案例總覽與案例詳情皆由 `#` 後方的前端路由處理，不需要 Vercel rewrite。
