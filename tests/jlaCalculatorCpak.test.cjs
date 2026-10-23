const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/hka/jlaCalculator.js"),
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
const { computeJLA } = moduleExports;

// Builds a synthetic knee with EXACT target LDFA/MPTA angles, independent of
// computeJLA's own implementation — derived straight from the dot-product
// definition of each angle (see jlaCalculator.js's header comment for the
// vector conventions), not by reusing its code. This lets every other
// derived value (JLCA, cpakJLO, cpakHKA, JLO_hsu, the CPAK phenotype, DLO
// risk, Micicoi reduction, range flags) be checked against independently
// hand-computed expectations rather than the function grading its own work.
//
// vFemUp = (0,-1); angleDeg(vFemUp, u) = L  =>  u = (sin L, -cos L)
// vTibUp = (0,+1); angleDeg(vTibUp, u) = M  =>  u = (sin M, +cos M)
function kneeForAngles(ldfaDeg, mptaDeg) {
  const lRad = (ldfaDeg * Math.PI) / 180;
  const mRad = (mptaDeg * Math.PI) / 180;
  const cx = 10 * Math.sin(lRad);
  const cy = -10 * Math.cos(lRad);
  const px = 10 * Math.sin(mRad);
  const py = 10 * Math.cos(mRad);
  return {
    femoralHead: { x: 0, y: -100 },
    kneeCenter: { x: 0, y: 0 },
    ankleCenter: { x: 0, y: 100 },
    femCondyleLateral: { x: cx, y: cy },
    femCondyleMedial: { x: -cx, y: -cy },
    tibPlateauMedial: { x: px, y: py },
    tibPlateauLateral: { x: -px, y: -py },
  };
}

const CLOSE = 0.15; // computeJLA rounds to the nearest 0.1 degree internally

test("neutral knee (LDFA=90, MPTA=90): CPAK V, Neutral/Neutral, low DLO risk", () => {
  const result = computeJLA(kneeForAngles(90, 90));
  assert.ok(result);
  assert.ok(Math.abs(result.LDFA - 90) < CLOSE);
  assert.ok(Math.abs(result.MPTA - 90) < CLOSE);
  assert.ok(Math.abs(result.JLCA - 0) < CLOSE);
  assert.ok(Math.abs(result.cpakJLO - 180) < CLOSE);
  assert.ok(Math.abs(result.cpakHKA - 0) < CLOSE);
  assert.ok(Math.abs(result.JLO_hsu - 0) < CLOSE);
  assert.equal(result.cpakType, "CPAK V");
  assert.equal(result.cpakJLOCategory, "Neutral");
  assert.equal(result.cpakHKACategory, "Neutral");
  assert.equal(result.dloRisk, "low");
  assert.equal(result.micicoiReduction, 0);
  assert.equal(result.ldfaFlag, "normal");
  assert.equal(result.mptaFlag, "normal");
  assert.equal(result.jlcaFlag, "normal");
  assert.equal(result.jloFlag, "normal");
});

test("varus + apex-proximal knee (LDFA=100, MPTA=90): CPAK VII, moderate DLO risk via JLCA", () => {
  const result = computeJLA(kneeForAngles(100, 90));
  assert.ok(Math.abs(result.LDFA - 100) < CLOSE);
  assert.ok(Math.abs(result.MPTA - 90) < CLOSE);
  assert.ok(Math.abs(result.JLCA - 10) < CLOSE);
  assert.ok(Math.abs(result.cpakJLO - 190) < CLOSE);
  assert.ok(Math.abs(result.cpakHKA - -10) < CLOSE);
  assert.ok(Math.abs(result.JLO_hsu - -5) < CLOSE);
  assert.equal(result.cpakType, "CPAK VII");
  assert.equal(result.cpakJLOCategory, "Apex Proximal");
  assert.equal(result.cpakHKACategory, "Varus");
  assert.equal(result.dloRisk, "moderate");
  assert.ok(Math.abs(result.micicoiReduction - 4) < CLOSE);
  assert.equal(result.ldfaFlag, "high");
  assert.equal(result.mptaFlag, "normal");
  assert.equal(result.jlcaFlag, "high");
  assert.equal(result.jloFlag, "borderline");
});

test("valgus + apex-distal knee (LDFA=80, MPTA=90): CPAK III, high DLO risk", () => {
  const result = computeJLA(kneeForAngles(80, 90));
  assert.ok(Math.abs(result.LDFA - 80) < CLOSE);
  assert.ok(Math.abs(result.MPTA - 90) < CLOSE);
  assert.ok(Math.abs(result.JLCA - 10) < CLOSE);
  assert.ok(Math.abs(result.cpakJLO - 170) < CLOSE);
  assert.ok(Math.abs(result.cpakHKA - 10) < CLOSE);
  assert.ok(Math.abs(result.JLO_hsu - 5) < CLOSE);
  assert.equal(result.cpakType, "CPAK III");
  assert.equal(result.cpakJLOCategory, "Apex Distal");
  assert.equal(result.cpakHKACategory, "Valgus");
  // jloHsu(5) >= 3 AND JLCA(10) >= 5 -> the "mandatory DLO" high-risk branch.
  assert.equal(result.dloRisk, "high");
  assert.ok(Math.abs(result.micicoiReduction - 4) < CLOSE);
  assert.equal(result.ldfaFlag, "low");
  assert.equal(result.jlcaFlag, "high");
  assert.equal(result.jloFlag, "borderline");
});

test("CPAK HKA boundary: exactly +2 and exactly -2 both classify as Neutral (strict < / >)", () => {
  // hkaCol = hka < -2 ? 0 : hka <= 2 ? 1 : 2 — the boundaries themselves are
  // inclusive of Neutral on both sides, not split evenly at the midpoint.
  const plusTwo = computeJLA(kneeForAngles(89, 91)); // cpakHKA = 91-89 = +2
  assert.ok(Math.abs(plusTwo.cpakHKA - 2) < CLOSE);
  assert.equal(plusTwo.cpakHKACategory, "Neutral");

  const minusTwo = computeJLA(kneeForAngles(91, 89)); // cpakHKA = 89-91 = -2
  assert.ok(Math.abs(minusTwo.cpakHKA - -2) < CLOSE);
  assert.equal(minusTwo.cpakHKACategory, "Neutral");
});

test("CPAK JLO boundary: 177 is Neutral, just under 177 is Apex Distal", () => {
  // jloRow = cpakJLO < 177 ? 0 : cpakJLO <= 183 ? 1 : 2
  const atBoundary = computeJLA(kneeForAngles(88.5, 88.5)); // cpakJLO = 177
  assert.ok(Math.abs(atBoundary.cpakJLO - 177) < CLOSE);
  assert.equal(atBoundary.cpakJLOCategory, "Neutral");

  const justUnder = computeJLA(kneeForAngles(88, 88)); // cpakJLO = 176
  assert.ok(Math.abs(justUnder.cpakJLO - 176) < CLOSE);
  assert.equal(justUnder.cpakJLOCategory, "Apex Distal");
});

test("computeJLA returns null when any required landmark is missing", () => {
  const complete = kneeForAngles(90, 90);
  for (const key of Object.keys(complete)) {
    const incomplete = { ...complete, [key]: undefined };
    assert.equal(computeJLA(incomplete), null, `expected null with ${key} missing`);
  }
});
