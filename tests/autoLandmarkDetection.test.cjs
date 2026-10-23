const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/xray/autoLandmarkDetection.js"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const { toGrayscale, houghDetectCircle, refineFemoralHeadCircle } = moduleExports;

// Synthetic "femoral head": a filled bright disk on a dark background, which
// gives the Sobel operator one crisp edge ring at exactly radius R — the
// target the Hough transform should recover.
function makeDiscImage(width, height, cx, cy, radius, { fg = 220, bg = 30 } = {}) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = Math.hypot(x - cx, y - cy) <= radius;
      const v = inside ? fg : bg;
      const p = (y * width + x) * 4;
      data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255;
    }
  }
  return { data, width, height };
}

test("toGrayscale averages RGB with BT.601 weights", () => {
  const data = new Uint8ClampedArray([100, 100, 100, 255, 0, 0, 0, 255]);
  const gray = toGrayscale(data, 2, 1);
  assert.ok(Math.abs(gray[0] - 100) < 1e-6);
  assert.equal(gray[1], 0);
});

test("houghDetectCircle recovers the center and radius of a synthetic disc", () => {
  const img = makeDiscImage(200, 200, 100, 95, 40);
  const gray = toGrayscale(img.data, img.width, img.height);
  const result = houghDetectCircle(gray, img.width, img.height, { minRadius: 20, maxRadius: 60 });
  assert.ok(result, "expected a circle to be detected");
  assert.ok(Math.abs(result.center.x - 100) <= 3, `cx off: ${result.center.x}`);
  assert.ok(Math.abs(result.center.y - 95) <= 3, `cy off: ${result.center.y}`);
  assert.ok(Math.abs(result.radius - 40) <= 3, `radius off: ${result.radius}`);
});

test("houghDetectCircle finds an odd-radius circle just as reliably as an even one", () => {
  // Regression guard: a coarse radiusStep starting from an even minRadius
  // would skip every odd radius outright, so a 45px-radius circle would
  // never be evaluated at its true radius at all.
  const img = makeDiscImage(200, 200, 100, 95, 45);
  const gray = toGrayscale(img.data, img.width, img.height);
  const result = houghDetectCircle(gray, img.width, img.height, { minRadius: 20, maxRadius: 60 });
  assert.ok(result, "expected a circle to be detected");
  assert.ok(Math.abs(result.radius - 45) <= 3, `radius off: ${result.radius}`);
});

test("houghDetectCircle returns null on a blank (edge-free) image", () => {
  const data = new Uint8ClampedArray(100 * 100 * 4).fill(128);
  const gray = toGrayscale(data, 100, 100);
  const result = houghDetectCircle(gray, 100, 100, { minRadius: 10, maxRadius: 30 });
  assert.equal(result, null);
});

test("houghDetectCircle rejects an invalid radius range", () => {
  const gray = new Float32Array(100);
  assert.throws(() => houghDetectCircle(gray, 10, 10, { minRadius: 50, maxRadius: 10 }));
  assert.throws(() => houghDetectCircle(gray, 10, 10, { minRadius: 0, maxRadius: 10 }));
});

test("refineFemoralHeadCircle snaps an off-center seed click to the true circle", () => {
  const img = makeDiscImage(300, 300, 150, 140, 45);
  // Surgeon's rough click is 15px off from the true center — the realistic
  // "approximate click, let the tool refine it" scenario.
  const seed = { x: 165, y: 150 };
  const result = refineFemoralHeadCircle(img, seed, { searchRadiusPx: 90, minRadiusPx: 20, maxRadiusPx: 70 });
  assert.ok(result, "expected a refined circle");
  assert.ok(Math.abs(result.center.x - 150) <= 4, `cx off: ${result.center.x}`);
  assert.ok(Math.abs(result.center.y - 140) <= 4, `cy off: ${result.center.y}`);
  assert.ok(Math.abs(result.radius - 45) <= 4, `radius off: ${result.radius}`);
});

test("refineFemoralHeadCircle returns null when the seed sits over a blank region", () => {
  const data = new Uint8ClampedArray(300 * 300 * 4).fill(60);
  const result = refineFemoralHeadCircle({ data, width: 300, height: 300 }, { x: 150, y: 150 });
  assert.equal(result, null);
});

test("refineFemoralHeadCircle returns null when the image is too small to fit a search window", () => {
  // The ROI is clamped to the image bounds on whichever side runs off the
  // edge, so a seed near a corner alone doesn't shrink it (the far side
  // still extends to the image boundary) — only an image smaller than
  // 2*minRadiusPx in either dimension actually forces a too-small crop.
  const img = makeDiscImage(30, 30, 15, 15, 8);
  const result = refineFemoralHeadCircle(img, { x: 15, y: 15 }, { minRadiusPx: 18, maxRadiusPx: 25 });
  assert.equal(result, null);
});
