const test = require("node:test");
const assert = require("node:assert/strict");

let helper;

test.before(async () => {
  helper = await import("../src/lib/googleAppsScriptUrl.mjs");
});

test("allows only HTTPS Apps Script endpoints", () => {
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("https://script.google.com/macros/s/id/exec"), true);
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("https://script.googleusercontent.com/macros/echo"), true);
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("http://script.google.com/macros/s/id/exec"), false);
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("https://evil.google.com/"), false);
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("https://script.google.com:8443/"), false);
  assert.equal(helper.isAllowedGoogleAppsScriptUrl("https://user@script.google.com/"), false);
});

test("follows redirects only when the next host is allowlisted", async () => {
  const originalFetch = global.fetch;
  const requested = [];
  global.fetch = async (url, init) => {
    requested.push({ url: String(url), method: init.method || "GET", redirect: init.redirect });
    if (requested.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://script.googleusercontent.com/macros/echo" },
      });
    }
    return new Response('{"ok":true}', { status: 200 });
  };

  try {
    const response = await helper.fetchGoogleAppsScriptUrl("https://script.google.com/macros/s/id/exec");
    assert.equal(response.status, 200);
    assert.equal(requested.length, 2);
    assert.ok(requested.every((request) => request.redirect === "manual"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("blocks an external redirect without making a second request", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1:8080/internal" },
    });
  };

  try {
    await assert.rejects(
      helper.fetchGoogleAppsScriptUrl("https://script.google.com/macros/s/id/exec"),
      /redirect tidak diizinkan/,
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("changes a redirected POST to GET for 302 Apps Script responses", async () => {
  const originalFetch = global.fetch;
  const requested = [];
  global.fetch = async (url, init) => {
    requested.push({ method: init.method, body: init.body });
    if (requested.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://script.googleusercontent.com/macros/echo" },
      });
    }
    return new Response('{"ok":true}', { status: 200 });
  };

  try {
    await helper.fetchGoogleAppsScriptUrl("https://script.google.com/macros/s/id/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.deepEqual(requested, [
      { method: "POST", body: "{}" },
      { method: "GET", body: undefined },
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
