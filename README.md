# Split Four｜圖片切割工具

在瀏覽器中將圖片切成多張切片，支援預覽、個別下載及打包下載。圖片處理與 ZIP 產生均在瀏覽器內完成，不需後端服務。

## 功能

- 透過檔案選擇、拖曳或貼上圖片匯入。
- 支援 2 × 2、3 × 3、左右對切及上下對切。
- 支援沿用原始格式或輸出為 PNG、JPG、WEBP。
- 預覽各切片及其像素尺寸，可單張下載或打包成 ZIP。
- 依原圖像素切割；若尺寸無法整除，切片尺寸可能相差一個像素。

## 使用方式

1. 使用支援 `createImageBitmap` 和 Canvas 的現代瀏覽器開啟 `index.html`。
2. 選擇或拖曳圖片至上傳區，也可貼上剪貼簿中的圖片。
3. 選擇切割方式與輸出格式，確認預覽。
4. 點選切片下方的「下載」，或選擇「下載全部（ZIP）」。

圖片格式是否能讀取取決於瀏覽器。選擇「沿用原始格式」時，僅 PNG、JPG、WEBP 會沿用原格式，其他格式會輸出為 PNG。JPG 不支援透明背景，透明區域會以白色填滿。ZIP 採用未壓縮的儲存方式，主要用途是方便一次下載。

## 本機開發

此專案使用原生 HTML、CSS 和 JavaScript，執行網頁不需安裝依賴或建置。若要執行格式檢查或格式化，請先安裝 Node.js 與 npm，然後在專案目錄執行：

```bash
npm install
npm run check
npm run format
```

`check` 使用 Prettier 檢查網頁程式碼格式；`format` 會修改這些檔案的格式。

## 專案結構

```text
index.html   頁面結構
styles.css   頁面樣式
script.js    圖片匯入、切割、預覽與下載
zip.js       ZIP 封裝與 CRC-32 計算
package.json 格式化工具與指令
```

## 部署

專案包含 GitHub Actions 工作流程：推送至 `main` 或手動觸發時，透過 SSH 將四個網頁檔案上傳至 Cloudways。工作流程需要設定 `CLOUDWAYS_SSH_PRIVATE_KEY` 與 `CLOUDWAYS_SSH_KNOWN_HOSTS` repository secrets；部署目標設定於 `.github/workflows/deploy.yml`。
