"use client";
import { clamp } from "./geometryUtils";
import { sharpenImageData } from "./imageProcessingUtils";

export function removeImageBackground(imageSrc, { threshold = 30, targetColor = "white" } = {}) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          let match = false;
          if (targetColor === "white") {
            match = r > 255 - threshold && g > 255 - threshold && b > 255 - threshold;
          } else if (targetColor === "black") {
            match = r < threshold && g < threshold && b < threshold;
          } else {
            const brightness = (r + g + b) / 3;
            match = brightness > 255 - threshold;
          }
          if (match) d[i + 3] = 0;
        }
        ctx.putImageData(data, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}


export function createCombinedReportCanvas(
  imageCanvas,
  overlayCanvas,
  { exportScale = 1, sharpen = false, background = null } = {},
) {
  if (!imageCanvas || !overlayCanvas) return null;
  const outCanvas = document.createElement("canvas");
  const scale = clamp(Number(exportScale) || 1, 1, 4);
  outCanvas.width = Math.max(1, Math.round(imageCanvas.width * scale));
  outCanvas.height = Math.max(1, Math.round(imageCanvas.height * scale));
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  }
  ctx.drawImage(imageCanvas, 0, 0, outCanvas.width, outCanvas.height);
  ctx.drawImage(overlayCanvas, 0, 0, outCanvas.width, outCanvas.height);
  if (sharpen) {
    try {
      const imageData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
      sharpenImageData(imageData);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // If the canvas is tainted by a remote image, export will handle the error.
    }
  }
  return outCanvas;
}





