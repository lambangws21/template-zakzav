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
const { buildKneeApReference, tkaImplantPlacement } = exported;
const { clipTkaImageAtCut } = exported;

test("AP cut spans active image width and reaches the proximal/distal image edges", () => {
  const cut = { start: { x: 40, y: 100 }, end: { x: 60, y: 100 } };
  const upper = clipTkaImageAtCut(400, 600, cut, { x: 50, y: 20 });
  const lower = clipTkaImageAtCut(400, 600, cut, { x: 50, y: 300 });
  assert.equal(Math.min(...upper.map((p) => p.x)), 0);
  assert.equal(Math.max(...upper.map((p) => p.x)), 400);
  assert.equal(Math.min(...upper.map((p) => p.y)), 0);
  assert.equal(Math.max(...upper.map((p) => p.y)), 100);
  assert.equal(Math.max(...lower.map((p) => p.y)), 600);
  assert.equal(Math.min(...lower.map((p) => p.y)), 100);
  const oblique = clipTkaImageAtCut(400, 600, { start: { x: 0, y: 100 }, end: { x: 400, y: 200 } }, { x: 50, y: 0 });
  assert.ok(oblique.some((p) => p.x === 400 && p.y === 200));
  assert.equal(clipTkaImageAtCut(0, 600, cut, { x: 0, y: 0 }), null);
});
const hka = {
  id: 42, hip: { x: 50, y: 0 }, knee: { x: 50, y: 100 }, ankle: { x: 50, y: 200 },
  femCondyleMedial: { x: 30, y: 95 }, femCondyleLateral: { x: 70, y: 95 },
  tibPlateauMedial: { x: 30, y: 105 }, tibPlateauLateral: { x: 70, y: 105 },
};
const plan = computeTkaResectionPlan({ hka, mmPerPixel: 0.5 });
test("distal cut centers exactly on the axis junction without changing orientation or length", () => {
  const before = { start: { x: 20, y: 80 }, end: { x: 80, y: 90 } };
  const cut = exported.centerCutOnPoint(before, hka.knee);
  assert.equal((cut.start.x + cut.end.x) / 2, hka.knee.x);
  assert.equal((cut.start.y + cut.end.y) / 2, hka.knee.y);
  assert.equal(cut.end.x - cut.start.x, 60);
  assert.equal(cut.end.y - cut.start.y, 10);
  assert.equal(before.start.y, 80);
  const applied = applyTkaCutLines(plan, hka, [{ tkaSourceId: 42, tkaCutRole: "femoral", x1: cut.start.x, y1: cut.start.y, x2: cut.end.x, y2: cut.end.y }], 0.5);
  assert.equal(applied.femoral.start.y, cut.start.y);
  assert.equal(exported.centerCutOnPoint(null, hka.knee), null);
});
test("corrected mechanical axes use the same knee pivot and rotation as tibial cutting", () => {
  const axes = exported.correctedTkaMechanicalAxes(hka, 90);
  assert.equal(axes[0].end.y, hka.knee.y);
  assert.ok(Math.abs(axes[1].end.x + 50) < 1e-8);
  assert.ok(Math.abs(axes[1].end.y - 100) < 1e-8);
  assert.equal(hka.ankle.x, 50);
  assert.equal(exported.correctedTkaMechanicalAxes(null, 0).length, 0);
  assert.equal(exported.correctedTkaMechanicalAxes(hka, NaN).length, 0);
});
test("existing short IM guide is adjustable without additional landmarks", () => {
  const initial = exported.getFemoralImGuide(hka);
  assert.equal(initial.confirmed, false);
  assert.equal(initial.angle, null);
  assert.equal(initial.point.y, 78);
  const adjusted = { ...hka, femoralImPoint: { x: 52, y: 80 } };
  const guide = exported.getFemoralImGuide(adjusted);
  assert.ok(Math.abs(guide.angle - 5.710593) < 0.00001);
  const resolved = exported.applyTkaAxisLines(adjusted, []);
  assert.ok(Math.abs(resolved.femoralValgusAngleDeg - guide.angle) < 1e-8);
  assert.equal(exported.getFemoralImGuide({ ...hka, hip: hka.knee }), null);
  assert.equal(exported.getFemoralImGuide({ ...hka, femoralImPoint: hka.knee }).angle, null);
  assert.equal(hka.femoralImPoint, undefined);
});
const femoral = { tkaSourceId: 42, tkaCutRole: "femoral", x1: 20, y1: 85, x2: 80, y2: 85 };

