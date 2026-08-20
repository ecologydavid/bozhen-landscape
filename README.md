# 柏鎮園藝假山水形象報價網站

以 React、Vite 與原生 CSS 製作的靜態形象網站。首頁採「作品先行、報價收尾」架構，包含服務介紹、精選案例、品牌工法、合作流程、報價表單示意、案例總覽與案例詳情。

## 本機開發（公開網站）

```powershell
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
npm run preview
```

## 曜聖｜內容工作室本機 MVP

本機 Supabase workflow 已可執行，包含 migrations、RLS、私有 Storage、由受限 RPC 唯一寫入的 append-only／content-idempotent 事實卡版本，以及 pgTAP gate。瀏覽器 API 角色不能直接刪除專案或素材；上傳失敗時仍可刪除私有 Storage 物件以清理孤兒檔。這是可驗證的 local MVP foundation，不是 production readiness，也不代表 hosted deployment 已完成。

### 前置需求

- Node.js 版本必須符合 `package.json` 的 engines：`^22.13.0 || >=24.0.0`。先執行 `node --version` 確認版本；若 npm 顯示 `EBADENGINE`，請升級或切換 Node.js 後再安裝套件。
- 本機 Supabase 需要 Docker Desktop，或與 Supabase CLI 相容且正在運作的 Docker／Podman runtime。
- 所有 `VITE_` 變數都會送到瀏覽器。本機開發使用本機 Supabase 的 publishable key（或 legacy anon key）；hosted 部署則使用該 hosted 專案的 URL 與 publishable key（或 legacy anon key），並透過部署平台的環境設定注入為 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_PUBLISHABLE_KEY`。這兩類 browser-safe key 預期會出現在瀏覽器中。
- `VITE_`／browser config 嚴禁放入 elevated／server credentials，包括 `sb_secret_`、`service_role` JWT／key、資料庫密碼，以及 management／service secrets。
- `.env.local` 僅供 Vite／瀏覽器開發與 Studio browser smoke 使用；Supabase CLI 的 reset、DB tests 與 DB lint 不依賴它。

### 啟動本機環境

在專案根目錄依序執行：

```powershell
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run supabase:start
npm run supabase:reset
npm run dev
```

建立 `.env.local` 的命令僅供第一次設定使用；若檔案已存在便不會覆寫，既有本機設定會保留。

`npm run supabase:start` 啟動完成後，會列出本機 Supabase API URL、Studio URL 與 browser-safe key。把 API URL 填入 `.env.local` 的 `VITE_SUPABASE_URL`，再把 publishable key（若 CLI 顯示舊版名稱則為 anon key）填入 `VITE_SUPABASE_PUBLISHABLE_KEY`。切勿把 `service_role` 或以 `sb_secret_` 開頭的金鑰放進 `VITE_` 變數；Vite 會把這些值送到瀏覽器。

`.env.local` 已由根目錄 `.gitignore` 排除，不應提交。hosted URL 與 browser-safe publishable／anon key 應由部署環境設定注入；即使 publishable／anon key 不是 secret，本儲存庫仍不直接提交 hosted config，這是環境隔離與設定衛生政策。elevated／server credentials 則永遠不得提交或放進瀏覽器環境。

### 建立第一位管理員

1. 開啟 `npm run supabase:start` 輸出所列的本機 Studio URL，進入 Auth 使用者管理頁面，以預定的管理員 Email 與密碼建立使用者。使用 hosted Supabase 時，則在該專案的 Auth dashboard 建立使用者。
2. 從同一個 Auth dashboard 複製該使用者的 UUID。
3. 在該 Supabase 專案的 SQL Editor 執行以下 SQL，將使用者登記為 Studio 管理員：

```sql
insert into public.studio_admins(user_id)
values ('<Auth user UUID copied from the dashboard>');
```

UUID 必須來自目前使用的本機或 hosted Auth dashboard。只有已登記在 `public.studio_admins` 的使用者可以使用 Studio；正式環境 secrets 永遠不可提交到版本控制。MVP 明確支援且強制只有一位管理員：`studio_admins` 有 singleton unique index，第二次 INSERT 會被拒絕，必須先移除或替換現有管理員。

### 進入 Studio

啟動應用程式後，開啟開發伺服器網址並加上 `#/studio`（應用程式使用 `HashRouter`），再以剛建立的 Email 與密碼登入。公開網站仍維持原有的一般路由與瀏覽流程。

