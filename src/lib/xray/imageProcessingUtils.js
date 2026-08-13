"use client";
import { buildDriveImageCandidates } from "../googleSheetImageUtils";

export const IMAGE_PROCESSING_MODES = [
  { key: "normal",       label: "Normal",        desc: "Tampilan asli dengan contrast/level." },
  { key: "enhance",      label: "Enhance",       desc: "Histogram equalization untuk X-ray." },
  { key: "clahe",        label: "CLAHE",         desc: "Equalisasi adaptif per-region, terbaik untuk tulang." },
  { key: "gamma",        label: "Gamma",         desc: "Koreksi gamma — terangkan area gelap." },
  { key: "edge",         label: "Edge",          desc: "Sobel edge detection kontur tulang." },
  { key: "invert",       label: "Invert",        desc: "Balik hitam/putih." },
  { key: "sharpen",      label: "Sharpen",       desc: "Tajamkan detail tulang/template." },
  { key: "detectMarker", label: "Detect Marker", desc: "Cari marker/ruler kalibrasi otomatis." },
];

export const IMAGE_PROCESSING_MODE_LABELS = IMAGE_PROCESSING_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.key]: mode.label }),
  {},
);

export const IMG_PROC_PREVIEW_MAX_SIDE = 1100;
export const IMG_PROC_DETECT_MAX_SIDE = 900;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function loadImageFromSrc(rawSrc) {
  return new Promise((resolve, reject) => {
    const src = buildDriveImageCandidates(rawSrc)[0] || rawSrc;
    const canTryAnonymous =
      typeof src === "string" &&
      !src.startsWith("data:") &&
      !src.startsWith("blob:");
    const tryLoad = (anonymous) => {
      const img = new Image();
      if (anonymous) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        if (anonymous) {
          tryLoad(false);
          return;
        }
        reject(error);
      };
      img.src = src;
    };

    tryLoad(canTryAnonymous);
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("File tidak menghasilkan data URL."));
    };
    reader.onerror = () =>
      reject(reader.error || new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

export function isTransientImageSrc(src) {
  const raw = String(src || "").trim();
  return raw.startsWith("blob:") || raw.startsWith("data:");
}

export function getPersistableImageSrc(src) {
  const raw = String(src || "").trim();
  return raw && !isTransientImageSrc(raw) ? raw : "";
}

export async function loadImageFromCandidates(candidates) {
  const sources = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  let lastError = null;
  for (const src of sources) {
    try {
      const image = await loadImageFromSrc(src);
      return { image, src };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Semua kandidat URL gambar gagal dimuat.");
}

export function normalizeImageProcessingMode(mode) {
  return IMAGE_PROCESSING_MODE_LABELS[mode] ? mode : "normal";
}

export function getLimitedProcessingSize(width, height, maxSide) {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  const limit = Math.max(256, Number(maxSide) || IMG_PROC_PREVIEW_MAX_SIDE);
  const scale = Math.min(1, limit / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
}

export function applyContrastLevelToImageData(imageData, contrastPercent, levelPercent) {
  const data = imageData.data;
  const contrastFactor = clamp(Number(contrastPercent) || 100, 10, 300) / 100;
  const levelFactor = clamp(Number(levelPercent) || 100, 10, 300) / 100;

  for (let index = 0; index < data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = data[index + channel];
      data[index + channel] = clamp(
        Math.round((value - 128) * contrastFactor + 128 * levelFactor),
        0,
        255,
      );
    }
  }
}

export function equalizeXrayImageData(imageData) {
  const data = imageData.data;
  const histogram = new Array(256).fill(0);
  const grayValues = new Uint8ClampedArray(data.length / 4);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const gray = Math.round(
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
    );
    grayValues[pixel] = gray;
    histogram[gray] += 1;
  }

  const totalPixels = grayValues.length;
  let cumulative = 0;
  let cdfMin = 0;
  const lut = new Uint8ClampedArray(256);
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value];
    if (!cdfMin && cumulative > 0) cdfMin = cumulative;
    lut[value] = clamp(
      Math.round(((cumulative - cdfMin) / Math.max(1, totalPixels - cdfMin)) * 255),
      0,
      255,
    );
  }

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const equalized = lut[grayValues[pixel]];
    data[index] = equalized;
    data[index + 1] = equalized;
    data[index + 2] = equalized;
  }
}

