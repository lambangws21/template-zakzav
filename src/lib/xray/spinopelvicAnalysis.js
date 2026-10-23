// Spinopelvic mobility — pelvic tilt from standing vs. sitting lateral films.
//
// Pelvic Tilt (PT) definition follows Legaye & Duval-Beaupère: the angle
// between the vertical and the line joining the midpoint of the S1 sacral
// endplate to the bicoxofemoral axis (center of the femoral heads, which
// superimpose into one point on a true lateral). Two landmarks per film is
// the full requirement — no acetabular/femoral landmarks needed, unlike the
// AP pelvic analysis in ./pelvicAnalysis.js.
//
// Mobility classification (Normal / Stiff / Hypermobile) follows the
// standing-to-sitting ΔPT thresholds reported in Stefl et al., "Spinopelvic
// mobility and acetabular component position for total hip arthroplasty",
// Bone Joint J. 2017. Those thresholds (10°/30°) are the well-established
// headline figures; this module intentionally stops there and does not
// attempt the finer "stuck standing" vs "stuck sitting" sub-stratification,
// which needs sacral-slope cutoffs beyond what's safe to hardcode without a
// clinician validating them against this app's own landmark conventions.
//
// Sign convention caveat: PT here is signed by which way the sacral-endplate
// point sits relative to the hip axis *in image space*, so it is only
// comparable between the standing and sitting shot when both lateral films
// are captured/oriented the same way (patient facing the same screen side in
// both). That matches how a single-session sit-to-stand pair is normally
// acquired, but isn't a physics-level anterior/posterior guarantee.

export const SPINOPELVIC_LANDMARKS = [
  {
    key: "bicoxofemoralCenter",
    label: "Pusat bikoksofemoral (kedua caput femur superimposed)",
    shortLabel: "BFC",
  },
  {
    key: "sacralEndplateMidpoint",
    label: "Titik tengah endplate superior S1",
    shortLabel: "S1-MP",
  },
];

export const SPINOPELVIC_MOBILITY_THRESHOLDS = {
  stiffMaxDeltaPT: 10,
  hypermobileMinDeltaPT: 30,
};

export const SPINOPELVIC_CLASSIFICATION_LABELS = {
  stiff: "Stiff — ΔPT di bawah ambang (risiko impingement/dislokasi tergantung arah)",
  normal: "Normal mobility",
  hypermobile: "Hypermobile — ΔPT di atas ambang (pertimbangkan cup lebih permisif)",
};

/**
 * Pelvic tilt in degrees from vertical for one lateral film. Returns null
 * if either landmark is missing.
 */
export function computePelvicTilt({ bicoxofemoralCenter, sacralEndplateMidpoint } = {}) {
  if (!bicoxofemoralCenter || !sacralEndplateMidpoint) return null;
  const dx = sacralEndplateMidpoint.x - bicoxofemoralCenter.x;
  const dy = sacralEndplateMidpoint.y - bicoxofemoralCenter.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  // atan2(dx, -dy): 0° when S1 midpoint sits directly above the hip axis
  // (image y grows downward, so "straight up" is -dy); sign flips with
  // whichever side the sacral point leans toward.
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/**
 * Standing-to-sitting mobility classification per Stefl et al. 2017.
 * Returns null if either angle is missing.
 */
export function classifySpinopelvicMobility({ standingPT, sittingPT } = {}) {
  if (!Number.isFinite(standingPT) || !Number.isFinite(sittingPT)) return null;
  const deltaPT = standingPT - sittingPT;
  const absDeltaPT = Math.abs(deltaPT);
  const classification =
    absDeltaPT > SPINOPELVIC_MOBILITY_THRESHOLDS.hypermobileMinDeltaPT
      ? "hypermobile"
      : absDeltaPT < SPINOPELVIC_MOBILITY_THRESHOLDS.stiffMaxDeltaPT
        ? "stiff"
        : "normal";
  return {
    standingPT,
    sittingPT,
    deltaPT,
    absDeltaPT,
    classification,
    label: SPINOPELVIC_CLASSIFICATION_LABELS[classification],
  };
}

/**
 * Convenience end-to-end helper: four landmarks in, full result out.
 */
export function analyzeSpinopelvicMobility({ standing, sitting } = {}) {
  const standingPT = computePelvicTilt(standing || {});
  const sittingPT = computePelvicTilt(sitting || {});
  if (standingPT === null || sittingPT === null) {
    return { standingPT, sittingPT, deltaPT: null, absDeltaPT: null, classification: null, label: null };
  }
  return classifySpinopelvicMobility({ standingPT, sittingPT });
}
