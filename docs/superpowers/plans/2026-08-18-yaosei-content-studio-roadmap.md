# 曜聖社群內容工作室 MVP 實作路線圖

核准規格：`docs/superpowers/specs/2026-08-18-yaosei-social-content-studio-design.md`

## 執行順序

1. `2026-08-18-yaosei-content-studio-foundation.md`
   - 私有 Studio、單一管理者、Supabase、案場事實卡、素材上傳與公開權限。
2. `2026-08-18-yaosei-content-generation-pipeline.md`
   - 圖片轉檔與挑選、AI 觀察、客群／視覺比例、三平台文案、來源追蹤與品質閘門。
3. `2026-08-18-yaosei-review-export-workbench.md`
   - 審核工作台、換圖／裁切、局部重生、版本／稽核、A/B/C 圖片、單檔與 ZIP 匯出、20 組校準。
4. `2026-08-18-yaosei-weekly-draft-automation.md`
   - 手動開關、每週七個備稿時段、n8n 去重／重試、LINE 完成通知與營運檢查。

每份計畫都必須通過自己的 completion gate，才可進入下一份。任何階段都不會串接 Meta 或對外發布。

## 規格覆蓋檢查

| 規格需求 | 實作計畫 |
|---|---|
| 單一管理者、案場與事實卡 | Plan 1 Tasks 2–6 |
| JPG／PNG／WebP／HEIC 與私有素材權限 | Plan 1 Tasks 7–9 |
| 真實照片自然修整、EXIF、重複與隱私提示 | Plan 2 Tasks 3–5 |
| 客群 50/30/20、視覺 30/60/10 | Plan 2 Task 5、Plan 4 Task 2 |
| FB／IG／Threads 差異化且去 AI 味 | Plan 2 Tasks 6–7 |
| 工程敘述可追溯、資料不足停止 | Plan 2 Tasks 6–8 |
| 手動生成 | Plan 2 Tasks 8–9 |
| 審核、退回、版本、局部重生、換圖、裁切 | Plan 3 Tasks 1–5 |
| A/B/C 固定版型與單檔／ZIP 完稿 | Plan 3 Tasks 5–6 |
| 品牌詞彙、禁用語、優良範例 | Plan 2 Task 1、Plan 3 Task 7 |
| 至少 20 組與 80% 小改核准 | Plan 3 Tasks 8–9 |
| 每週 3 FB、3 IG、7 Threads 草稿 | Plan 4 Tasks 1–4 |
| LINE 待審通知 | Plan 4 Task 5 |
| 錯誤、重試、去重、完整 E2E | Plans 2–4 completion gates |

## 明確延後

- Meta Business 與 FB／IG／Threads API。
- 社群排程發布與發布重試。
- 社群成效回收。
- 影片、Reels、多使用者與外部合作方權限。
