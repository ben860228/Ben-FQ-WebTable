# 應用程式入口 (App Directory)

本目錄遵循 Next.js App Router 架構，負責頁面路由與全域設定。

## 檔案說明

### `page.tsx` (首頁 / Dashboard)
這是整個儀表板的主頁面，擔任「資料彙整中心」的角色。
-   **資料獲取**: 在 Server Component 端並行抓取 Google Sheets (資產、收支、債務) 與股市報價。
-   **邏輯運算**: 呼叫 `lib/financial-logic.ts` 進行淨值加總、現金流預測。
-   **組件傳遞**: 將處理後的數據 (Props) 分發給底下的各個 Dashboard 組件。**[Update]** 新增將 `oneOffEvents` 傳遞給 `RecurringTable` 以進行年度預測。

### `layout.tsx` (全域佈局)
定義應用程式的骨架。
-   設定 HTML/Body 標籤。
-   引入全域字型 (Inter, Roboto Mono 等)。
-   套用全站背景色 (深色主題)。

### `globals.css` (全域樣式)
基於 Tailwind CSS 的全站樣式設定。
-   定義了自定義的 CSS 變數與 Utility Classes。
-   設定深色模式 (`dark`) 的基礎色調。

### `api/` (API Routes)
存放後端 API 端點。
-   `quotes/`: (較少使用) 提供前端透過 API 獲取報價的備用管道。
