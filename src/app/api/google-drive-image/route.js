import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildGoogleDriveImageCandidates,
  extractGoogleDriveId,
  isGoogleDriveUrl,
} from "@/lib/googleDriveImage";

export const runtime = "nodejs";

async function buildNoImageResponse(status = 200) {
  try {
    const fallbackPath = join(process.cwd(), "public", "no-image.png");
    const bytes = await readFile(fallbackPath);
    return new NextResponse(Buffer.from(bytes), {
      status,
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "X-Drive-Image-Fallback": "1",
      },
    });
  } catch {
    return new NextResponse("Image not available", { status: 502 });
  }
}

function buildCandidates({ driveId, id, src, url }) {
  const effectiveDriveId =
    String(driveId || "").trim() || String(id || "").trim();
  if (effectiveDriveId) {
    return buildGoogleDriveImageCandidates(effectiveDriveId);
  }

  const effectiveSrc = String(src || "").trim() || String(url || "").trim();
  if (!effectiveSrc) return [];

  const srcDriveId = extractGoogleDriveId(effectiveSrc);
  if (srcDriveId) {
    return buildGoogleDriveImageCandidates(srcDriveId);
  }

  if (isGoogleDriveUrl(effectiveSrc)) {
    return buildGoogleDriveImageCandidates(effectiveSrc);
  }

  return [effectiveSrc];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const candidates = buildCandidates({
    driveId: searchParams.get("driveId"),
    id: searchParams.get("id"),
    src: searchParams.get("src"),
    url: searchParams.get("url"),
  });

  if (!candidates.length) {
    return buildNoImageResponse(200);
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(7000),
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      const isImage =
        contentType.toLowerCase().startsWith("image/") ||
        contentType === "application/octet-stream";
      if (!isImage) continue;

      const body = await response.arrayBuffer();
      if (!body.byteLength) continue;

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType || "image/jpeg",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
          "X-Drive-Image-Candidate": candidate,
        },
      });
    } catch {
      // try next candidate
    }
  }

  return buildNoImageResponse(200);
}
