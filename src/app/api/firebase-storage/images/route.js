import { NextResponse } from "next/server";
import {
  firebaseAdminConfig,
  getFirebaseAdminStorageBucket,
  hasFirebaseAdminConfig,
} from "@/lib/firebaseAdmin";

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|svg)$/i;

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isImageLikeFile(file) {
  const contentType = String(file?.metadata?.contentType || "").toLowerCase();
  if (contentType.startsWith("image/")) return true;
  const name = String(file?.name || "");
  return IMAGE_EXT_RE.test(name);
}

export const runtime = "nodejs";

export async function GET(request) {
  if (!hasFirebaseAdminConfig) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Firebase Admin belum terkonfigurasi. Isi FIREBASE_SERVICE_ACCOUNT_* dan FIREBASE_STORAGE_BUCKET.",
      },
      { status: 400 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const prefix = String(searchParams.get("prefix") || "").replace(/^\/+/, "");
    const maxResults = Math.max(1, Math.min(200, toInt(searchParams.get("limit"), 80)));
    const pageToken = searchParams.get("pageToken") || undefined;
    const signedUrlHours = Math.max(1, Math.min(24, toInt(searchParams.get("signedHours"), 12)));

    const bucket = getFirebaseAdminStorageBucket();
    if (!bucket) {
      return NextResponse.json(
        { ok: false, error: "Bucket Firebase tidak tersedia." },
        { status: 500 },
      );
    }

    const [files, , response] = await bucket.getFiles({
      ...(prefix ? { prefix } : {}),
      maxResults,
      ...(pageToken ? { pageToken } : {}),
      autoPaginate: false,
    });

    const expiry = Date.now() + signedUrlHours * 60 * 60 * 1000;
    const items = (
      await Promise.all(
        files.map(async (file) => {
          const fullPath = String(file.name || "");
          if (!fullPath || fullPath.endsWith("/")) return null;
          if (!isImageLikeFile(file)) return null;

          try {
            const [imageSrc] = await file.getSignedUrl({
              action: "read",
              expires: expiry,
            });
            return {
              id: `firebase-admin-${fullPath}`,
              name: fullPath.split("/").pop() || fullPath,
              imageSrc,
              fullPath,
              sourceWidth: 0,
              sourceHeight: 0,
              createdAt: file.metadata?.timeCreated || null,
            };
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);

    return NextResponse.json({
      ok: true,
      source: "firebase-admin",
      bucket: firebaseAdminConfig.storageBucket,
      prefix,
      count: items.length,
      nextPageToken: response?.nextPageToken || null,
      signedUrlHours,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal membaca Firebase Storage.",
      },
      { status: 500 },
    );
  }
}
