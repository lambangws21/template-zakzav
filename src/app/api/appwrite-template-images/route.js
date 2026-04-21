import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IMAGE_MIME_PREFIX = "image/";

function readConfig() {
  return {
    endpoint:
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || "",
    projectId:
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || "",
    bucketId:
      process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_BUCKET_ID ||
      process.env.VITE_APPWRITE_TEMPLATE_BUCKET_ID ||
      "",
    bucketName:
      process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_BUCKET_NAME ||
      process.env.VITE_APPWRITE_TEMPLATE_BUCKET_NAME ||
      "",
  };
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFileViewUrl(endpoint, projectId, bucketId, fileId) {
  const baseEndpoint = endpoint.replace(/\/+$/, "");
  const url = new URL(`${baseEndpoint}/storage/buckets/${bucketId}/files/${fileId}/view`);
  url.searchParams.set("project", projectId);
  return url.toString();
}

function normalizeFile(file, config) {
  const mimeType = String(file?.mimeType || "");
  if (!mimeType.startsWith(IMAGE_MIME_PREFIX)) return null;

  const id = file?.$id || file?.id;
  if (!id) return null;

  return {
    id: `storage-${id}`,
    name: file.name || `file-${String(id).slice(-6)}`,
    imageSrc: buildFileViewUrl(config.endpoint, config.projectId, config.bucketId, id),
    sourceWidth: 0,
    sourceHeight: 0,
    createdAt: file.$createdAt || file.createdAt || new Date().toISOString(),
  };
}

export async function GET(request) {
  const config = readConfig();
  if (!config.endpoint || !config.projectId || !config.bucketId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Konfigurasi Appwrite Storage belum lengkap. Isi endpoint, project ID, dan template bucket ID.",
      },
      { status: 400 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(200, toInt(searchParams.get("limit"), 60)));
    const endpoint = config.endpoint.replace(/\/+$/, "");
    const remoteUrl = new URL(`${endpoint}/storage/buckets/${config.bucketId}/files`);
    remoteUrl.searchParams.append(
      "queries[]",
      JSON.stringify({ method: "orderDesc", attribute: "$createdAt" }),
    );
    remoteUrl.searchParams.append(
      "queries[]",
      JSON.stringify({ method: "limit", values: [limit] }),
    );

    const response = await fetch(remoteUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Appwrite-Project": config.projectId,
      },
    });
    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          statusCode: response.status,
          error: `Appwrite Storage HTTP ${response.status}`,
          payload: rawText.slice(0, 500),
        },
      );
    }

    let payload = null;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Response Appwrite Storage bukan JSON valid." },
        { status: 502 },
      );
    }

    const files = Array.isArray(payload.files) ? payload.files : [];
    const items = files.map((file) => normalizeFile(file, config)).filter(Boolean);

    return NextResponse.json({
      ok: true,
      source: "appwrite-storage",
      bucketId: config.bucketId,
      bucketName: config.bucketName,
      total: payload.total ?? files.length,
      count: items.length,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Gagal membaca Appwrite Storage.",
      },
      { status: 500 },
    );
  }
}
