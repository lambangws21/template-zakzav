const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/firebaseAdmin.js"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load() {
  const exports = {};
  const sdk = {
    cert: () => ({}),
    getApps: () => [],
    initializeApp: () => ({}),
    getStorage: () => ({ bucket: () => ({}) }),
  };
  vm.runInNewContext(compiled, {
    exports,
    Buffer,
    process: { env: {} },
    require: (id) => {
      if (id === "node:fs") return { readFileSync: () => "" };
      if (id === "node:path") return { resolve: (...parts) => parts.join("/") };
      return sdk;
    },
  });
  return exports;
}

test("normalizes a JSON-quoted Firebase private key", () => {
  const { normalizeFirebasePrivateKey } = load();
  const input = '"-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n"';
  assert.equal(
    normalizeFirebasePrivateKey(input),
    "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----",
  );
});

test("normalizes a base64-encoded Firebase private key", () => {
  const { normalizeFirebasePrivateKey } = load();
  const pem = "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----";
  assert.equal(normalizeFirebasePrivateKey(Buffer.from(pem).toString("base64")), pem);
});

test("repairs double-escaped and wrapped PEM values", () => {
  const { normalizeFirebasePrivateKey } = load();
  const input =
    '\\"-----BEGIN PRIVATE KEY-----\\\\nYWJjMTIz\\\\n-----END PRIVATE KEY-----\\\\n\\"';
  assert.equal(
    normalizeFirebasePrivateKey(input),
    "-----BEGIN PRIVATE KEY-----\nYWJjMTIz\n-----END PRIVATE KEY-----",
  );
});

test("reformats a collapsed PEM body into 64 character lines", () => {
  const { normalizeFirebasePrivateKey } = load();
  const body = "a".repeat(80);
  assert.equal(
    normalizeFirebasePrivateKey(`prefix -----BEGIN PRIVATE KEY-----${body}-----END PRIVATE KEY----- suffix`),
    `-----BEGIN PRIVATE KEY-----\n${"a".repeat(64)}\n${"a".repeat(16)}\n-----END PRIVATE KEY-----`,
  );
});
