const EPSILON = 1e-6;
const HALLUX_ANGLE_LABEL_OFFSETS = {
  HVA: { x: -22, y: -25 },
  IMA: { x: 20, y: 20 },
  DMAA: { x: -22, y: 20 },
  HIA: { x: 20, y: -22 },
  TMT: { x: 22, y: 20 },
};

export const HALLUX_VALGUS_LANDMARKS = [
  {
    key: "m1Proximal",
    label: "Pusat shaft M1 proksimal",
    shortLabel: "M1-P",
  },
  {
    key: "m1Distal",
    label: "Pusat shaft M1 distal",
    shortLabel: "M1-D",
  },
  {
    key: "p1Proximal",
    label: "Pusat falang proksimal (pangkal)",
    shortLabel: "P1-P",
  },
  {
    key: "p1Distal",
    label: "Pusat falang proksimal (ujung)",
    shortLabel: "P1-D",
  },
  {
    key: "m2Proximal",
    label: "Pusat shaft M2 proksimal",
    shortLabel: "M2-P",
  },
  {
    key: "m2Distal",
    label: "Pusat shaft M2 distal",
    shortLabel: "M2-D",
  },
  {
    key: "articularMedial",
    label: "Rim artikular distal M1 medial",
    shortLabel: "DMAA-M",
  },
  {
    key: "articularLateral",
    label: "Rim artikular distal M1 lateral",
    shortLabel: "DMAA-L",
  },
  {
    key: "distalPhalanxProximal",
    label: "Pusat falang distal (pangkal)",
    shortLabel: "DP-P",
  },
  {
    key: "distalPhalanxDistal",
    label: "Pusat falang distal (ujung)",
    shortLabel: "DP-D",
  },
  {
    key: "tmtJointMedial",
    label: "Tepi medial sendi TMT I",
    shortLabel: "TMT Med",
  },
  {
    key: "tmtJointLateral",
    label: "Tepi lateral sendi TMT I",
    shortLabel: "TMT Lat",
  },
];

export const HALLUX_VALGUS_METRICS = {
  HVA: { label: "Hallux Valgus Angle", normal: "≤ 15°", targetDeg: 15, color: "#22d3ee" },
  IMA: { label: "Intermetatarsal Angle", normal: "≤ 9°", targetDeg: 9, color: "#a3e635" },
  DMAA: {
    label: "Distal Metatarsal Articular Angle",
    normal: "≤ 10°",
    targetDeg: 10,
    color: "#fbbf24",
  },
  HIA: {
    label: "Hallux Interphalangeal Angle",
    normal: "≤ 10°",
    targetDeg: 10,
    color: "#f472b6",
  },
  TMT: {
    label: "First TMT Joint Obliquity",
    normal: "Target planning 0°",
    targetDeg: 0,
    color: "#fb923c",
  },
};

export const HALLUX_VALGUS_METRIC_AXES = {
  HVA: ["M1", "P1"],
  IMA: ["M1", "M2"],
  DMAA: ["M1", "DMAA Surface"],
  HIA: ["P1", "DP"],
  TMT: ["M1", "TMT"],
};

export function isHalluxValgusLineRelevant(line, metric) {
  if (!metric) return true;
  if (line.correctionTarget) return line.metric === `${metric} Target`;
  return HALLUX_VALGUS_METRIC_AXES[metric]?.includes(line.metric) || false;
}

function pointMap(points) {
  return Object.fromEntries(
    HALLUX_VALGUS_LANDMARKS.map((definition, index) => [
      definition.key,
      points[index],
    ]),
  );
}

function extendLine(line, before = 0.35, after = 0.35) {
  const direction = normalizedDirection(line.start, line.end);
  if (!direction) return line;
  return {
    start: {
      x: line.start.x - direction.x * direction.length * before,
      y: line.start.y - direction.y * direction.length * before,
    },
    end: {
      x: line.end.x + direction.x * direction.length * after,
      y: line.end.y + direction.y * direction.length * after,
    },
  };
}

function makeLine(start, end, input) {
  if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) < 1) {
    return null;
  }
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...input };
}

