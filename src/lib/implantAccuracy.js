// Shared classification for "pre-op planned size vs. actual implant size"
// comparisons. Used to be reimplemented independently in PostOpDataModal,
// PreOpReportModal, CaseFullReportModal, CaseCompareModal, and
// TemplatingAnalytics with two different threshold sets (diff===0/<=1 vs.
// <0.25/<=1.25) — the same case could read "Exact Match" in one screen and
// "not exact" in another. This is the single source of truth going forward.
export function classifyImplantAccuracy(diff) {
  if (diff == null || !Number.isFinite(diff)) return null;
  if (diff === 0) return "exact";
  if (Math.abs(diff) <= 1) return "close";
  return "off";
}

export function accuracyToneClasses(diff) {
  const tier = classifyImplantAccuracy(diff);
  if (tier === "exact") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (tier === "close") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (tier === "off") return "bg-red-50 text-red-700 border border-red-200";
  return "";
}

export function accuracyLabel(diff, unit = "") {
  const tier = classifyImplantAccuracy(diff);
  if (tier == null) return "";
  if (tier === "exact") return "Exact Match";
  const sign = diff > 0 ? "+" : "";
  const suffix = unit ? ` ${unit}` : "";
  return `Selisih ${sign}${diff.toFixed(1)}${suffix} — actual ${diff > 0 ? "lebih besar" : "lebih kecil"}`;
}
