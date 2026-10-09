// Resolve overlapping touch targets in screen pixels, independent of zoom.
export function pickTouchLine(lines, point, scale, selectedId, tolerance) {
  let nearest = null;
  let selected = null;
  for (const line of lines) {
    if (line.hidden) continue;
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((point.x - line.x1) * dx + (point.y - line.y1) * dy) / lengthSquared))
      : 0;
    const distance = Math.hypot(point.x - line.x1 - t * dx, point.y - line.y1 - t * dy) * scale;
    if (!Number.isFinite(distance) || distance > tolerance) continue;
    const hit = { id: line.id, distance };
    if (!nearest || distance <= nearest.distance) nearest = hit;
    if (line.id === selectedId) selected = hit;
  }
  // Keep the selected line at intersections, but allow a clearly closer neighbor.
  return selected && selected.distance <= (nearest?.distance ?? Infinity) + 4
    ? selected.id
    : nearest?.id ?? null;
}
