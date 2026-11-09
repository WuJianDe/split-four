# Image Splitter｜圖片切割工具

在瀏覽器中將單張圖片依宮格或對切方式拆分為多張切片，支援即時預覽、指定輸出尺寸、格式轉換、單張下載及打包下載。所有圖片處理與 ZIP 封裝均在瀏覽器端完成，不需後端服務。

## 功能特色

- **多元匯入方式**：支援點擊選擇檔案、拖曳圖片至上傳區，或直接貼上剪貼簿圖片（`Ctrl+V` 貼上截圖）。
- **多種切割模式**：
  - `2 × 2`（四宮格：左上、右上、左下、右下）
  - `3 × 3`（九宮格）
  - `4 × 4`（十六宮格）
  - `2 × 1`（左右對切）
  - `1 × 2`（上下對切）
- **彈性輸出尺寸**：
  - **原始像素**：依原圖像素等分切割（若尺寸無法整除，切片尺寸可能相差 1 px）。
  - **指定寬高**：自訂每張切片的輸出寬高（`1`～`8192` px，預設 `320 × 320` px），並提供三種比例適應方式：
    - **填滿並裁切（Cover）**：等比例縮放至填滿目標寬高，並置中裁切多餘區域。
    - **完整保留（Contain）**：等比例縮放以完整顯示切片內容，四周空白處自動補白邊。
    - **拉伸變形（Stretch）**：直接縮放至目標寬高。
- **格式轉換**：支援沿用原始格式，或統一輸出為 `PNG`、`JPG`、`WEBP`（`JPG` 與 `WEBP` 輸出品質為 `0.92`）。
- **即時預覽與下載**：預覽各切片及其實際像素尺寸，可單張下載或一鍵打包為 `ZIP` 壓縮檔。
- **深色模式與響應式介面**：自動配合系統深淺色主題，支援桌面與行動裝置瀏覽。

## 使用方式

1. 使用支援 `createImageBitmap` 與 HTML5 Canvas 的現代瀏覽器開啟 `index.html`。
2. 選擇、拖曳或貼上圖片。
3. 選擇**切割方式**、**輸出格式**與**輸出尺寸**（若選擇「指定寬高」，可進一步調整比例適應方式與像素寬高）。
4. 在右側預覽區確認切片結果與尺寸，點選單張切片的「下載」或左側「下載全部（ZIP）」。

### 注意事項

- 圖片格式是否能讀取取決於瀏覽器支援度。
- 選擇「沿用原始格式」時，僅 `PNG`、`JPG`、`WEBP` 會沿用原格式，其餘格式會自動轉為 `PNG` 輸出。
- `JPG` 不支援透明背景，透明區域會自動以白色（`#ffffff`）填滿；選擇「完整保留（補白邊）」時亦會以白色填補邊界。
- `ZIP` 採用無壓縮（Store-only）封裝並內建 CRC-32 計算與 UTF-8 檔名支援，主要用於方便一次下載所有切片。

## 本機開發

此專案使用原生 HTML、CSS 和 JavaScript，直接開啟網頁即可執行，不需安裝執行期依賴或建置步驟。若要執行程式碼格式檢查或排版，請先安裝 Node.js 與 npm，然後在專案目錄執行：

```bash
npm install
npm run check
npm run format
```

- `npm run check`：使用 Prettier 檢查 `index.html`、`script.js`、`zip.js`、`styles.css` 格式。
- `npm run format`：使用 Prettier 自動格式化上述檔案。

## 專案結構

```text
index.html                   頁面結構與表單控制項
styles.css                   響應式版面與深淺色主題樣式
script.js                    圖片匯入、Canvas 切割、尺寸縮放、預覽與下載邏輯
zip.js                       瀏覽器端 Store-only ZIP 封裝與 CRC-32 計算
package.json                 專案資訊與 Prettier 格式化指令
.github/workflows/deploy.yml GitHub Actions 自動部署流程
```

## 部署

專案包含 GitHub Actions 工作流程（`.github/workflows/deploy.yml`）：推送至 `main` 分支或手動觸發時，會自動將 `index.html` 中的靜態資源參數 `?v=dev` 替換為 Commit SHA 前 8 碼以繞過快取，並透過 SSH/SCP 將四個網頁檔案上傳至 Cloudways 的 `$PUBLIC_HTML/split-four` 目錄。

工作流程需要設定以下 Repository Secrets：
- `DEPLOY_SSH_KEY`
- `CLOUDWAYS_SSH_KNOWN_HOSTS`
