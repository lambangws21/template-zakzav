// Joint Line Analysis (JLA) Calculator
// Reference: Pratobevera et al., EFORT Open Reviews 2024 (DOI 10.1530/EOR-24-0037)
// "Joint line and knee osteotomy"
//
// Angle conventions (AP weight-bearing long-leg X-ray, image coords y=down):
//   LDFA  = angle(femoralHead–kneeCenter , condyleLateral–condyleMedial)   → lateral side ~87°
//   MPTA  = angle(kneeCenter–ankleCenter , plateauMedial–plateauLateral)   → medial  side ~87°
//   JLCA  = acute angle between condyle line and plateau line               → ~0° normal
//   CPAK JLO = MPTA + LDFA  (neutral = 180° ± 3°)
//   CPAK HKA = MPTA - LDFA  (neutral = 0° ± 2°)
//   JLO_hsu  = 90° - (MPTA + LDFA) / 2   (tilt relative to ground per Hsu et al.)

const DEG = 180 / Math.PI;

function normalize(v) {
  const m = Math.hypot(v.x, v.y);
  if (!m) return null;
  return { x: v.x / m, y: v.y / m };
}

function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y;
}

function angleDeg(v1, v2) {
  const u1 = normalize(v1);
  const u2 = normalize(v2);
  if (!u1 || !u2) return null;
  const c = Math.max(-1, Math.min(1, dotProduct(u1, u2)));
  return Math.acos(c) * DEG;
}

// CPAK classification (MacDessi et al. 2021, Bone & Joint Journal)
// 9 phenotypes: rows = JLO category, cols = HKA category
const CPAK_TYPES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function cpakClassify(hka, cpakJLO) {
  const jloRow = cpakJLO < 177 ? 0 : cpakJLO <= 183 ? 1 : 2;
  const hkaCol = hka < -2 ? 0 : hka <= 2 ? 1 : 2;
  const idx = jloRow * 3 + hkaCol;
  const jloLabels = ['Apex Distal', 'Neutral', 'Apex Proximal'];
  const hkaLabels = ['Varus', 'Neutral', 'Valgus'];
  return {
    type: `CPAK ${CPAK_TYPES[idx]}`,
    jloCategory: jloLabels[jloRow],
    hkaCategory: hkaLabels[hkaCol],
  };
}

