const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/lib/hka/jlaCalculator.js"), "utf8");
const exported = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported });
const { computeTkaResectionPlan, applyTkaCutLines } = exported;
const { estimateTkaMlSize } = exported;
const hka = {
  id: 42, hip: { x: 50, y: 0 }, knee: { x: 50, y: 100 }, ankle: { x: 50, y: 200 },
  femCondyleMedial: { x: 30, y: 95 }, femCondyleLateral: { x: 70, y: 95 },
  tibPlateauMedial: { x: 30, y: 105 }, tibPlateauLateral: { x: 70, y: 105 },
};
const plan = computeTkaResectionPlan({ hka, mmPerPixel: 0.5 });
const femoral = { tkaSourceId: 42, tkaCutRole: "femoral", x1: 20, y1: 85, x2: 80, y2: 85 };

test("unmodified TKA retains automatic cuts", () => {
  assert.equal(applyTkaCutLines(plan, hka, [], 0.5).femoral, plan.femoral);
});
test("edited cut endpoints and signed depths are used without rescaling", () => {
  const updated = applyTkaCutLines(plan, hka, [femoral], 0.5);
  assert.equal(updated.femoral.start.x, 20);
  assert.equal(updated.femoral.end.x, 80);
  assert.equal(updated.femoral.medialMm, 5);
  assert.equal(updated.femoral.lateralMm, 5);
  assert.equal(updated.plannedMetrics.mFCL, 5);
  assert.notEqual(plan.femoral.medialMm, 5);
});
test("rotated line yields different medial and lateral depths", () => {
  const updated = applyTkaCutLines(plan, hka, [{ ...femoral, y2: 91 }], 0.5);
  assert.equal(updated.femoral.medialMm, 4.5);
  assert.equal(updated.femoral.lateralMm, 2.5);
});
test("hidden cut still defines geometry, other analyses do not", () => {
  assert.equal(applyTkaCutLines(plan, hka, [{ ...femoral, hidden: true }], 0.5).femoral.medialMm, 5);
  assert.equal(applyTkaCutLines(plan, hka, [{ ...femoral, tkaSourceId: 41 }], 0.5).femoral, plan.femoral);
});
test("tibial depth uses its own axis and retains negative values", () => {
  const updated = applyTkaCutLines(plan, hka, [{ ...femoral, tkaCutRole: "tibial", y1: 103, y2: 103 }], 0.5);
  assert.equal(updated.tibial.medialMm, -1);
});
test("degenerate, non-finite and parallel cuts cannot be applied", () => {
  for (const patch of [{ x2: 20, y2: 85 }, { x2: NaN }, { x2: 20, y2: 150 }]) {
    assert.equal(applyTkaCutLines(plan, hka, [{ ...femoral, ...patch }], 0.5), null);
  }
});

test("implant estimate excludes automatic guide padding", () => {
  const sizes = [{ size: 1, width: 20 }, { size: 2, width: 30 }];
  const cut = { start: { x: 0, y: 85 }, end: { x: 100, y: 85 } };
  const result = estimateTkaMlSize(cut, hka.femCondyleMedial, hka.femCondyleLateral, 0.5, sizes);
  assert.equal(result.widthMm, 20);
  assert.equal(result.size, 1);
  assert.equal(result.outsideCatalog, false);
});
test("explicit ML cut width updates estimate and flags unsupported sizes", () => {
  const sizes = [{ size: 1, width: 20 }, { size: 2, width: 30 }];
  const cut = { start: { x: 20, y: 85 }, end: { x: 80, y: 85 } };
  const result = estimateTkaMlSize(cut, hka.femCondyleMedial, hka.femCondyleLateral, 0.5, sizes, true);
  assert.equal(result.widthMm, 30);
  assert.equal(result.size, 2);
  assert.equal(estimateTkaMlSize(cut, hka.femCondyleMedial, hka.femCondyleLateral, 1, sizes, true).outsideCatalog, true);
  assert.equal(estimateTkaMlSize(cut, hka.femCondyleMedial, hka.femCondyleLateral, 0, sizes), null);
});