function lineIntersection(a1, a2, b1, b2) {
  const adx = a2.x - a1.x;
  const ady = a2.y - a1.y;
  const bdx = b2.x - b1.x;
  const bdy = b2.y - b1.y;
  const denominator = adx * bdy - ady * bdx;
  if (Math.abs(denominator) < EPSILON) return null;
  const ox = b1.x - a1.x;
  const oy = b1.y - a1.y;
  const t = (ox * bdy - oy * bdx) / denominator;
  return { x: a1.x + t * adx, y: a1.y + t * ady };
}

function normalizedDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < EPSILON) return null;
  return { x: dx / length, y: dy / length, length };
}

function makeAcuteAngle(metric, lineA, lineB, analysisId) {
  const intersection = lineIntersection(lineA.start, lineA.end, lineB.start, lineB.end);
  const directionA = normalizedDirection(lineA.start, lineA.end);
  const directionB = normalizedDirection(lineB.start, lineB.end);
  if (!intersection || !directionA || !directionB) return null;

  let bx = directionB.x;
  let by = directionB.y;
  if (directionA.x * bx + directionA.y * by < 0) {
    bx *= -1;
    by *= -1;
  }
  const rayLength = Math.max(
    75,
    Math.min(130, (directionA.length + directionB.length) * 0.32),
  );
  const metadata = HALLUX_VALGUS_METRICS[metric];
  const labelOffset = HALLUX_ANGLE_LABEL_OFFSETS[metric];
  return {
    name: `${metric} · ${metadata.label}`,
    metric,
    p1: {
      x: intersection.x + directionA.x * rayLength,
      y: intersection.y + directionA.y * rayLength,
    },
    p2: intersection,
    p3: {
      x: intersection.x + bx * rayLength,
      y: intersection.y + by * rayLength,
    },
    color: metadata.color,
    strokeWidth: 1.7,
    labelOffsetX: labelOffset.x,
    labelOffsetY: labelOffset.y,
    halluxValgusAnalysisId: analysisId,
    normalRange: metadata.normal,
    normalTargetDeg: metadata.targetDeg,
  };
}

function makeCorrectionTargetLine(metric, lineA, lineB, analysisId) {
  const intersection = lineIntersection(lineA.start, lineA.end, lineB.start, lineB.end);
  const directionA = normalizedDirection(lineA.start, lineA.end);
  const directionB = normalizedDirection(lineB.start, lineB.end);
  const metadata = HALLUX_VALGUS_METRICS[metric];
  if (!intersection || !directionA || !directionB || !metadata) return null;

  let bx = directionB.x;
  let by = directionB.y;
  if (directionA.x * bx + directionA.y * by < 0) {
    bx *= -1;
    by *= -1;
  }
  const signedAngle = Math.atan2(
    directionA.x * by - directionA.y * bx,
    directionA.x * bx + directionA.y * by,
  );
  const targetRadians =
    (Math.sign(signedAngle || 1) * metadata.targetDeg * Math.PI) / 180;
  const targetDirection = {
    x:
      directionA.x * Math.cos(targetRadians) -
      directionA.y * Math.sin(targetRadians),
    y:
      directionA.x * Math.sin(targetRadians) +
      directionA.y * Math.cos(targetRadians),
  };
  const length = Math.max(45, Math.min(150, directionB.length * 1.35));
  return makeLine(
    {
      x: intersection.x - targetDirection.x * length * 0.25,
      y: intersection.y - targetDirection.y * length * 0.25,
    },
    {
      x: intersection.x + targetDirection.x * length,
      y: intersection.y + targetDirection.y * length,
    },
    {
      type: "correction",
      name: `${metric} Free Cut Target ${metadata.targetDeg}°`,
      metric: `${metric} Target`,
      color: metadata.color,
      showLabel: false,
      strokeWidth: 0.5,
      directional: false,
      labelOffsetX: metric === "TMT" ? 18 : 10,
      labelOffsetY:
        metric === "IMA"
          ? -38
          : metric === "DMAA" || metric === "TMT"
            ? 24
            : -24,
      description: `Garis target ${metric} menuju ${metadata.targetDeg}°; gunakan sebagai arah rotasi Free Cut.`,
      correctionTarget: true,
      normalTargetDeg: metadata.targetDeg,
      halluxValgusAnalysisId: analysisId,
    },
  );
}

