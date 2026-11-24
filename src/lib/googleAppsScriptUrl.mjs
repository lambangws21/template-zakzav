const ALLOWED_HOSTS = new Set([
  "script.google.com",
  "script.googleusercontent.com",
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

export function isAllowedGoogleAppsScriptUrl(value) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    return (
      url.protocol === "https:" &&
      ALLOWED_HOSTS.has(url.hostname.toLowerCase()) &&
      (!url.port || url.port === "443") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export async function fetchGoogleAppsScriptUrl(value, init = {}) {
  let url = value instanceof URL ? new URL(value) : new URL(value);
  let requestInit = { ...init };

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!isAllowedGoogleAppsScriptUrl(url)) {
      throw new Error("Host Apps Script redirect tidak diizinkan.");
    }

    const response = await fetch(url, { ...requestInit, redirect: "manual" });
    const location = response.headers.get("location");
    if (!REDIRECT_STATUSES.has(response.status) || !location) return response;
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Terlalu banyak redirect dari Apps Script.");
    }

    const nextUrl = new URL(location, url);
    if (!isAllowedGoogleAppsScriptUrl(nextUrl)) {
      throw new Error("Host Apps Script redirect tidak diizinkan.");
    }

    const method = String(requestInit.method || "GET").toUpperCase();
    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) && method !== "GET" && method !== "HEAD")
    ) {
      const headers = new Headers(requestInit.headers || {});
      headers.delete("content-length");
      headers.delete("content-type");
      requestInit = { ...requestInit, method: "GET", body: undefined, headers };
    }
    url = nextUrl;
  }

  throw new Error("Terlalu banyak redirect dari Apps Script.");
}
