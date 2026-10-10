export function createPlanningSession() {
  return { step: 0, side: null, bindings: {}, initial: null, completedSteps: [] };
}

export function measurementPresentation(source) {
  const group = ["tka", "hip", "foot"].includes(source?.landmarkGroup)
    ? source.landmarkGroup : null;
  const kind = String(source?.id || "").split(":")[0];
  const type = kind === "intersection" ? "interline"
    : kind === "tka-plan" ? "guide"
    : kind === "line" ? source?.type === "ruler" ? "ruler" : "line"
    : ["angle", "circle", "guide"].includes(kind) ? kind : "other";
  return { landmarkGroup: group, measurementKind: type };
}

export function getCompletedPlanningSteps(session, setupComplete = false) {
  const completed = new Set(
    Array.isArray(session?.completedSteps)
      ? session.completedSteps.filter((step) => Number.isInteger(step) && step >= 0 && step <= 5)
      : [],
  );
  // Projects saved before completedSteps existed still restore to the right point.
  if (setupComplete) completed.add(0);
  if (session?.initial) completed.add(1);
  return completed;
}

export function completePlanningStep(session, step, nextStep = step + 1) {
  const completed = getCompletedPlanningSteps(session);
  completed.add(step);
  return {
    ...session,
    completedSteps: [...completed].sort((a, b) => a - b),
    step: Math.max(0, Math.min(5, nextStep)),
  };
}

export const PLANNING_METRICS = {
  tka: [
    ["mTFA", "deg", "Mechanical tibiofemoral angle (mFA-mTA)"],
    ["FVA", "deg", "Femoral valgus angle between anatomical and mechanical axes"],
    ["mLPFA", "deg", "Mechanical lateral proximal femoral angle"],
    ["AMA", "deg", "Anatomical-mechanical angle"],
    ["Mikulicz", "mm", "Panjang mechanical axis line"],
    ["MAD", "mm", "Mechanical axis deviation"],
    ["mLDFA", "deg", "Mechanical lateral distal femoral angle"],
    ["JLCA", "deg", "Joint line convergence angle"],
    ["FSA-mTA", "deg", "Femoral shaft axis - mechanical tibial axis"],
    ["mFA-mTA", "deg", "Mechanical femoral axis - mechanical tibial axis"],
    ["mMPTA", "deg", "Mechanical medial proximal tibial angle"],
    ["mLDTA", "deg", "Mechanical lateral distal tibial angle"],
    ["IAA", "deg", "Interline angle"],
    ["mFCL", "mm", "Medial distal femoral cut length"],
    ["lFCL", "mm", "Lateral distal femoral cut length"],
    ["mTCL", "mm", "Medial proximal tibial cut length"],
    ["lTCL", "mm", "Lateral proximal tibial cut length"],
  ],
  hip: [
    ["LLD", "mm", "Selisih absolut Hip Length kanan dan kiri. Hip Length adalah jarak tegak lurus lesser trochanter ke interteardrop line."],
    ["Hip Length L", "mm", "Jarak tegak lurus lesser trochanter kiri ke garis inter-teardrop."],
    ["Hip Length R", "mm", "Jarak tegak lurus lesser trochanter kanan ke garis inter-teardrop."],
    ["FO L", "mm", "Jarak tegak lurus pusat femoral head kiri ke anatomical axis femur kiri."],
    ["FO R", "mm", "Jarak tegak lurus pusat femoral head kanan ke anatomical axis femur kanan."],
    ["AO L", "mm", "Offset asetabular kiri: jarak horizontal pusat femoral head kiri ke teardrop kiri, diukur sejajar garis inter-teardrop."],
    ["AO R", "mm", "Offset asetabular kanan: jarak horizontal pusat femoral head kanan ke teardrop kanan, diukur sejajar garis inter-teardrop."],
    ["COR-V L", "mm", "Pusat rotasi kiri, komponen vertikal: jarak tegak lurus pusat femoral head kiri ke garis inter-teardrop."],
    ["COR-V R", "mm", "Pusat rotasi kanan, komponen vertikal: jarak tegak lurus pusat femoral head kanan ke garis inter-teardrop."],
    ["CCD L", "deg", "Sudut neck-shaft kiri: sudut antara garis pusat head ke titik tengah neck (N1) dan sumbu anatomis femur (S1-S2)."],
    ["CCD R", "deg", "Sudut neck-shaft kanan: sudut antara garis pusat head ke titik tengah neck (N1) dan sumbu anatomis femur (S1-S2)."],
    ["FHD L", "mm", "Diameter femoral head kiri dari titik pusat ke tepi korteks."],
    ["FHD R", "mm", "Diameter femoral head kanan dari titik pusat ke tepi korteks."],
    ["GT Height L", "mm", "Jarak vertikal (tegak lurus garis inter-teardrop) dari pusat femoral head kiri ke puncak greater trochanter kiri."],
    ["GT Height R", "mm", "Jarak vertikal (tegak lurus garis inter-teardrop) dari pusat femoral head kanan ke puncak greater trochanter kanan."],
    ["CEA L", "deg", "Center-edge angle (Wiberg) kiri: sudut antara garis vertikal melalui pusat femoral head kiri dan garis ke tepi lateral sourcil kiri (AL)."],
    ["CEA R", "deg", "Center-edge angle (Wiberg) kanan: sudut antara garis vertikal melalui pusat femoral head kanan dan garis ke tepi lateral sourcil kanan (AL)."],
    ["Cup Inclination", "deg", "Inklinasi cup"],
    ["Cup Anteversion", "deg", "Anteversi cup"],
  ],
  foot: [
    ["HVA", "deg", "Hallux valgus angle antara axis metatarsal I dan proximal phalanx."],
    ["IMA", "deg", "Intermetatarsal angle antara axis metatarsal I dan II."],
    ["DMAA", "deg", "Distal metatarsal articular angle pada metatarsal I."],
    ["HIA", "deg", "Hallux interphalangeal angle antara proximal dan distal phalanx."],
    ["TMT", "deg", "Obliquity sendi tarsometatarsal I terhadap garis tegak lurus axis metatarsal I."],
  ],
};

