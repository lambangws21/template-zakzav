import zimmerData from "../../../docs/zimmer_ml_taper_complete_with_reduced_neck.json";

export const ZIMMER_ML_TAPER = zimmerData;
export const ZIMMER_HEAD_NECK_OPTIONS = zimmerData.headNeckOptions;
export const ZIMMER_OFFSET_TYPES = zimmerData.variants?.offsetType ?? ["standard", "extended"];
export const ZIMMER_NECK_VARIANTS = zimmerData.variants?.neckVariant ?? ["normal", "reduced"];

export function getZimmerStemSizes(offsetType = "standard", neckVariant = "normal") {
  return zimmerData.items
    .filter((item) => item.offsetType === offsetType && item.neckVariant === neckVariant)
    .slice()
    .sort((a, b) => a.stemSizeMm - b.stemSizeMm);
}

// Pick the largest stem that still fits inside the measured canal (no overstuffing).
export function recommendZimmerStem(canalMm, offsetType = "standard", neckVariant = "normal") {
  if (!Number.isFinite(canalMm) || canalMm <= 0) return null;
  const sizes = getZimmerStemSizes(offsetType, neckVariant);
  if (!sizes.length) return null;

  let fit = null;
  for (const item of sizes) {
    if (item.stemSizeMm <= canalMm) fit = item;
  }

  const undersized = !fit; // canal narrower than the smallest available stem
  const item = fit ?? sizes[0];
  const idx = sizes.findIndex((s) => s.stemSizeMm === item.stemSizeMm);
  const previous = idx > 0 ? sizes[idx - 1] : null;
  const nextUp = sizes[idx + 1] ?? null;
  const clearanceMm = Number((canalMm - item.stemSizeMm).toFixed(1));
  const oversized = !undersized && !nextUp && clearanceMm > 1.5;
  const fitStatus = undersized
    ? "below-range"
    : oversized
      ? "above-range"
      : nextUp
        ? "within-range"
        : "largest-available";

  return {
    item,
    previous,
    nextUp,
    sizes,
    canalMm,
    offsetType,
    neckVariant,
    clearanceMm,
    fitStatus,
    undersized,
    oversized,
  };
}
