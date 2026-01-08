# 核心邏輯庫 (Library)

本目錄存放應用程式的核心運算邏輯、資料擷取層與型別定義。

## 檔案說明

### `financial-logic.ts` (核心運算)
這是本專案的「大腦」，負責將原始資料轉換為具備商業意義的指標。
-   **`calculateNetWorth`**: 計算總資產淨值，自動處理多幣別 (USD/JPY) 匯率轉換。
-   **`calculateCashFlow`**: 產生現金流預測圖表所需的數據。會依據「週期性收支 (Recurring Items)」與「一次性事件 (One-Off Events)」推算未來每月收支與淨值變化。
-   **`calculateAllocation`**: 計算資產配置佔比，供樹狀圖使用。
-   **`checkLiquidity`**: 檢查流動性風險，判斷現金是否足以支付未來的重大支出。
-   **`getLivePrice`**: 取得資產的即時價格 (包含美股、台股、加密貨幣的邏輯封裝)。

### `googleSheets.ts` (資料存取層)
負責與 Google Sheets API 進行通訊，將試算表資料轉為 TypeScript 物件。
-   `fetchAssets`: 抓取資產庫存表。
-   `fetchRecurringItems`: 抓取週期性收支表。
-   `fetchOneOffEvents`: 抓取一次性事件表。
-   `fetchDebtDetails` / `fetchInsuranceDetails`: 抓取債務與保險明細。

### `types.ts` (型別定義)
定義全站通用的資料介面 (Interfaces)。
-   `Asset`: 資產物件結構。
-   `RecurringItem`: 週期性收支項目結構。
-   `OneOffEvent`: 一次性事件結構。

### `currency.ts`
定義匯率資料結構 `ExchangeRates` 及相關常數。

### `stocks.ts`
定義股市資料的介面 `StockData` 及快取設定。
(註：原有的 Yahoo Finance 依賴已移除，改採用輕量化或 Mock 邏輯以提升效能)。
