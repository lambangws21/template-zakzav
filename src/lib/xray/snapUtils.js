import { getLineLength, getDistance, projectPointToInfiniteLine, getCircumcircleFromThreePoints, getSegmentMidpoint, getCircleTangentPointsFromExternalPoint } from "./geometryUtils";


export function buildAxisLineFromPoints(points) {
  if (!Array.isArray(points) || points.length < 4) return null;
  const proximalMid = getSegmentMidpoint(points[0], points[1]);
  const distalMid = getSegmentMidpoint(points[2], points[3]);
  if (Math.hypot(distalMid.x - proximalMid.x, distalMid.y - proximalMid.y) < 2) {
    return null;
  }
  return {
    x1: proximalMid.x,
    y1: proximalMid.y,
    x2: distalMid.x,
    y2: distalMid.y,
  };
}


export function buildGuideLineFromReference(referenceLine, throughPoint, mode = "parallel") {
  if (!referenceLine || !throughPoint) return null;
  const dx = referenceLine.x2 - referenceLine.x1;
  const dy = referenceLine.y2 - referenceLine.y1;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;

  let ux = dx / length;
  let uy = dy / length;
  if (mode === "perpendicular") {
    const nextUx = -uy;
    const nextUy = ux;
    ux = nextUx;
    uy = nextUy;
  }

  const halfLength = Math.max(18, length * 0.5);
  return {
    x1: throughPoint.x - ux * halfLength,
    y1: throughPoint.y - uy * halfLength,
    x2: throughPoint.x + ux * halfLength,
    y2: throughPoint.y + uy * halfLength,
  };
}


export function getSegmentIntersectionPoint(a, b) {
  const x1 = a.x1;
  const y1 = a.y1;
  const x2 = a.x2;
  const y2 = a.y2;
  const x3 = b.x1;
  const y3 = b.y1;
  const x4 = b.x2;
  const y4 = b.y2;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 1e-6) return null;

  const determinantA = x1 * y2 - y1 * x2;
  const determinantB = x3 * y4 - y3 * x4;
  const px =
    (determinantA * (x3 - x4) - (x1 - x2) * determinantB) / denominator;
  const py =
    (determinantA * (y3 - y4) - (y1 - y2) * determinantB) / denominator;

  const withinSegment = (value, start, end) =>
    value >= Math.min(start, end) - 1e-4 && value <= Math.max(start, end) + 1e-4;

  if (
    !withinSegment(px, x1, x2) ||
    !withinSegment(py, y1, y2) ||
    !withinSegment(px, x3, x4) ||
    !withinSegment(py, y3, y4)
  ) {
    return null;
  }

  return { x: px, y: py };
}


export function normalizeSnapSettings(settings) {
  return {
    endpoint: settings?.endpoint !== false,
    midpoint: settings?.midpoint !== false,
    intersection: settings?.intersection !== false,
    center: settings?.center !== false,
    tangent: Boolean(settings?.tangent),
    perpendicular: Boolean(settings?.perpendicular),
    shiftOnlyDesktop: Boolean(settings?.shiftOnlyDesktop),
  };
}


export function getSnapTypeShortLabel(type) {
  if (type === "midpoint") return "MID";
  if (type === "intersection") return "X";
  if (type === "center") return "CTR";
  if (type === "tangent") return "TAN";
  if (type === "perpendicular") return "PERP";
  return "END";
}


export function getSnapTargetSignature(target) {
  if (!target) return "none";
  const round = (value) =>
    Number.isFinite(value) ? Number(value).toFixed(2) : "";
  const sourceRefs = Array.isArray(target.sourceRefs)
    ? target.sourceRefs.join(",")
    : "";
  const hintSegments = Array.isArray(target.hintSegments)
    ? target.hintSegments
        .map(
          (segment) =>
            `${round(segment.x1)}:${round(segment.y1)}:${round(segment.x2)}:${round(segment.y2)}`,
        )
        .join("|")
    : "";

  return [
    target.type || "",
    round(target.x),
    round(target.y),
    sourceRefs,
    hintSegments,
  ].join(";");
}


