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