export function computeJLA({
  femoralHead,
  kneeCenter,
  ankleCenter,
  femCondyleMedial,
  femCondyleLateral,
  tibPlateauMedial,
  tibPlateauLateral,
}) {
  if (
    !femoralHead || !kneeCenter || !ankleCenter ||
    !femCondyleMedial || !femCondyleLateral ||
    !tibPlateauMedial || !tibPlateauLateral
  ) return null;

  // ── LDFA ──────────────────────────────────────────────────────────────────
  // Lateral angle between femoral mechanical axis (up = head→knee reversed = knee→head)
  // and femoral condyle line (medial→lateral)
  const vFemUp  = { x: femoralHead.x - kneeCenter.x, y: femoralHead.y - kneeCenter.y };
  const vCondyle = { x: femCondyleLateral.x - femCondyleMedial.x, y: femCondyleLateral.y - femCondyleMedial.y };
  const LDFA = angleDeg(vFemUp, vCondyle);

  // ── MPTA ──────────────────────────────────────────────────────────────────
  // Medial angle between tibial mechanical axis (up = ankle→knee reversed = knee→ankle above)
  // and tibial plateau line (medial→lateral reversed = lateral→medial)
  const vTibUp   = { x: kneeCenter.x - ankleCenter.x, y: kneeCenter.y - ankleCenter.y };
  const vPlateau = { x: tibPlateauMedial.x - tibPlateauLateral.x, y: tibPlateauMedial.y - tibPlateauLateral.y };
  const MPTA = angleDeg(vTibUp, vPlateau);

  if (LDFA === null || MPTA === null) return null;

  // ── JLCA ──────────────────────────────────────────────────────────────────
  // Acute angle between condyle tangent line and plateau tangent line
  const uCond = normalize(vCondyle);
  const uPlat = normalize(vPlateau);
  if (!uCond || !uPlat) return null;
  const JLCA = Math.acos(Math.min(1, Math.abs(dotProduct(uCond, uPlat)))) * DEG;

  // ── Derived metrics ───────────────────────────────────────────────────────
  const r = (v) => Math.round(v * 10) / 10;
  const LDFA_r = r(LDFA);
  const MPTA_r = r(MPTA);
  const JLCA_r = r(JLCA);
  const cpakJLO    = r(MPTA_r + LDFA_r);         // MPTA + LDFA  (sum)
  const cpakHKA    = r(MPTA_r - LDFA_r);         // MPTA - LDFA  (difference)
  const jloHsu     = r(90 - (LDFA_r + MPTA_r) / 2); // JLO relative to ground (Hsu et al.)

  // ── CPAK phenotype ────────────────────────────────────────────────────────
  const cpak = cpakClassify(cpakHKA, cpakJLO);

  // ── DLO indication (Sohn et al., via Pratobevera review) ─────────────────
  // Mandatory DLO if: JLCA ≥ 5° AND JLO ≥ 3° → ~80% MPTA>95° post-MOWPTO
  // Consider DLO if predicted MOWPTO would give JLO >5° or MPTA >95°
  let dloRisk, dloText;
  if (jloHsu >= 3 && JLCA_r >= 5) {
    dloRisk = 'high';
    dloText = 'Waspada — DLO sebaiknya dipertimbangkan (JLO≥3° + JLCA≥5°; risiko MPTA>95° post-MOWPTO ≈80%).';
  } else if (jloHsu >= 5) {
    dloRisk = 'moderate';
    dloText = 'Periksa ulang — JLO ≥5° melebihi threshold DLO guidelines. Evaluasi MPTA target post-op.';
  } else if (JLCA_r >= 5) {
    dloRisk = 'moderate';
    dloText = 'Periksa ulang — JLCA ≥5° berisiko overcorrection; terapkan koreksi Micicoi.';
  } else {
    dloRisk = 'low';
    dloText = 'Risiko rendah — single-level osteotomy kemungkinan dapat mempertahankan JLO yang baik.';
  }

  // ── Micicoi overcorrection formula ────────────────────────────────────────
  // Reduce planned correction angle by (JLCA – 2) / 2  when JLCA > 2°
  // Reference: Micicoi et al. 2020, J Exp Orthopaedics
  const micicoiReduction = JLCA_r > 2 ? r((JLCA_r - 2) / 2) : 0;

  // ── Normal range flags ────────────────────────────────────────────────────
  const ldfaFlag  = LDFA_r < 84 ? 'low' : LDFA_r > 90 ? 'high' : 'normal';
  const mptaFlag  = MPTA_r < 84 ? 'low' : MPTA_r > 90 ? 'high' : 'normal';
  const jlcaFlag  = JLCA_r <= 2 ? 'normal' : JLCA_r <= 4 ? 'borderline' : 'high';
  const jloFlag   = Math.abs(jloHsu) <= 3 ? 'normal' : Math.abs(jloHsu) <= 5 ? 'borderline' : 'high';

  return {
    LDFA: LDFA_r,
    MPTA: MPTA_r,
    JLCA: JLCA_r,
    JLO_hsu: jloHsu,
    cpakHKA,
    cpakJLO,
    cpakType:       cpak.type,
    cpakJLOCategory: cpak.jloCategory,
    cpakHKACategory: cpak.hkaCategory,
    dloRisk,
    dloText,
    micicoiReduction,
    ldfaFlag,
    mptaFlag,
    jlcaFlag,
    jloFlag,
  };
}

function dot(point, axis) {
  return point.x * axis.x + point.y * axis.y;
}

const finitePoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);

export function getFemoralImGuide(item) {
  if (![item?.hip, item?.knee, item?.ankle].every(finitePoint)) return null;
  const { hip, knee, ankle } = item;
  const tibLength = Math.hypot(knee.x - ankle.x, knee.y - ankle.y);
  const femLength = Math.hypot(hip.x - knee.x, hip.y - knee.y);
  if (tibLength < 1 || femLength < 1) return null;
  const length = Math.min(tibLength, femLength) * 0.22;
  const confirmed = Boolean(finitePoint(item.femoralImPoint));
  const point = confirmed ? item.femoralImPoint : {
    x: knee.x + (knee.x - ankle.x) / tibLength * length,
    y: knee.y + (knee.y - ankle.y) / tibLength * length,
  };
  const angle = confirmed ? angleDeg({ x: hip.x - knee.x, y: hip.y - knee.y }, { x: point.x - knee.x, y: point.y - knee.y }) : null;
  return { point, confirmed, angle: angle === null ? null : Math.min(angle, 180 - angle) };
}

