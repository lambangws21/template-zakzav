export function createPlanningSession() {
  return { step: 0, side: null, bindings: {}, initial: null, completedSteps: [] };
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
  ],
  hip: [
    ["LLD", "mm", "Selisih absolut Hip Length kanan dan kiri. Hip Length adalah jarak tegak lurus lesser trochanter ke interteardrop line."],
    ["FO L", "mm", "Jarak tegak lurus pusat femoral head kiri ke anatomical axis femur kiri."],
    ["FO R", "mm", "Jarak tegak lurus pusat femoral head kanan ke anatomical axis femur kanan."],
    ["CCD L", "deg", "Sudut neck-shaft kiri dari tiga titik: pusat head, vertex neck-shaft, dan pusat shaft distal."],
    ["CCD R", "deg", "Sudut neck-shaft kanan dari tiga titik: pusat head, vertex neck-shaft, dan pusat shaft distal."],
    ["FHD L", "mm", "Diameter femoral head kiri dari titik pusat ke tepi korteks."],
    ["FHD R", "mm", "Diameter femoral head kanan dari titik pusat ke tepi korteks."],
    ["Cup Inclination", "deg", "Inklinasi cup"],
    ["Cup Anteversion", "deg", "Anteversi cup"],
  ],
};

// Only explicitly assigned or identified measurements enter the clinical log.
export function resolvePlanningRows(procedure, session, measurements) {
  return PLANNING_METRICS[procedure].map(([key, unit, detail]) => {
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
