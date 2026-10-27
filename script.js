const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const previewGrid = document.querySelector("#previewGrid");
const statusText = document.querySelector("#statusText");
const downloadAll = document.querySelector("#downloadAll");
const resetButton = document.querySelector("#resetButton");
const gridSelect = document.querySelector("#gridSelect");
const formatSelect = document.querySelector("#formatSelect");
const tileTemplate = document.querySelector("#tileTemplate");

const QUARTER_LABELS = ["左上", "右上", "左下", "右下"];
const QUARTER_SUFFIXES = ["top-left", "top-right", "bottom-left", "bottom-right"];
const FORMATS = {
  png: { mime: "image/png", ext: "png" },
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
};
const OUTPUT_QUALITY = 0.92;

let source = null; // { bitmap, name, type }
let pieces = [];
let latestRequest = 0;
let dragDepth = 0;

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  if (file) {
    handleFile(file);
  }
  imageInput.value = "";
});

// Keep the browser from navigating away when a file misses the drop zone.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

dropZone.addEventListener("dragenter", () => {
  dragDepth += 1;
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    dropZone.classList.remove("drag-over");
  }
});

dropZone.addEventListener("drop", (event) => {
  dragDepth = 0;
  dropZone.classList.remove("drag-over");

  const [file] = event.dataTransfer.files;
  if (file) {
    handleFile(file);
  }
});

document.addEventListener("paste", (event) => {
  const items = [...(event.clipboardData?.items ?? [])];
  const file = items.find((entry) => entry.type.startsWith("image/"))?.getAsFile();
  if (file) {
    handleFile(file);
  }
});

gridSelect.addEventListener("change", () => (source ? processSource() : renderPlaceholders()));
formatSelect.addEventListener("change", () => source && processSource());

downloadAll.addEventListener("click", downloadZip);
resetButton.addEventListener("click", resetApp);

function parseGrid() {
  const [cols, rows] = gridSelect.value.split("x").map(Number);
  return { cols, rows };
}

function setBusy(busy) {
  downloadAll.disabled = busy || pieces.length === 0;
  resetButton.disabled = busy || !source;
  gridSelect.disabled = busy;
  formatSelect.disabled = busy;
}

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("請上傳圖片檔案");
    return;
  }

  const request = ++latestRequest;
  setBusy(true);
  setStatus("圖片處理中...");

  try {
    const bitmap = await createImageBitmap(file);
    if (request !== latestRequest) {
      bitmap.close();
      return;
    }

    source?.bitmap.close();
    source = { bitmap, name: file.name, type: file.type };
    await processSource(request);
  } catch (error) {
    if (request !== latestRequest) {
      return;
    }
    clearPieces();
    setBusy(false);
    showError("圖片讀取失敗，請換一張圖片再試一次");
  }
}

async function processSource(existingRequest) {
  const request = existingRequest ?? ++latestRequest;
  setBusy(true);
  setStatus("圖片處理中...");

  try {
    const next = await splitImage(source);
    if (request !== latestRequest) {
      next.forEach((piece) => URL.revokeObjectURL(piece.url));
      return;
    }

    clearPieces();
    pieces = next;
    renderPieces();

    const { bitmap } = source;
    const { cols, rows } = parseGrid();
    setStatus(`${bitmap.width} x ${bitmap.height} 已切成 ${cols * rows} 張`);
    setBusy(false);
  } catch (error) {
    if (request !== latestRequest) {
      return;
    }
    clearPieces();
    setBusy(false);
    showError("圖片過大或格式不支援，無法輸出切片");
  }
}

function resolveFormat(sourceType) {
  const choice = formatSelect.value;
  if (choice !== "original") {
    return FORMATS[choice];
  }
  return Object.values(FORMATS).find((format) => format.mime === sourceType) ?? FORMATS.png;
}