// Clip the active image rectangle to the bone side of an infinite cut line.
export function clipTkaImageAtCut(width, height, cut, keepPoint) {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width + height) ||
      !finitePoint(cut?.start) || !finitePoint(cut?.end) || !finitePoint(keepPoint)) return null;
  const dx = cut.end.x - cut.start.x;
  const dy = cut.end.y - cut.start.y;
  if (Math.hypot(dx, dy) < 1) return null;
  const side = (p) => dx * (p.y - cut.start.y) - dy * (p.x - cut.start.x);
  const direction = Math.sign(side(keepPoint));
  if (!direction) return null;
  const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const output = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const da = direction * side(a);
    const db = direction * side(b);
    if (da >= 0) output.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      output.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return output.length >= 3 ? output : null;
}

// A short AP knee image cannot measure hip/ankle centers. These reference rays
// are explicitly estimated from shaft landmarks and a user-supplied offset.
export function buildKneeApReference(landmarks, femoralOffsetDeg = 0) {
  if (!landmarks || !Number.isFinite(femoralOffsetDeg) || Math.abs(femoralOffsetDeg) > 15) return null;
  const keys = ["femoralProximal", "femoralDistal", "tibialProximal", "tibialDistal",
    "femCondyleMedial", "femCondyleLateral", "tibPlateauMedial", "tibPlateauLateral"];
  if (keys.some((key) => !finitePoint(landmarks[key]))) return null;
  const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const femoral = normalize(vector(landmarks.femoralDistal, landmarks.femoralProximal));
  const tibial = normalize(vector(landmarks.tibialProximal, landmarks.tibialDistal));
  if (!femoral || !tibial) return null;
  const jointKeys = keys.slice(4);
  const knee = jointKeys.reduce((sum, key) => ({
    x: sum.x + landmarks[key].x / 4,
    y: sum.y + landmarks[key].y / 4,
  }), { x: 0, y: 0 });
  const femoralLength = Math.hypot(landmarks.femoralProximal.x - knee.x, landmarks.femoralProximal.y - knee.y);
  const tibialLength = Math.hypot(landmarks.tibialDistal.x - knee.x, landmarks.tibialDistal.y - knee.y);
  if (femoralLength < 1 || tibialLength < 1) return null;
  const radians = femoralOffsetDeg / DEG;
  const rotated = {
    x: femoral.x * Math.cos(radians) - femoral.y * Math.sin(radians),
    y: femoral.x * Math.sin(radians) + femoral.y * Math.cos(radians),
  };
  return {
    ...landmarks,
    axisReference: "estimated-ap",
    femoralOffsetDeg,
    knee,
    hip: { x: knee.x + rotated.x * femoralLength, y: knee.y + rotated.y * femoralLength },
    ankle: { x: knee.x + tibial.x * tibialLength, y: knee.y + tibial.y * tibialLength },
    anatomicalAxes: {
      femoral: { start: { ...landmarks.femoralProximal }, end: { ...landmarks.femoralDistal } },
      tibial: { start: { ...landmarks.tibialProximal }, end: { ...landmarks.tibialDistal } },
    },
  };
}