export function invertImageData(imageData) {
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255 - data[index];
    data[index + 1] = 255 - data[index + 1];
    data[index + 2] = 255 - data[index + 2];
  }
}

export function sharpenImageData(imageData) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const targetIndex = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = 0;
        let kernelIndex = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const sourceIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
            sum += source[sourceIndex] * kernel[kernelIndex];
            kernelIndex += 1;
          }
        }
        data[targetIndex + channel] = clamp(Math.round(sum), 0, 255);
      }
    }
  }
}

export function edgeDetectImageData(imageData, threshold) {
  const { width, height, data } = imageData;
  const source = new Uint8ClampedArray(data);
  const gray = new Uint8ClampedArray(width * height);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      gray[y * width + x] = Math.round(
        source[index] * 0.299 + source[index + 1] * 0.587 + source[index + 2] * 0.114,
      );
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let gx = 0;
      let gy = 0;
      let kernelIndex = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const value = gray[(y + ky) * width + (x + kx)];
          gx += value * sobelX[kernelIndex];
          gy += value * sobelY[kernelIndex];
          kernelIndex += 1;
        }
      }
      const magnitude = clamp(Math.round(Math.hypot(gx, gy)), 0, 255);
      const val = magnitude > (threshold || 0) ? magnitude : 0;
      const targetIndex = (y * width + x) * 4;
      data[targetIndex] = val;
      data[targetIndex + 1] = val;
      data[targetIndex + 2] = val;
      data[targetIndex + 3] = 255;
    }
  }
}

export function gammaImageData(imageData, gamma) {
  const data = imageData.data;
  const g = clamp(Number(gamma) || 1, 0.1, 5);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = clamp(Math.round(255 * Math.pow(i / 255, 1 / g)), 0, 255);
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

export function claheImageData(imageData, clipLimit, tileGridSize) {
  const { width, height, data } = imageData;
  const tiles = Math.max(2, Math.round(tileGridSize) || 8);
  const clip = Math.max(0.5, Number(clipLimit) || 3);
  const tileW = Math.ceil(width / tiles);
  const tileH = Math.ceil(height / tiles);

  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114);
  }

  const luts = [];
  for (let ty = 0; ty < tiles; ty++) {
    luts.push([]);
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, width);
      const y1 = Math.min(y0 + tileH, height);
      const hist = new Int32Array(256);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++;
          count++;
        }
      }
      const limit = Math.max(1, Math.round((clip * count) / 256));
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) { excess += hist[i] - limit; hist[i] = limit; }
      }
      const add = Math.floor(excess / 256);
      const rem = excess % 256;
      for (let i = 0; i < 256; i++) { hist[i] += add + (i < rem ? 1 : 0); }
      const lut = new Uint8ClampedArray(256);
      let cdf = 0; let cdfMin = -1;
      for (let i = 0; i < 256; i++) {
        cdf += hist[i];
        if (cdfMin < 0 && cdf > 0) cdfMin = cdf;
        lut[i] = clamp(Math.round(((cdf - cdfMin) / Math.max(1, count - cdfMin)) * 255), 0, 255);
      }
      luts[ty].push(lut);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = x / tileW - 0.5;
      const ty = y / tileH - 0.5;
      const tx0 = clamp(Math.floor(tx), 0, tiles - 1);
      const ty0 = clamp(Math.floor(ty), 0, tiles - 1);
      const tx1 = clamp(tx0 + 1, 0, tiles - 1);
      const ty1 = clamp(ty0 + 1, 0, tiles - 1);
      const fx = clamp(tx - Math.floor(tx), 0, 1);
      const fy = clamp(ty - Math.floor(ty), 0, 1);
      const g = gray[y * width + x];
      const eq = Math.round(
        luts[ty0][tx0][g] * (1 - fx) * (1 - fy) +
        luts[ty0][tx1][g] * fx * (1 - fy) +
        luts[ty1][tx0][g] * (1 - fx) * fy +
        luts[ty1][tx1][g] * fx * fy,
      );
      const idx = (y * width + x) * 4;
      data[idx] = eq; data[idx + 1] = eq; data[idx + 2] = eq;
    }
  }
}

