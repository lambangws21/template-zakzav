export const PELVIC_ANALYSIS_LANDMARKS = [
  { key: "tdRight", label: "Teardrop kanan", shortLabel: "TD-R", side: "right", guideKey: "teardrop" },
  { key: "tdLeft", label: "Teardrop kiri", shortLabel: "TD-L", side: "left", guideKey: "teardrop" },
  { key: "isRight", label: "Tuber ischii kanan", shortLabel: "IS-R", side: "right", guideKey: "ischial_tuberosity" },
  { key: "isLeft", label: "Tuber ischii kiri", shortLabel: "IS-L", side: "left", guideKey: "ischial_tuberosity" },
  { key: "kiRight", label: "Köhler ilium kanan", shortLabel: "KI-R", side: "right", guideKey: "kohler_ilium_medial_edge" },
  { key: "kiLeft", label: "Köhler ilium kiri", shortLabel: "KI-L", side: "left", guideKey: "kohler_ilium_medial_edge" },
  { key: "ksRight", label: "Köhler ischium kanan", shortLabel: "KS-R", side: "right", guideKey: "kohler_ischium_medial_edge" },
  { key: "ksLeft", label: "Köhler ischium kiri", shortLabel: "KS-L", side: "left", guideKey: "kohler_ischium_medial_edge" },
  { key: "ltRight", label: "Lesser trochanter kanan", shortLabel: "LT-R", side: "right", guideKey: "lesser_trochanter" },
  { key: "ltLeft", label: "Lesser trochanter kiri", shortLabel: "LT-L", side: "left", guideKey: "lesser_trochanter" },
  { key: "gtRight", label: "Puncak greater trochanter kanan", shortLabel: "GT-R", side: "right", guideKey: "greater_trochanter_lateral_tip" },
  { key: "gtLeft", label: "Puncak greater trochanter kiri", shortLabel: "GT-L", side: "left", guideKey: "greater_trochanter_lateral_tip" },
  { key: "hcRight", label: "Pusat femoral head kanan", shortLabel: "HC-R", side: "right", guideKey: "femoral_head_center" },
  { key: "hcLeft", label: "Pusat femoral head kiri", shortLabel: "HC-L", side: "left", guideKey: "femoral_head_center" },
  { key: "headEdgeRight", label: "Tepi korteks femoral head kanan", shortLabel: "FHD-R", side: "right", guideKey: "femoral_head_lateral_edge" },
  { key: "headEdgeLeft", label: "Tepi korteks femoral head kiri", shortLabel: "FHD-L", side: "left", guideKey: "femoral_head_lateral_edge" },
  { key: "alRight", label: "Tepi lateral sourcil kanan", shortLabel: "AL-R", side: "right", guideKey: "acetabular_lateral_rim" },
  { key: "alLeft", label: "Tepi lateral sourcil kiri", shortLabel: "AL-L", side: "left", guideKey: "acetabular_lateral_rim" },
  { key: "amRight", label: "Tepi medial sourcil kanan", shortLabel: "AM-R", side: "right", guideKey: "acetabular_inferomedial_rim" },
  { key: "amLeft", label: "Tepi medial sourcil kiri", shortLabel: "AM-L", side: "left", guideKey: "acetabular_inferomedial_rim" },
  { key: "s1Right", label: "Axis femur kanan proksimal", shortLabel: "S1-R", side: "right", guideKey: "femoral_cortex_medial" },
  { key: "s1Left", label: "Axis femur kiri proksimal", shortLabel: "S1-L", side: "left", guideKey: "femoral_cortex_medial" },
  { key: "s2Right", label: "Axis femur kanan distal", shortLabel: "S2-R", side: "right", guideKey: "femoral_shaft_distal_center" },
  { key: "s2Left", label: "Axis femur kiri distal", shortLabel: "S2-L", side: "left", guideKey: "femoral_shaft_distal_center" },
  { key: "n1Right", label: "Titik tengah neck kanan", shortLabel: "N1-R", side: "right", guideKey: "femoral_neck_midpoint" },
  { key: "n1Left", label: "Titik tengah neck kiri", shortLabel: "N1-L", side: "left", guideKey: "femoral_neck_midpoint" },
];

