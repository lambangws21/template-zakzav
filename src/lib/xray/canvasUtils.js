import { clamp } from "./geometryUtils";

const DEFAULT_LABEL_OPACITY = 0.56;
const DEFAULT_ANNOTATION_COLOR = "#f97316";

export function applyBrushToCanvas(canvas, canvasPt, canvasRadius, mode, strength, color) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = Math.max(0.01, Math.min(1, strength));
  if (mode === "erase") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createRadialGradient(canvasPt.x, canvasPt.y, 0, canvasPt.x, canvasPt.y, canvasRadius);
    g.addColorStop(0, `rgba(0,0,0,${s})`);
    g.addColorStop(0.6, `rgba(0,0,0,${s * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(canvasPt.x, canvasPt.y, canvasRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (mode === "color") {
    const r = parseInt(color.slice(1, 3), 16) || 0;
    const gr = parseInt(color.slice(3, 5), 16) || 0;
    const b = parseInt(color.slice(5, 7), 16) || 0;
    const g = ctx.createRadialGradient(canvasPt.x, canvasPt.y, 0, canvasPt.x, canvasPt.y, canvasRadius);
    g.addColorStop(0, `rgba(${r},${gr},${b},${s})`);
    g.addColorStop(0.6, `rgba(${r},${gr},${b},${s * 0.5})`);
    g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(canvasPt.x, canvasPt.y, canvasRadius, 0, Math.PI * 2);
    ctx.fill();
  } else if (mode === "blur") {
    const bx = Math.max(0, Math.floor(canvasPt.x - canvasRadius));
    const by = Math.max(0, Math.floor(canvasPt.y - canvasRadius));
    const bw = Math.min(canvas.width - bx, Math.ceil(canvasRadius * 2 + 2));
    const bh = Math.min(canvas.height - by, Math.ceil(canvasRadius * 2 + 2));
    if (bw <= 0 || bh <= 0) return;
    const tmp = document.createElement("canvas");
    tmp.width = bw;
    tmp.height = bh;
    const tCtx = tmp.getContext("2d");
    if (!tCtx) return;
    const blurPx = Math.max(2, Math.round(canvasRadius * 0.35));
    tCtx.filter = `blur(${blurPx}px)`;
    tCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);
    tCtx.filter = "none";
    tCtx.globalCompositeOperation = "destination-in";
    const cx = canvasPt.x - bx;
    const cy = canvasPt.y - by;
    const mg = tCtx.createRadialGradient(cx, cy, 0, cx, cy, canvasRadius);
    mg.addColorStop(0, `rgba(0,0,0,${s})`);
    mg.addColorStop(0.7, `rgba(0,0,0,${s * 0.6})`);
    mg.addColorStop(1, "rgba(0,0,0,0)");
    tCtx.fillStyle = mg;
    tCtx.beginPath();
    tCtx.arc(cx, cy, canvasRadius, 0, Math.PI * 2);
    tCtx.fill();
    ctx.drawImage(tmp, bx, by);
  } else if (mode === "transparent") {
    const bx = Math.max(0, Math.floor(canvasPt.x - canvasRadius));
    const by = Math.max(0, Math.floor(canvasPt.y - canvasRadius));
    const bw = Math.min(canvas.width - bx, Math.ceil(canvasRadius * 2 + 2));
    const bh = Math.min(canvas.height - by, Math.ceil(canvasRadius * 2 + 2));
    if (bw <= 0 || bh <= 0) return;
    const imageData = ctx.getImageData(bx, by, bw, bh);
    const data = imageData.data;
    const cx = canvasPt.x - bx;
    const cy = canvasPt.y - by;
    for (let py = 0; py < bh; py++) {
      for (let px = 0; px < bw; px++) {
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        if (dist > canvasRadius) continue;
        const falloff = Math.cos((dist / canvasRadius) * (Math.PI / 2));
        const reduction = s * falloff;
        const idx = (py * bw + px) * 4;
        data[idx + 3] = Math.round(data[idx + 3] * (1 - reduction));
      }
    }
    ctx.putImageData(imageData, bx, by);
  }
}


export function tracePolygonPath(ctx, points) {
  if (!ctx || !Array.isArray(points) || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}


export function drawTag(ctx, x, y, text, color, options = {}) {
  const fontSize = options.fontSize ?? 10;
  const paddingX = options.paddingX ?? 5;
  const paddingY = options.paddingY ?? 3;
  const bgOpacity = options.bgOpacity ?? DEFAULT_LABEL_OPACITY;
  const textOpacity = options.textOpacity ?? 0.94;
  const radius = options.radius ?? 5;
  const borderOpacity = options.borderOpacity ?? 0.9;

  ctx.save();
  ctx.font = `${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const textMetrics = ctx.measureText(text);
  const width = textMetrics.width + paddingX * 2;
  const height = fontSize + paddingY * 2 + 4;

  ctx.fillStyle = `rgba(15, 23, 42, ${bgOpacity})`;
  ctx.strokeStyle = color;
  ctx.globalAlpha = borderOpacity;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = textOpacity;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, x - width / 2 + paddingX, y);
  ctx.restore();
}


export function fillCircleMarkers(ctx, markers) {
  for (const marker of markers) {
    if (!marker) continue;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}


export function strokeCircleMarkers(ctx, markers) {
  for (const marker of markers) {
    if (!marker) continue;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}


export function getTagBounds(x, y, text, options = {}) {
  const fontSize = options.fontSize ?? 10;
  const paddingX = options.paddingX ?? 5;
  const paddingY = options.paddingY ?? 3;
  const estimatedWidth = Math.max(
    fontSize * 3.4,
    String(text || "").length * fontSize * 0.58 + paddingX * 2,
  );
  const height = fontSize + paddingY * 2 + 4;

  return {
    left: x - estimatedWidth / 2,
    right: x + estimatedWidth / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}


export function cloneAnnotation(annotation) {
  return {
    id: annotation?.id,
    x: Number(annotation?.x) || 0,
    y: Number(annotation?.y) || 0,
    text: String(annotation?.text || ""),
    color: annotation?.color || DEFAULT_ANNOTATION_COLOR,
    fontSize: clamp(Number(annotation?.fontSize) || 11, 8, 24),
    labelOpacity: clamp(
      Number(annotation?.labelOpacity ?? DEFAULT_LABEL_OPACITY),
      0.08,
      1,
    ),
    px: annotation?.px != null ? Number(annotation.px) : null,
    py: annotation?.py != null ? Number(annotation.py) : null,
  };
}


export function drawLeaderLine(ctx, labelX, labelY, tagWidth, tagHeight, tipX, tipY, color, isSelected) {
  const dx = tipX - labelX;
  const dy = tipY - labelY;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  const nx = dx / dist;
  const ny = dy / dist;
  // Exit point from label border
  const hw = tagWidth / 2 + 3;
  const hh = tagHeight / 2 + 3;
  const tEdge = Math.min(
    Math.abs(hw / (nx || 0.001)),
    Math.abs(hh / (ny || 0.001)),
  );
  const edgeDist = Math.min(tEdge, dist);
  const sx = labelX + nx * edgeDist;
  const sy = labelY + ny * edgeDist;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = isSelected ? 1 : 0.88;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  // Line
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Arrowhead at tip
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-9, -4);
  ctx.lineTo(-9, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Pointer tip dot (drag handle)
  ctx.beginPath();
  ctx.arc(tipX, tipY, isSelected ? 5 : 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(248,250,252,0.95)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}


export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}


