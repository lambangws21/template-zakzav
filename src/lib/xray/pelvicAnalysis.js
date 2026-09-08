export const PELVIC_ANALYSIS_LANDMARKS = [
  { key: "tdRight", label: "Teardrop kanan", shortLabel: "TD-R", side: "right", guideKey: "teardrop" },
  { key: "tdLeft", label: "Teardrop kiri", shortLabel: "TD-L", side: "left", guideKey: "teardrop" },
  { key: "hrcRight", label: "Pusat femoral head kanan", shortLabel: "HRC-R", side: "right", guideKey: "femoral_head_center" },
  { key: "hrcLeft", label: "Pusat femoral head kiri", shortLabel: "HRC-L", side: "left", guideKey: "femoral_head_center" },
  { key: "headEdgeRight", label: "Tepi korteks femoral head kanan", shortLabel: "FHD-R", side: "right", guideKey: "femoral_head_lateral_edge" },
  { key: "headEdgeLeft", label: "Tepi korteks femoral head kiri", shortLabel: "FHD-L", side: "left", guideKey: "femoral_head_lateral_edge" },
  { key: "neckVertexRight", label: "Vertex neck-shaft kanan", shortLabel: "CCD-R", side: "right", guideKey: "greater_trochanter_inferior" },
  { key: "neckVertexLeft", label: "Vertex neck-shaft kiri", shortLabel: "CCD-L", side: "left", guideKey: "greater_trochanter_inferior" },
  { key: "axisRightTop", label: "Axis femur kanan proksimal", shortLabel: "AX-R1", side: "right", guideKey: "femoral_cortex_medial" },
  { key: "axisRightBottom", label: "Axis femur kanan distal", shortLabel: "AX-R2", side: "right", guideKey: "femoral_shaft_distal_center" },
  { key: "axisLeftTop", label: "Axis femur kiri proksimal", shortLabel: "AX-L1", side: "left", guideKey: "femoral_cortex_medial" },
  { key: "axisLeftBottom", label: "Axis femur kiri distal", shortLabel: "AX-L2", side: "left", guideKey: "femoral_shaft_distal_center" },
  { key: "ltRight", label: "Lesser trochanter kanan", shortLabel: "LT-R", side: "right", guideKey: "lesser_trochanter" },
  { key: "ltLeft", label: "Lesser trochanter kiri", shortLabel: "LT-L", side: "left", guideKey: "lesser_trochanter" },
  { key: "medialWallRight", label: "Medial wall acetabulum kanan", shortLabel: "MW-R", side: "right", guideKey: "acetabular_inferomedial_rim" },
  { key: "medialWallLeft", label: "Medial wall acetabulum kiri", shortLabel: "MW-L", side: "left", guideKey: "acetabular_inferomedial_rim" },
];

function pointMap(points) {
  return Object.fromEntries(
    PELVIC_ANALYSIS_LANDMARKS.map((definition, index) => [definition.key, points[index]]),
  );
}

function projectPointToLine(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!Number.isFinite(lengthSquared) || lengthSquared < 1e-6) return null;
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function projectToParallelReference(point, reference, baselineStart, baselineEnd) {
  const dx = baselineEnd.x - baselineStart.x;
  const dy = baselineEnd.y - baselineStart.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 1e-3) return null;
  const ux = dx / length;
  const uy = dy / length;
  const distance = (reference.x - point.x) * ux + (reference.y - point.y) * uy;
  return { x: point.x + distance * ux, y: point.y + distance * uy };
}

function buildLldComparisonLine(rightPoint, leftPoint, baselineStart, baselineEnd) {
  const dx = baselineEnd.x - baselineStart.x;
  const dy = baselineEnd.y - baselineStart.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 1e-3) return null;
  const nx = -dy / length;
  const ny = dx / length;
  const signedDistance = (point) =>
    (point.x - baselineStart.x) * nx + (point.y - baselineStart.y) * ny;
  const center = {
    x: (baselineStart.x + baselineEnd.x) / 2,
    y: (baselineStart.y + baselineEnd.y) / 2,
  };
  const rightDistance = signedDistance(rightPoint);
  const leftDistance = signedDistance(leftPoint);
  return {
    start: { x: center.x + nx * rightDistance, y: center.y + ny * rightDistance },
    end: { x: center.x + nx * leftDistance, y: center.y + ny * leftDistance },
  };
}

function makeLine(start, end, input) {
  if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 1) return null;
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...input };
}