export const HIP_RESULT_DEFINITIONS = [
  { key: "LLD", label: "Selisih panjang tungkai", color: "#f472b6", lineMetrics: ["ITD", "LLD", "Hip Length R", "Hip Length L"] },
  { key: "Hip Length R", label: "Panjang hip kanan", color: "#f472b6", lineMetrics: ["ITD", "Hip Length R"] },
  { key: "Hip Length L", label: "Panjang hip kiri", color: "#f472b6", lineMetrics: ["ITD", "Hip Length L"] },
  { key: "FO R", label: "Femoral offset kanan", color: "#38bdf8", lineMetrics: ["Femoral Axis R", "FO R"] },
  { key: "FO L", label: "Femoral offset kiri", color: "#38bdf8", lineMetrics: ["Femoral Axis L", "FO L"] },
  { key: "AO R", label: "Acetabular offset kanan", color: "#fbbf24", lineMetrics: ["ITD", "AO R"] },
  { key: "AO L", label: "Acetabular offset kiri", color: "#fbbf24", lineMetrics: ["ITD", "AO L"] },
  { key: "CCD R", label: "Sudut neck-shaft kanan", color: "#a78bfa", lineMetrics: ["Femoral Axis R"], angleMetrics: ["CCD R"] },
  { key: "CCD L", label: "Sudut neck-shaft kiri", color: "#a78bfa", lineMetrics: ["Femoral Axis L"], angleMetrics: ["CCD L"] },
  { key: "FHD R", label: "Diameter head kanan", color: "#fb923c", circleMetrics: ["FHD R"] },
  { key: "FHD L", label: "Diameter head kiri", color: "#fb923c", circleMetrics: ["FHD L"] },
  { key: "COR-V R", label: "Pusat rotasi vertikal kanan", color: "#2dd4bf", lineMetrics: ["ITD", "COR-V R"] },
  { key: "COR-V L", label: "Pusat rotasi vertikal kiri", color: "#2dd4bf", lineMetrics: ["ITD", "COR-V L"] },
  { key: "GT Height R", label: "Tinggi head-trokanter kanan", color: "#84cc16", lineMetrics: ["GT Height R"] },
  { key: "GT Height L", label: "Tinggi head-trokanter kiri", color: "#84cc16", lineMetrics: ["GT Height L"] },
  { key: "CEA R", label: "Center-edge angle kanan", color: "#f87171", angleMetrics: ["CEA R"] },
  { key: "CEA L", label: "Center-edge angle kiri", color: "#f87171", angleMetrics: ["CEA L"] },
];

// Numbered legend for the "Garis pengukuran pra-operasi" overlay. Grouped by
// clinical concept (one row covers both sides), unlike HIP_RESULT_DEFINITIONS
// above which is per-side. `estimable: true` rows get a dynamic "(perkiraan)"
// suffix in the panel when the underlying line/angle for either side carries
// `estimated: true`.
export const HIP_LEGEND_ITEMS = [
  {
    n: 1,
    label: "Garis inter-teardrop",
    color: "#f2c200",
    detail: "Acuan horizontal utama pelvis. Dipakai sebagai bidang nol untuk mengukur inklinasi cup dan sebagai baseline semua jarak vertikal lain (LLD, pusat rotasi).",
  },
  {
    n: 2,
    label: "Garis bi-ischial",
    color: "#22d3ee",
    detail: "Acuan horizontal kedua untuk menyilangkan garis 1 — selisih kemiringan besar berarti salah satu titik teardrop/ischium perlu ditandai ulang sebelum cup diposisikan.",
  },
  {
    n: 3,
    label: "Tinggi trokanter minor (LLD)",
    color: "#f472b6",
    detail: "Selisih tinggi LT kanan-kiri terhadap garis 1 = perkiraan selisih panjang tungkai. Dipakai untuk menentukan target koreksi panjang saat memilih level reseksi neck dan ukuran head/neck implan.",
  },
  {
    n: 4,
    label: "Garis Köhler (ilioischial)",
    color: "#fb923c",
    detail: "Batas medial true acetabulum. Jika dasar asetabulum melewati garis ini (protrusio), cup berisiko medialisasi berlebih — pertimbangkan ukuran cup lebih kecil atau graft medial.",
  },
  {
    n: 5,
    label: "Garis Shenton",
    color: "#4ade80",
    detail: "Kontinuitas lengkung ramus pubis ke neck medial. Garis yang terputus menandakan subluksasi/dislokasi — reduksi harus dikoreksi dulu sebelum posisi cup dinilai dari foto ini.",
  },
  {
    n: 6,
    label: "Sumbu anatomis femur",
    color: "#e5e7eb",
    detail: "Sumbu shaft femur (S1-S2), diperpanjang agar terlihat jelas sampai titik jatuh Femoral Offset. Acuan untuk CCD dan untuk menyelaraskan sumbu stem terhadap kanal saat templating.",
  },
  {
    n: 7,
    label: "Pusat rotasi",
    color: "#2dd4bf",
    estimable: true,
    metricPrefix: "COR-V",
    detail: "Posisi pusat kepala femur (HC) relatif terhadap garis 1, dengan garis putus-putus pembanding HC kanan-kiri. Target cup idealnya memulihkan pusat rotasi ini sedekat mungkin ke posisi anatomis.",
  },
  {
    n: 8,
    label: "Offset femoral",
    color: "#38bdf8",
    estimable: true,
    metricPrefix: "FO",
    detail: "Jarak HC ke sumbu femur. Dipakai bersama offset cup/stem untuk menjaga tension soft tissue dan mencegah impingement setelah implan terpasang.",
  },
  {
    n: 9,
    label: "Sudut Center-Edge (CE)",
    color: "#f87171",
    estimable: true,
    metricPrefix: "CEA",
    detail: "Sudut antara garis vertikal melalui HC dan garis HC-AL (tepi lateral sourcil). Normal sekitar 25°-40°; kurang dari 20° mengindikasikan displasia asetabulum dan coverage cup yang kurang.",
  },
];

