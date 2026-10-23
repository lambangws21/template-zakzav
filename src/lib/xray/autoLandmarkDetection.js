// Classical computer-vision assist for femoral head auto-detection on AP
// pelvis X-rays. No trained model, no dataset — a Sobel edge map feeds a
// gradient-direction Hough circle transform, the same technique used in
// published femoral-head-localization papers (e.g. Hough Circle Transform
// on hip radiographs). This is a *refinement* tool, not blind whole-image
// detection: the surgeon clicks roughly on the femoral head first, and this
// snaps that seed to the most likely precise center + edge within a small
// search window around it — the "click-assist" pattern real templating
// tools use, which is far more reliable (and safer to ship) than hoping a
// single-shot detector finds the right circle somewhere in the whole film.
//
// Pure pixel-array functions — no canvas/DOM dependency — so this is
// directly unit-testable with synthetic pixel data (see
// tests/autoLandmarkDetection.test.cjs) and callable from any canvas layer
// in the app (HKA-style canvas, or XrayCalibrationWorkspace's own).

/** RGBA Uint8ClampedArray -> Float32Array luminance (ITU-R BT.601 weights). */
export function toGrayscale(data, width, height) {
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i += 1, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return gray;
}

/** Sobel gradient magnitude + direction (radians) over a grayscale buffer. */
export function sobelGradient(gray, width, height) {
  const magnitude = new Float32Array(width * height);
  const angle = new Float32Array(width * height);
  const at = (x, y) => gray[y * width + x];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const idx = y * width + x;
      magnitude[idx] = Math.hypot(gx, gy);
      angle[idx] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, angle };
}

/**
 * Gradient-direction Hough circle transform. Each strong edge pixel votes
 * along its gradient line (both polarities, since we don't know whether the
 * circle is brighter-inside or darker-inside) at every candidate radius; the
 * (cx, cy, r) accumulator cell with the highest circumference-normalized
 * vote count wins.
 *
 * Operates on a plain Float32Array grayscale buffer so it's testable with
 * synthetic data with no canvas involved.
 */
export function houghDetectCircle(
  gray,
  width,
  height,
  // radiusStep defaults to 1, not a coarser value: skipping radii means the
  // true radius can be skipped outright when it has different parity from
  // minRadius, leaving only smeared (weaker, less precise) neighboring-radius
  // peaks to compete with pure noise. Raise it only if profiling shows this
  // is a bottleneck, and re-check accuracy on real films if you do.
  { minRadius, maxRadius, radiusStep = 1, edgeThresholdPercentile = 0.85 } = {}
) {
  if (!Number.isFinite(minRadius) || !Number.isFinite(maxRadius) || minRadius <= 0 || maxRadius < minRadius) {
    throw new Error("houghDetectCircle requires 0 < minRadius <= maxRadius");
  }
  const { magnitude, angle } = sobelGradient(gray, width, height);

  const sorted = Array.from(magnitude).filter((m) => m > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const threshold = sorted[Math.floor(sorted.length * edgeThresholdPercentile)] || 0;

  const edgePixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (magnitude[idx] >= threshold && magnitude[idx] > 0) {
        edgePixels.push({ x, y, theta: angle[idx] });
      }
    }
  }
  if (edgePixels.length === 0) return null;

  // A true circle's edge pixels each vote for a center that lands *near*
  // (true_cx, true_cy), not exactly on it — floating-point angles round
  // differently pixel to pixel, so naive integer-pixel binning scatters
  // what should be one strong peak across several neighboring cells, and
  // the "peak" ends up a tiny fraction of the votes cast. Binning into
  // coarser cells (BIN_SIZE px) lets those near-misses accumulate together;
  // centroiding the *unrounded* votes that fell into the winning bin then
  // recovers sub-pixel precision instead of settling for the bin's corner.
  const BIN_SIZE = 3;
  const binCols = Math.ceil(width / BIN_SIZE);

  let best = null;
  for (let r = minRadius; r <= maxRadius; r += radiusStep) {
    const acc = new Map(); // key -> { count, sumX, sumY } of unrounded vote positions

    const castVote = (vx, vy) => {
      if (vx < 0 || vy < 0 || vx >= width || vy >= height) return;
      const binX = Math.floor(vx / BIN_SIZE);
      const binY = Math.floor(vy / BIN_SIZE);
      const key = binY * binCols + binX;
      const cell = acc.get(key);
      if (cell) {
        cell.count += 1;
        cell.sumX += vx;
        cell.sumY += vy;
      } else {
        acc.set(key, { count: 1, sumX: vx, sumY: vy });
      }
    };

    for (const p of edgePixels) {
      const dx = r * Math.cos(p.theta);
      const dy = r * Math.sin(p.theta);
      castVote(p.x - dx, p.y - dy);
      castVote(p.x + dx, p.y + dy);
    }

    let peak = null;
    for (const cell of acc.values()) {
      if (!peak || cell.count > peak.count) peak = cell;
    }
    if (!peak) continue;

    // Fraction of all votes cast at this radius that agree on this one
    // location — bounded in [0, 1], and comparable across radii, unlike a
    // circumference-normalized count which rewards small radii for free.
    const totalVotes = edgePixels.length * 2;
    const score = peak.count / totalVotes;
    if (!best || score > best.score) {
      best = {
        center: { x: peak.sumX / peak.count, y: peak.sumY / peak.count },
        radius: r,
        score,
        votes: peak.count,
      };
    }
  }

  return best;
}

