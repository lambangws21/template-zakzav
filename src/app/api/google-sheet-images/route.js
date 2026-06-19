import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const REQUEST_TIMEOUT_MS = 90_000;
const HTML_TAG_PATTERN = /^\s*<(?:!doctype\s+html|html)\b/i;

function isAllowedRemote(url) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith(".google.com") ||
      host.endsWith(".googleusercontent.com") ||
      host === "script.google.com" ||
      host === "script.googleusercontent.com"
    );
  } catch {
    return false;
  }
}

function parseJsonSafe(raw) {
  const cleaned = String(raw || "").trim().replace(/^\uFEFF/, "");
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

async function forwardPostToRemote(remoteUrl, body) {
  const payloadBody = JSON.stringify(body || {});
  let response = await fetch(remoteUrl, {
    method: "POST",
    cache: "no-store",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json,text/plain,*/*",
    },
    body: payloadBody,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  let rawText = await response.text();
  let parsed = parseJsonSafe(rawText);

  if (!parsed && HTML_TAG_PATTERN.test(rawText)) {
    const redirectProbe = await fetch(remoteUrl, {
      method: "POST",
      cache: "no-store",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json,text/plain,*/*",
      },
      body: payloadBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const location = redirectProbe.headers.get("location");
    if (location) {
      const redirectedUrl = new URL(location, remoteUrl).toString();
      response = await fetch(redirectedUrl, {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "application/json,text/plain,*/*",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      rawText = await response.text();
      parsed = parseJsonSafe(rawText);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json(
      {
        ok: false,
        status: response.status || 500,
        remote: {
          ok: false,
          status: "error",
          error: "Apps Script tidak mengembalikan JSON valid.",
          rawPreview: String(rawText || "").slice(0, 500),
        },
      },
      { status: 500 }
    );
  }

  const remoteStatus = String(parsed?.status || "").toLowerCase();
  const remoteOk =
    typeof parsed?.ok === "boolean"
      ? parsed.ok
      : remoteStatus
      ? remoteStatus !== "error"
      : true;

  return NextResponse.json({
    ok: response.ok && remoteOk,
    status: response.status,
    remote: parsed,
  });
}

async function readRequestJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const remoteUrl = String(searchParams.get("url") || "").trim();
    if (!remoteUrl) {
      return NextResponse.json({ ok: false, error: "Parameter url wajib diisi." }, { status: 400 });
    }
    if (!isAllowedRemote(remoteUrl)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Host URL tidak diizinkan. Gunakan endpoint Google Apps Script / Google Sheets.",
        },
        { status: 400 },
      );
    }

    const queryWithoutUrl = new URLSearchParams(searchParams.toString());
    queryWithoutUrl.delete("url");
    const target = queryWithoutUrl.toString()
      ? `${remoteUrl}${remoteUrl.includes("?") ? "&" : "?"}${queryWithoutUrl.toString()}`
      : remoteUrl;

    const response = await fetch(target, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "application/json,text/csv,text/plain,*/*",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const rawText = await response.text();
    const parsed = parseJsonSafe(rawText);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        {
          ok: false,
          status: response.status || 500,
          remote: {
            ok: false,
            status: "error",
            error: "Apps Script GET tidak mengembalikan JSON valid.",
            rawPreview: String(rawText || "").slice(0, 500),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { ok: response.ok, status: response.status, remote: parsed },
      { status: response.ok ? 200 : response.status || 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal mengambil data sheet.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const payload = await readRequestJson(request);
    const remoteUrl = String(payload?.url || "").trim();
    if (!remoteUrl) {
      return NextResponse.json({ ok: false, error: "Field url wajib diisi." }, { status: 400 });
    }
    if (!isAllowedRemote(remoteUrl)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Host URL tidak diizinkan. Gunakan endpoint Google Apps Script / Google Sheets.",
        },
        { status: 400 },
      );
    }
    const { url, ...forwardBody } = payload || {};
    return await forwardPostToRemote(remoteUrl, forwardBody);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal meneruskan request POST ke Apps Script.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const payload = await readRequestJson(request);
    const remoteUrl = String(payload?.url || "").trim();
    if (!remoteUrl) {
      return NextResponse.json({ ok: false, error: "Field url wajib diisi." }, { status: 400 });
    }
    if (!isAllowedRemote(remoteUrl)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Host URL tidak diizinkan. Gunakan endpoint Google Apps Script / Google Sheets.",
        },
        { status: 400 },
      );
    }
    const { url, ...forwardBody } = payload || {};
    const normalizedBody = forwardBody?.action ? forwardBody : { ...forwardBody, action: "update" };
    return await forwardPostToRemote(remoteUrl, normalizedBody);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal meneruskan request PUT ke Apps Script.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const payload = await readRequestJson(request);
    const remoteUrl = String(payload?.url || "").trim();
    if (!remoteUrl) {
      return NextResponse.json({ ok: false, error: "Field url wajib diisi." }, { status: 400 });
    }
    if (!isAllowedRemote(remoteUrl)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Host URL tidak diizinkan. Gunakan endpoint Google Apps Script / Google Sheets.",
        },
        { status: 400 },
      );
    }
    const { url, ...forwardBody } = payload || {};
    const normalizedBody =
      forwardBody?.action ? forwardBody : { ...forwardBody, action: "delete" };
    return await forwardPostToRemote(remoteUrl, normalizedBody);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal meneruskan request DELETE ke Apps Script.",
      },
      { status: 500 },
    );
  }
}