export function applyTkaAxisLines(source, lines, shaft = null) {
  if (!source) return null;
  let reference = { ...source };
  const matching = lines.filter((line) => line.tkaSourceId === source.id && line.tkaAxisRole);
  const segment = (role, bone) => {
    const line = [...matching].reverse().find((item) => item.tkaAxisRole === role && item.tkaAxisBone === bone);
    if (!line) return undefined;
    if (![line.x1, line.y1, line.x2, line.y2].every(Number.isFinite) || Math.hypot(line.x2 - line.x1, line.y2 - line.y1) < 1) return null;
    return { start: { x: line.x1, y: line.y1 }, end: { x: line.x2, y: line.y2 } };
  };
  const fa = segment("anatomical", "Femoral");
  const ta = segment("anatomical", "Tibial");
  const fm = segment("mechanical", "Femoral");
  const tm = segment("mechanical", "Tibial");
  if ([fa, ta, fm, tm].some((item) => item === null)) return null;
  if (source.mode === "knee-ap") {
    reference = buildKneeApReference({ ...source,
      ...(fa ? { femoralProximal: fa.start, femoralDistal: fa.end } : {}),
      ...(ta ? { tibialProximal: ta.start, tibialDistal: ta.end } : {}),
    }, source.femoralOffsetDeg ?? 0);
    if (!reference) return null;
  }
  reference.anatomicalAxes = {
    femoral: fa || (finitePoint(source.femoralImPoint) ? { start: source.femoralImPoint, end: source.knee } : null) || reference.anatomicalAxes?.femoral || (shaft ? { start: shaft.femurMidshaft10cm, end: shaft.femoralNotch } : null),
    tibial: ta || reference.anatomicalAxes?.tibial || (shaft ? { start: shaft.tibiaMidshaft4cm, end: shaft.tibiaMidshaft10cm } : null),
  };
  if (fm) { reference.hip = fm.start; reference.knee = fm.end; }
  if (tm && reference.knee) {
    reference.ankle = { x: reference.knee.x + tm.end.x - tm.start.x, y: reference.knee.y + tm.end.y - tm.start.y };
  }
  const anatomical = reference.anatomicalAxes.femoral;
  if (anatomical?.start && anatomical?.end && reference.hip && reference.knee) {
    const angle = angleDeg(
      { x: reference.hip.x - reference.knee.x, y: reference.hip.y - reference.knee.y },
      { x: anatomical.start.x - anatomical.end.x, y: anatomical.start.y - anatomical.end.y },
    );
    reference.femoralValgusAngleDeg = angle === null ? null : Math.min(angle, 180 - angle);
  }
  return reference;
}

export function centerCutOnPoint(cut, point) {
  if (![cut?.start, cut?.end, point].every(finitePoint)) return null;
  const dx = point.x - (cut.start.x + cut.end.x) / 2;
  const dy = point.y - (cut.start.y + cut.end.y) / 2;
  return {
    start: { x: cut.start.x + dx, y: cut.start.y + dy },
    end: { x: cut.end.x + dx, y: cut.end.y + dy },
  };
}

function buildResectionLine(pointA, pointB, axis, depthMm, mmPerPixel) {
  const depthPx = depthMm / mmPerPixel;
  const tangent = { x: -axis.y, y: axis.x };
  const aProjection = dot(pointA, axis);
  const bProjection = dot(pointB, axis);
  const cutProjection = Math.max(aProjection, bProjection) + depthPx;
  const midpoint = {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  };
  const centerShift = cutProjection - dot(midpoint, axis);
  const center = {
    x: midpoint.x + axis.x * centerShift,
    y: midpoint.y + axis.y * centerShift,
  };
  const landmarkWidth = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  const halfLength = Math.max(landmarkWidth * 0.72, 24 / mmPerPixel);

  return {
    start: {
      x: center.x - tangent.x * halfLength,
      y: center.y - tangent.y * halfLength,
    },
    end: {
      x: center.x + tangent.x * halfLength,
      y: center.y + tangent.y * halfLength,
    },
    center,
    depthA: Math.max(0, (cutProjection - aProjection) * mmPerPixel),
    depthB: Math.max(0, (cutProjection - bProjection) * mmPerPixel),
  };
}

/**
 * Creates a geometric TKA resection preview from completed JLA landmarks.
 * The values are planning aids and intentionally remain user-verifiable.
 */
