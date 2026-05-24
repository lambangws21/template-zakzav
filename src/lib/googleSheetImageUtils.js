import {
  buildGoogleDriveDirectImageUrl,
  buildGoogleDriveImageCandidates,
  extractDriveIdFromRecord,
  extractGoogleDriveId,
  normalizeImageUrl,
  toSafeImageSrc,
} from "@/lib/googleDriveImage";

export const DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "";

function asText(value) {
  return String(value ?? "").trim();
}

function pickFirst(record, keys) {
  if (!record || typeof record !== "object") return "";
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = asText(record[key]);
    if (value) return value;
  }
  return "";
}

function parseJsonSafe(raw) {
  const cleaned = asText(raw).replace(/^\uFEFF/, "");
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeSheetItem(input, index = 0) {
  if (!input || typeof input !== "object") return null;
  const driveId = extractDriveFileId(input);
  const rawImage =
    pickFirst(input, [
      "imageSrc",
      "imageURL",
      "imageUrl",
      "image",
      "photo",
      "photoUrl",
      "url",
      "link",
    ]) || (driveId ? buildGoogleDriveDirectImageUrl(driveId) : "");

  const imageSrc = normalizeImageUrl(rawImage);
  const id =
    pickFirst(input, ["id", "ID", "submissionId", "catalogNo", "catalogno", "code", "kode"]) ||
    `${index + 1}`;
  const name =
    pickFirst(input, ["name", "Name", "title", "Title", "instrument", "description"]) ||
    `Item ${index + 1}`;

  return {
    ...input,
    id,
    name,
    tags: pickFirst(input, ["tags", "Tags"]),
    driveId,
    imageSrc,
    createdAt: pickFirst(input, ["createdAt", "created_at"]),
    updatedAt: pickFirst(input, ["updatedAt", "updated_at"]),
  };
}

function normalizeItemList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => normalizeSheetItem(item, index))
    .filter((item) => item && (item.imageSrc || item.driveId || item.name));
}

function parseCsvText(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]);
  if (!headers.length) return [];

  const rows = [];
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const cells = splitCsvLine(lines[rowIndex]);
    const row = {};
    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
      const key = String(headers[colIndex] || "").trim();
      if (!key) continue;
      row[key] = cells[colIndex] ?? "";
    }
    rows.push(row);
  }
  return normalizeItemList(rows);
}

function parseFromObject(input) {
  if (!input) return [];
  if (Array.isArray(input)) return normalizeItemList(input);

  const payloadString = asText(input.payload);
  if (payloadString) {
    const fromPayload = parseSheetRawText(payloadString);
    if (fromPayload.length) return fromPayload;
  }

  const itemArrays = [
    input.items,
    input.data,
    input.rows,
    input.values,
    input.remote?.items,
    input.remote?.data,
    input.remote?.rows,
    input.remote?.values,
  ];
  for (let i = 0; i < itemArrays.length; i += 1) {
    const normalized = normalizeItemList(itemArrays[i]);
    if (normalized.length) return normalized;
  }

  return [];
}

export function extractDriveFileId(input) {
  if (!input) return "";
  if (typeof input === "object") {
    const fromRecord = extractDriveIdFromRecord(input);
    if (fromRecord) return fromRecord;

    const candidates = [
      input.driveId,
      input.drive_id,
      input.fileId,
      input.file_id,
      input.imageSrc,
      input.imageUrl,
      input.url,
      input.link,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      const id = extractGoogleDriveId(candidates[i]);
      if (id) return id;
    }
    return "";
  }

  const id = extractGoogleDriveId(input);
  return id || "";
}

export function parseSheetRawText(raw) {
  if (!raw) return [];
  if (typeof raw === "object") {
    return parseFromObject(raw);
  }

  const text = asText(raw).replace(/^\uFEFF/, "");
  if (!text) return [];

  const jsonParsed = parseJsonSafe(text);
  if (jsonParsed && typeof jsonParsed === "object") {
    return parseFromObject(jsonParsed);
  }

  return parseCsvText(text);
}

export function buildDriveImageCandidates(src = "", driveId = "") {
  const list = [];
  const add = (value) => {
    const next = asText(value);
    if (!next) return;
    if (!list.includes(next)) list.push(next);
  };

  const normalizedSrc = normalizeImageUrl(src);
  const resolvedDriveId =
    extractDriveFileId({ driveId, imageSrc: normalizedSrc, src }) ||
    extractGoogleDriveId(driveId) ||
    extractGoogleDriveId(src);

  if (normalizedSrc) {
    add(toSafeImageSrc(normalizedSrc, ""));
    add(normalizedSrc);
  }

  if (resolvedDriveId) {
    add(`/api/google-drive-image?driveId=${encodeURIComponent(resolvedDriveId)}`);
    const driveCandidates = buildGoogleDriveImageCandidates(resolvedDriveId);
    driveCandidates.forEach((candidate) => {
      add(toSafeImageSrc(candidate, ""));
      add(candidate);
    });
  }

  if (!list.length) add("/no-image.png");
  return list;
}

export { normalizeImageUrl };
