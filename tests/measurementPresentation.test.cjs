const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const exported = {};
const source = fs.readFileSync(path.join(__dirname, "../src/lib/planningWorkspace.js"), "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported });
const { measurementPresentation } = exported;

test("only explicit landmark provenance enters a landmark group", () => {
  for (const group of ["tka", "hip", "foot"]) {
    assert.equal(measurementPresentation({ id: "line:1", landmarkGroup: group }).landmarkGroup, group);
  }
  assert.equal(measurementPresentation({ id: "line:2", name: "HVA", metric: "HVA" }).landmarkGroup, null);
  assert.equal(measurementPresentation({ id: "angle:3", metric: "mLDFA" }).landmarkGroup, null);
});
test("independent measurements retain distinct visual categories", () => {
  for (const [id, type, expected] of [
    ["line:1", "normal", "line"], ["line:2", "ruler", "ruler"],
    ["angle:1", null, "angle"], ["intersection:1", null, "interline"],
    ["circle:1", null, "circle"], ["guide:1", null, "guide"],
    ["tka-plan:mFCL", null, "guide"],
  ]) {
    const result = measurementPresentation({ id, type });
    assert.equal(result.measurementKind, expected);
    assert.equal(result.landmarkGroup, null);
  }
});
