// Post-TKA Radiographic Alignment Calculator
// References:
//   Parratte et al. (2010) J Bone Joint Surg Am — alignment & 15-yr survival
//   Ritter et al. (2011) Clin Orthop Relat Res — coronal alignment outcomes
//   Berend et al. (2004) Clin Orthop Relat Res — tibial component alignment
//   Bellemans et al. (2012) Clin Orthop Relat Res — PCO & flexion gap
//
// AP weight-bearing X-ray:
//   MDFA = Mechanical Distal Femoral Angle: angle between femoral mechanical
//          axis (femHead→kneeCenter, reversed = upward) and femoral condyle
//          line (condyleMedial→condyleLateral). Normal post-TKA: 85–95°.
//   MPTA = Medial Proximal Tibial Angle: angle between tibial mechanical axis
//          (ankle→knee, upward) and tibial plateau line (lateral→medial).
//          Normal post-TKA: 85–90°.
//   MDFA+MPTA combined: acceptable ≤185°; deviation >3° each = poor outcome risk.
//
// Lateral X-ray:
//   PCO ratio = Posterior Condylar Offset / Total AP dimension.
//   PCO = dist from posterior cortex to posterior condyle tip (along AP axis).
//   Total AP = dist from anterior cortex to posterior condyle tip (along AP axis).
//   Normal: 0.44–0.47. Low = flexion gap tight; high = potential impingement.

const DEG = 180 / Math.PI;

function normalize(v) {
  const m = Math.hypot(v.x, v.y);
  if (!m) return null;
  return { x: v.x / m, y: v.y / m };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function angleDeg(v1, v2) {
  const u1 = normalize(v1);
  const u2 = normalize(v2);
  if (!u1 || !u2) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))) * DEG;
}

const r1 = (v) => Math.round(v * 10) / 10;

// ── AP view ────────────────────────────────────────────────────────────────────

export function computeTKAAlignment({
  femHead,
  kneeCenter,
  ankleCenter,
  condyleMedial,
  condyleLateral,
  plateauMedial,
  plateauLateral,
}) {
  if (
    !femHead || !kneeCenter || !ankleCenter ||
    !condyleMedial || !condyleLateral ||
    !plateauMedial || !plateauLateral
  ) return null;

  // Femoral mechanical axis (upward = knee→head direction)
  const vFemUp = { x: femHead.x - kneeCenter.x, y: femHead.y - kneeCenter.y };
  // Femoral condyle line: medial → lateral (outward).
  // Results: < 90° = varus (medial lower), > 90° = valgus (lateral lower).
  const vCondyle = { x: condyleLateral.x - condyleMedial.x, y: condyleLateral.y - condyleMedial.y };
  const MDFA = angleDeg(vFemUp, vCondyle);

  // Tibial mechanical axis (upward = ankle→knee direction)
  const vTibUp = { x: kneeCenter.x - ankleCenter.x, y: kneeCenter.y - ankleCenter.y };
  // Tibial plateau line: medial → lateral (same outward convention as condyle).
  // Results: < 90° = varus (medial lower), > 90° = valgus (lateral lower). Consistent with MDFA.
  const vPlateau = { x: plateauLateral.x - plateauMedial.x, y: plateauLateral.y - plateauMedial.y };
  const MPTA = angleDeg(vTibUp, vPlateau);

  if (MDFA === null || MPTA === null) return null;

  const MDFA_r = r1(MDFA);
  const MPTA_r = r1(MPTA);
  const combined = r1(MDFA_r + MPTA_r);

  // Both MDFA and MPTA now share the same convention:
  //   < 90° = varus component   (medial side lower / undercorrected)
  //   > 90° = valgus component  (lateral side lower / overcorrected)
  // Post-TKA target: 90° (perpendicular cut). Acceptable range: 85–95°.
  const mdfaFlag = MDFA_r < 85 ? "low" : MDFA_r > 95 ? "high" : "normal";
  const mptaFlag = MPTA_r < 85 ? "low" : MPTA_r > 95 ? "high" : "normal";
  const combinedFlag = combined > 185 ? "high" : combined < 175 ? "low" : "normal";

  // Signed deviation from 90° for each component
  const mdfaDev = r1(MDFA_r - 90);
  const mptaDev = r1(MPTA_r - 90);

  const mdfaText =
    mdfaFlag === "normal"
      ? `MDFA ${MDFA_r}° (target 90°, deviasi ${mdfaDev > 0 ? "+" : ""}${mdfaDev}°). Komponen femoral tegak lurus terhadap sumbu mekanik.`
      : mdfaFlag === "low"
      ? `MDFA ${MDFA_r}° < 85° — komponen femoral varus (deviasi ${mdfaDev}°). Risiko kegagalan dan nyeri sisi medial jangka panjang.`
      : `MDFA ${MDFA_r}° > 95° — komponen femoral valgus (deviasi +${mdfaDev}°). Evaluasi rotasi dan posisi komponen.`;

  const mptaText =
    mptaFlag === "normal"
      ? `MPTA ${MPTA_r}° (target 90°, deviasi ${mptaDev > 0 ? "+" : ""}${mptaDev}°). Komponen tibial tegak lurus terhadap sumbu mekanik.`
      : mptaFlag === "low"
      ? `MPTA ${MPTA_r}° < 85° — komponen tibial varus (deviasi ${mptaDev}°). Distribusi beban asimetris sisi medial, risiko loosening awal.`
      : `MPTA ${MPTA_r}° > 95° — komponen tibial valgus (deviasi +${mptaDev}°). Evaluasi positioning tibial intraoperatif.`;

  const combinedText =
    combinedFlag === "normal"
      ? `Total MDFA+MPTA = ${combined}° (175–185°). Alignment koronal keseluruhan dalam batas akseptabel.`
      : combinedFlag === "high"
      ? `Total MDFA+MPTA = ${combined}° > 185°. Combined valgus — tekanan meningkat sisi lateral, potensi polietilen asimetris.`
      : `Total MDFA+MPTA = ${combined}° < 175°. Combined varus — tekanan meningkat sisi medial, risiko loosening awal.`;

  return {
    MDFA: MDFA_r,
    MPTA: MPTA_r,
    combined,
    mdfaDev,
    mptaDev,
    mdfaFlag,
    mptaFlag,
    combinedFlag,
    mdfaText,
    mptaText,
    combinedText,
  };
}