export function computeTkaResectionPlan({
  hka,
  mmPerPixel,
  femoralResectionMm = 9,
  tibialResectionMm = 2,
  alignmentMode = "mechanical",
  customTargetHkaDeg = 0,
}) {
  if (!hka || !Number.isFinite(mmPerPixel) || mmPerPixel <= 0) return null;
  const required = [
    "hip", "knee", "ankle", "femCondyleMedial", "femCondyleLateral",
    "tibPlateauMedial", "tibPlateauLateral",
  ];
  if (required.some((key) => !hka[key])) return null;

  const femoralVector = {
    x: hka.hip.x - hka.knee.x,
    y: hka.hip.y - hka.knee.y,
  };
  const tibialVector = {
    x: hka.ankle.x - hka.knee.x,
    y: hka.ankle.y - hka.knee.y,
  };
  const femoralAxis = normalize(femoralVector);
  const tibialAxis = normalize(tibialVector);
  if (!femoralAxis || !tibialAxis) return null;

  const jla = computeJLA({
    femoralHead: hka.hip,
    kneeCenter: hka.knee,
    ankleCenter: hka.ankle,
    femCondyleMedial: hka.femCondyleMedial,
    femCondyleLateral: hka.femCondyleLateral,
    tibPlateauMedial: hka.tibPlateauMedial,
    tibPlateauLateral: hka.tibPlateauLateral,
  });
  if (!jla) return null;

  const femoral = buildResectionLine(
    hka.femCondyleMedial,
    hka.femCondyleLateral,
    femoralAxis,
    femoralResectionMm,
    mmPerPixel,
  );
  const tibial = buildResectionLine(
    hka.tibPlateauMedial,
    hka.tibPlateauLateral,
    tibialAxis,
    tibialResectionMm,
    mmPerPixel,
  );

  const femurDown = { x: -femoralAxis.x, y: -femoralAxis.y };
  const cross = tibialAxis.x * femurDown.y - tibialAxis.y * femurDown.x;
  const alignmentDot = Math.max(-1, Math.min(1, dot(tibialAxis, femurDown)));
  const signedCorrectionDeg = Math.atan2(cross, alignmentDot) * DEG;
  const normalizedAlignmentMode = ["mechanical", "preserve", "custom"].includes(
    alignmentMode,
  )
    ? alignmentMode
    : "mechanical";
  const targetHkaDeg = normalizedAlignmentMode === "preserve"
    ? jla.cpakHKA
    : normalizedAlignmentMode === "custom"
      ? Math.max(-10, Math.min(10, Number(customTargetHkaDeg) || 0))
      : 0;
  const targetLabel = normalizedAlignmentMode === "preserve"
    ? "Preserve measured anatomy"
    : normalizedAlignmentMode === "custom"
      ? "Custom alignment target"
      : "Mechanical alignment";
  const plannedMetrics = normalizedAlignmentMode === "mechanical"
    ? { "mFA-mTA": 0, mTFA: 0, MAD: 0, mLDFA: 90, mMPTA: 90, JLCA: 0 }
    : normalizedAlignmentMode === "preserve"
      ? {
          "mFA-mTA": jla.cpakHKA,
          mTFA: jla.cpakHKA,
          mLDFA: jla.LDFA,
          mMPTA: jla.MPTA,
          JLCA: jla.JLCA,
        }
      : { "mFA-mTA": targetHkaDeg, mTFA: targetHkaDeg };

  plannedMetrics.mFCL = femoral.depthA;
  plannedMetrics.lFCL = femoral.depthB;
  plannedMetrics.mTCL = tibial.depthA;
  plannedMetrics.lTCL = tibial.depthB;

  return {
    alignmentMode: normalizedAlignmentMode,
    target: `${targetLabel} ${targetHkaDeg.toFixed(1)} deg`,
    targetLabel,
    targetHkaDeg,
    plannedMetrics,
    jla,
    femoral: {
      ...femoral,
      medialMm: Math.round(femoral.depthA * 10) / 10,
      lateralMm: Math.round(femoral.depthB * 10) / 10,
      targetAngleDeg: 90,
    },
    tibial: {
      ...tibial,
      medialMm: Math.round(tibial.depthA * 10) / 10,
      lateralMm: Math.round(tibial.depthB * 10) / 10,
      targetAngleDeg: 90,
    },
    tibialPreviewRotationDeg: Math.max(
      -15,
      Math.min(15, signedCorrectionDeg - targetHkaDeg),
    ),
  };
}

// Intersect the landmark's mechanical-axis ray with the edited cut line.
// Signed depths are retained so a cut outside the bone is not reported as zero.
export function applyTkaCutLines(plan, hka, lines, mmPerPixel) {
  if (!plan || !hka || !(mmPerPixel > 0)) return plan;
  const next = { ...plan, plannedMetrics: { ...plan.plannedMetrics } };
  for (const role of ["femoral", "tibial"]) {
    const line = [...lines].reverse().find(
      (item) => item.tkaSourceId === hka.id && item.tkaCutRole === role,
    );
    if (!line) continue;
    if (![line.x1, line.y1, line.x2, line.y2].every(Number.isFinite)) return null;
    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    const tangent = { x: end.x - start.x, y: end.y - start.y };
    const length = Math.hypot(tangent.x, tangent.y);
    const axisEnd = role === "femoral" ? hka.hip : hka.ankle;
    const axis = normalize({ x: axisEnd.x - hka.knee.x, y: axisEnd.y - hka.knee.y });
    if (!axis || length < 1) return null;
    const denominator = axis.x * tangent.y - axis.y * tangent.x;
    if (Math.abs(denominator) / length < 0.05) return null;
    const depth = (point) => (
      ((start.x - point.x) * tangent.y - (start.y - point.y) * tangent.x) /
      denominator
    ) * mmPerPixel;
    const medial = role === "femoral" ? hka.femCondyleMedial : hka.tibPlateauMedial;
    const lateral = role === "femoral" ? hka.femCondyleLateral : hka.tibPlateauLateral;
    const depthA = depth(medial);
    const depthB = depth(lateral);
    next[role] = {
      ...plan[role], start, end,
      center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      depthA, depthB, medialMm: depthA, lateralMm: depthB, edited: true,
    };
    next.plannedMetrics[role === "femoral" ? "mFCL" : "mTCL"] = depthA;
    next.plannedMetrics[role === "femoral" ? "lFCL" : "lTCL"] = depthB;
  }
  return next;
}

