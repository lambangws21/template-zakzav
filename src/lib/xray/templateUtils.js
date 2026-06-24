"use client";
import { clamp } from "./geometryUtils";

const A5_PORTRAIT_WIDTH_MM = 148;
const A5_PORTRAIT_HEIGHT_MM = 210;


export function getTemplateKey(template) {
  const safeName = String(template?.name || "")
    .trim()
    .toLowerCase();
  const safeSrc =
    typeof template?.imageSrc === "string"
      ? template.imageSrc.slice(0, 120)
      : "";
  return `${safeName}::${safeSrc}`;
}


export function mergeTemplateLibraryLists(primaryTemplates, fallbackTemplates) {
  const merged = [];
  const seen = new Set();
  for (const item of [...primaryTemplates, ...fallbackTemplates]) {
    if (!item || typeof item.imageSrc !== "string" || !item.imageSrc) continue;
    const key = getTemplateKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, 60);
}


export function getOrientedSize(width, height, rotation) {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }

  return { width, height };
}


export function orientPoint(x, y, width, height, rotation, flipX, flipY) {
  let nx = x;
  let ny = y;

  if (flipX) nx = width - nx;
  if (flipY) ny = height - ny;

  if (rotation === 90) {
    return { x: height - ny, y: nx };
  }

  if (rotation === 180) {
    return { x: width - nx, y: height - ny };
  }

  if (rotation === 270) {
    return { x: ny, y: width - nx };
  }

  return { x: nx, y: ny };
}


export function inverseOrientPoint(x, y, width, height, rotation, flipX, flipY) {
  let nx = x;
  let ny = y;

  if (rotation === 90) {
    nx = y;
    ny = height - x;
  } else if (rotation === 180) {
    nx = width - x;
    ny = height - y;
  } else if (rotation === 270) {
    nx = width - y;
    ny = x;
  }

  if (flipX) nx = width - nx;
  if (flipY) ny = height - ny;

  return { x: nx, y: ny };
}


export function getImageContentBounds(image) {
  if (typeof document === "undefined" || !image) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  if (!rawWidth || !rawHeight) return null;

  const maxScanSize = 900;
  const scanScale = Math.min(
    maxScanSize / rawWidth,
    maxScanSize / rawHeight,
    1,
  );
  const scanWidth = Math.max(1, Math.round(rawWidth * scanScale));
  const scanHeight = Math.max(1, Math.round(rawHeight * scanScale));
  const canvas = document.createElement("canvas");
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const pixels = ctx.getImageData(0, 0, scanWidth, scanHeight).data;
    const cornerIndexes = [
      0,
      (scanWidth - 1) * 4,
      (scanHeight - 1) * scanWidth * 4,
      ((scanHeight - 1) * scanWidth + scanWidth - 1) * 4,
    ];
    const background = cornerIndexes.reduce(
      (sum, index) => ({
        r: sum.r + pixels[index],
        g: sum.g + pixels[index + 1],
        b: sum.b + pixels[index + 2],
        a: sum.a + pixels[index + 3],
      }),
      { r: 0, g: 0, b: 0, a: 0 },
    );
    background.r /= cornerIndexes.length;
    background.g /= cornerIndexes.length;
    background.b /= cornerIndexes.length;
    background.a /= cornerIndexes.length;

    let minX = scanWidth;
    let minY = scanHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < scanHeight; y += 1) {
      for (let x = 0; x < scanWidth; x += 1) {
        const index = (y * scanWidth + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha <= 18) continue;

        const distance =
          Math.abs(pixels[index] - background.r) +
          Math.abs(pixels[index + 1] - background.g) +
          Math.abs(pixels[index + 2] - background.b) +
          Math.abs(alpha - background.a) * 0.35;
        if (distance <= 34) continue;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const pad = Math.max(
      2,
      Math.round(Math.min(scanWidth, scanHeight) * 0.015),
    );
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(scanWidth - 1, maxX + pad);
    maxY = Math.min(scanHeight - 1, maxY + pad);

    const x = Math.floor(minX / scanScale);
    const y = Math.floor(minY / scanScale);
    const width = Math.min(
      rawWidth - x,
      Math.ceil((maxX - minX + 1) / scanScale),
    );
    const height = Math.min(
      rawHeight - y,
      Math.ceil((maxY - minY + 1) / scanScale),
    );
    const coversAlmostAll =
      width >= rawWidth * 0.96 && height >= rawHeight * 0.96;
    if (coversAlmostAll || width < 8 || height < 8) return null;

    return { x, y, width, height };
  } catch {
    return null;
  }
}


