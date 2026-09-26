const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function fixture() {
  let data = {};
  const ref = { get: async () => ({ data: () => data }) };
  const store = {
    collection: () => ({ doc: () => ref }),
    runTransaction: async (fn) => fn({ get: ref.get, set: (_, next, options) => { data = options?.merge ? { ...data, ...next } : next; } }),
  };
  const mocks = {
    "node:crypto": require("node:crypto"),
    "firebase-admin/firestore": { getFirestore: () => store },
    "@/lib/firebaseAdmin": { getFirebaseAdminApp: () => ({}) },
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200, cookies: { set: function (...args) { this.value = args; } } }) } },
    "@/lib/serverAuth": { requireApprovedUser: async () => ({ user: { uid: "test-user" } }) },
  };
  function load(file) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: (name) => { if (!mocks[name]) throw new Error(name); return mocks[name]; }, process: { env: { CASE_ACCESS_CODE: "2026", CASE_ACCESS_SECRET: "test-secret-only" } }, Buffer, Date });
    return exports;
  }
  const access = load("src/lib/caseAccess.js");
  mocks["@/lib/caseAccess"] = access;
  return { access, route: load("src/app/api/case-access/route.js"), setData: (next) => { data = next; }, getData: () => data };
}

test("case access requires the PIN and sets an HttpOnly signed session", async () => {
  const { route } = fixture();
  const wrong = await route.POST({ json: async () => ({ code: "0000" }) });
  assert.equal(wrong.status, 403);
  const result = await route.POST({ json: async () => ({ code: "2026" }) });
  assert.equal(result.status, 200);
  assert.match(result.cookies.value[1], /^[a-f0-9]{64}\.[a-f0-9]{64}$/);
  assert.equal(result.cookies.value[2].httpOnly, true);
});

test("five failed attempts block even a subsequent correct PIN", async () => {
  const { route } = fixture();
  for (let i = 0; i < 4; i++) assert.equal((await route.POST({ json: async () => ({ code: "wrong" }) })).status, 403);
  assert.equal((await route.POST({ json: async () => ({ code: "wrong" }) })).status, 429);
  assert.equal((await route.POST({ json: async () => ({ code: "2026" }) })).status, 429);
});

test("session is user-bound, expires, and rejects tampering", async () => {
  const { access, route, setData, getData } = fixture();
  const result = await route.POST({ json: async () => ({ code: "2026" }) });
  const value = result.cookies.value[1];
  const request = { cookies: { get: () => ({ value }) } };
  assert.equal(await access.requireCaseAccess(request, "test-user"), null);
  assert.equal((await access.requireCaseAccess(request, "different-user")).status, 403);
  assert.equal((await access.requireCaseAccess({ cookies: { get: () => ({ value: value + "0" }) } }, "test-user")).status, 403);
  setData({ ...getData(), expiresAt: Date.now() - 1 });
  assert.equal((await access.requireCaseAccess(request, "test-user")).status, 403);
});

test("patient action aliases are protected without blocking implant reads", () => {
  const { access } = fixture();
  for (const action of ["list_patient_cases", "readPatientCases", "create_patient_case", "update-patient-case", "delete_patient_case"]) assert.equal(access.isPatientCaseAction(action), true);
  assert.equal(access.isPatientCaseAction("list"), false);
  assert.equal(access.isPatientCaseAction("create_implant_usage"), false);
});