test("editable femoral axes update angle and mechanical cut orientation", () => {
  const { applyTkaAxisLines } = exported;
  const mechanical = { tkaSourceId: 42, tkaAxisRole: "mechanical", tkaAxisBone: "Femoral", x1: 60, y1: 0, x2: 50, y2: 100 };
  const anatomical = { ...mechanical, tkaAxisRole: "anatomical", x1: 50 };
  const result = applyTkaAxisLines(hka, [mechanical, anatomical]);
  assert.ok(Math.abs(result.femoralValgusAngleDeg - 5.710593) < 0.00001);
  const updated = computeTkaResectionPlan({ hka: result, mmPerPixel: 0.5 });
  const dx = updated.femoral.end.x - updated.femoral.start.x;
  const dy = updated.femoral.end.y - updated.femoral.start.y;
  assert.ok(Math.abs(dx * 10 + dy * -100) < 1e-7);
  assert.equal(hka.hip.x, 50);
  assert.equal(applyTkaAxisLines(hka, [{ ...mechanical, x1: 50, y1: 100 }]), null);
  assert.equal(applyTkaAxisLines(hka, [{ ...mechanical, hidden: true }, anatomical]).femoralValgusAngleDeg, result.femoralValgusAngleDeg);
  const other = applyTkaAxisLines(hka, [{ ...mechanical, tkaSourceId: 99 }]);
  assert.equal(other.hip.x, hka.hip.x);
});

test("short AP reference uses shaft points and remains explicitly estimated", () => {
  const landmarks = {
    ...hka, hip: undefined, knee: undefined, ankle: undefined,
    femoralProximal: { x: 50, y: 10 }, femoralDistal: { x: 50, y: 80 },
    tibialProximal: { x: 50, y: 120 }, tibialDistal: { x: 50, y: 190 },
  };
  const reference = buildKneeApReference(landmarks, 0);
  assert.equal(reference.axisReference, "estimated-ap");
  assert.equal(reference.knee.y, 100);
  assert.equal(reference.hip.x, 50);
  assert.equal(reference.ankle.y, 190);
  assert.equal(landmarks.hip, undefined);
  const offset = buildKneeApReference(landmarks, 6);
  assert.ok(offset.hip.x > reference.hip.x);
  assert.equal(offset.anatomicalAxes.femoral.start.x, 50);
  assert.equal(buildKneeApReference({ ...landmarks, femoralDistal: landmarks.femoralProximal }), null);
  assert.equal(buildKneeApReference({ ...landmarks, tibialDistal: { x: NaN, y: 20 } }), null);
  assert.equal(buildKneeApReference(landmarks, 16), null);
});

test("SVG placement follows cut edge and tibial correction pivot", () => {
  const cut = { start: { x: 20, y: 100 }, end: { x: 80, y: 100 } };
  const fem = tkaImplantPlacement(cut, "femoral", 40, 0.5);
  const tib = tkaImplantPlacement(cut, "tibial", 40, 0.5);
  assert.equal(fem.y, 60);
  assert.equal(tib.y, 140);
  const rotated = tkaImplantPlacement(cut, "tibial", 40, 0.5, { x: 50, y: 100 }, 90);
  assert.ok(Math.abs(rotated.x - 10) < 1e-8);
  assert.ok(Math.abs(rotated.y - 100) < 1e-8);
  assert.equal(rotated.rotation, 90);
  const reverse = tkaImplantPlacement({ start: cut.end, end: cut.start }, "femoral", 40, 0.5);
  assert.equal(reverse.x, fem.x);
  assert.equal(reverse.y, fem.y);
  assert.equal(tkaImplantPlacement(cut, "femoral", Infinity, 0.5), null);
  assert.equal(tkaImplantPlacement(cut, "tibial", 40, 0), null);
});

test("tibial resection defaults to 2mm and preserves explicit depth", () => {
  assert.equal(plan.tibial.medialMm, 2);
  assert.equal(computeTkaResectionPlan({ hka, mmPerPixel: 0.5, tibialResectionMm: 8 }).tibial.medialMm, 8);
});

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
