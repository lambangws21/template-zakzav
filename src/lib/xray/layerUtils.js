import { clamp, rotateVector } from "./geometryUtils";

const LAYER_PALETTE = [
  { border: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  { border: "#06b6d4", bg: "#ecfeff", text: "#155e75" },
  { border: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  { border: "#8b5cf6", bg: "#f5f3ff", text: "#5b21b6" },
  { border: "#f43f5e", bg: "#fff1f2", text: "#9f1239" },
  { border: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
];
const MIN_FREE_CUT_POINTS = 3;

export function getLayerPalette(layerId) {
  const index = Math.abs(Number(layerId) || 0) % LAYER_PALETTE.length;
  return LAYER_PALETTE[index];
}



export function isImageBackedLayerKind(kind) {
  return kind === "upload" || kind === "free-cut";
}


export function getLayerFilterValue(layer) {
  const layerContrast = clamp(Number(layer?.contrast ?? 100), 10, 300);
  const layerLevel = clamp(Number(layer?.level ?? 100), 10, 300);
  return `contrast(${layerContrast}%) brightness(${layerLevel}%)`;
}



export function getLayerDefaultName(layer) {
  if (!layer) return "Layer";
  if (layer.kind === "upload") return "Template";
  if (layer.kind === "free-cut") return "Free Cut";
  if (layer.kind === "free-line") return "Free Line";
  return "Fragment";
}


export function toLayerLocal(point, layer) {
  const dx = point.x - layer.centerX;
  const dy = point.y - layer.centerY;
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
  };
}


export function toLayerShapeLocal(point, layer) {
  const local = toLayerLocal(point, layer);
  return {
    x: layer.flipX ? -local.x : local.x,
    y: layer.flipY ? -local.y : local.y,
  };
}


export function imagePointToLayerCanvasPoint(imgPt, layer) {
  const shapeLocal = toLayerShapeLocal(imgPt, layer);
  const displaySize = getLayerDisplaySize(layer);
  const displayX = shapeLocal.x + displaySize.width / 2;
  const displayY = shapeLocal.y + displaySize.height / 2;
  return {
    x: displayX * (layer.sourceWidth / Math.max(1, displaySize.width)),
    y: displayY * (layer.sourceHeight / Math.max(1, displaySize.height)),
  };
}


export function getLayerDisplaySize(layer) {
  return {
    width: layer.displayWidth || layer.sourceWidth,
    height: layer.displayHeight || layer.sourceHeight,
  };
}


export function isEditableMaskLayer(layer) {
  return Boolean(
    layer &&
      (layer.kind === "free-line" || layer.kind === "free-cut") &&
      Array.isArray(layer.maskPoints) &&
      layer.maskPoints.length >= MIN_FREE_CUT_POINTS,
  );
}

export function isWarpableImageLayer(layer) {
  return Boolean(layer && isImageBackedLayerKind(layer.kind) && layer.image);
}

export function getDefaultImplantWarpAnchors(layer) {
  const size = getLayerDisplaySize(layer);
  const halfH = Math.max(8, size.height / 2);
  return [
    { x: 0, y: -halfH },
    { x: 0, y: 0 },
    { x: 0, y: halfH },
  ];
}

export function getImplantWarpAnchors(layer) {
  if (!isWarpableImageLayer(layer)) return [];
  const anchors = Array.isArray(layer.implantWarp?.anchors)
    ? layer.implantWarp.anchors
    : [];
  if (anchors.length >= 2) {
    return anchors
      .map((point) => ({ x: Number(point?.x) || 0, y: Number(point?.y) || 0 }))
      .sort((a, b) => a.y - b.y);
  }
  return getDefaultImplantWarpAnchors(layer);
}

export function isImplantWarpEnabled(layer) {
  return Boolean(layer?.implantWarp?.enabled);
}

export function getImplantWarpStrength(layer) {
  return clamp(Number(layer?.implantWarp?.strength ?? 1), 0, 1.6);
}

export function getImplantWarpWorldPoints(layer) {
  return getImplantWarpAnchors(layer).map((point, pointIndex) => ({
    pointIndex,
    ...transformLayerLocalPoint(layer, point),
  }));
}

function interpolateWarpCenter(anchors, normalizedT, strength) {
  if (!anchors.length) return { x: 0, y: 0, tangentX: 0, tangentY: 1 };
  if (anchors.length === 1) {
    return { x: anchors[0].x * strength, y: anchors[0].y, tangentX: 0, tangentY: 1 };
  }

  const yMin = anchors[0].y;
  const yMax = anchors[anchors.length - 1].y;
  const targetY = yMin + (yMax - yMin) * clamp(normalizedT, 0, 1);
  let index = 0;
  while (index < anchors.length - 2 && targetY > anchors[index + 1].y) {
    index += 1;
  }

  const a = anchors[index];
  const b = anchors[Math.min(index + 1, anchors.length - 1)];
  const span = Math.max(1e-6, b.y - a.y);
  const localT = clamp((targetY - a.y) / span, 0, 1);
  const eased = localT * localT * (3 - 2 * localT);
  const x = (a.x + (b.x - a.x) * eased) * strength;
  const y = a.y + (b.y - a.y) * localT;
  const tangentX = (b.x - a.x) * strength;
  const tangentY = b.y - a.y;
  return { x, y, tangentX, tangentY };
}

export function drawWarpedImageLayer(ctx, layer, sourceImage, srcX, srcY, srcW, srcH, displayWidth, displayHeight) {
  if (!ctx || !isImplantWarpEnabled(layer) || !sourceImage || !displayWidth || !displayHeight) {
    return false;
  }

  const anchors = getImplantWarpAnchors(layer);
  if (anchors.length < 2) return false;

  const strength = getImplantWarpStrength(layer);
  const maxAbsX = anchors.reduce((max, point) => Math.max(max, Math.abs(point.x || 0)), 0);
  if (strength <= 0.01 || maxAbsX <= 0.5) return false;

  const stripCount = clamp(Math.ceil(displayHeight / 4), 24, 180);
  const srcStep = srcH / stripCount;
  const dstStep = displayHeight / stripCount;
  const overlap = Math.max(0.5, displayHeight * 0.0025);

  ctx.save();
  for (let index = 0; index < stripCount; index += 1) {
    const t0 = index / stripCount;
    const tMid = (index + 0.5) / stripCount;
    const center = interpolateWarpCenter(anchors, tMid, strength);
    const angle = Math.atan2(center.tangentX, center.tangentY);
    const y = -displayHeight / 2 + t0 * displayHeight + dstStep / 2;

    ctx.save();
    ctx.translate(center.x, y);
    ctx.rotate(angle);
    ctx.drawImage(
      sourceImage,
      srcX,
      srcY + index * srcStep,
      srcW,
      Math.min(srcStep + 1, srcH - index * srcStep),
      -displayWidth / 2,
      -dstStep / 2 - overlap,
      displayWidth,
      dstStep + overlap * 2,
    );
    ctx.restore();
  }
  ctx.restore();
  return true;
}


export function transformLayerLocalPoint(layer, point) {
  const flippedX = layer.flipX ? -point.x : point.x;
  const flippedY = layer.flipY ? -point.y : point.y;
  const rotated = rotateVector(flippedX, flippedY, layer.rotation);
  return {
    x: layer.centerX + rotated.x,
    y: layer.centerY + rotated.y,
  };
}


export function getLayerMaskDisplayPoints(layer) {
  if (!Array.isArray(layer.maskPoints) || layer.maskPoints.length < 3) {
    return null;
  }

  const size = getLayerDisplaySize(layer);
  const scaleX = size.width / Math.max(1, layer.sourceWidth || size.width);
  const scaleY = size.height / Math.max(1, layer.sourceHeight || size.height);

  return layer.maskPoints.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
    handleInX: Number.isFinite(point?.handleInX)
      ? point.handleInX * scaleX
      : undefined,
    handleInY: Number.isFinite(point?.handleInY)
      ? point.handleInY * scaleY
      : undefined,
    handleOutX: Number.isFinite(point?.handleOutX)
      ? point.handleOutX * scaleX
      : undefined,
    handleOutY: Number.isFinite(point?.handleOutY)
      ? point.handleOutY * scaleY
      : undefined,
  }));
}


