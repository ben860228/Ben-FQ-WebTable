# React Hooks

本目錄存放自定義的 React Hooks，用於封裝前端的狀態邏輯與副作用 (Side Effects)。

## 檔案說明

### `useLivePrices.ts`
用於在前端即時更新資產價格。
-   **用途**: 雖然首頁 (`page.tsx`) 會在伺服器端抓取一次最新的價格，但使用者停留在頁面時，此 Hook 可依設定的頻率輪詢 (Polling) 最新報價。
-   **機制**: 結合 `useState` 與 `useEffect`，定期呼叫 API 或檢查更新。
