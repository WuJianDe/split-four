const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const previewGrid = document.querySelector("#previewGrid");
const statusText = document.querySelector("#statusText");
const downloadAll = document.querySelector("#downloadAll");
const resetButton = document.querySelector("#resetButton");

const labels = ["左上", "右上", "左下", "右下"];
let pieces = [];

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  if (file) {
    handleFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");

  const [file] = event.dataTransfer.files;
  if (file) {
    handleFile(file);
  }
});

downloadAll.addEventListener("click", () => {
  pieces.forEach((piece, index) => {
    window.setTimeout(() => downloadPiece(piece), index * 160);
  });
});

resetButton.addEventListener("click", resetApp);

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("請上傳圖片檔案");
    return;
  }

  statusText.textContent = "圖片處理中...";

  try {
    const image = await loadImage(file);
    pieces.forEach((piece) => URL.revokeObjectURL(piece.url));
    pieces = await splitImage(image, file.name);
    renderPieces();
    statusText.classList.remove("error");
    statusText.textContent = `${image.naturalWidth} x ${image.naturalHeight} 已切成 4 張`;
    downloadAll.disabled = false;
    resetButton.disabled = false;
  } catch (error) {
    showError("圖片讀取失敗，請換一張圖片再試一次");
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot load image"));
    };

    image.src = url;
  });
}

async function splitImage(image, originalName) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const leftWidth = Math.floor(width / 2);
  const rightWidth = width - leftWidth;
  const topHeight = Math.floor(height / 2);
  const bottomHeight = height - topHeight;
  const baseName = originalName.replace(/\.[^.]+$/, "") || "split-four";

  const regions = [
    { label: labels[0], x: 0, y: 0, width: leftWidth, height: topHeight, suffix: "top-left" },
    { label: labels[1], x: leftWidth, y: 0, width: rightWidth, height: topHeight, suffix: "top-right" },
    { label: labels[2], x: 0, y: topHeight, width: leftWidth, height: bottomHeight, suffix: "bottom-left" },
    {
      label: labels[3],
      x: leftWidth,
      y: topHeight,
      width: rightWidth,
      height: bottomHeight,
      suffix: "bottom-right",
    },
  ];

  return Promise.all(regions.map(async (region) => {
    const canvas = document.createElement("canvas");
    canvas.width = region.width;
    canvas.height = region.height;

    const context = canvas.getContext("2d");
    context.drawImage(
      image,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height,
    );

    const blob = await canvasToBlob(canvas);

    return {
      label: region.label,
      filename: `${baseName}-${region.suffix}.png`,
      width: region.width,
      height: region.height,
      url: URL.createObjectURL(blob),
    };
  }));
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Cannot create image blob"));
    }, "image/png");
  });
}

function renderPieces() {
  previewGrid.innerHTML = "";

  pieces.forEach((piece) => {
    const tile = document.createElement("article");
    tile.className = "tile";

    const image = document.createElement("img");
    image.src = piece.url;
    image.alt = `${piece.label}切割圖片`;

    const footer = document.createElement("div");
    footer.className = "tile-footer";

    const label = document.createElement("span");
    label.textContent = `${piece.label} ${piece.width} x ${piece.height}`;

    const button = document.createElement("button");
    button.className = "download-button";
    button.type = "button";
    button.textContent = "下載";
    button.addEventListener("click", () => downloadPiece(piece));

    footer.append(label, button);
    tile.append(image, footer);
    previewGrid.append(tile);
  });
}

function downloadPiece(piece) {
  const link = document.createElement("a");
  link.href = piece.url;
  link.download = piece.filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function resetApp() {
  pieces.forEach((piece) => URL.revokeObjectURL(piece.url));
  pieces = [];
  imageInput.value = "";
  downloadAll.disabled = true;
  resetButton.disabled = true;
  statusText.classList.remove("error");
  statusText.textContent = "尚未上傳圖片";
  previewGrid.innerHTML = labels
    .map((label) => `<article class="tile placeholder"><span>${label}</span></article>`)
    .join("");
}

function showError(message) {
  statusText.classList.add("error");
  statusText.textContent = message;
}
