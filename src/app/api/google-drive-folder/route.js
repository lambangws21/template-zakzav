import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER_TIMEOUT_MS = 8000;
const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
// Strip "- Google Drive" suffix in various languages / encodings
const DRIVE_SUFFIX_REGEX = /\s*[-–—]\s*Google Drive\s*$/i;

function extractNameFromHtml(html) {
  const raw = String(html || "");

  // 1. Try <title> tag — most reliable
  const titleMatch = raw.match(TITLE_REGEX);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim().replace(DRIVE_SUFFIX_REGEX, "").trim();
  }

  // 2. Fallback: og:title meta tag
  const ogMatch = raw.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogMatch?.[1]) {
    return ogMatch[1].trim().replace(DRIVE_SUFFIX_REGEX, "").trim();
  }

  return null;
}

async function resolveFolderName(folderId) {
  // Try the public folder page — works for any folder shared as "anyone with link"
  const url = `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FOLDER_TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "text/html,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) return null;

  // Stream only the first 8 KB to avoid large download just for the title
  const reader = res.body?.getReader();
  if (!reader) return null;

  let partial = "";
  const decoder = new TextDecoder();
  try {
    while (partial.length < 8192) {
      const { done, value } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: !done });
      // Stop early once we have enough for the <title>
      if (/<\/title>/i.test(partial)) break;
    }
  } finally {
    reader.cancel();
  }

  return extractNameFromHtml(partial);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Accept a single id= OR comma-separated ids= for batch resolve
  const single = searchParams.get("id")?.trim();
  const batch = searchParams.get("ids")?.trim();

  if (!single && !batch) {
    return NextResponse.json(
      { ok: false, error: "Param 'id' atau 'ids' wajib diisi." },
      { status: 400 }
    );
  }

  const ids = single
    ? [single]
    : batch.split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "Tidak ada folder ID valid." }, { status: 400 });
  }

  // Resolve all in parallel
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const name = await resolveFolderName(id);
      return { id, name: name || null };
    })
  );

  const folders = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { id: ids[i], name: null, error: String(r.reason) };
  });

  const ok = folders.some((f) => f.name !== null);

  return NextResponse.json(
    { ok, folders },
    {
      status: 200,
      headers: {
        // Cache 10 minutes — folder names rarely change
        "Cache-Control": "public, max-age=600, stale-while-revalidate=1800",
      },
    }
  );
}
