import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildGoogleDriveImageCandidates,
  extractGoogleDriveId,
  isGoogleDriveUrl,
} from "@/lib/googleDriveImage";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

  return [];
}

async function readLimitedBody(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_IMAGE_BYTES) throw new Error("Image terlalu besar.");
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image terlalu besar.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
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

      const body = await readLimitedBody(response);
      if (!body.byteLength) continue;

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType || "image/jpeg",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // try next candidate
    }
  }

  return buildNoImageResponse(200);
}
