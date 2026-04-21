const SHEET_NAME = "images";
const DRIVE_FOLDER_ID = "1Lrwz8rfwO418Ul5TF1ORjLTyEzgio64O"; // Optional: isi folder ID Google Drive khusus upload.
const SHEET_HEADERS = ["id", "name", "tags", "driveId", "createdAt", "updatedAt"];
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{20,}$/;

function doGet() {
  try {
    const sheet = getSheet_();
    const items = readItems_(sheet);
    return jsonOutput_({ ok: true, items });
  } catch (error) {
    return jsonOutput_({ ok: false, error: getErrorMessage_(error) });
  }
}

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = String(payload.action || "list").toLowerCase();

    if (action === "list" || action === "read") {
      const sheet = getSheet_();
      return jsonOutput_({ ok: true, items: readItems_(sheet) });
    }

    if (action === "create" || action === "upload") {
      return jsonOutput_(createItem_(payload));
    }

    if (action === "update") {
      return jsonOutput_(updateItem_(payload));
    }

    if (action === "delete") {
      return jsonOutput_(deleteItem_(payload));
    }

    return jsonOutput_({ ok: false, error: `Action tidak didukung: ${action}` });
  } catch (error) {
    return jsonOutput_({ ok: false, error: getErrorMessage_(error) });
  }
}

function createItem_(payload) {
  const sheet = getSheet_();
  const item = payload.item || {};
  const now = isoNow_();

  let driveId = normalizeDriveId_(item.driveId);
  if (item.imageDataUrl) {
    driveId = uploadImageFromDataUrl_(item);
  }
  if (!driveId) {
    throw new Error("driveId kosong. Kirim item.driveId atau item.imageDataUrl.");
  }
  assertValidDriveId_(driveId);

  const idInput = String(item.id || payload.id || "").trim();
  const id = idInput || Utilities.getUuid();
  const name = String(item.name || "").trim() || `Image ${id.slice(0, 8)}`;
  const tags = String(item.tags || "").trim();
  const row = [id, name, tags, driveId, now, now];

  sheet.appendRow(row);
  return { ok: true, item: mapRowToItem_(row) };
}

function updateItem_(payload) {
  const sheet = getSheet_();
  const item = payload.item || {};
  const id = String(payload.id || item.id || "").trim();
  if (!id) throw new Error("Field id wajib diisi untuk update.");

  const rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error(`Item dengan id ${id} tidak ditemukan.`);

  const current = sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).getValues()[0];
  const currentId = String(current[0] || "");
  const currentName = String(current[1] || "");
  const currentTags = String(current[2] || "");
  const currentDriveId = String(current[3] || "");
  const createdAt = String(current[4] || isoNow_());

  let driveId = hasOwnKey_(item, "driveId")
    ? normalizeDriveId_(item.driveId)
    : normalizeDriveId_(currentDriveId);
  if (item.imageDataUrl) {
    const nextDriveId = uploadImageFromDataUrl_(item);
    if (nextDriveId) {
      if (payload.deleteOldDriveFile && currentDriveId && currentDriveId !== nextDriveId) {
        trashDriveFileSafe_(currentDriveId);
      }
      driveId = nextDriveId;
    }
  }
  if (!driveId) {
    throw new Error("driveId hasil update kosong.");
  }
  assertValidDriveId_(driveId);

  const name = hasOwnKey_(item, "name")
    ? String(item.name || "").trim() || currentName
    : currentName;
  const tags = hasOwnKey_(item, "tags") ? String(item.tags || "").trim() : currentTags;
  const updatedAt = isoNow_();

  const nextRow = [currentId, name, tags, driveId, createdAt, updatedAt];
  sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).setValues([nextRow]);
  return { ok: true, item: mapRowToItem_(nextRow) };
}

function deleteItem_(payload) {
  const sheet = getSheet_();
  const payloadItem = payload && payload.item ? payload.item : {};
  const id = String(payload.id || payloadItem.id || "").trim();
  if (!id) throw new Error("Field id wajib diisi untuk delete.");

  const rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error(`Item dengan id ${id} tidak ditemukan.`);

  const row = sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).getValues()[0];
  const driveId = String(row[3] || "");

  if (payload.deleteDriveFile && driveId) {
    trashDriveFileSafe_(driveId);
  }

  sheet.deleteRow(rowIndex);
  return { ok: true, id, driveId };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const isDifferent = SHEET_HEADERS.some((header, index) => currentHeaders[index] !== header);
  if (isDifferent) {
    headerRange.setValues([SHEET_HEADERS]);
  }
}

function readItems_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
  return values
    .map((row) => mapRowToItem_(row))
    .filter((item) => item.id && item.driveId);
}

function mapRowToItem_(row) {
  const driveId = normalizeDriveId_(row[3]);
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    tags: String(row[2] || ""),
    driveId,
    imageSrc: driveIdToImageUrl_(driveId),
    createdAt: String(row[4] || ""),
    updatedAt: String(row[5] || ""),
  };
}

function driveIdToImageUrl_(driveId) {
  if (!driveId) return "";
  return `https://drive.google.com/uc?export=view&id=${driveId}`;
}

function normalizeDriveId_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const byPath = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath && byPath[1]) return byPath[1];
  const byQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery && byQuery[1]) return byQuery[1];
  const byUc = raw.match(/uc\?id=([a-zA-Z0-9_-]+)/);
  if (byUc && byUc[1]) return byUc[1];
  return raw;
}

function assertValidDriveId_(driveId) {
  if (!DRIVE_ID_PATTERN.test(String(driveId || "").trim())) {
    throw new Error("driveId tidak valid. Pastikan ini File ID Google Drive, bukan nama/slug.");
  }
}

function findRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idColumnValues.length; i += 1) {
    if (String(idColumnValues[i][0] || "") === id) {
      return i + 2;
    }
  }
  return -1;
}

function uploadImageFromDataUrl_(item) {
  const rawDataUrl = String(item.imageDataUrl || "");
  const matched = rawDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matched) {
    throw new Error("imageDataUrl tidak valid.");
  }

  const mimeType = String(item.mimeType || matched[1] || "application/octet-stream");
  const base64 = matched[2];
  const bytes = Utilities.base64Decode(base64);
  const extension = getExtensionByMime_(mimeType);
  const fileName =
    String(item.fileName || "").trim() || `image-${new Date().getTime()}.${extension}`;

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

function trashDriveFileSafe_(driveId) {
  try {
    const file = DriveApp.getFileById(driveId);
    file.setTrashed(true);
  } catch (_ignored) {
    // Abaikan kalau file sudah tidak ada / tidak bisa diakses.
  }
}

function parseRequestBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function hasOwnKey_(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function isoNow_() {
  return new Date().toISOString();
}

function getExtensionByMime_(mimeType) {
  const table = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return table[mimeType] || "bin";
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getErrorMessage_(error) {
  return error && error.message ? String(error.message) : String(error);
}