// ── Lateral view ───────────────────────────────────────────────────────────────

// Tibial posterior slope (lateral view).
// Normal post-TKA: 3–7°. < 3° = too flat; > 7° = too steep; anterior slope = abnormal.
// Ref: Kumar et al. 2014; most PS designs target 3–5°, CR designs 5–7°.
export function computeTibialSlope({ tibShaftTop, tibShaftBot, slopePlateauAnt, slopePlateauPost }) {
  if (!tibShaftTop || !tibShaftBot || !slopePlateauAnt || !slopePlateauPost) return null;

  // Tibial shaft direction (upward: from tibShaftBot → tibShaftTop)
  const vShaft = { x: tibShaftTop.x - tibShaftBot.x, y: tibShaftTop.y - tibShaftBot.y };
  const shaftLen = Math.hypot(vShaft.x, vShaft.y);
  if (shaftLen < 1) return null;
  const shU = { x: vShaft.x / shaftLen, y: vShaft.y / shaftLen };

  // Reference perpendicular to shaft (equivalent to "horizontal" relative to tibia)
  const perpToShaft = { x: -shU.y, y: shU.x };

  // Tibial plateau vector (anterior → posterior)
  const vPlateau = { x: slopePlateauPost.x - slopePlateauAnt.x, y: slopePlateauPost.y - slopePlateauAnt.y };

  // Angle between plateau line and the shaft perpendicular = slope angle
  let angle = angleDeg(perpToShaft, vPlateau);
  if (angle > 90) angle = 180 - angle;
  const slope = r1(angle);

  // Determine direction via cross product (z-component):
  // For standard lateral with y-down: upward shaft → shU.y < 0.
  // Posterior slope: vPlateau.y > 0 (post side is lower). Cross = shU.x*vP.y - shU.y*vP.x < 0.
  const cross = shU.x * vPlateau.y - shU.y * vPlateau.x;
  const isPosterior = cross < 0;

  const slopeFlag = !isPosterior ? "high"
                  : slope < 3   ? "low"
                  : slope > 7   ? "high"
                  : "normal";

  const dir = isPosterior ? "posterior" : "anterior";
  const slopeText = !isPosterior
    ? `Anterior slope ${slope}° — abnormal. Anterior slope menyebabkan ketegangan ligamen kolateral dan penurunan ROM fleksi.`
    : slopeFlag === "normal"
    ? `Posterior slope ${slope}° (normal 3–7°). Kemiringan komponen tibial optimal — stabilitas fleksi baik.`
    : slopeFlag === "low"
    ? `Posterior slope ${slope}° < 3° — kemiringan tibial kurang. Dapat meningkatkan ketegangan fleksi dan mengurangi ROM.`
    : `Posterior slope ${slope}° > 7° — kemiringan berlebih. Risiko instabilitas fleksi dan loosening anterior komponen tibial.`;

  return { slope, isPosterior, dir, slopeFlag, slopeText };
}

