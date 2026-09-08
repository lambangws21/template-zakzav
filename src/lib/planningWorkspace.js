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
    ["LLD", "mm", "Limb length discrepancy"],
    ["FO L", "mm", "Femoral offset kiri"],
    ["FO R", "mm", "Femoral offset kanan"],
    ["CCD L", "deg", "Neck-shaft angle kiri"],
    ["CCD R", "deg", "Neck-shaft angle kanan"],
    ["FHD L", "mm", "Femoral head diameter kiri"],
    ["FHD R", "mm", "Femoral head diameter kanan"],
    ["Cup Inclination", "deg", "Inklinasi cup"],
    ["Cup Anteversion", "deg", "Anteversi cup"],
  ],
};

// Only explicitly assigned or identified measurements enter the clinical log.
export function resolvePlanningRows(procedure, session, measurements) {
  return PLANNING_METRICS[procedure].map(([key, unit, detail]) => {
    const binding = session.bindings?.[key];
    const source = binding
      ? measurements.find((item) => item.id === binding && item.unit === unit)
      : measurements.find((item) => item.metric === key && item.unit === unit &&
          (!item.side || item.side === session.side));
    return {
      key, unit, detail, sourceId: source?.id || "",
      value: Number.isFinite(source?.value) ? source.value : null,
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
