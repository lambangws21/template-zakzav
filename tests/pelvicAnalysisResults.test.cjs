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

test("HIP result list maps each metric to its visible measurements", () => {
  const { HIP_RESULT_DEFINITIONS, isHipResultMeasurementRelevant: relevant } = moduleExports;
  assert.deepEqual(
    Array.from(HIP_RESULT_DEFINITIONS, (item) => item.key),
    [
      "LLD", "Hip Length R", "Hip Length L", "FO R", "FO L", "AO R", "AO L",
      "CCD R", "CCD L", "FHD R", "FHD L", "COR-V R", "COR-V L",
      "GT Height R", "GT Height L", "CEA R", "CEA L",
    ],
  );
  assert.equal(relevant({ metric: "ITD" }, "LLD", "line"), true);
  assert.equal(relevant({ metric: "Hip Length R" }, "LLD", "line"), true);
  assert.equal(relevant({ metric: "Hip Length L" }, "LLD", "line"), true);
  assert.equal(relevant({ metric: "Hip Length R" }, "Hip Length R", "line"), true);
  assert.equal(relevant({ metric: "Hip Length L" }, "Hip Length R", "line"), false);
  assert.equal(relevant({ metric: "FO L" }, "FO L", "line"), true);
  assert.equal(relevant({ metric: "Femoral Axis R" }, "CCD R", "line"), true);
  assert.equal(relevant({ metric: "Femoral Axis L" }, "CCD R", "line"), false);
  assert.equal(relevant({ metric: "CCD R" }, "CCD R", "angle"), true);
  assert.equal(relevant({ metric: "CCD L" }, "CCD R", "angle"), false);
  assert.equal(relevant({ metric: "FHD L" }, "FHD L", "circle"), true);
  assert.equal(relevant({ metric: "FHD R" }, "FHD L", "circle"), false);
  assert.equal(relevant({ metric: "FO L" }, "LLD", "line"), false);
  assert.equal(relevant({ metric: "CCD R" }, "CCD R", "line"), false);
  assert.equal(relevant({ metric: "Neck Osteotomy" }, "FHD R", "line"), false);
  assert.equal(relevant({ metric: "ITD" }, "unknown", "line"), false);
});

test("one pelvic landmark pass creates CCD and head diameter measurements", () => {
  // buildPelvicAnalysisMeasurements now requires as many points as the
  // landmark set it's given (quick/continuation split added a length
  // guard) — CCD needs the femoral-axis (s1/s2) and neck-midpoint (n1)
  // landmarks, so this fixture passes a reduced 24-item landmark set
  // (full 26 minus the CEA-only acetabular-lateral-rim pair) alongside
  // matching points, keeping this test's original CCD/FHD-only intent.
  const { PELVIC_ANALYSIS_LANDMARKS } = moduleExports;
  const landmarks = PELVIC_ANALYSIS_LANDMARKS.filter(
    (item) => item.key !== "alRight" && item.key !== "alLeft",
  );
  const points = [
    { x: 0, y: 0 }, { x: 100, y: 0 },
    { x: 15, y: 20 }, { x: 85, y: 20 },
    { x: 25, y: 20 }, { x: 75, y: 20 },
    { x: 25, y: 35 }, { x: 75, y: 35 },
    { x: 20, y: 50 }, { x: 20, y: 100 },
    { x: 80, y: 50 }, { x: 80, y: 100 },
    { x: 20, y: 60 }, { x: 80, y: 64 },
    { x: 5, y: 15 }, { x: 95, y: 15 },
    { x: 30, y: 40 }, { x: 70, y: 40 },
    { x: 22, y: 70 }, { x: 78, y: 74 },
    { x: 24, y: 140 }, { x: 76, y: 144 },
    { x: 30, y: 55 }, { x: 70, y: 59 },
  ];
  const result = moduleExports.buildPelvicAnalysisMeasurements(points, "hip-test", landmarks);
  assert.deepEqual(Array.from(result.angles, (item) => item.metric), ["CCD R", "CCD L"]);
  assert.deepEqual(Array.from(result.circles, (item) => item.metric), ["FHD R", "FHD L"]);
  assert.ok(result.lines.some((item) => item.metric === "LLD"));
  assert.ok(result.angles.every((item) => item.pelvicAnalysisId === "hip-test"));
  assert.ok(result.circles.every((item) => item.pelvicAnalysisId === "hip-test"));
});