function describePiece(cols, rows, row, col) {
  const index = row * cols + col;
  if (cols === 2 && rows === 2) {
    return { label: QUARTER_LABELS[index], suffix: QUARTER_SUFFIXES[index] };
  }
  if (cols === 1) {
    return { label: row === 0 ? "上" : "下", suffix: row === 0 ? "top" : "bottom" };
  }
  if (rows === 1) {
    return { label: col === 0 ? "左" : "右", suffix: col === 0 ? "left" : "right" };
  }
  return { label: `第 ${row + 1} 列 ${col + 1} 欄`, suffix: `r${row + 1}-c${col + 1}` };
}

async function splitImage({ bitmap, name, type }) {
  const { cols, rows } = parseGrid();
  const format = resolveFormat(type);
  const baseName = name.replace(/\.[^.]+$/, "") || "split-four";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const result = [];

  try {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.floor((bitmap.width * col) / cols);
        const y = Math.floor((bitmap.height * row) / rows);
        const width = Math.floor((bitmap.width * (col + 1)) / cols) - x;
        const height = Math.floor((bitmap.height * (row + 1)) / rows) - y;

        canvas.width = width;
        canvas.height = height;
        if (format.mime === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
        }
        context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);

        const blob = await canvasToBlob(canvas, format.mime);
        const { label, suffix } = describePiece(cols, rows, row, col);
        result.push({
          label,
          filename: `${baseName}-${suffix}.${format.ext}`,
          width,
          height,
          blob,
          url: URL.createObjectURL(blob),
        });
      }
    }
  } catch (error) {
    result.forEach((piece) => URL.revokeObjectURL(piece.url));
    throw error;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  return result;
}

function canvasToBlob(canvas, mime) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Cannot create image blob"))),
      mime,
      OUTPUT_QUALITY,
    );
  });
}

function renderPlaceholders() {
  const { cols, rows } = parseGrid();
  previewGrid.style.setProperty("--cols", cols);
  previewGrid.replaceChildren(
    ...Array.from({ length: cols * rows }, (_, index) => {
      const tile = document.createElement("article");
      tile.className = "tile placeholder";
      const label = document.createElement("span");
      label.textContent = describePiece(cols, rows, Math.floor(index / cols), index % cols).label;
      tile.append(label);
      return tile;
    }),
  );
}

function renderPieces() {
  const { cols } = parseGrid();
  previewGrid.style.setProperty("--cols", cols);
  previewGrid.replaceChildren(
    ...pieces.map((piece) => {
      const tile = tileTemplate.content.firstElementChild.cloneNode(true);
      const image = tile.querySelector("img");
      image.src = piece.url;
      image.alt = `${piece.label}切割圖片`;
      tile.querySelector(".tile-footer span").textContent =
        `${piece.label} ${piece.width} x ${piece.height}`;
      tile.querySelector(".download-button").addEventListener("click", () => downloadPiece(piece));
      return tile;
    }),
  );
}

function saveBlobUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function downloadPiece(piece) {
  saveBlobUrl(piece.url, piece.filename);
}

async function downloadZip() {
  const snapshot = pieces;
  if (snapshot.length === 0) {
    return;
  }

  downloadAll.disabled = true;
  try {
    const files = await Promise.all(
      snapshot.map(async (piece) => ({
        name: piece.filename,
        data: new Uint8Array(await piece.blob.arrayBuffer()),
      })),
    );
    const url = URL.createObjectURL(createZip(files));
    const baseName = source?.name.replace(/\.[^.]+$/, "") || "split-four";
    saveBlobUrl(url, `${baseName}-split.zip`);
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  } finally {
    downloadAll.disabled = pieces.length === 0;
  }
}

function clearPieces() {
  pieces.forEach((piece) => URL.revokeObjectURL(piece.url));
  pieces = [];
  renderPlaceholders();
}

function resetApp() {
  latestRequest += 1;
  source?.bitmap.close();
  source = null;
  clearPieces();
  setBusy(false);
  setStatus("尚未上傳圖片");
}

function setStatus(message) {
  statusText.classList.remove("error");
  statusText.textContent = message;
}

function showError(message) {
  statusText.classList.add("error");
  statusText.textContent = message;
}

renderPlaceholders();