// Insall–Salvati ratio (lateral view).
// LP = panjang patela (superior ke inferior pole).
// LT = panjang tendon patela (inferior pole ke tuberositas tibia).
// Normal: 0.8–1.2. < 0.8 = patela baja; > 1.2 = patela alta.
// Ref: Rogers et al. 2006 JBJS Br; Kumar et al. 2014.
export function computeInsallSalvati({ patellaSup, patellaInf, tibTuberosity }) {
  if (!patellaSup || !patellaInf || !tibTuberosity) return null;

  const LP = Math.hypot(patellaInf.x - patellaSup.x, patellaInf.y - patellaSup.y);
  const LT = Math.hypot(tibTuberosity.x - patellaInf.x, tibTuberosity.y - patellaInf.y);
  if (LP < 1 || LT < 1) return null;

  const ratio = Math.round((LP / LT) * 100) / 100;

  const isFlag = ratio < 0.8 ? "low" : ratio > 1.2 ? "high" : "normal";

  const isText = isFlag === "normal"
    ? `Insall-Salvati ${ratio.toFixed(2)} (normal 0.8–1.2). Tinggi patela dalam kisaran normal — tidak ada patela baja atau alta.`
    : isFlag === "low"
    ? `Insall-Salvati ${ratio.toFixed(2)} < 0.8 — patela baja. Dapat mempengaruhi kinematika patellofemoral, evaluasi pemendekan tendon patela vs joint line elevation.`
    : `Insall-Salvati ${ratio.toFixed(2)} > 1.2 — patela alta. Evaluasi risiko subluksasi dan instabilitas patellofemoral.`;

  return { ratio, LP, LT, isFlag, isText };
}

// Skyline/Merchant view assessment (opsional).
// Patellar Tilt: angle between patellar transverse axis (PM→PL) and posterior condylar line (TM→TL).
//   Normal: < 20°. ≥ 20° = significant lateral/medial tilt. Ref: Merchant 1974; Kumar 2014.
// Sulcus Angle: angle at trochlear groove (TM–SG–TL). Normal ≤144°. >150° = trochlear dysplasia.
//   Ref: Merchant 1974; Dejour trochlear dysplasia classification.
export function computeSkylineAssessment({ skyPatMed, skyPatLat, skyCondMed, skyCondLat, skyGroove }) {
  let patellarTilt = null, tiltFlag = null, tiltText = null;
  let sulcusAngle  = null, sulcusFlag = null, sulcusText = null;

  if (skyPatMed && skyPatLat && skyCondMed && skyCondLat) {
    const vPat  = { x: skyPatLat.x  - skyPatMed.x,  y: skyPatLat.y  - skyPatMed.y  };
    const vCond = { x: skyCondLat.x - skyCondMed.x, y: skyCondLat.y - skyCondMed.y };
    let angle = angleDeg(vPat, vCond);
    if (angle !== null) {
      if (angle > 90) angle = 180 - angle;
      patellarTilt = r1(angle);
      const condLen = Math.hypot(vCond.x, vCond.y);
      const condU = { x: vCond.x / condLen, y: vCond.y / condLen };
      const cross = condU.x * vPat.y - condU.y * vPat.x;
      const isLateralTilt = cross > 0;
      tiltFlag = patellarTilt >= 20 ? "high" : "normal";
      tiltText = patellarTilt < 20
        ? `Patellar tilt ${patellarTilt}° (normal <20°). Orientasi patela normal — tidak ada kemiringan signifikan terhadap garis kondil.`
        : `Patellar tilt ${patellarTilt}° ≥ 20° — kemiringan ${isLateralTilt ? "lateral" : "medial"} signifikan. Evaluasi lateral release dan balancing patellofemoral. Risiko nyeri dan subluksasi patellofemoral.`;
    }
  }

  if (skyCondMed && skyGroove && skyCondLat) {
    const vGM = { x: skyCondMed.x - skyGroove.x, y: skyCondMed.y - skyGroove.y };
    const vGL = { x: skyCondLat.x - skyGroove.x, y: skyCondLat.y - skyGroove.y };
    const sa = angleDeg(vGM, vGL);
    if (sa !== null) {
      sulcusAngle = r1(sa);
      sulcusFlag  = sulcusAngle > 144 ? "high" : "normal";
      sulcusText  = sulcusFlag === "normal"
        ? `Sulkus angle ${sulcusAngle}° (normal ≤144°). Trochlear groove terbentuk baik — risiko subluksasi patela rendah.`
        : sulcusAngle <= 150
        ? `Sulkus angle ${sulcusAngle}° (144–150°) — borderline shallow trochlear groove. Monitor patellar tracking secara klinis.`
        : `Sulkus angle ${sulcusAngle}° >150° — trochlear dysplasia. Groove dangkal secara signifikan; risiko instabilitas patellofemoral meningkat.`;
    }
  }

  if (patellarTilt === null && sulcusAngle === null) return null;
  return { patellarTilt, tiltFlag, tiltText, sulcusAngle, sulcusFlag, sulcusText };
}