export function estimateTkaMlSize(cut, medial, lateral, mmPerPixel, sizes, useCutSpan = false) {
  if (!cut || !medial || !lateral || !(mmPerPixel > 0) || !sizes.length) return null;
  const dx = cut.end.x - cut.start.x;
  const dy = cut.end.y - cut.start.y;
  const span = Math.hypot(dx, dy);
  if (!Number.isFinite(span) || span < 1) return null;
  // Automatic cut guides extend beyond bone. Do not size implants from that padding.
  const widthMm = (useCutSpan ? span : Math.abs(
    ((lateral.x - medial.x) * dx + (lateral.y - medial.y) * dy) / span,
  )) * mmPerPixel;
  if (!Number.isFinite(widthMm) || widthMm <= 0) return null;
  const nearest = [...sizes].sort((a, b) => Math.abs(a.width - widthMm) - Math.abs(b.width - widthMm))[0];
  return {
    widthMm, size: nearest.size, referenceMm: nearest.width,
    deltaMm: widthMm - nearest.width,
    source: useCutSpan ? "ML garis" : "ML landmark",
    outsideCatalog: widthMm < Math.min(...sizes.map((item) => item.width)) ||
      widthMm > Math.max(...sizes.map((item) => item.width)),
  };
}

export function correctedTkaMechanicalAxes(source, rotationDeg) {
  if (![source?.hip, source?.knee, source?.ankle].every(finitePoint) || !Number.isFinite(rotationDeg)) return [];
  const { hip, knee, ankle } = source;
  const radians = rotationDeg * Math.PI / 180;
  const dx = ankle.x - knee.x;
  const dy = ankle.y - knee.y;
  return [
    { bone: "Femoral", start: { ...hip }, end: { ...knee } },
    { bone: "Tibial", start: { ...knee }, end: {
      x: knee.x + dx * Math.cos(radians) - dy * Math.sin(radians),
      y: knee.y + dx * Math.sin(radians) + dy * Math.cos(radians),
    } },
  ];
}

export function tkaImplantPlacement(cut, role, heightMm, mmPerPixel, pivot, tibialRotationDeg = 0) {
  if (!cut || !["femoral", "tibial"].includes(role) ||
      ![heightMm, mmPerPixel, tibialRotationDeg].every(Number.isFinite) ||
      !(heightMm > 0) || !(mmPerPixel > 0) ||
      !finitePoint(cut.start) || !finitePoint(cut.end) ||
      Math.hypot(cut.end.x - cut.start.x, cut.end.y - cut.start.y) < 1 ||
      (pivot && !finitePoint(pivot))) return null;
  let angle = Math.atan2(cut.end.y - cut.start.y, cut.end.x - cut.start.x);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  const offset = (role === "femoral" ? -1 : 1) * heightMm / mmPerPixel / 2;
  let x = (cut.start.x + cut.end.x) / 2 - Math.sin(angle) * offset;
  let y = (cut.start.y + cut.end.y) / 2 + Math.cos(angle) * offset;
  if (role === "tibial" && pivot) {
    const radians = tibialRotationDeg * Math.PI / 180;
    const dx = x - pivot.x;
    const dy = y - pivot.y;
    x = pivot.x + dx * Math.cos(radians) - dy * Math.sin(radians);
    y = pivot.y + dx * Math.sin(radians) + dy * Math.cos(radians);
    angle += radians;
  }
  return { x, y, rotation: angle * 180 / Math.PI };
}
