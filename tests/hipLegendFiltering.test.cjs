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
const { HIP_LEGEND_ITEMS } = moduleExports;

// Mirrors the filter predicate used in PlanningWorkspace.js's "Garis
// pengukuran pra-operasi" legend — kept in sync deliberately, since the
// real bug this guards against is the legend listing reference lines
// (Kohler, Shenton, CEA, ...) that the *current* analysis never actually
// drew (e.g. Quick mode, which skips every optional landmark).
function visibleLegendItems(measurements) {
  return HIP_LEGEND_ITEMS.filter((item) =>
    measurements.some((m) => m.metric?.startsWith(item.metricPrefix)),
  );
}

test("every HIP_LEGEND_ITEMS entry has a metricPrefix to match against live measurements", () => {
  for (const item of HIP_LEGEND_ITEMS) {
    assert.ok(
      typeof item.metricPrefix === "string" && item.metricPrefix.length > 0,
      `legend item ${item.n} (${item.label}) is missing metricPrefix`,
    );
  }
});

test("quick-mode measurements only surface the 5 legend rows they actually produce", () => {
  const quickMeasurements = [
    { metric: "ITD" },
    { metric: "LLD" },
    { metric: "Femoral Axis R" },
    { metric: "Femoral Axis L" },
    { metric: "COR-V R" },
    { metric: "COR-V L" },
    { metric: "FO R" },
    { metric: "FO L" },
  ];
  const visible = Array.from(visibleLegendItems(quickMeasurements), (item) => item.n);
  assert.deepEqual(visible, [1, 3, 6, 7, 8]);
});

test("detailed-mode measurements surface all 9 legend rows", () => {
  const detailedMeasurements = [
    { metric: "ITD" }, { metric: "Bi-ischial" }, { metric: "LLD" },
    { metric: "Köhler R" }, { metric: "Köhler L" },
    { metric: "Shenton R" }, { metric: "Shenton L" },
    { metric: "Femoral Axis R" }, { metric: "Femoral Axis L" },
    { metric: "COR-V R" }, { metric: "COR-V L" },
    { metric: "FO R" }, { metric: "FO L" },
    { metric: "CEA R" }, { metric: "CEA L" },
  ];
  const visible = Array.from(visibleLegendItems(detailedMeasurements), (item) => item.n);
  assert.deepEqual(visible, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("FO's prefix does not false-positive match FHD or AO metrics", () => {
  const measurements = [{ metric: "FHD R" }, { metric: "AO R" }];
  const visible = visibleLegendItems(measurements);
  assert.equal(visible.length, 0);
});
