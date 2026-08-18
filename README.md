# 柏鎮園藝假山水形象報價網站

以 React、Vite 與原生 CSS 製作的靜態形象網站。首頁採「作品先行、報價收尾」架構，包含服務介紹、精選案例、品牌工法、合作流程、報價表單示意、案例總覽與案例詳情。

## 本機開發

```powershell
npm install
npm run dev
npm test -- --run
npm run lint
npm run build
npm run preview
```

## 曜聖｜內容工作室本機設定

### 目前實作狀態

> **目前 HEAD 尚未具備可執行的本機 Supabase／DB 工作流程，也不代表已可供正式環境使用。** 瀏覽器端與 Studio UI 基礎已實作，但本機 Supabase config、foundation migrations、RLS／Storage policies、不可變事實的 content-idempotent RPC 與 pgTAP 測試尚未提交；Task 2、5B、9B 仍在等待可用的 container runtime。

下方 Supabase 啟動、重設、DB 測試與管理員註冊步驟，是上述檔案提交後的**目標工作流程**。在目前 HEAD，`npm run supabase:start`、`npm run supabase:reset`、`npm run test:db` 以及 `studio_admins` 管理員 INSERT 都不預期成功，也不得拿來當作功能或 DB gate 已完成的證據。

### 前置需求

- Node.js 版本必須符合 `package.json` 的 engines：`^22.13.0 || >=24.0.0`。先執行 `node --version` 確認版本；若 npm 顯示 `EBADENGINE`，請升級或切換 Node.js 後再安裝套件。
- 本機 Supabase 需要 Docker Desktop，或與 Supabase CLI 相容的 Docker／Podman runtime。這台開發機目前尚未安裝可用的 Docker runtime，因此無法在此環境完成資料庫重設與 DB 測試；其他開發者仍可依下列通用流程啟動。
- 瀏覽器環境變數只能放本機 Supabase 提供的 publishable／anon browser-safe key。不得把正式環境金鑰、`service_role` key、`sb_secret_` key 或其他 secret 寫入任何 `VITE_` 變數。

### 啟動本機環境

待 Supabase config、migrations、policies、RPC 與 DB tests 提交後，在專案根目錄依序執行以下目標流程：

```powershell
npm install
Copy-Item .env.example .env.local
npm run supabase:start
npm run supabase:reset
npm run dev
```

`npm run supabase:start` 啟動完成後，會列出本機 Supabase API URL、Studio URL 與 browser-safe key。把 API URL 填入 `.env.local` 的 `VITE_SUPABASE_URL`，再把 publishable key（若 CLI 顯示舊版名稱則為 anon key）填入 `VITE_SUPABASE_PUBLISHABLE_KEY`。切勿把 `service_role` 或以 `sb_secret_` 開頭的金鑰放進 `VITE_` 變數；Vite 會把這些值送到瀏覽器。

`.env.local` 已由根目錄 `.gitignore` 排除，不應提交。正式環境的 URL 與金鑰也不得提交到儲存庫。

### 建立第一位管理員

這也是 migrations 提交後的目標流程；目前 HEAD 尚未建立 `public.studio_admins`，請勿執行此 INSERT 或視為已完成設定。

1. 開啟 `npm run supabase:start` 輸出所列的本機 Studio URL，進入 Auth 使用者管理頁面，以預定的管理員 Email 與密碼建立使用者。使用 hosted Supabase 時，則在該專案的 Auth dashboard 建立使用者。
2. 從同一個 Auth dashboard 複製該使用者的 UUID。
3. 在該 Supabase 專案的 SQL Editor 執行以下 SQL，將使用者登記為 Studio 管理員：

```sql
insert into public.studio_admins(user_id)
values ('<Auth user UUID copied from the dashboard>');
```

UUID 必須來自目前使用的本機或 hosted Auth dashboard。只有已登記在 `public.studio_admins` 的使用者可以使用 Studio；正式環境 secrets 永遠不可提交到版本控制。

### 進入 Studio

啟動應用程式後，開啟開發伺服器網址並加上 `#/studio`（應用程式使用 `HashRouter`），再以剛建立的 Email 與密碼登入。公開網站仍維持原有的一般路由與瀏覽流程。

目前 MVP 僅支援建立／編輯專案與不可變事實，以及上傳、分類私有的真實專案照片；AI 圖片生成、發布與排程尚未提供，會在後續計畫處理。

### 驗證與停止

目前 HEAD 可執行、且不依賴本機資料庫的 gate：

```powershell
npm test -- --run
npm run lint
npm run build
```

預期結果是 Vitest 無失敗、ESLint 無錯誤，且 Vite 成功產生 `dist/`。

下列 DB gate 目前受阻；只有在 Supabase config、migrations、policies、RPC 與 pgTAP files 已提交，且 Docker runtime、正確 Node.js 版本及 `.env.local` 都就緒後，才執行：

```powershell
npm run supabase:reset
npm run test:db
```

屆時完整 gate 的預期結果才包含本機資料庫可重設與 DB 測試通過。上述任一命令非零結束即代表 gate 未通過；這台開發機目前因缺少 Docker runtime，且目前 HEAD 尚缺 DB 實作檔案，因此尚未執行或宣稱 DB gate 通過。

常見問題：

- `npm run supabase:start` 失敗或顯示找不到 `docker`：安裝並啟動 Docker Desktop 或相容 runtime，確認 daemon 正在執行，再重試。
- npm 顯示 `EBADENGINE`：`node --version` 若不符合 `^22.13.0 || >=24.0.0`，請先升級或切換 Node.js，再重新執行 `npm install`。
- 顯示 publishable key 無效：重新從目前本機 stack 的啟動輸出複製 API URL 與 publishable／anon key，確認沒有誤用 hosted 專案的值、`service_role` 或 `sb_secret_` key，然後重啟 `npm run dev`。
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
