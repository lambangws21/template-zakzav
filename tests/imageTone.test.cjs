const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/xray/imageTone.js"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadTone(document) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, document });
  return exports;
}

test("native tone filters preserve the source and include inversion", () => {
  const { prepareImageTone } = loadTone();
  let filter = "none";
  const native = Object.create({
    get filter() { return filter; },
    set filter(value) { filter = value; },
  });
  const image = { width: 2, height: 1 };
  assert.equal(prepareImageTone(native, image, { contrast: 130, level: 80, invert: true }), image);
  assert.equal(native.filter, "contrast(130%) brightness(80%) invert(1)");
});

test("software tone adjusts color without changing alpha and redraws after slider updates", () => {
  const sourcePixels = [64, 128, 192, 127, 0, 255, 80, 0];
  let drawnImage;
  let output;
  let drawCount = 0;
  const target = {
    clearRect() {},
    drawImage(image) {
      drawnImage = image;
      drawCount += 1;
    },
    getImageData() { return { data: Uint8ClampedArray.from(sourcePixels) }; },
    putImageData(pixels) { output = [...pixels.data]; },
  };
  const canvas = { getContext: () => target };
  const { invalidateImageTone, prepareImageTone } = loadTone({ createElement: () => canvas });
  const image = { naturalWidth: 2, naturalHeight: 1 };

  assert.equal(prepareImageTone({}, image), image);
  assert.equal(prepareImageTone({ filter: "none" }, image, { level: 50 }), canvas);
  assert.equal(drawnImage, image);
  assert.deepEqual(output, [32, 64, 96, 127, 0, 128, 40, 0]);
  assert.equal(prepareImageTone({}, image, { level: 50 }), canvas);
  assert.equal(drawCount, 1);
  prepareImageTone({}, image, { contrast: 200 });
  assert.deepEqual(output, [0, 128, 255, 127, 0, 255, 32, 0]);
  invalidateImageTone(image);
  prepareImageTone({}, image, { contrast: 200 });
  assert.equal(drawCount, 3);
});
