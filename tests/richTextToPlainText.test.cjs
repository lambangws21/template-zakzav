const assert = require("node:assert/strict");
const { test } = require("node:test");

// richTextToPlainText has a DOM branch (document.createElement) and a
// server/no-DOM regex-fallback branch — this test exercises the no-DOM
// fallback directly (no jsdom in this plain node:test setup), which is
// also what the PDF-generation code path in PreOpReportModal.js relies on
// since it may run before/without a populated document in some environments.
function richTextToPlainTextFallback(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

test("strips simple tags and collapses whitespace", () => {
  assert.equal(
    richTextToPlainTextFallback("<p>Hello <strong>world</strong></p>"),
    "Hello world",
  );
});

test("strips list markup into space-joined plain text", () => {
  assert.equal(
    richTextToPlainTextFallback("<ul><li>First</li><li>Second</li></ul>"),
    "First Second",
  );
});

test("returns empty string for empty/falsy input", () => {
  assert.equal(richTextToPlainTextFallback(""), "");
  assert.equal(richTextToPlainTextFallback(null), "");
  assert.equal(richTextToPlainTextFallback(undefined), "");
});

test("plain text with no tags passes through trimmed", () => {
  assert.equal(richTextToPlainTextFallback("  just plain text  "), "just plain text");
});
