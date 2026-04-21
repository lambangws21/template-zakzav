const DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.VITE_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbzuQk2jdWiJT8ANVR3XdoFQiWInwMGnJM9ZtHUHIf6MipXdNs5moRMx4NV-nXzfJ_6q/exec";

function isLikelyDriveId(value) {
  return /^[a-zA-Z0-9_-]{20,}$/.test(String(value || "").trim());
}

function driveIdToImageUrl(driveId) {
  const cleanId = String(driveId || "").trim();
  if (!cleanId) return "";
  return `https://drive.google.com/uc?export=view&id=${cleanId}`;
}

function pickBestDriveId(primary, fallback) {
  const first = String(primary || "").trim();
  const second = String(fallback || "").trim();
  if (isLikelyDriveId(first)) return first;
  if (isLikelyDriveId(second)) return second;
  return first || second;
}

function extractDriveFileId(url) {
  const value = String(url || "");
  if (isLikelyDriveId(value)) return value.trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function buildGoogleDriveImageProxyUrl(driveId, size = 1600) {
  const cleanId = String(driveId || "").trim();
  if (!cleanId) return "";
  const params = new URLSearchParams({
    id: cleanId,
    size: String(size),
  });
  return `/api/google-drive-image?${params.toString()}`;
}

function buildDriveImageCandidates(raw, fallbackDriveId = "") {
  const value = String(raw || "").trim();
  const driveIdFromValue = extractDriveFileId(value);
  const driveIdFromFallback = extractDriveFileId(fallbackDriveId);
  const resolvedDriveId = pickBestDriveId(driveIdFromValue, driveIdFromFallback);
  if (resolvedDriveId) {
    return [buildGoogleDriveImageProxyUrl(resolvedDriveId)];
  }
  if (!value) return [];
  if (value.startsWith("data:")) return [value];
  if (value.startsWith("blob:")) return [value];
  if (value.startsWith("//")) return [`https:${value}`];
  if (/^https?:\/\//i.test(value)) return [value];
  return [];
}

function normalizeImageUrl(raw, fallbackDriveId = "") {
  const candidates = buildDriveImageCandidates(raw, fallbackDriveId);
  return Array.isArray(candidates) ? candidates[0] || "" : candidates || "";
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }
  out.push(current);
  return out.map((item) => item.trim());
}

function parseCsvRows(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  if (headers.length === 0) return [];

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || "";
    });
    return row;
  });
}

function pickImageField(row) {
  if (!row || typeof row !== "object") return "";
  const keys = Object.keys(row);
  const priority = [
    "imageSrc",
    "image_url",
    "imageUrl",
    "photoUrl",
    "photo",
    "url",
    "link",
    "driveUrl",
    "drive_url",
    "src",
  ];
  for (const key of priority) {
    if (row[key]) return row[key];
  }
  const fallbackKey = keys.find((key) => /image|photo|url|link|drive|src/i.test(key));
  return fallbackKey ? row[fallbackKey] : "";
}

function pickDriveIdField(row) {
  if (!row || typeof row !== "object") return "";
  const keys = Object.keys(row);
  const priority = [
    "driveId",
    "drive_id",
    "fileId",
    "file_id",
    "googleDriveId",
    "gdriveId",
    "imageId",
    "image_id",
  ];
  for (const key of priority) {
    if (row[key]) return row[key];
  }
  const fallbackKey = keys.find((key) => /drive.*id|file.*id|gdrive/i.test(key));
  return fallbackKey ? row[fallbackKey] : "";
}

function pickNameField(row, fallback) {
  if (!row || typeof row !== "object") return fallback;
  const keys = Object.keys(row);
  const priority = ["name", "title", "label", "filename", "fileName"];
  for (const key of priority) {
    if (row[key]) return String(row[key]);
  }
  const fallbackKey = keys.find((key) => /name|title|label/i.test(key));
  return fallbackKey ? String(row[fallbackKey]) : fallback;
}

function toItem(rawRow, index) {
  if (typeof rawRow === "string") {
    const driveId = extractDriveFileId(rawRow);
    const imageSrc = normalizeImageUrl(rawRow, driveId);
    if (!imageSrc) return null;
    return {
      id: driveId || `sheet-${index}-${imageSrc.slice(-12)}`,
      name: `Sheet Image ${index + 1}`,
      imageSrc,
      driveId,
      sourceWidth: 0,
      sourceHeight: 0,
    };
  }

  if (Array.isArray(rawRow)) {
    const firstValid = rawRow.find(
      (value) => normalizeImageUrl(value) || isLikelyDriveId(value),
    );
    const driveId = extractDriveFileId(firstValid);
    const imageSrc = normalizeImageUrl(firstValid, driveId);
    if (!imageSrc) return null;
    return {
      id: driveId || `sheet-${index}-${imageSrc.slice(-12)}`,
      name: `Sheet Image ${index + 1}`,
      imageSrc,
      driveId,
      sourceWidth: 0,
      sourceHeight: 0,
    };
  }

  if (!rawRow || typeof rawRow !== "object") return null;
  const driveId = extractDriveFileId(pickDriveIdField(rawRow));
  const imageSrc = normalizeImageUrl(pickImageField(rawRow), driveId);
  if (!imageSrc) return null;
  const name = pickNameField(rawRow, `Sheet Image ${index + 1}`);
  const rowId = rawRow.id || rawRow.ID || rawRow.rowId || rawRow.row_id || "";
  return {
    id: String(rowId || driveId || `sheet-${index}-${imageSrc.slice(-12)}`),
    name,
    imageSrc,
    driveId,
    tags: String(rawRow.tags || rawRow.tag || ""),
    fileName: String(rawRow.fileName || rawRow.filename || ""),
    sourceWidth: Number(rawRow.sourceWidth || rawRow.width || 0) || 0,
    sourceHeight: Number(rawRow.sourceHeight || rawRow.height || 0) || 0,
    createdAt: String(rawRow.createdAt || rawRow.date || ""),
    updatedAt: String(rawRow.updatedAt || ""),
  };
}

function normalizeSheetPayload(payload) {
  let rows = [];

  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) rows = payload.items;
    else if (Array.isArray(payload.data)) rows = payload.data;
    else if (Array.isArray(payload.values)) rows = payload.values;
    else if (Array.isArray(payload.rows)) rows = payload.rows;
  }

  if (rows.length === 0) return [];

  if (Array.isArray(rows[0])) {
    const headerCells = rows[0].map((cell) => String(cell || "").trim());
    const mappedRows = rows.slice(1).map((cells) => {
      const rowObj = {};
      headerCells.forEach((header, index) => {
        rowObj[header || `col_${index}`] = cells[index] || "";
      });
      return rowObj;
    });
    return mappedRows
      .map((row, index) => toItem(row, index))
      .filter(Boolean)
      .slice(0, 300);
  }

  return rows
    .map((row, index) => toItem(row, index))
    .filter(Boolean)
    .slice(0, 300);
}

function parseSheetRawText(rawText) {
  let parsed = null;
  try {
    parsed = JSON.parse(String(rawText || ""));
  } catch {
    parsed = parseCsvRows(rawText);
  }
  return normalizeSheetPayload(parsed);
}

export {
  buildDriveImageCandidates,
  buildGoogleDriveImageProxyUrl,
  DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT,
  driveIdToImageUrl,
  extractDriveFileId,
  normalizeImageUrl,
  normalizeSheetPayload,
  parseCsvRows,
  parseSheetRawText,
};
