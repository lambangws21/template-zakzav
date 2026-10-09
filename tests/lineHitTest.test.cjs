const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const exported = {};
const source = fs.readFileSync(path.join(__dirname, "../src/lib/xray/lineHitTest.js"), "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported });
const { pickTouchLine } = exported;
const lines = [
  { id: 1, x1: 0, y1: 0, x2: 100, y2: 0 },
  { id: 2, x1: 50, y1: -50, x2: 50, y2: 50 },
];
test("touch keeps selected line at crossing and near-overlap", () => {
  assert.equal(pickTouchLine(lines, { x: 50, y: 0 }, 1, 1, 24), 1);
  assert.equal(pickTouchLine(lines, { x: 50, y: 3 }, 1, 1, 24), 1);
  assert.equal(pickTouchLine(lines, { x: 50, y: 12 }, 1, 1, 24), 2);
});
test("touch tolerance and selection priority stay constant across zoom", () => {
  assert.equal(pickTouchLine(lines, { x: 50, y: 3 }, 2, 1, 24), 2);
  assert.equal(pickTouchLine([lines[0]], { x: 30, y: 15 }, 2, 1, 24), null);
  assert.equal(pickTouchLine([lines[0]], { x: 30, y: 15 }, 1, 1, 24), 1);
});
test("hidden, invalid and distant lines cannot steal a hit", () => {
  assert.equal(pickTouchLine([{ ...lines[0], hidden: true }, lines[1]], { x: 50, y: 0 }, 1, 1, 24), 2);
  assert.equal(pickTouchLine([{ ...lines[0], x1: NaN }], { x: 50, y: 0 }, 1, 1, 24), null);
  assert.equal(pickTouchLine(lines, { x: 200, y: 200 }, 1, 1, 24), null);
});
test("coincident lines default to topmost and zero-length lines remain selectable", () => {
  assert.equal(pickTouchLine([lines[0], { ...lines[0], id: 3 }], { x: 30, y: 0 }, 1, null, 24), 3);
  assert.equal(pickTouchLine([{ id: 4, x1: 10, y1: 10, x2: 10, y2: 10 }], { x: 10, y: 12 }, 1, null, 24), 4);
});
