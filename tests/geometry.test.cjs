const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/hka/geometry.js"),
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
const { screenToImagePoint } = moduleExports;

function fakeCanvas({ width, height, rectWidth, rectHeight, rectLeft = 0, rectTop = 0 }) {
  return {
    width,
    height,
    getBoundingClientRect() {
      return { left: rectLeft, top: rectTop, width: rectWidth, height: rectHeight };
    },
  };
}

test("screenToImagePoint maps 1:1 when CSS size matches the canvas buffer size", () => {
  const canvas = fakeCanvas({ width: 640, height: 780, rectWidth: 640, rectHeight: 780 });
  const point = screenToImagePoint(
    { clientX: 320, clientY: 390 },
    canvas,
    { scale: 1, offsetX: 0, offsetY: 0 },
  );
  assert.equal(point.x, 320);
  assert.equal(point.y, 390);
});

test("screenToImagePoint corrects for a CSS size smaller than the canvas buffer (two-up layout)", () => {
  // Buffer is 640x780 but the element is only rendered at 320x390 CSS px —
  // the exact scenario when two fixed-width canvases share a flex/grid row.
  const canvas = fakeCanvas({ width: 640, height: 780, rectWidth: 320, rectHeight: 390 });
  const point = screenToImagePoint(
    { clientX: 160, clientY: 195 }, // dead center in CSS space
    canvas,
    { scale: 1, offsetX: 0, offsetY: 0 },
  );
  // Should land on the buffer's center (320, 390), not (160, 195).
  assert.equal(point.x, 320);
  assert.equal(point.y, 390);
});

test("screenToImagePoint corrects for a CSS size larger than the canvas buffer", () => {
  const canvas = fakeCanvas({ width: 640, height: 780, rectWidth: 1280, rectHeight: 1560 });
  const point = screenToImagePoint(
    { clientX: 1280, clientY: 1560 }, // bottom-right corner in CSS space
    canvas,
    { scale: 1, offsetX: 0, offsetY: 0 },
  );
  assert.equal(point.x, 640);
  assert.equal(point.y, 780);
});

test("screenToImagePoint still applies pan/zoom transform on top of the CSS-to-buffer ratio", () => {
  const canvas = fakeCanvas({ width: 640, height: 780, rectWidth: 320, rectHeight: 390 });
  const point = screenToImagePoint(
    { clientX: 160, clientY: 195 },
    canvas,
    { scale: 2, offsetX: 40, offsetY: 60 },
  );
  // CSS->buffer first: (160,195) -> (320,390); then undo transform: (x-offset)/scale
  assert.equal(point.x, (320 - 40) / 2);
  assert.equal(point.y, (390 - 60) / 2);
});

test("screenToImagePoint accounts for the element's offset position on the page", () => {
  const canvas = fakeCanvas({ width: 640, height: 780, rectWidth: 320, rectHeight: 390, rectLeft: 50, rectTop: 20 });
  const point = screenToImagePoint(
    { clientX: 50, clientY: 20 }, // top-left corner of the element
    canvas,
    { scale: 1, offsetX: 0, offsetY: 0 },
  );
  assert.equal(point.x, 0);
  assert.equal(point.y, 0);
});