本機 MVP 支援建立／編輯專案、由事實卡 RPC 唯一寫入的 append-only／content-idempotent 版本，以及私有 `studio-assets` bucket 的 JPG、PNG、WebP、HEIC、HEIF 上傳、signed preview 與使用權限分類。內容相同時會保留既有事實版本；內容變更才建立下一版，且每個專案只有一筆 current row。素材路徑固定為 `raw/{project_id}/{asset_id}.{extension}`，直接刪除專案／素材不在 Plan 1。AI 內容／圖片生成、審核或匯出、LINE 通知、Meta 發布與排程均不在 Plan 1，仍屬後續計畫。

### 驗證與停止

Docker runtime 已啟動時，完整 gate 依序為：

```powershell
npm run supabase:reset
npm run test:db
npm test -- --run
npm run lint
npm run build
npx supabase db lint --local --level error
git diff --check
```

上述命令都應以零結束。2026-08-21 的觀測結果是 pgTAP `132` tests、Vitest `33` files／`302` tests、ESLint 無錯誤、Vite build 成功，以及 DB lint 回報 `No schema errors found`；隨測試演進，總數可能改變。Supabase CLI 的 DB gate 依賴 Supabase config 與 container runtime，不需要 Vite 的 `.env.local`。

常見問題：

- `npm run supabase:start` 失敗或顯示找不到 `docker`：安裝並啟動 Docker Desktop 或相容 runtime，確認 daemon 正在執行，再重試。
- npm 顯示 `EBADENGINE`：`node --version` 若不符合 `^22.13.0 || >=24.0.0`，請先升級或切換 Node.js，再重新執行 `npm install`。
- 顯示 publishable key 無效：本機開發請重新從本機 stack 的啟動輸出複製 URL 與 publishable／anon key；hosted 部署則確認 URL 與 key 都來自同一個 hosted 專案，並由部署環境設定注入。確認沒有誤用 `service_role`、`sb_secret_` 或其他 elevated credentials，然後重啟或重新部署應用程式。
- 登入後收到 forbidden／無權限：確認 Auth 使用者 UUID 已正確寫入同一個 Supabase 專案的 `public.studio_admins`；未登記的使用者不可使用 Studio。

開發結束後可停止本機 Supabase：

```powershell
npm run supabase:stop
```

## 內容維護

- 服務項目：`src/data/services.js`
- 案例內容與圖片：`src/data/projects.js`
- 品牌文案、客群與表單選項：`src/data/siteContent.js`
- 服務流程：`src/data/processSteps.js`

目前案例照片使用示意圖片。正式素材確認後，只需替換 `siteContent.js` 與 `projects.js` 內的圖片網址，不必修改版面元件。

## 本版功能範圍

這一版刻意不連接 LINE、Email、報價 API、網站分析與 Google Drive 圖片。報價表單、LINE 與 Email 按鈕只會顯示「正式上線時開放」提示，不會傳送或儲存訪客資料。

正式上線階段可再依序加入：

1. 正式 LINE 官方帳號與公司 Email。
2. 報價資料庫、通知與人工審核流程。
3. GA4、Meta Pixel 與轉換事件。
4. Google Drive 正式照片的壓縮、裁切及本地化素材。

## 部署

`vercel.json` 已提供 SPA rewrite，讓 `/projects/:slug` 等前端路由重新整理時仍回到 React 入口。執行 `npm run build` 後，靜態成品會輸出到 `dist/`。
