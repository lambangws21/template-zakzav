import { XRAY_BASE_HEIGHT, XRAY_BASE_WIDTH } from "./viewerConstants";

export function createTemplatingId() {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20,
    )}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function getViewerXrayTransform(stageRect, zoom = 1, mode = "fit", cover = false, pan) {
  if (!stageRect) return null;

  const fitScale = Math.min(stageRect.width / XRAY_BASE_WIDTH, stageRect.height / XRAY_BASE_HEIGHT);
  const coverScale = Math.max(
    stageRect.width / XRAY_BASE_WIDTH,
    stageRect.height / XRAY_BASE_HEIGHT,
  );
  const baseScale = cover ? coverScale : mode === "oneToOne" ? 1 : fitScale;
  const scale = baseScale * zoom;
  const width = XRAY_BASE_WIDTH * scale;
  const height = XRAY_BASE_HEIGHT * scale;

  return {
    offsetX: (stageRect.width - width) / 2 + (pan?.x ?? 0),
    offsetY: (stageRect.height - height) / 2 + (pan?.y ?? 0),
    rect: stageRect,
    scale,
  };
}

export function distancePointToSegmentSq(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    const dx = point.x - a.x;
    const dy = point.y - a.y;
    return dx * dx + dy * dy;
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  const dx = point.x - cx;
  const dy = point.y - cy;

  return dx * dx + dy * dy;
}

export function clampViewerStagePoint(point) {
  return {
    x: Math.min(XRAY_BASE_WIDTH, Math.max(0, point.x)),
    y: Math.min(XRAY_BASE_HEIGHT, Math.max(0, point.y)),
  };
}
