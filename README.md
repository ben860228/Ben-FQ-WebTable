# 金融儀表板 (Financial Cockpit)

這是一個基於 **Next.js 14** 構建的個人財務管理儀表板，整合了 Google Sheets 作為後端資料庫，並提供即時的現金流預測、資產配置分析及流動性監控。

## 專案結構 (Directory Structure)

本專案採用 Next.js App Router 架構，主要目錄說明如下：

-   **app/**: 應用程式的主入口與路由頁面。
    -   `page.tsx`: 儀表板首頁，負責彙整所有數據並傳遞給子組件。
    -   `layout.tsx`: 全域佈局設定。
    -   `globals.css`: 全站樣式定義 (Tailwind CSS)。

-   **components/**: UI 組件庫。
    -   `dashboard/`: 專用於儀表板的各式圖表與資訊卡片 (如：現金流圖表、資產樹狀圖、債務儀表板等)。
    -   `ui/`: 通用型 UI 元素 (按鈕、輸入框等)。

-   **lib/**: 核心邏輯與工具函式。
    -   `financial-logic.ts`: **(核心)** 財務運算邏輯，包含淨值計算、現金流預測及資產配置算法。
    -   `googleSheets.ts`: 負責與 Google Sheets API 溝通，抓取資產、債務、保險等原始數據。
    -   `stocks.ts`: 股市報價相關邏輯 (目前作為介面定義，實際抓取邏輯可能整合於前端或 mock)。
    -   `currency.ts`: 匯率定義與轉換工具。

-   **hooks/**: React Custom Hooks。
    -   `useLivePrices.ts`: 用於前端即時抓取或更新資產價格的 Hook。

## 核心功能

1.  **資產總覽 (Net Worth)**: 自動加總所有資產 (現金、股票、加密貨幣)，並依即時匯率換算為 TWD。
2.  **現金流預測 (Cash Flow)**: 基於週期性收支與一次性事件，預測未來的現金水位與淨值走勢。
3.  **流動性監控 (Liquidity)**: 比較現金資產與即將到來的重大支出，提出預警。
4.  **資產配置 (Allocation)**: 以樹狀圖 (Treemap) 視覺化各類資產佔比。

## 開發指南

**啟動開發伺服器:**
```bash
npm run dev
```

**建置生產版本:**
```bash
npm run build
```