// Several hip lines/angle/circle converge on HC (femoral offset, acetabular
// offset, COR-vertical, CCD, FHD) and would otherwise stack their labels on
// top of each other. Fan them out in distinct screen-pixel directions;
// mirrored horizontally for the left hip so both sides spread symmetrically
// regardless of which side of the image each hip falls on.
const HIP_LABEL_OFFSET_BY_TYPE = {
  femoralOffset: { x: -45, y: -45 },
  acetabularOffset: { x: 0, y: -62 },
  corVertical: { x: 46, y: -45 },
  kohler: { x: -40, y: 26 },
  shenton: { x: 0, y: 46 },
};
const HIP_LABEL_OFFSET_BY_METRIC_PREFIX = {
  CCD: { x: 0, y: 42 },
  FHD: { x: 55, y: 10 },
  CEA: { x: -105, y: -10 },
};

export function getHipLineLabelOffset(type, side) {
  const base = HIP_LABEL_OFFSET_BY_TYPE[type];
  if (!base) return null;
  return side === "left" ? { x: -base.x, y: base.y } : { ...base };
}

export function getHipMetricLabelOffset(metric, side) {
  const prefix = Object.keys(HIP_LABEL_OFFSET_BY_METRIC_PREFIX).find((key) => metric?.startsWith(key));
  if (!prefix) return null;
  const base = HIP_LABEL_OFFSET_BY_METRIC_PREFIX[prefix];
  return side === "left" ? { x: -base.x, y: base.y } : { ...base };
}

export function isHipResultMeasurementRelevant(item, resultKey, kind) {
  const definition = HIP_RESULT_DEFINITIONS.find((entry) => entry.key === resultKey);
  if (!definition) return false;
  const metrics = kind === "angle"
    ? definition.angleMetrics
    : kind === "circle"
      ? definition.circleMetrics
      : definition.lineMetrics;
  return Boolean(metrics?.includes(item?.metric));
}

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

function projectPointToParallelLineThroughPoint(point, through, baselineStart, baselineEnd) {
  const dx = baselineEnd.x - baselineStart.x;
  const dy = baselineEnd.y - baselineStart.y;
  return projectPointToLine(point, through, { x: through.x + dx, y: through.y + dy });
}

