const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/xray/pelvicAnalysis.js"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports, Math });
const {
  PELVIC_ANALYSIS_LANDMARKS,
  PELVIC_QUICK_LANDMARK_KEYS,
  PELVIC_CONTINUATION_LANDMARK_KEYS,
  PELVIC_ADDABLE_LINES,
  getPelvicLandmarkSet,
  getMissingPelvicLines,
  buildPelvicAnalysisMeasurements,
} = moduleExports;

test("quick + continuation landmark keys together reconstruct the full 26, with no overlap", () => {
  const quickKeys = Array.from(PELVIC_QUICK_LANDMARK_KEYS);
  const continuationKeys = Array.from(PELVIC_CONTINUATION_LANDMARK_KEYS);
  assert.equal(quickKeys.length, 14);
  assert.equal(continuationKeys.length, 12);
  assert.equal(new Set([...quickKeys, ...continuationKeys]).size, 26);
  const fullKeys = Array.from(PELVIC_ANALYSIS_LANDMARKS, (item) => item.key);
  assert.deepEqual([...quickKeys, ...continuationKeys].sort(), [...fullKeys].sort());
});

test("getPelvicLandmarkSet('continuation') returns exactly the 12 non-quick landmarks", () => {
  const continuation = getPelvicLandmarkSet("continuation");
  assert.deepEqual(
    Array.from(continuation, (item) => item.key),
    Array.from(PELVIC_CONTINUATION_LANDMARK_KEYS),
  );
});

test("getPelvicLandmarkSet('quick') returns exactly the 14 essential landmarks, in original order", () => {
  const quick = getPelvicLandmarkSet("quick");
  // .filter()/.map() on a value from the vm sandbox yield a cross-realm
  // Array (different Array.prototype than this file's), which deepStrictEqual
  // treats as structurally-equal-but-not-reference-equal even when the
  // printed contents match — Array.from() re-materializes into *this*
  // realm's Array so the comparison is apples-to-apples, matching the
  // pattern the other pelvicAnalysis tests already use.
  assert.deepEqual(Array.from(quick, (item) => item.key), Array.from(PELVIC_QUICK_LANDMARK_KEYS));
  // Original relative order preserved, not just the same set.
  const fullOrder = Array.from(PELVIC_ANALYSIS_LANDMARKS, (item) => item.key);
  const quickIndexes = Array.from(quick, (item) => fullOrder.indexOf(item.key));
  const sorted = [...quickIndexes].sort((a, b) => a - b);
  assert.deepEqual(quickIndexes, sorted);
});

test("getPelvicLandmarkSet falls back to the full 26-landmark list for any non-'quick' mode", () => {
  assert.equal(getPelvicLandmarkSet("detailed").length, PELVIC_ANALYSIS_LANDMARKS.length);
  assert.equal(getPelvicLandmarkSet(undefined).length, PELVIC_ANALYSIS_LANDMARKS.length);
});

// 14 points in exactly PELVIC_QUICK_LANDMARK_KEYS order.
const quickPoints = [
  { x: 0, y: 0 },     // tdRight
  { x: 100, y: 0 },   // tdLeft
  { x: 20, y: 55 },   // ltRight (deliberately not level with ltLeft, so LLD isn't a degenerate zero-length line)
  { x: 80, y: 48 },   // ltLeft
  { x: 25, y: 20 },   // hcRight
  { x: 75, y: 20 },   // hcLeft
  { x: 35, y: 20 },   // headEdgeRight
  { x: 65, y: 20 },   // headEdgeLeft
  { x: 20, y: 60 },   // s1Right
  { x: 80, y: 60 },   // s1Left
  { x: 20, y: 100 },  // s2Right
  { x: 80, y: 100 },  // s2Left
  { x: 22, y: 58 },   // n1Right
  { x: 78, y: 58 },   // n1Left
];

