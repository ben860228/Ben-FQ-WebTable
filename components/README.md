# UI 組件庫 (Components)

本目錄存放所有前端 React 組件，分為儀表板專用組件與通用 UI 組件。

## 目錄結構

### `dashboard/` (儀表板功能組件)
此資料夾包含特定業務邏輯的視覺化組件：
-   **`NetWorthCard.tsx`**: 顯示總資產淨值的大型數字卡片。
-   **`CashFlowChart.tsx`**: [核心] 結合長條圖與折線圖，顯示每月收入、支出與淨值預測。支援點擊查看明細 Modal。
-   **`AssetTreemap.tsx`**: 以樹狀圖顯示資產配置 (如股票 vs 現金 vs 加密貨幣)。
-   **`LiquidityWidget.tsx`**: 顯示可用現金水位及其對應的安全天數。
-   **`TimelineAlert.tsx`**: 顯示即將到來的重大支出事件 (One-Off Events) 與資金缺口警示。
-   **`ExpenseBreakdown.tsx`**: 以圓餅圖分析各類別支出的佔比。
-   **`RecurringTable.tsx`**: **[New]** 詳細收支表。整合 2026 年度一次性事件 (One-Offs)，支援切換「Base Net」與「Forecast Net」雙重預測，並提供隱藏/顯示功能。
-   **`AssetTable.tsx`**: 資產列表。
-   **`BudgetTracker.tsx`**: **[New]** 進階預算追蹤器。提供每日支出建議 (Smart Daily Limit)、動態滾動預算 (Rolling Budget) 及月度預警功能。

### `ui/` (通用組件)
存放與業務邏輯無關的純 UI 元素，如同 Design System：
-   `button.tsx`, `card.tsx`, `input.tsx`: 基礎互動元件。
-   (這些元件通常基於 shadcn/ui 或自行封裝的 Tailwind 樣式)。