export function createProcessedXrayCanvas({
  image,
  sourceX,
  sourceY,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  mode,
  contrastPercent,
  levelPercent,
  filterIntensity = 100,
  gammaValue = 1.5,
  edgeThreshold = 40,
  claheClip = 3.0,
  claheTiles = 8,
}) {
  if (typeof document === "undefined" || !image || !targetWidth || !targetHeight) {
    return null;
  }

  const normalizedMode = normalizeImageProcessingMode(mode);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  applyContrastLevelToImageData(imageData, contrastPercent, levelPercent);

  if (normalizedMode !== "normal") {
    const intensity = clamp(Number(filterIntensity) || 100, 0, 200);
    const origPixels = intensity !== 100 ? new Uint8ClampedArray(imageData.data) : null;

    if (normalizedMode === "enhance") {
      equalizeXrayImageData(imageData);
      sharpenImageData(imageData);
    } else if (normalizedMode === "clahe") {
      claheImageData(imageData, claheClip, claheTiles);
    } else if (normalizedMode === "gamma") {
      gammaImageData(imageData, gammaValue);
    } else if (normalizedMode === "invert") {
      invertImageData(imageData);
    } else if (normalizedMode === "sharpen") {
      sharpenImageData(imageData);
    } else if (normalizedMode === "edge") {
      edgeDetectImageData(imageData, edgeThreshold);
    }

    if (origPixels) {
      const t = intensity / 100;
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(Math.round(origPixels[i] * (1 - t) + d[i] * t), 0, 255);
        d[i + 1] = clamp(Math.round(origPixels[i + 1] * (1 - t) + d[i + 1] * t), 0, 255);
        d[i + 2] = clamp(Math.round(origPixels[i + 2] * (1 - t) + d[i + 2] * t), 0, 255);
      }
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

export function detectCalibrationMarkerLineFromCanvas(canvas) {
  if (!canvas) return null;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const { width, height } = canvas;
  if (width < 24 || height < 24) return null;

  const imageData = context.getImageData(0, 0, width, height);
  edgeDetectImageData(imageData);
  const data = imageData.data;
  const points = [];
  const step = Math.max(2, Math.floor(Math.max(width, height) / 420));
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.018));
  for (let y = margin; y < height - margin; y += step) {
    for (let x = margin; x < width - margin; x += step) {
      const value = data[(y * width + x) * 4];
      if (value >= 180) {
        points.push({ x, y });
      }
    }
  }
  if (points.length < 20) return null;

  const diag = Math.hypot(width, height);
  const rhoStep = Math.max(3, Math.round(diag / 280));
  let best = null;
  for (let angle = 0; angle < 180; angle += 4) {
    const theta = (angle * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const bins = new Map();
    for (const point of points) {
      const rho = Math.round((point.x * cos + point.y * sin) / rhoStep);
      bins.set(rho, (bins.get(rho) || 0) + 1);
    }
    for (const [rho, count] of bins.entries()) {
      if (!best || count > best.count) {
        best = { angle, theta, cos, sin, rho: rho * rhoStep, count };
      }
    }
  }
  if (!best || best.count < 12) return null;

  const ux = -best.sin;
  const uy = best.cos;
  const linePoints = points
    .filter((point) => Math.abs(point.x * best.cos + point.y * best.sin - best.rho) <= rhoStep * 1.8)
    .map((point) => ({
      ...point,
      projection: point.x * ux + point.y * uy,
    }))
    .sort((a, b) => a.projection - b.projection);
  if (linePoints.length < 10) return null;

  const first = linePoints[0];
  const last = linePoints[linePoints.length - 1];
  const length = Math.hypot(last.x - first.x, last.y - first.y);
  if (length < Math.min(width, height) * 0.08) return null;

  return {
    x1: clamp(first.x, 0, width),
    y1: clamp(first.y, 0, height),
    x2: clamp(last.x, 0, width),
    y2: clamp(last.y, 0, height),
    confidence: clamp(best.count / Math.max(1, linePoints.length), 0, 1),
  };
}