test("buildPelvicAnalysisMeasurements computes the core metrics from only the 14 quick landmarks", () => {
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const result = buildPelvicAnalysisMeasurements(quickPoints, "quick-test", quickLandmarks);

  assert.deepEqual(
    Array.from(result.angles, (item) => item.metric),
    ["CCD R", "CCD L"],
    "CEA should be skipped (needs the optional AL landmark), CCD should still compute",
  );
  assert.deepEqual(Array.from(result.circles, (item) => item.metric), ["FHD R", "FHD L"]);
  assert.ok(result.lines.some((item) => item.metric === "LLD"));
  assert.ok(result.lines.some((item) => item.metric === "FO R"));
  assert.ok(result.lines.some((item) => item.metric === "AO R"));
  assert.ok(
    !result.lines.some((item) => item.metric?.startsWith("Köhler")),
    "Kohler lines need optional landmarks that weren't collected in quick mode",
  );
  assert.ok(
    !result.lines.some((item) => item.metric?.startsWith("GT Height")),
    "GT height needs the optional GT landmark that wasn't collected in quick mode",
  );
});

test("buildPelvicAnalysisMeasurements does not crash when points are one short of the quick set", () => {
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const result = buildPelvicAnalysisMeasurements(quickPoints.slice(0, 13), "quick-test", quickLandmarks);
  assert.equal(result.lines.length, 0);
  assert.equal(result.angles.length, 0);
  assert.equal(result.circles.length, 0);
});

test("buildPelvicAnalysisMeasurements still works with the full 26-landmark default (back-compat)", () => {
  const points = [
    { x: 0, y: 0 }, { x: 100, y: 0 },
    { x: 15, y: 20 }, { x: 85, y: 20 },
    { x: 25, y: 20 }, { x: 85, y: 20 },
    { x: 25, y: 35 }, { x: 75, y: 35 },
    { x: 20, y: 50 }, { x: 80, y: 50 },
    { x: 20, y: 40 }, { x: 80, y: 40 },
    { x: 25, y: 20 }, { x: 75, y: 20 },
    { x: 35, y: 20 }, { x: 65, y: 20 },
    { x: 40, y: 15 }, { x: 60, y: 15 },
    { x: 20, y: 60 }, { x: 80, y: 60 },
    { x: 20, y: 60 }, { x: 80, y: 60 },
    { x: 20, y: 100 }, { x: 80, y: 100 },
    { x: 22, y: 58 }, { x: 78, y: 58 },
  ];
  const result = buildPelvicAnalysisMeasurements(points, "full-test");
  assert.deepEqual(Array.from(result.angles, (item) => item.metric), ["CCD R", "CCD L", "CEA R", "CEA L"]);
  assert.deepEqual(Array.from(result.circles, (item) => item.metric), ["FHD R", "FHD L"]);
});

test("'Lanjutkan ke Detailed': merging a quick run with a continuation run reconstructs the full analysis", () => {
  // Mirrors the merge XrayCalibrationWorkspace.js performs: seed the 14
  // quick landmarks (key-based, as pelvicLandmarksRef would hold them),
  // separately collect the 12 continuation-only landmarks, concatenate
  // (disjoint keys), reorder to PELVIC_ANALYSIS_LANDMARKS' positions, and
  // rebuild — this should recover everything a one-shot detailed run gets.
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const seededFromQuick = quickLandmarks.map((definition, index) => ({
    key: definition.key,
    ...quickPoints[index],
    confidence: "jelas",
  }));

  const continuationLandmarks = getPelvicLandmarkSet("continuation");
  const continuationPoints = [
    { x: 15, y: 20 }, { x: 85, y: 20 },   // isRight, isLeft
    { x: 25, y: 20 }, { x: 85, y: 20 },   // kiRight, kiLeft
    { x: 25, y: 35 }, { x: 75, y: 35 },   // ksRight, ksLeft
    { x: 20, y: 40 }, { x: 80, y: 40 },   // gtRight, gtLeft
    { x: 35, y: 20 }, { x: 65, y: 20 },   // alRight, alLeft
    { x: 40, y: 15 }, { x: 60, y: 15 },   // amRight, amLeft
  ];
  const seededFromContinuation = continuationLandmarks.map((definition, index) => ({
    key: definition.key,
    ...continuationPoints[index],
    confidence: "jelas",
  }));

  const merged = [...seededFromQuick, ...seededFromContinuation];
  assert.equal(merged.length, 26);
  assert.equal(new Set(Array.from(merged, (item) => item.key)).size, 26);

  const orderedPoints = Array.from(PELVIC_ANALYSIS_LANDMARKS, (definition) => {
    const found = merged.find((item) => item.key === definition.key);
    return found ? { x: found.x, y: found.y, confidence: found.confidence } : null;
  });

  const result = buildPelvicAnalysisMeasurements(orderedPoints, "merged-test");
  const angleMetrics = Array.from(result.angles, (item) => item.metric);
  const lineMetrics = Array.from(result.lines, (item) => item.metric);
  // Everything quick alone produced is still there...
  assert.ok(angleMetrics.includes("CCD R") && angleMetrics.includes("CCD L"));
  assert.ok(lineMetrics.includes("LLD"));
  assert.ok(lineMetrics.includes("FO R"));
  // ...plus what continuation added, which quick alone can never produce.
  assert.ok(angleMetrics.includes("CEA R") && angleMetrics.includes("CEA L"));
  assert.ok(lineMetrics.some((m) => m.startsWith("Köhler")));
});

