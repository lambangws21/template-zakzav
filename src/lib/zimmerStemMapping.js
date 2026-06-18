import stemCatalog from "../data/zimmer_ml_taper_complete_with_reduced_neck.json";

export const HEAD_NECK_OPTIONS = ["-3.5", "+0", "+3.5", "+7", "+10.5"];

export const BASELINE_SELECTION = {
  stemSizeMm: 10,
  offsetType: "standard",
  neckVariant: "normal",
  headNeck: "+0",
};

const VISUAL_CONFIG = {
  pxPerMm: 2.1,

  // B stem length is visualized mostly on the horizontal axis.
  bodyLengthScaleFactor: 1,

  // A stem size is visualized as a vertical body thickness change.
  bodyThicknessScalePerMm: 0.018,

  // Neck/offset visual sensitivity.
  neckLengthToXFactor: 0.35,
  neckLengthToYFactor: 0.75,
  offsetToXFactor: 0.9,

  // Keeps the animation readable without claiming true engineering geometry.
  extendedRotationDeg: 2.5,
  reducedRotationDeg: -1.5,
};

export function getAllStemItems() {
  return stemCatalog.items || [];
}

export function getAvailableStemSizes(offsetType, neckVariant) {
  const sizes = getAllStemItems()
    .filter((item) => item.offsetType === offsetType && item.neckVariant === neckVariant)
    .map((item) => item.stemSizeMm);

  return Array.from(new Set(sizes)).sort((a, b) => a - b);
}

export function findStemItem({ stemSizeMm, offsetType, neckVariant, productNo }) {
  const items = getAllStemItems();

  if (productNo) {
    const byProductNo = items.find((item) => item.productNo === productNo);
    if (byProductNo) return byProductNo;
  }

  return (
    items.find(
      (item) =>
        Number(item.stemSizeMm) === Number(stemSizeMm) &&
        item.offsetType === offsetType &&
        item.neckVariant === neckVariant
    ) || null
  );
}

export function getBaselineItem() {
  return findStemItem(BASELINE_SELECTION);
}

export function getStemMetrics(item, headNeck) {
  if (!item) return null;

  return {
    productNo: item.productNo,
    haTcpProductNo: item.haTcpProductNo,
    stemSizeMm: item.stemSizeMm,
    stemLengthMm: item.stemLengthMm,
    offsetType: item.offsetType,
    neckVariant: item.neckVariant,
    headNeck,
    neckLengthMm: item.neckLengthMm?.[headNeck],
    stemOffsetMm: item.stemOffsetMm?.[headNeck],
  };
}

function round(value, decimals = 3) {
  return Number(Number(value).toFixed(decimals));
}

/**
 * Mapping nilai katalog ke animasi SVG.
 *
 * Penting:
 * Ini adalah visual parametric model untuk UI/education.
 * Ini bukan CAD/geometri resmi 1:1 dari manufacturer.
 */
export function buildStemVisualMapping(selection) {
  const item = findStemItem(selection);
  const baselineItem = getBaselineItem();

  if (!item || !baselineItem) {
    return null;
  }

  const headNeck = selection.headNeck || "+0";
  const current = getStemMetrics(item, headNeck);
  const baseline = getStemMetrics(baselineItem, BASELINE_SELECTION.headNeck);

  if (current.neckLengthMm == null || baseline.neckLengthMm == null) return null;
  if (current.stemOffsetMm == null || baseline.stemOffsetMm == null) return null;

  const stemLengthDeltaMm = current.stemLengthMm - baseline.stemLengthMm;
  const stemSizeDeltaMm = current.stemSizeMm - baseline.stemSizeMm;
  const neckLengthDeltaMm = current.neckLengthMm - baseline.neckLengthMm;
  const stemOffsetDeltaMm = current.stemOffsetMm - baseline.stemOffsetMm;

  const pxPerMm = VISUAL_CONFIG.pxPerMm;

  const bodyScaleX =
    1 +
    ((current.stemLengthMm / baseline.stemLengthMm - 1) *
      VISUAL_CONFIG.bodyLengthScaleFactor);

  const bodyScaleY = 1 + stemSizeDeltaMm * VISUAL_CONFIG.bodyThicknessScalePerMm;

  const stemLengthTranslateX = stemLengthDeltaMm * pxPerMm * 0.85;
  const offsetTranslateX = stemOffsetDeltaMm * pxPerMm * VISUAL_CONFIG.offsetToXFactor;
  const neckLengthTranslateX = neckLengthDeltaMm * pxPerMm * VISUAL_CONFIG.neckLengthToXFactor;
  const neckLengthTranslateY = -neckLengthDeltaMm * pxPerMm * VISUAL_CONFIG.neckLengthToYFactor;

  const neckX = stemLengthTranslateX + offsetTranslateX + neckLengthTranslateX;
  const neckY = neckLengthTranslateY;

  const neckRotate =
    item.offsetType === "extended"
      ? VISUAL_CONFIG.extendedRotationDeg
      : item.neckVariant === "reduced"
        ? VISUAL_CONFIG.reducedRotationDeg
        : 0;

  return {
    current,
    baseline,
    deltas: {
      stemLengthDeltaMm: round(stemLengthDeltaMm),
      stemSizeDeltaMm: round(stemSizeDeltaMm),
      neckLengthDeltaMm: round(neckLengthDeltaMm),
      stemOffsetDeltaMm: round(stemOffsetDeltaMm),
    },
    visual: {
      bodyScaleX: round(bodyScaleX, 4),
      bodyScaleY: round(bodyScaleY, 4),
      neckX: round(neckX, 2),
      neckY: round(neckY, 2),
      neckRotate: round(neckRotate, 2),
    },
  };
}

export function getNearestStemByCanalMm(measuredCanalMm, offsetType = "standard", neckVariant = "normal") {
  const candidates = getAllStemItems().filter(
    (item) => item.offsetType === offsetType && item.neckVariant === neckVariant
  );

  if (!candidates.length) return null;

  return candidates
    .map((item) => ({
      ...item,
      differenceMm: Math.abs(Number(item.stemSizeMm) - Number(measuredCanalMm)),
    }))
    .sort((a, b) => a.differenceMm - b.differenceMm)[0];
}
