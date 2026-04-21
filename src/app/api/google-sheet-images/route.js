import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

async function forwardGetToRemote(remoteUrl) {
  const response = await fetch(remoteUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json,text/csv,text/plain,*/*",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: `Remote HTTP ${response.status}` },
      { status: response.status },
    );
  }
  const rawText = await response.text();
  return NextResponse.json({
    ok: true,
    payload: rawText,
    contentType: response.headers.get("content-type") || "",
  });
}

async function forwardPostToRemote(remoteUrl, body) {
  const response = await fetch(remoteUrl, {
    method: "POST",
    cache: "no-store",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json,text/plain,*/*",
    },
    body: JSON.stringify(body || {}),
  });

  const rawText = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: `Remote HTTP ${response.status}`, payload: rawText },
      { status: response.status },
    );
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = { ok: true, payload: rawText };
  }

  return NextResponse.json({
    ok: true,
    remote: parsed,
    raw: rawText,
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

  try {
    return await forwardGetToRemote(remoteUrl);
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
