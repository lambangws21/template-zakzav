const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/firebaseClient.js"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const validEnv = Object.fromEntries([
  "API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID",
].map((key) => [`NEXT_PUBLIC_FIREBASE_${key}`, `test-${key}`]));

function load({ browser = false, env = {}, fail = false, existing = false } = {}) {
  const exports = {};
  const calls = [];
  const sdk = {
    getApps: () => existing ? [{}] : [],
    getApp: () => { calls.push("getApp"); return {}; },
    initializeApp: () => { calls.push("initializeApp"); return {}; },
    getAuth: () => {
      calls.push("getAuth");
      if (fail) throw new Error("auth/invalid-api-key");
      return { currentUser: null };
    },
    getFirestore: () => { calls.push("getFirestore"); return {}; },
  };
  vm.runInNewContext(compiled, {
    exports, require: () => sdk, process: { env }, ...(browser ? { window: {} } : {}),
  });
  return { client: exports, calls };
}

test("prerender does not initialize Firebase, including when env is missing", () => {
  for (const env of [{}, validEnv]) {
    const { client, calls } = load({ env });
    assert.deepEqual(calls, []);
    assert.equal(client.auth, null);
    assert.equal(client.db, null);
    assert.throws(() => client.requireFirebaseAuth());
  }
});

test("missing browser configuration fails closed with a useful error", () => {
  const { client, calls } = load({ browser: true });
  assert.deepEqual(calls, []);
  assert.match(client.firebaseClientError, /apiKey.*authDomain.*projectId/);
  assert.throws(() => client.requireFirebaseAuth(), /Konfigurasi Firebase/);
});

test("configured browser initializes auth and Firestore and reuses existing apps", () => {
  for (const existing of [false, true]) {
    const { client, calls } = load({ browser: true, env: validEnv, existing });
    assert.deepEqual(calls, [existing ? "getApp" : "initializeApp", "getAuth", "getFirestore"]);
    assert.equal(client.firebaseClientError, null);
    assert.equal(client.requireFirebaseAuth(), client.auth);
    assert.ok(client.db);
  }
});

test("invalid SDK configuration produces an error without exposing a partial client", () => {
  const { client } = load({ browser: true, env: validEnv, fail: true });
  assert.equal(client.auth, null);
  assert.equal(client.db, null);
  assert.match(client.firebaseClientError, /auth\/invalid-api-key/);
  assert.throws(() => client.requireFirebaseAuth());
});
