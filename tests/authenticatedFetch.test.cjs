const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/authenticatedFetch.js"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function load(auth) {
  const exportsObject = {};
  const calls = [];
  vm.runInNewContext(compiled, {
    exports: exportsObject,
    require: () => ({ auth }),
    Headers,
    Request,
    fetch: async (input, init) => {
      calls.push({ input, init });
      return { ok: true };
    },
  });
  return { authenticatedFetch: exportsObject.authenticatedFetch, calls };
}

test("authenticatedFetch rejects without a Firebase session", async () => {
  const { authenticatedFetch } = load(null);
  await assert.rejects(authenticatedFetch("/api/test"), /Sesi login/);
});

test("authenticatedFetch adds the current Firebase ID token", async () => {
  const auth = { currentUser: { getIdToken: async () => "token-123" } };
  const { authenticatedFetch, calls } = load(auth);
  await authenticatedFetch("/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.get("Authorization"), "Bearer token-123");
  assert.equal(calls[0].init.headers.get("Content-Type"), "application/json");
});
