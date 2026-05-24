const DRIVE_ID_ONLY_REGEX = /^[a-zA-Z0-9_-]{20,}$/;
const DEFAULT_DRIVE_IMAGE_WIDTH = 2000;
const DISABLED_LOCAL_IMAGE_PREFIXES = [
  "/images/tkr-normed/",
  "images/tkr-normed/",
  "/images/instruments/",
  "images/instruments/",
];

function tryDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractGoogleDriveId(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  if (DRIVE_ID_ONLY_REGEX.test(raw)) return raw;

  const decoded = tryDecode(raw);
  const directMatch = decoded.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (directMatch?.[1]) return directMatch[1];

  const genericPathMatch = decoded.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (genericPathMatch?.[1]) return genericPathMatch[1];

  const ucMatch = decoded.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch?.[1]) return ucMatch[1];

  try {
    const url = new URL(decoded);
    const byQuery = url.searchParams.get("id");
    if (byQuery && DRIVE_ID_ONLY_REGEX.test(byQuery)) return byQuery;

    const byPath = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (byPath?.[1]) return byPath[1];
  } catch {
    return null;
  }

  return null;
}

function pickValueByKeys(record, keys) {
  if (!record || typeof record !== "object") return "";
  const entries = Object.entries(record);
  if (!entries.length) return "";

  const lowerValueByKey = {};
  entries.forEach(([key, value]) => {
    lowerValueByKey[String(key || "").toLowerCase()] = value;
  });

  for (const key of keys) {
    const value = lowerValueByKey[String(key || "").toLowerCase()];
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return "";
}

export function extractDriveIdFromRecord(record) {
  if (!record || typeof record !== "object") return "";

  const priorityKeys = [
    "driveId",
    "drive_id",
    "driveid",
    "drive id",
    "fileId",
    "file_id",
    "fileid",
    "googleDriveId",
    "gdriveId",
    "imageId",
    "image_id",
  ];

  const directValue = pickValueByKeys(record, priorityKeys);
  const directId = extractGoogleDriveId(directValue);
  if (directId) return directId;

  const fallbackKey = Object.keys(record).find((key) =>
    /drive.*id|file.*id|gdrive/i.test(String(key || ""))
  );
  if (fallbackKey) {
    const fallbackId = extractGoogleDriveId(record[fallbackKey]);
    if (fallbackId) return fallbackId;
  }

  const fallbackImageKeys = [
    "imageSrc",
    "imageUrl",
    "image",
    "photoUrl",
    "photourl",
    "thumbnail",
    "url",
    "link",
  ];
  const imageValue = pickValueByKeys(record, fallbackImageKeys);
  const imageId = extractGoogleDriveId(imageValue);
  if (imageId) return imageId;

  return "";
}

export function buildGoogleDriveDirectImageUrl(
  driveId,
  width = DEFAULT_DRIVE_IMAGE_WIDTH
) {
  const raw = String(driveId || "").trim();
  const id = extractGoogleDriveId(raw) || raw;
  if (!id) return "";
  return `https://lh3.googleusercontent.com/d/${id}=w${Math.max(
    320,
    Math.round(width || DEFAULT_DRIVE_IMAGE_WIDTH)
  )}`;
}

export function isGoogleDriveUrl(input) {
  if (!input) return false;
  const raw = String(input).trim();
  if (!raw) return false;

  if (extractGoogleDriveId(raw)) return true;
  return (
    raw.includes("drive.google.com") ||
    raw.includes("docs.google.com") ||
    raw.includes("googleusercontent.com")
  );
}

export function normalizeImageUrl(input) {
  let raw = String(input ?? "").trim();
  if (!raw) return "";

  if (raw.startsWith("/api/proxy-image?")) {
    const query = raw.split("?")[1] || "";
    const params = new URLSearchParams(query);
    const encoded = params.get("url");
    const decoded = tryDecode(String(encoded || "").trim());
    if (decoded) {
      raw = decoded;
    } else {
      return "";
    }
  }

  const lower = raw.toLowerCase();
  if (
    DISABLED_LOCAL_IMAGE_PREFIXES.some((prefix) => lower.startsWith(prefix))
  ) {
    return "";
  }

  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/")
  ) {
    return raw;
  }

  const driveId = extractGoogleDriveId(raw);
  if (driveId) return buildGoogleDriveDirectImageUrl(driveId);

  return raw;
}

export function toSafeImageSrc(input, fallback = "/no-image.png") {
  const normalized = normalizeImageUrl(input);
  if (!normalized) return fallback;

  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }

  const driveId = extractGoogleDriveId(normalized) || extractGoogleDriveId(input);
  if (driveId) {
    return `/api/google-drive-image?driveId=${encodeURIComponent(driveId)}`;
  }

  if (isGoogleDriveUrl(input) || isGoogleDriveUrl(normalized)) {
    return `/api/google-drive-image?src=${encodeURIComponent(normalized)}`;
  }

  const isHttpUrl =
    normalized.startsWith("http://") || normalized.startsWith("https://");
  if (!isHttpUrl) {
    return fallback;
  }

  return normalized;
}

export function buildGoogleDriveImageCandidates(input) {
  const normalized = normalizeImageUrl(input);
  const id = extractGoogleDriveId(normalized);
  if (!id) return normalized ? [normalized] : [];

  return [
    buildGoogleDriveDirectImageUrl(id),
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.usercontent.google.com/uc?id=${id}&export=view`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];
}