export function computePCO({ anteriorCortex, posteriorCortex, posteriorCondyle }) {
  if (!anteriorCortex || !posteriorCortex || !posteriorCondyle) return null;

  // AP axis direction (from anterior toward posterior cortex)
  const vAP = {
    x: posteriorCortex.x - anteriorCortex.x,
    y: posteriorCortex.y - anteriorCortex.y,
  };
  const apLen = Math.hypot(vAP.x, vAP.y);
  if (apLen < 1) return null;

  const apUnit = { x: vAP.x / apLen, y: vAP.y / apLen };

  // Project posteriorCondyle onto AP axis from anteriorCortex
  const vCond = {
    x: posteriorCondyle.x - anteriorCortex.x,
    y: posteriorCondyle.y - anteriorCortex.y,
  };
  const projCondyle = dot(vCond, apUnit); // total AP distance (A → condyle tip)
  const projCortex = apLen;               // A → posterior cortex

  // PCO = condyle extension beyond cortex along the AP axis
  const pco = projCondyle - projCortex;
  const totalAP = projCondyle;

  // totalAP must be positive (condyle must be beyond anterior cortex)
  if (totalAP <= 0) return null;

  const ratio = pco > 0 ? Math.round((pco / totalAP) * 1000) / 1000 : 0;

  // pco <= 0 means condyle didn't project past posterior cortex — likely misplaced KP or CP
  const misplaced = pco <= 0;

  // Normal target post-TKA: 0.47 (Bellemans et al. 2002; Kumar et al. 2014).
  // Reduced PCO (<0.40) → loose flexion space, flexion instability, paradoxical roll-forward.
  // Elevated PCO (>0.60) → potential posterior impingement.
  const pcoFlag = misplaced ? "low" : ratio < 0.40 ? "low" : ratio > 0.60 ? "high" : "normal";

  const pcoText = misplaced
    ? `PCO tidak terdeteksi — kemungkinan titik kurang tepat. Pastikan: KA di ujung anterior korteks femur, KP di korteks posterior shaft (bukan kondil), CP di ujung paling posterior kondil. Coba geser titik KP lebih ke depan atau CP lebih ke belakang.`
    : pcoFlag === "normal"
    ? `PCO ratio ${ratio.toFixed(2)} (kisaran akseptabel 0.40–0.60, target ideal ≥0.47). Offset kondil posterior terpelihara — risiko instabilitas fleksi rendah.`
    : pcoFlag === "low"
    ? `PCO ratio ${ratio.toFixed(2)} < 0.40 — offset kondil posterior berkurang signifikan. Risiko ruang fleksi longgar, instabilitas fleksi, dan paradoxical roll-forward femur pada tibia saat fleksi.`
    : `PCO ratio ${ratio.toFixed(2)} > 0.60 — offset kondil posterior berlebih. Evaluasi kemungkinan posterior impingement dan keterbatasan ekstensi.`;

  return {
    ratio,
    pcoFlag,
    pcoText,
    pcoPx: pco,
    totalAPPx: totalAP,
    misplaced,
  };
}