test("every PELVIC_ADDABLE_LINES entry only needs keys outside the quick set", () => {
  // If one needed a quick-set key, it would already always exist after any
  // quick run and could never show up as "missing" — a sign the entry is
  // wrong, since the whole point of this list is optional/detailed-only
  // lines a quick run doesn't produce.
  const quickKeys = new Set(Array.from(PELVIC_QUICK_LANDMARK_KEYS));
  for (const line of PELVIC_ADDABLE_LINES) {
    for (const key of line.landmarkKeys) {
      assert.ok(!quickKeys.has(key), `${line.id} depends on quick-set key ${key}`);
    }
  }
});

test("getMissingPelvicLines lists all 9 addable lines right after a quick run", () => {
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const seededFromQuick = quickLandmarks.map((definition, index) => ({
    key: definition.key,
    ...quickPoints[index],
    confidence: "jelas",
  }));
  const missing = getMissingPelvicLines(seededFromQuick);
  assert.deepEqual(
    Array.from(missing, (item) => item.id).sort(),
    Array.from(PELVIC_ADDABLE_LINES, (item) => item.id).sort(),
  );
});

test("getMissingPelvicLines drops an entry once all its landmarks are present", () => {
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const seeded = quickLandmarks.map((definition, index) => ({
    key: definition.key,
    ...quickPoints[index],
    confidence: "jelas",
  }));
  // Add just what Shenton R needs (amRight; n1Right is already in quick).
  seeded.push({ key: "amRight", x: 40, y: 15, confidence: "jelas" });
  const missing = getMissingPelvicLines(seeded);
  assert.ok(!missing.some((item) => item.id === "shentonRight"));
  // Shenton L still needs amLeft, which wasn't added.
  assert.ok(missing.some((item) => item.id === "shentonLeft"));
});

test("getMissingPelvicLines requires BOTH landmarks for a two-point line (Kohler)", () => {
  const quickLandmarks = getPelvicLandmarkSet("quick");
  const seeded = quickLandmarks.map((definition, index) => ({
    key: definition.key,
    ...quickPoints[index],
    confidence: "jelas",
  }));
  // Only one half of Kohler R (kiRight) — ksRight still missing.
  seeded.push({ key: "kiRight", x: 25, y: 20, confidence: "jelas" });
  const missing = getMissingPelvicLines(seeded);
  assert.ok(missing.some((item) => item.id === "kohlerRight"));
});

test("getMissingPelvicLines returns nothing once every landmark is present", () => {
  const seeded = PELVIC_ANALYSIS_LANDMARKS.map((definition) => ({
    key: definition.key,
    x: 0,
    y: 0,
    confidence: "jelas",
  }));
  assert.equal(getMissingPelvicLines(seeded).length, 0);
});