/**
 * Crops a square ROI around `seed` sized by `searchRadiusPx`, runs the Hough
 * circle transform inside it, and maps the result back to full-image
 * coordinates. Returns null if no confident circle is found.
 *
 * `imageLike` is anything shaped like ImageData: { data, width, height }.
 */
export function refineFemoralHeadCircle(
  imageLike,
  seed,
  // minScore is a fraction of all votes cast at the winning radius (see
  // houghDetectCircle), not a confidence percentage — even a clean
  // noise-free synthetic circle only converges 5-25% of its votes into one
  // bin once pixel-rounding scatter is accounted for, so this floor mainly
  // rejects genuinely featureless regions, not "imperfect" real detections.
  { searchRadiusPx = 90, minRadiusPx = 18, maxRadiusPx = 70, radiusStep = 1, minScore = 0.05 } = {}
) {
  const { data, width: imgWidth, height: imgHeight } = imageLike;
  if (!seed || !Number.isFinite(seed.x) || !Number.isFinite(seed.y)) return null;

  const roiLeft = Math.max(0, Math.round(seed.x - searchRadiusPx));
  const roiTop = Math.max(0, Math.round(seed.y - searchRadiusPx));
  const roiRight = Math.min(imgWidth, Math.round(seed.x + searchRadiusPx));
  const roiBottom = Math.min(imgHeight, Math.round(seed.y + searchRadiusPx));
  const roiWidth = roiRight - roiLeft;
  const roiHeight = roiBottom - roiTop;
  if (roiWidth < minRadiusPx * 2 || roiHeight < minRadiusPx * 2) return null;

  const roiData = new Uint8ClampedArray(roiWidth * roiHeight * 4);
  for (let y = 0; y < roiHeight; y += 1) {
    const srcRowStart = ((roiTop + y) * imgWidth + roiLeft) * 4;
    const dstRowStart = y * roiWidth * 4;
    roiData.set(data.subarray(srcRowStart, srcRowStart + roiWidth * 4), dstRowStart);
  }

  const gray = toGrayscale(roiData, roiWidth, roiHeight);
  const result = houghDetectCircle(gray, roiWidth, roiHeight, {
    minRadius: minRadiusPx,
    maxRadius: Math.min(maxRadiusPx, Math.floor(Math.min(roiWidth, roiHeight) / 2) - 1),
    radiusStep,
  });
  if (!result || result.score < minScore) return null;

  return {
    center: { x: result.center.x + roiLeft, y: result.center.y + roiTop },
    radius: result.radius,
    score: result.score,
  };
}