export function buildHalluxValgusMeasurements(
  points,
  analysisId = `hallux-${Date.now()}`,
) {
  if (!Array.isArray(points) || points.length < HALLUX_VALGUS_LANDMARKS.length) {
    return { lines: [], angles: [] };
  }

  const p = pointMap(points);
  const m1 = { start: p.m1Proximal, end: p.m1Distal };
  const p1 = { start: p.p1Proximal, end: p.p1Distal };
  const m2 = { start: p.m2Proximal, end: p.m2Distal };
  const articular = { start: p.articularMedial, end: p.articularLateral };
  const distalPhalanx = {
    start: p.distalPhalanxProximal,
    end: p.distalPhalanxDistal,
  };
  const tmtJoint = { start: p.tmtJointMedial, end: p.tmtJointLateral };
  const m1Direction = normalizedDirection(m1.start, m1.end);
  const m1Midpoint = {
    x: (m1.start.x + m1.end.x) / 2,
    y: (m1.start.y + m1.end.y) / 2,
  };
  const perpendicular = m1Direction
    ? {
        start: {
          x: m1Midpoint.x - m1Direction.y * 45,
          y: m1Midpoint.y + m1Direction.x * 45,
        },
        end: {
          x: m1Midpoint.x + m1Direction.y * 45,
          y: m1Midpoint.y - m1Direction.x * 45,
        },
      }
    : null;

  const lineDefinitions = [
    [extendLine(m1, 1.2, 1.2), "M1 Axis", "M1", "#84cc16", "Axis tengah metatarsal I; acuan HVA, IMA, dan DMAA."],
    [extendLine(p1, 0.45, 0.7), "Proximal Phalanx Axis", "P1", "#06b6d4", "Axis tengah phalanx proksimal; acuan HVA dan HIA."],
    [extendLine(m2, 0.9, 0.9), "M2 Axis", "M2", "#3b82f6", "Axis tengah metatarsal II; pasangan M1 untuk IMA."],
    [extendLine(articular, 0.35, 0.35), "M1 Distal Articular Surface", "DMAA Surface", "#facc15", "Permukaan artikular distal M1; pasangan garis tegak lurus M1 untuk DMAA."],
    [extendLine(distalPhalanx, 0.3, 0.3), "Distal Phalanx Axis", "DP", "#ec4899", "Axis tengah phalanx distal; pasangan P1 untuk HIA."],
    [extendLine(tmtJoint, 0.5, 0.5), "Metatarsocuneiform I Joint", "TMT", "#f97316", "Orientasi sendi TMT I terhadap garis transversal M1."],
  ];

  const lines = lineDefinitions
    .map(([line, name, metric, color, description]) =>
      makeLine(line.start, line.end, {
        type: "axis",
        name,
        metric,
        color,
        description,
        directional: false,
        showLabel: false,
        strokeWidth: 0.5,
        halluxValgusAnalysisId: analysisId,
      }),
    )
    .filter(Boolean);

  const angleDefinitions = [
    ["HVA", m1, p1],
    ["IMA", m1, m2],
    ["DMAA", perpendicular, articular],
    ["HIA", p1, distalPhalanx],
    ["TMT", perpendicular, tmtJoint],
  ].filter(([, lineA, lineB]) => lineA && lineB);
  const angles = angleDefinitions.map(([metric, lineA, lineB]) =>
    makeAcuteAngle(metric, lineA, lineB, analysisId),
  ).filter(Boolean);
  const correctionLines = angleDefinitions.map(([metric, lineA, lineB]) =>
    makeCorrectionTargetLine(metric, lineA, lineB, analysisId),
  ).filter(Boolean);

  return { lines: [...lines, ...correctionLines], angles };
}
