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
