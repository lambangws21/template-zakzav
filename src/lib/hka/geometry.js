export function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a, b) {
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function angleBetweenLines(a1, a2, b1, b2) {
  if (!a1 || !a2 || !b1 || !b2) return null;

  const v1 = { x: a1.x - a2.x, y: a1.y - a2.y };
  const v2 = { x: b1.x - b2.x, y: b1.y - b2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (!mag1 || !mag2) return null;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const rad = Math.acos(cosTheta);
  let deg = rad * (180 / Math.PI);

  if (deg > 90) deg = 180 - deg;

  return deg;
}

export function signedCoronalAngle(femurTop, knee, ankle) {
  if (!femurTop || !knee || !ankle) return null;

  const femurVector = {
    x: femurTop.x - knee.x,
    y: femurTop.y - knee.y,
  };
  const tibiaVector = {
    x: ankle.x - knee.x,
    y: ankle.y - knee.y,
  };

  const dot = femurVector.x * tibiaVector.x + femurVector.y * tibiaVector.y;
  const cross = femurVector.x * tibiaVector.y - femurVector.y * tibiaVector.x;
  const mag1 = Math.hypot(femurVector.x, femurVector.y);
  const mag2 = Math.hypot(tibiaVector.x, tibiaVector.y);

  if (!mag1 || !mag2) return null;

  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

export function screenToImagePoint(event, canvas, transform) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - transform.offsetX) / transform.scale,
    y: (event.clientY - rect.top - transform.offsetY) / transform.scale,
  };
}

export function drawPoint(ctx, point, label, color = "#facc15") {
  if (!point) return;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = "14px Arial";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 4;
  ctx.strokeText(label, point.x + 10, point.y - 10);
  ctx.fillText(label, point.x + 10, point.y - 10);
  ctx.restore();
}

export function drawLine(ctx, a, b, color = "#22c55e", width = 3) {
  if (!a || !b) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}