// A point `length` away from `origin`, along whichever of the two
// directions perpendicular to (baselineStart -> baselineEnd) points toward
// smaller image-Y (superior, i.e. "up" on an AP pelvis film) — used for
// angle constructions that need a reliable "straight up from this point"
// reference, independent of exactly where `origin` sits relative to the
// baseline (projecting onto the baseline itself can flip direction based on
// sub-pixel position, which a fixed direction choice avoids).
function getUpwardPerpendicularPoint(origin, baselineStart, baselineEnd, length) {
  const dx = baselineEnd.x - baselineStart.x;
  const dy = baselineEnd.y - baselineStart.y;
  const baseLength = Math.hypot(dx, dy);
  if (!Number.isFinite(baseLength) || baseLength < 1e-3) return null;
  const ux = dx / baseLength;
  const uy = dy / baseLength;
  const candidateA = { x: -uy, y: ux };
  const candidateB = { x: uy, y: -ux };
  const upward = candidateA.y < candidateB.y ? candidateA : candidateB;
  return { x: origin.x + upward.x * length, y: origin.y + upward.y * length };
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

// Infinite-line intersection (no segment-bounding), kept local and separate
// from src/lib/xray/snapUtils.js's getSegmentIntersectionPoint on purpose:
// that shared helper backs the global lineIntersectionAngleOverlays feature
// (auto-detects angles between *all* visible canvas line pairs), which
// intentionally requires segments to actually cross within their drawn
// extent. CCD's neck axis (HC-N1) and shaft axis (S1-S2) segments generally
// don't cross within their own extents, only when extended, so relaxing the
// shared helper would make that unrelated global feature noisy.
function getInfiniteLineIntersection(aStart, aEnd, bStart, bEnd) {
  const x1 = aStart.x, y1 = aStart.y, x2 = aEnd.x, y2 = aEnd.y;
  const x3 = bStart.x, y3 = bStart.y, x4 = bEnd.x, y4 = bEnd.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-6) return null;
  const determinantA = x1 * y2 - y1 * x2;
  const determinantB = x3 * y4 - y3 * x4;
  const px = (determinantA * (x3 - x4) - (x1 - x2) * determinantB) / denominator;
  const py = (determinantA * (y3 - y4) - (y1 - y2) * determinantB) / denominator;
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  return { x: px, y: py };
}

function makeLine(start, end, input) {
  if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 1) return null;
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...input };
}

// A landmark click can be flagged "samar" (uncertain) while tagging — see
// the "Tandai titik samar" control in the Pelvic Mechanical Analysis tool.
// Anything derived from an uncertain point inherits `estimated: true`, which
// XrayCalibrationWorkspace.js renders as a red dashed line/circle with a
// "?" label suffix instead of failing silently or looking fully reliable.
function isEstimated(point) {
  return point?.confidence === "samar";
}

function anyEstimated(...points) {
  return points.some((point) => isEstimated(point));
}

