import { NextResponse } from "next/server";
import { extractDriveFileId } from "@/lib/googleSheetImageUtils";

export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
  "lh3.googleusercontent.com",
]);

function isAllowedGoogleImageUrl(value) {
  try {
    const parsed = new URL(value);
    return /^https?:$/i.test(parsed.protocol) && ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function buildDirectDriveCandidates({ id, url, size }) {
  const driveId = extractDriveFileId(id || url);
  if (driveId) {
    const safeSize = Math.max(256, Math.min(2400, Number.parseInt(String(size || 1600), 10) || 1600));
    return [
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${safeSize}`,
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=view&authuser=0`,
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`,
    ];
  }

  const rawUrl = String(url || "").trim();
  return rawUrl && isAllowedGoogleImageUrl(rawUrl) ? [rawUrl] : [];
}

function readFileNameFromResponse(response, fallback) {
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/^"|"$/g, ""));
  } catch {
    return match[1].replace(/^"|"$/g, "");
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const candidates = buildDirectDriveCandidates({
    id: searchParams.get("id"),
    url: searchParams.get("url"),
    size: searchParams.get("size"),
  });

  if (candidates.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Parameter id/url Google Drive tidak valid." },
      { status: 400 },
    );
  }

  let lastError = "";
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        },
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      if (!contentType.toLowerCase().startsWith("image/")) {
        lastError = `Content-Type ${contentType || "unknown"}`;
        continue;
      }

      const body = await response.arrayBuffer();
      const headers = new Headers({
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      });
      const fileName = readFileNameFromResponse(response, "google-drive-image");
      headers.set("Content-Disposition", `inline; filename="${fileName.replace(/"/g, "")}"`);

      return new NextResponse(body, { status: 200, headers });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: `Gagal memuat gambar Google Drive.${lastError ? ` ${lastError}` : ""}`,
    },
    { status: 502 },
  );
}
