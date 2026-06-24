// JLA (Joint Line Analysis) canvas drawing utilities

export function jlaExtendLine(a, b, extendPx) {
  if (!a || !b) return { a, b };
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    a: { x: a.x - (dx / len) * extendPx, y: a.y - (dy / len) * extendPx },
    b: { x: b.x + (dx / len) * extendPx, y: b.y + (dy / len) * extendPx },
  };
}

export function jlaLineIntersect(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null;
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-8) return null;
  const dx = p3.x - p1.x, dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / cross;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

export function jlaDrawAngleArc(ctx, vertex, ptA, ptB, radius, label, color) {
  if (!vertex || !ptA || !ptB) return;
  const angleA = Math.atan2(ptA.y - vertex.y, ptA.x - vertex.x);
  const angleB = Math.atan2(ptB.y - vertex.y, ptB.x - vertex.x);
  let diff = angleB - angleA;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.arc(vertex.x, vertex.y, radius, angleA, angleB, diff < 0);
  ctx.stroke();
  const midAngle = angleA + diff / 2;
  const lx = vertex.x + (radius + 11) * Math.cos(midAngle);
  const ly = vertex.y + (radius + 11) * Math.sin(midAngle);
  ctx.globalAlpha = 1;
  ctx.font = "bold 10px Arial";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeText(label, lx, ly);
  ctx.fillStyle = color;
  ctx.fillText(label, lx, ly);
  ctx.restore();
}