export function buildPelvicAnalysisLines(points, analysisId = `pelvic-${Date.now()}`) {
  if (!Array.isArray(points) || points.length < PELVIC_ANALYSIS_LANDMARKS.length) return [];
  const p = pointMap(points);
  const rightHipFoot = projectPointToLine(p.ltRight, p.tdRight, p.tdLeft);
  const leftHipFoot = projectPointToLine(p.ltLeft, p.tdRight, p.tdLeft);
  const rightFemoralFoot = projectPointToLine(p.hcRight, p.s1Right, p.s2Right);
  const leftFemoralFoot = projectPointToLine(p.hcLeft, p.s1Left, p.s2Left);
  const rightAcetabularFoot = projectToParallelReference(p.hcRight, p.tdRight, p.tdRight, p.tdLeft);
  const leftAcetabularFoot = projectToParallelReference(p.hcLeft, p.tdLeft, p.tdRight, p.tdLeft);
  const lldComparison = buildLldComparisonLine(p.ltRight, p.ltLeft, p.tdRight, p.tdLeft);
  const rightCorVFoot = projectPointToLine(p.hcRight, p.tdRight, p.tdLeft);
  const leftCorVFoot = projectPointToLine(p.hcLeft, p.tdRight, p.tdLeft);
  const rightGtHeightFoot = projectPointToParallelLineThroughPoint(p.gtRight, p.hcRight, p.tdRight, p.tdLeft);
  const leftGtHeightFoot = projectPointToParallelLineThroughPoint(p.gtLeft, p.hcLeft, p.tdRight, p.tdLeft);

  return [
    makeLine(p.tdRight, p.tdLeft, { type: "interteardrop", name: "ITD", metric: "ITD", side: "bilateral", color: "#f2c200", estimated: anyEstimated(p.tdRight, p.tdLeft) }),
    makeLine(p.isRight, p.isLeft, { type: "biischial", name: "Bi-ischial", metric: "Bi-ischial", side: "bilateral", color: "#22d3ee", estimated: anyEstimated(p.isRight, p.isLeft) }),
    makeLine(p.kiRight, p.ksRight, { type: "kohler", name: "Köhler R", metric: "Köhler R", side: "right", color: "#fb923c", estimated: anyEstimated(p.kiRight, p.ksRight) }),
    makeLine(p.kiLeft, p.ksLeft, { type: "kohler", name: "Köhler L", metric: "Köhler L", side: "left", color: "#fb923c", estimated: anyEstimated(p.kiLeft, p.ksLeft) }),
    // Shenton is illustrative only (no pubic-ramus landmark to anchor it
    // precisely) — default hidden, shown on demand via the toggle next to
    // the utuh/putus buttons in the hip correction panel.
    makeLine(p.amRight, p.n1Right, { type: "shenton", name: "Shenton R", metric: "Shenton R", side: "right", color: "#4ade80", hidden: true, estimated: anyEstimated(p.amRight, p.n1Right) }),
    makeLine(p.amLeft, p.n1Left, { type: "shenton", name: "Shenton L", metric: "Shenton L", side: "left", color: "#4ade80", hidden: true, estimated: anyEstimated(p.amLeft, p.n1Left) }),
    // visualExtend: drawn past S1/S2 so the axis reads as a full femoral
    // shaft line long enough to visibly carry the Femoral Offset foot point.
    makeLine(p.s1Right, p.s2Right, { type: "femurAxis", name: "Femur Axis R", metric: "Femoral Axis R", side: "right", color: "#e5e7eb", visualExtend: 0.4, estimated: anyEstimated(p.s1Right, p.s2Right) }),
    makeLine(p.s1Left, p.s2Left, { type: "femurAxis", name: "Femur Axis L", metric: "Femoral Axis L", side: "left", color: "#e5e7eb", visualExtend: 0.4, estimated: anyEstimated(p.s1Left, p.s2Left) }),
    // Connects the two femoral head centers — every other bilateral pair
    // (TD, IS) already has a comparison line; HC didn't.
    makeLine(p.hcRight, p.hcLeft, { type: "hcComparison", name: "HC Comparison", metric: "HC Comparison", side: "bilateral", color: "#2dd4bf", estimated: anyEstimated(p.hcRight, p.hcLeft) }),
    makeLine(p.ltRight, rightHipFoot, { type: "hipLength", name: "Hip Length R", metric: "Hip Length R", side: "right", visualExtend: 0.35, estimated: anyEstimated(p.ltRight, p.tdRight, p.tdLeft) }),
    makeLine(p.ltLeft, leftHipFoot, { type: "hipLength", name: "Hip Length L", metric: "Hip Length L", side: "left", visualExtend: 0.35, estimated: anyEstimated(p.ltLeft, p.tdRight, p.tdLeft) }),
    makeLine(lldComparison?.start, lldComparison?.end, { type: "lld", name: "LLD", metric: "LLD", side: "bilateral", visualExtend: 0.35, estimated: anyEstimated(p.ltRight, p.ltLeft, p.tdRight, p.tdLeft) }),
    makeLine(p.hcRight, rightFemoralFoot, { type: "femoralOffset", name: "FO R", metric: "FO R", side: "right", estimated: anyEstimated(p.hcRight, p.s1Right, p.s2Right) }),
    makeLine(p.hcLeft, leftFemoralFoot, { type: "femoralOffset", name: "FO L", metric: "FO L", side: "left", estimated: anyEstimated(p.hcLeft, p.s1Left, p.s2Left) }),
    makeLine(p.hcRight, rightAcetabularFoot, { type: "acetabularOffset", name: "AO R", metric: "AO R", side: "right", estimated: anyEstimated(p.hcRight, p.tdRight, p.tdLeft) }),
    makeLine(p.hcLeft, leftAcetabularFoot, { type: "acetabularOffset", name: "AO L", metric: "AO L", side: "left", estimated: anyEstimated(p.hcLeft, p.tdRight, p.tdLeft) }),
    makeLine(p.hcRight, rightCorVFoot, { type: "corVertical", name: "COR-V R", metric: "COR-V R", side: "right", estimated: anyEstimated(p.hcRight, p.tdRight, p.tdLeft) }),
    makeLine(p.hcLeft, leftCorVFoot, { type: "corVertical", name: "COR-V L", metric: "COR-V L", side: "left", estimated: anyEstimated(p.hcLeft, p.tdRight, p.tdLeft) }),
    makeLine(p.gtRight, rightGtHeightFoot, { type: "gtHeight", name: "GT Height R", metric: "GT Height R", side: "right", estimated: anyEstimated(p.gtRight, p.hcRight, p.tdRight, p.tdLeft) }),
    makeLine(p.gtLeft, leftGtHeightFoot, { type: "gtHeight", name: "GT Height L", metric: "GT Height L", side: "left", estimated: anyEstimated(p.gtLeft, p.hcLeft, p.tdRight, p.tdLeft) }),
  ].filter(Boolean).map((line) => ({ ...line, pelvicAnalysisId: analysisId }));
}