export function buildPelvicAnalysisLines(points, analysisId = `pelvic-${Date.now()}`) {
  if (!Array.isArray(points) || points.length < PELVIC_ANALYSIS_LANDMARKS.length) return [];
  const p = pointMap(points);
  const rightHipFoot = projectPointToLine(p.ltRight, p.tdRight, p.tdLeft);
  const leftHipFoot = projectPointToLine(p.ltLeft, p.tdRight, p.tdLeft);
  const rightFemoralFoot = projectPointToLine(p.hrcRight, p.axisRightTop, p.axisRightBottom);
  const leftFemoralFoot = projectPointToLine(p.hrcLeft, p.axisLeftTop, p.axisLeftBottom);
  const rightAcetabularFoot = projectToParallelReference(p.hrcRight, p.medialWallRight, p.tdRight, p.tdLeft);
  const leftAcetabularFoot = projectToParallelReference(p.hrcLeft, p.medialWallLeft, p.tdRight, p.tdLeft);
  const lldComparison = buildLldComparisonLine(p.ltRight, p.ltLeft, p.tdRight, p.tdLeft);

  return [
    makeLine(p.tdRight, p.tdLeft, { type: "interteardrop", name: "Interteardrop Line", metric: "ITD", side: "bilateral" }),
    makeLine(p.axisRightTop, p.axisRightBottom, { type: "femurAxis", name: "Femoral Axis R", metric: "Femoral Axis R", side: "right" }),
    makeLine(p.axisLeftTop, p.axisLeftBottom, { type: "femurAxis", name: "Femoral Axis L", metric: "Femoral Axis L", side: "left" }),
    makeLine(p.ltRight, rightHipFoot, { type: "hipLength", name: "Hip Length R", metric: "Hip Length R", side: "right" }),
    makeLine(p.ltLeft, leftHipFoot, { type: "hipLength", name: "Hip Length L", metric: "Hip Length L", side: "left" }),
    makeLine(lldComparison?.start, lldComparison?.end, { type: "lld", name: "Limb Length Discrepancy", metric: "LLD", side: "bilateral" }),
    makeLine(p.hrcRight, rightFemoralFoot, { type: "femoralOffset", name: "Femoral Offset R", metric: "FO R", side: "right" }),
    makeLine(p.hrcLeft, leftFemoralFoot, { type: "femoralOffset", name: "Femoral Offset L", metric: "FO L", side: "left" }),
    makeLine(p.hrcRight, rightAcetabularFoot, { type: "acetabularOffset", name: "Acetabular Offset R", metric: "AO R", side: "right" }),
    makeLine(p.hrcLeft, leftAcetabularFoot, { type: "acetabularOffset", name: "Acetabular Offset L", metric: "AO L", side: "left" }),
  ].filter(Boolean).map((line) => ({ ...line, pelvicAnalysisId: analysisId }));
}

export function buildPelvicAnalysisMeasurements(points, analysisId = `pelvic-${Date.now()}`) {
  if (!Array.isArray(points) || points.length < PELVIC_ANALYSIS_LANDMARKS.length) {
    return { lines: [], angles: [], circles: [] };
  }
  const p = pointMap(points);
  const makeAngle = (side, center, vertex, shaft) => ({
    side,
    metric: `CCD ${side === "right" ? "R" : "L"}`,
    name: `CCD ${side === "right" ? "kanan" : "kiri"}`,
    p1: center,
    p2: vertex,
    p3: shaft,
    pelvicAnalysisId: analysisId,
  });
  const makeHeadCircle = (side, center, edge) => ({
    side,
    metric: `FHD ${side === "right" ? "R" : "L"}`,
    name: `Diameter Head ${side === "right" ? "kanan" : "kiri"}`,
    cx: center.x,
    cy: center.y,
    radius: Math.hypot(edge.x - center.x, edge.y - center.y),
    points: [center, edge],
    source: "pelvicAnalysis",
    pelvicAnalysisId: analysisId,
  });

  return {
    lines: buildPelvicAnalysisLines(points, analysisId),
    angles: [
      makeAngle("right", p.hrcRight, p.neckVertexRight, p.axisRightBottom),
      makeAngle("left", p.hrcLeft, p.neckVertexLeft, p.axisLeftBottom),
    ],
    circles: [
      makeHeadCircle("right", p.hrcRight, p.headEdgeRight),
      makeHeadCircle("left", p.hrcLeft, p.headEdgeLeft),
    ].filter((circle) => Number.isFinite(circle.radius) && circle.radius >= 3),
  };
}