export function getLayerCorners(layer) {
  const size = getLayerDisplaySize(layer);
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const corners = [
    { key: "tl", x: -halfW, y: -halfH },
    { key: "tr", x: halfW, y: -halfH },
    { key: "br", x: halfW, y: halfH },
    { key: "bl", x: -halfW, y: halfH },
  ];

  return corners.map((corner) => {
    const rotated = rotateVector(corner.x, corner.y, layer.rotation);
    return {
      key: corner.key,
      x: layer.centerX + rotated.x,
      y: layer.centerY + rotated.y,
    };
  });
}


export function getLayerBounds(layer) {
  const corners = getLayerCorners(layer);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}


export function reorderLayerStack(layers, layerIds, placement) {
  const selectedSet = new Set(layerIds);
  if (!selectedSet.size) return layers;

  if (placement === "back") {
    const selected = layers.filter((layer) => selectedSet.has(layer.id));
    const rest = layers.filter((layer) => !selectedSet.has(layer.id));
    return [...selected, ...rest];
  }

  if (placement === "front") {
    const rest = layers.filter((layer) => !selectedSet.has(layer.id));
    const selected = layers.filter((layer) => selectedSet.has(layer.id));
    return [...rest, ...selected];
  }

  const next = [...layers];
  if (placement === "up") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (
        selectedSet.has(next[index].id) &&
        !selectedSet.has(next[index + 1].id)
      ) {
        const current = next[index];
        next[index] = next[index + 1];
        next[index + 1] = current;
      }
    }
    return next;
  }

  if (placement === "down") {
    for (let index = 1; index < next.length; index += 1) {
      if (
        selectedSet.has(next[index].id) &&
        !selectedSet.has(next[index - 1].id)
      ) {
        const current = next[index];
        next[index] = next[index - 1];
        next[index - 1] = current;
      }
    }
  }

  return next;
}


export function getLayerControlPoints(layer) {
  const size = getLayerDisplaySize(layer);
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const rotateOffset = Math.max(30, Math.min(54, halfH * 0.24 + 18));
  const points = [
    { key: "tl", x: -halfW, y: -halfH, type: "corner" },
    { key: "tm", x: 0, y: -halfH, type: "edge" },
    { key: "tr", x: halfW, y: -halfH, type: "corner" },
    { key: "mr", x: halfW, y: 0, type: "edge" },
    { key: "br", x: halfW, y: halfH, type: "corner" },
    { key: "bm", x: 0, y: halfH, type: "edge" },
    { key: "bl", x: -halfW, y: halfH, type: "corner" },
    { key: "ml", x: -halfW, y: 0, type: "edge" },
    { key: "rotate", x: 0, y: halfH + rotateOffset, type: "rotate" },
  ];

  return points.map((point) => {
    const rotated = rotateVector(point.x, point.y, layer.rotation);
    return {
      key: point.key,
      type: point.type,
      x: layer.centerX + rotated.x,
      y: layer.centerY + rotated.y,
    };
  });
}