export function getA5PhysicalSizeForImage(width, height) {
  const isLandscape = Number(width) > Number(height);
  return {
    widthMm: isLandscape ? A5_PORTRAIT_HEIGHT_MM : A5_PORTRAIT_WIDTH_MM,
    heightMm: isLandscape ? A5_PORTRAIT_WIDTH_MM : A5_PORTRAIT_HEIGHT_MM,
    label: isLandscape ? "A5 landscape" : "A5 portrait",
  };
}


export function resolveTemplatePhysicalSize({
  physicalSize,
  physicalWidthMm,
  physicalHeightMm,
  width,
  height,
}) {
  const widthMm = Number(physicalWidthMm);
  const heightMm = Number(physicalHeightMm);
  if (Number.isFinite(widthMm) && widthMm > 0 && Number.isFinite(heightMm) && heightMm > 0) {
    return { widthMm, heightMm, label: `${widthMm} x ${heightMm} mm` };
  }
  if (String(physicalSize || "").toUpperCase() === "A5") {
    return getA5PhysicalSizeForImage(width, height);
  }
  return null;
}


export function makeWhiteBackgroundTransparent(image) {
  if (typeof document === "undefined" || !image) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  if (!rawWidth || !rawHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = rawWidth;
  canvas.height = rawHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, rawWidth, rawHeight);
    const imageData = ctx.getImageData(0, 0, rawWidth, rawHeight);
    const pixels = imageData.data;
    let changedPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha <= 0) continue;

      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const minChannel = Math.min(red, green, blue);
      const maxChannel = Math.max(red, green, blue);
      const spread = maxChannel - minChannel;

      if (minChannel >= 244 && spread <= 18) {
        pixels[index + 3] = 0;
        changedPixels += 1;
      } else if (minChannel >= 235 && spread <= 14) {
        pixels[index + 3] = Math.round(alpha * 0.24);
        changedPixels += 1;
      }
    }

    if (changedPixels === 0) return null;

    ctx.putImageData(imageData, 0, 0);
    let imageSrc = "";
    try {
      imageSrc = canvas.toDataURL("image/png");
    } catch {
      imageSrc = "";
    }
    return { image: canvas, imageSrc, changedPixels };
  } catch {
    return null;
  }
}