// Only explicitly assigned or identified measurements enter the clinical log.
export function resolvePlanningRows(procedure, session, measurements) {
  return (PLANNING_METRICS[procedure] || []).map(([key, unit, detail]) => {
    const binding = session.bindings?.[key];
    const hasExplicitMetricSide = /\s[LR]$/.test(key);
    const source = binding
      ? measurements.find((item) => item.id === binding && item.unit === unit)
      : measurements.find((item) => item.metric === key && item.unit === unit &&
          (!item.side || hasExplicitMetricSide || item.side === session.side));
    return {
      key, unit, detail, sourceId: source?.id || "",
      value: Number.isFinite(source?.value) ? source.value : null,
      sourceLineIds: Array.isArray(source?.sourceLineIds) ? source.sourceLineIds : [],
      sourceShowLabel: source?.sourceShowLabel !== false,
      sourceHidden: Boolean(source?.sourceHidden),
      sourceIntersectionKey: source?.sourceIntersectionKey || null,
      sourceAngleId: Number.isFinite(source?.sourceAngleId)
        ? source.sourceAngleId
        : null,
      initial: Number.isFinite(session.initial?.values?.[key])
        ? session.initial.values[key] : null,
    };
  });
}

export function capturePlanningInitial(rows) {
  const values = Object.fromEntries(rows.filter((row) => Number.isFinite(row.value))
    .map((row) => [row.key, row.value]));
  return Object.keys(values).length ? { capturedAt: Date.now(), values } : null;
}

export function formatPlanningValue(value, unit) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}${unit === "deg" ? "\u00b0" : " mm"}`;
}
