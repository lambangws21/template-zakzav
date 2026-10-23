const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/xray/spinopelvicAnalysis.js"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports, Math, Number });
const {
  computePelvicTilt,
  classifySpinopelvicMobility,
  analyzeSpinopelvicMobility,
  SPINOPELVIC_MOBILITY_THRESHOLDS,
} = moduleExports;

test("computePelvicTilt returns 0 when the sacral midpoint sits directly above the hip axis", () => {
  const pt = computePelvicTilt({
    bicoxofemoralCenter: { x: 100, y: 200 },
    sacralEndplateMidpoint: { x: 100, y: 100 },
  });
  assert.ok(Math.abs(pt) < 1e-9);
});

test("computePelvicTilt is signed by which side the sacral point leans toward", () => {
  const right = computePelvicTilt({
    bicoxofemoralCenter: { x: 100, y: 200 },
    sacralEndplateMidpoint: { x: 150, y: 100 },
  });
  const left = computePelvicTilt({
    bicoxofemoralCenter: { x: 100, y: 200 },
    sacralEndplateMidpoint: { x: 50, y: 100 },
  });
  assert.ok(right > 0);
  assert.ok(left < 0);
  assert.ok(Math.abs(right + left) < 1e-9);
});

test("computePelvicTilt returns null for missing landmarks", () => {
  assert.equal(computePelvicTilt({ bicoxofemoralCenter: { x: 0, y: 0 } }), null);
  assert.equal(computePelvicTilt({}), null);
});

test("classifySpinopelvicMobility: normal mobility within the Stefl 10-30 deg band", () => {
  const result = classifySpinopelvicMobility({ standingPT: 25, sittingPT: 5 });
  assert.equal(result.deltaPT, 20);
  assert.equal(result.classification, "normal");
});

test("classifySpinopelvicMobility: stiff when deltaPT is below the lower threshold", () => {
  const result = classifySpinopelvicMobility({ standingPT: 20, sittingPT: 15 });
  assert.equal(result.deltaPT, 5);
  assert.equal(result.classification, "stiff");
});

test("classifySpinopelvicMobility: hypermobile when deltaPT exceeds the upper threshold", () => {
  const result = classifySpinopelvicMobility({ standingPT: 40, sittingPT: 0 });
  assert.equal(result.deltaPT, 40);
  assert.equal(result.classification, "hypermobile");
});

test("classifySpinopelvicMobility: exact threshold boundaries are inclusive of 'normal'", () => {
  const atStiffBoundary = classifySpinopelvicMobility({ standingPT: 10, sittingPT: 0 });
  const atHyperBoundary = classifySpinopelvicMobility({ standingPT: 30, sittingPT: 0 });
  assert.equal(atStiffBoundary.classification, "normal");
  assert.equal(atHyperBoundary.classification, "normal");
  assert.equal(SPINOPELVIC_MOBILITY_THRESHOLDS.stiffMaxDeltaPT, 10);
  assert.equal(SPINOPELVIC_MOBILITY_THRESHOLDS.hypermobileMinDeltaPT, 30);
});

test("classifySpinopelvicMobility returns null for missing angles", () => {
  assert.equal(classifySpinopelvicMobility({ standingPT: null, sittingPT: 5 }), null);
  assert.equal(classifySpinopelvicMobility({}), null);
});

test("analyzeSpinopelvicMobility runs end-to-end from four raw landmarks", () => {
  const result = analyzeSpinopelvicMobility({
    standing: {
      bicoxofemoralCenter: { x: 100, y: 200 },
      sacralEndplateMidpoint: { x: 140, y: 100 },
    },
    sitting: {
      bicoxofemoralCenter: { x: 100, y: 200 },
      sacralEndplateMidpoint: { x: 100, y: 100 },
    },
  });
  assert.ok(result.standingPT > 0);
  assert.ok(Math.abs(result.sittingPT) < 1e-9);
  assert.ok(result.classification);
});

test("analyzeSpinopelvicMobility returns nulls when a side's landmarks are incomplete", () => {
  const result = analyzeSpinopelvicMobility({
    standing: { bicoxofemoralCenter: { x: 0, y: 0 } },
    sitting: {
      bicoxofemoralCenter: { x: 100, y: 200 },
      sacralEndplateMidpoint: { x: 100, y: 100 },
    },
  });
  assert.equal(result.classification, null);
});