export function normalizeImageToPhysicalAspect(image, physicalSize) {
  if (typeof document === "undefined" || !image || !physicalSize) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  const targetAspect = physicalSize.widthMm / physicalSize.heightMm;
  if (!rawWidth || !rawHeight || !Number.isFinite(targetAspect) || targetAspect <= 0) {
    return null;
  }

  const rawAspect = rawWidth / rawHeight;
  let canvasWidth = rawWidth;
  let canvasHeight = rawHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (Math.abs(rawAspect - targetAspect) <= 0.01) return null;

  if (rawAspect > targetAspect) {
    canvasHeight = Math.round(rawWidth / targetAspect);
    offsetY = Math.round((canvasHeight - rawHeight) / 2);
  } else {
    canvasWidth = Math.round(rawHeight * targetAspect);
    offsetX = Math.round((canvasWidth - rawWidth) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, canvasWidth);
  canvas.height = Math.max(1, canvasHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, offsetX, offsetY);

  let imageSrc = "";
  try {
    imageSrc = canvas.toDataURL("image/png");
  } catch {
    imageSrc = "";
  }
  return { image: canvas, imageSrc };
}


export function getMedian(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}


export function getProjectionTickSpacing(projection, threshold) {
  const groups = [];
  let start = -1;
  let weighted = 0;
  let total = 0;

  for (let index = 0; index <= projection.length; index += 1) {
    const value = index < projection.length ? projection[index] : 0;
    if (value >= threshold) {
      if (start < 0) {
        start = index;
        weighted = 0;
        total = 0;
      }
      weighted += index * value;
      total += value;
      continue;
    }

    if (start >= 0) {
      groups.push(total > 0 ? weighted / total : start);
      start = -1;
    }
  }

  const diffs = [];
  for (let index = 1; index < groups.length; index += 1) {
    const diff = groups[index] - groups[index - 1];
    if (diff >= 2 && diff <= 18) {
      diffs.push(diff);
    }
  }

  if (diffs.length < 12) return null;
  return {
    spacing: getMedian(diffs),
    tickCount: groups.length,
    diffCount: diffs.length,
  };
}


export function estimateTemplateRulerPxPerMm(image) {
  if (typeof document === "undefined" || !image) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  if (!rawWidth || !rawHeight) return null;

  const maxScanSize = 1100;
  const scanScale = Math.min(
    maxScanSize / rawWidth,
    maxScanSize / rawHeight,
    1,
  );
  const scanWidth = Math.max(1, Math.round(rawWidth * scanScale));
  const scanHeight = Math.max(1, Math.round(rawHeight * scanScale));
  const canvas = document.createElement("canvas");
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const pixels = ctx.getImageData(0, 0, scanWidth, scanHeight).data;
    const isStrictRulerPixel = (index) => {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      return a > 50 && g > 90 && g > r * 1.65 && g > b * 1.65;
    };

    const isLooseRulerPixel = (index) => {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      return (
        a > 50 &&
        g > 80 &&
        g > r * 1.35 &&
        (g > b * 1.12 || b > r * 1.45)
      );
    };

    const buildVerticalProjection = (startX, width, isRulerPixel) => {
      const projection = new Array(scanHeight).fill(0);
      const x0 = clamp(Math.round(startX), 0, Math.max(0, scanWidth - 1));
      const x1 = clamp(
        Math.round(startX + width),
        x0 + 1,
        Math.max(1, scanWidth),
      );
      for (let y = 0; y < scanHeight; y += 1) {
        let count = 0;
        for (let x = x0; x < x1; x += 1) {
          if (isRulerPixel((y * scanWidth + x) * 4)) count += 1;
        }
        projection[y] = count;
      }
      return projection;
    };

    const buildHorizontalProjection = (startY, height, isRulerPixel) => {
      const projection = new Array(scanWidth).fill(0);
      const y0 = clamp(Math.round(startY), 0, Math.max(0, scanHeight - 1));
      const y1 = clamp(
        Math.round(startY + height),
        y0 + 1,
        Math.max(1, scanHeight),
      );
      for (let x = 0; x < scanWidth; x += 1) {
        let count = 0;
        for (let y = y0; y < y1; y += 1) {
          if (isRulerPixel((y * scanWidth + x) * 4)) count += 1;
        }
        projection[x] = count;
      }
      return projection;
    };

    const verticalBandWidth = clamp(Math.round(scanWidth * 0.075), 18, 52);
    const horizontalBandHeight = clamp(Math.round(scanHeight * 0.07), 18, 52);

    const collectCandidates = (isRulerPixel) => {
      const scanRegions = [
        {
          axis: "vertical-left",
          projection: buildVerticalProjection(0, verticalBandWidth, isRulerPixel),
          threshold: Math.max(4, Math.round(verticalBandWidth * 0.18)),
        },
        {
          axis: "vertical-right",
          projection: buildVerticalProjection(
            scanWidth - verticalBandWidth,
            verticalBandWidth,
            isRulerPixel,
          ),
          threshold: Math.max(4, Math.round(verticalBandWidth * 0.18)),
        },
        {
          axis: "horizontal-top",
          projection: buildHorizontalProjection(0, horizontalBandHeight, isRulerPixel),
          threshold: Math.max(4, Math.round(horizontalBandHeight * 0.18)),
        },
        {
          axis: "horizontal-bottom",
          projection: buildHorizontalProjection(
            scanHeight - horizontalBandHeight,
            horizontalBandHeight,
            isRulerPixel,
          ),
          threshold: Math.max(4, Math.round(horizontalBandHeight * 0.18)),
        },
      ];

      return scanRegions
        .map((region) => {
          const spacing = getProjectionTickSpacing(
            region.projection,
            region.threshold,
          );
          if (!spacing) return null;
          return {
            axis: region.axis,
            pxPerMm: spacing.spacing / scanScale,
            confidence: spacing.diffCount,
          };
        })
        .filter(Boolean);
    };

    let candidates = collectCandidates(isStrictRulerPixel);
    if (candidates.length === 0) {
      candidates = collectCandidates(isLooseRulerPixel);
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    if (!Number.isFinite(best.pxPerMm) || best.pxPerMm <= 0) return null;
    return best;
  } catch {
    return null;
  }
}


