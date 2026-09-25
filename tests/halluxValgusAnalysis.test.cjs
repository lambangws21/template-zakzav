const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/xray/halluxValgusAnalysis.js"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, Math, Date });

function angleDegrees(angle) {
  const a = Math.atan2(angle.p1.y - angle.p2.y, angle.p1.x - angle.p2.x);
  const b = Math.atan2(angle.p3.y - angle.p2.y, angle.p3.x - angle.p2.x);
  let value = Math.abs(((b - a) * 180) / Math.PI);
  if (value > 180) value = 360 - value;
  return value;
}

test("builds editable Hallux Valgus axes and acute clinical angles", () => {
  assert.equal(exportsObject.HALLUX_VALGUS_LANDMARKS.length, 12);
  const points = [
    { x: 0, y: 100 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 34.202, y: -93.969 },
    { x: 20, y: 100 },
    { x: 37.365, y: 1.519 },
    { x: -50, y: 8.816 },
    { x: 50, y: -8.816 },
    { x: 34.202, y: -93.969 },
    { x: 84.202, y: -180.572 },
    { x: -16, y: 118 },
    { x: 16, y: 114 },
  ];

  const result = exportsObject.buildHalluxValgusMeasurements(points, "hallux-test");
  assert.equal(result.lines.length, 11);
  assert.deepEqual(
    Array.from(result.angles, (item) => item.metric),
    ["HVA", "IMA", "DMAA", "HIA", "TMT"],
  );
  for (const item of result.angles) {
    assert.ok(angleDegrees(item) <= 90);
    assert.equal(item.halluxValgusAnalysisId, "hallux-test");
  }
  assert.ok(Math.abs(angleDegrees(result.angles[0]) - 20) < 0.1);
  assert.ok(Math.abs(angleDegrees(result.angles[1]) - 10) < 0.1);
  assert.ok(Math.abs(angleDegrees(result.angles[2]) - 10) < 0.1);
  assert.ok(Math.abs(angleDegrees(result.angles[3]) - 10) < 0.1);
  assert.ok(Number.isFinite(angleDegrees(result.angles[4])));
  const m1Axis = result.lines.find((item) => item.metric === "M1");
  assert.ok(Math.hypot(m1Axis.x2 - m1Axis.x1, m1Axis.y2 - m1Axis.y1) > 200);
  assert.equal(
    result.lines.filter((item) => item.correctionTarget).length,
    5,
  );
  assert.ok(result.lines.every((item) => item.strokeWidth === 0.5));
  assert.ok(result.lines.every((item) => item.showLabel === false));
  assert.ok(result.angles.every((item) => item.strokeWidth === 1.7));
  assert.ok(
    result.angles.every(
      (item) => Number.isFinite(item.labelOffsetX) && Number.isFinite(item.labelOffsetY),
    ),
  );
});

test("Hallux result focus keeps only its anatomical axes and target line", () => {
  const relevant = exportsObject.isHalluxValgusLineRelevant;
  assert.equal(relevant({ metric: "M1" }, "HVA"), true);
  assert.equal(relevant({ metric: "P1" }, "HVA"), true);
  assert.equal(relevant({ metric: "M2" }, "HVA"), false);
  assert.equal(relevant({ metric: "M2" }, "IMA"), true);
  assert.equal(relevant({ metric: "DMAA Surface" }, "DMAA"), true);
  assert.equal(relevant({ metric: "TMT" }, "TMT"), true);
  assert.equal(relevant({ metric: "HVA Target", correctionTarget: true }, "HVA"), true);
  assert.equal(relevant({ metric: "IMA Target", correctionTarget: true }, "HVA"), false);
  assert.equal(relevant({ metric: "M2" }, null), true);
});