export function buildPelvicAnalysisMeasurements(points, analysisId = `pelvic-${Date.now()}`) {
  if (!Array.isArray(points) || points.length < PELVIC_ANALYSIS_LANDMARKS.length) {
    return { lines: [], angles: [], circles: [] };
  }
  const p = pointMap(points);
  // CCD = angle between line(HC,N1) and the femoral axis line(S1,S2). These
  // two lines don't share an endpoint, so the angle is only well-defined by
  // vertexing it at their (possibly off-canvas) infinite-line intersection.
  // p1/p3 are hardcoded to HC/S2 (not picked dynamically) because
  // XrayCalibrationWorkspace.js's createAutoNeckCutLine reads ccdAngle.p1 as
  // the head center to auto-place the neck-osteotomy cut line.
  const makeCcdAngle = (side, hc, n1, s1, s2) => {
    const vertex = getInfiniteLineIntersection(hc, n1, s1, s2);
    if (!vertex) return null;
    return {
      side,
      metric: `CCD ${side === "right" ? "R" : "L"}`,
      name: `CCD ${side === "right" ? "kanan" : "kiri"}`,
      p1: hc,
      p2: vertex,
      p3: s2,
      estimated: anyEstimated(hc, n1, s1, s2),
      pelvicAnalysisId: analysisId,
    };
  };
  // Center-edge angle (Wiberg): angle between a vertical ray from HC (always
  // pointing superiorly — smaller image-Y — regardless of which side of the
  // inter-teardrop line HC happens to sit on) and the ray from HC to AL
  // (lateral sourcil edge). Using the ITD perpendicular's *projection foot*
  // directly was wrong: when HC sits fractionally below vs. above that line,
  // the foot flips to the opposite side, silently swapping the acute angle
  // for its ~180°-complement. A fixed-direction "always up" ray avoids that.
  const makeCeaAngle = (side, hc, al, tdRight, tdLeft) => {
    const verticalPoint = getUpwardPerpendicularPoint(
      hc,
      tdRight,
      tdLeft,
      Math.max(40, Math.hypot(al.x - hc.x, al.y - hc.y) * 1.3),
    );
    if (!verticalPoint) return null;
    return {
      side,
      metric: `CEA ${side === "right" ? "R" : "L"}`,
      name: `CEA ${side === "right" ? "kanan" : "kiri"}`,
      p1: verticalPoint,
      p2: hc,
      p3: al,
      estimated: anyEstimated(hc, al, p.tdRight, p.tdLeft),
      pelvicAnalysisId: analysisId,
    };
  };
  const makeHeadCircle = (side, center, edge) => ({
    side,
    metric: `FHD ${side === "right" ? "R" : "L"}`,
    name: `Diameter Head ${side === "right" ? "kanan" : "kiri"}`,
    cx: center.x,
    cy: center.y,
    radius: Math.hypot(edge.x - center.x, edge.y - center.y),
    points: [center, edge],
    source: "pelvicAnalysis",
    estimated: anyEstimated(center, edge),
    pelvicAnalysisId: analysisId,
  });

  return {
    lines: buildPelvicAnalysisLines(points, analysisId),
    angles: [
      makeCcdAngle("right", p.hcRight, p.n1Right, p.s1Right, p.s2Right),
      makeCcdAngle("left", p.hcLeft, p.n1Left, p.s1Left, p.s2Left),
      makeCeaAngle("right", p.hcRight, p.alRight, p.tdRight, p.tdLeft),
      makeCeaAngle("left", p.hcLeft, p.alLeft, p.tdRight, p.tdLeft),
    ].filter(Boolean),
    circles: [
      makeHeadCircle("right", p.hcRight, p.headEdgeRight),
      makeHeadCircle("left", p.hcLeft, p.headEdgeLeft),
    ].filter((circle) => Number.isFinite(circle.radius) && circle.radius >= 3),
  };
}
