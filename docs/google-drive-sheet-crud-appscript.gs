const SHEET_NAME = "images";
const INSTRUMENT_PROFILE_SHEET = "InstrumentProfiles";
const DRIVE_FOLDER_ID = "1Lrwz8rfwO418Ul5TF1ORjLTyEzgio64O";

const SHEET_HEADERS = ["id", "name", "tags", "driveId", "createdAt", "updatedAt"];
const INSTRUMENT_PROFILE_HEADERS = [
  "id",
  "procedureKey",
  "catalogNo",
  "name",
  "category",
  "qty",
  "driveId",
  "imageSrc",
  "createdAt",
  "updatedAt",
];

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{20,}$/;

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = normalizeAction_(params.action || "list");
    const targetSheet = resolveTargetSheetName_(params);

    if (action === "list_instrument_profiles" || action === "read_instrument_profiles") {
      return jsonOutput_({ ok: true, status: "success", items: readInstrumentProfiles_() });
    }

    if (targetSheet === INSTRUMENT_PROFILE_SHEET) {
      return jsonOutput_({ ok: true, status: "success", items: readInstrumentProfiles_() });
    }

    const sheet = getSheet_(targetSheet, SHEET_HEADERS);
    return jsonOutput_({ ok: true, status: "success", items: readItems_(sheet) });
  } catch (error) {
    return jsonOutput_({ ok: false, status: "error", error: getErrorMessage_(error) });
  }
}

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = normalizeAction_(payload.action || "list");
    const targetSheet = resolveTargetSheetName_(payload);

    if (action === "list_instrument_profiles" || action === "read_instrument_profiles") {
      return jsonOutput_({ ok: true, status: "success", items: readInstrumentProfiles_() });
    }
    if (action === "create_instrument_profile") {
      return jsonOutput_(createInstrumentProfile_(payload));
    }
    if (action === "update_instrument_profile") {
      return jsonOutput_(updateInstrumentProfile_(payload));
    }
    if (action === "delete_instrument_profile") {
      return jsonOutput_(deleteInstrumentProfile_(payload));
    }

    if (action === "list" || action === "read") {
      if (targetSheet === INSTRUMENT_PROFILE_SHEET) {
        return jsonOutput_({ ok: true, status: "success", items: readInstrumentProfiles_() });
      }
      const sheet = getSheet_(targetSheet, SHEET_HEADERS);
      return jsonOutput_({ ok: true, status: "success", items: readItems_(sheet) });
    }

    if (action === "create" || action === "upload") {
      if (targetSheet === INSTRUMENT_PROFILE_SHEET) {
        return jsonOutput_(createInstrumentProfile_(payload));
      }
      return jsonOutput_(createItem_(payload));
    }

    if (action === "update") {
      if (targetSheet === INSTRUMENT_PROFILE_SHEET) {
        return jsonOutput_(updateInstrumentProfile_(payload));
      }
      return jsonOutput_(updateItem_(payload));
    }

    if (action === "delete") {
      if (targetSheet === INSTRUMENT_PROFILE_SHEET) {
        return jsonOutput_(deleteInstrumentProfile_(payload));
      }
      return jsonOutput_(deleteItem_(payload));
    }

    return jsonOutput_({ ok: false, status: "error", error: `Action tidak didukung: ${action}` });
  } catch (error) {
    return jsonOutput_({ ok: false, status: "error", error: getErrorMessage_(error) });
  }
}

function resolveTargetSheetName_(payload) {
  const raw =
    payload &&
    (payload.sheet || payload.sheetName || payload.tab || payload.table || payload.targetSheet);
  const name = String(raw || "").trim();
  if (!name) return SHEET_NAME;
  return name;
}

function createItem_(payload) {
  const sheetName = resolveTargetSheetName_(payload);
  const sheet = getSheet_(sheetName, SHEET_HEADERS);
  const item = payload.item || {};
  const now = isoNow_();

  let driveId = normalizeDriveId_(item.driveId || payload.driveId);
  if (item.imageDataUrl) {
    driveId = uploadImageFromDataUrl_(item);
  }
  if (!driveId) {
    throw new Error("driveId kosong. Kirim item.driveId atau item.imageDataUrl.");
  }
  assertValidDriveId_(driveId);
  setDriveFilePublicSafe_(driveId);

  const idInput = String(item.id || payload.id || "").trim();
  const id = idInput || Utilities.getUuid();
  const name = String(item.name || "").trim() || `Image ${id.slice(0, 8)}`;
  const tags = String(item.tags || "").trim();
  const row = [id, name, tags, driveId, now, now];

  sheet.appendRow(row);
  return { ok: true, status: "success", item: mapRowToItem_(row) };
}

function updateItem_(payload) {
  const sheetName = resolveTargetSheetName_(payload);
  const sheet = getSheet_(sheetName, SHEET_HEADERS);
  const item = payload.item || {};
  const id = String(payload.id || item.id || "").trim();
  if (!id) throw new Error("Field id wajib diisi untuk update.");

  const rowIndex = findRowById_(sheet, id, 1);
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
  setDriveFilePublicSafe_(driveId);

  const name = hasOwnKey_(item, "name")
    ? String(item.name || "").trim() || currentName
    : currentName;
  const tags = hasOwnKey_(item, "tags") ? String(item.tags || "").trim() : currentTags;
  const updatedAt = isoNow_();

  const nextRow = [currentId, name, tags, driveId, createdAt, updatedAt];
  sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).setValues([nextRow]);
  return { ok: true, status: "success", item: mapRowToItem_(nextRow) };
}

function deleteItem_(payload) {
  const sheetName = resolveTargetSheetName_(payload);
  const sheet = getSheet_(sheetName, SHEET_HEADERS);
  const payloadItem = payload && payload.item ? payload.item : {};
  const id = String(payload.id || payloadItem.id || "").trim();
  if (!id) throw new Error("Field id wajib diisi untuk delete.");

  const rowIndex = findRowById_(sheet, id, 1);
  if (rowIndex < 2) throw new Error(`Item dengan id ${id} tidak ditemukan.`);

  const row = sheet.getRange(rowIndex, 1, 1, SHEET_HEADERS.length).getValues()[0];
  const driveId = String(row[3] || "");

  if (payload.deleteDriveFile && driveId) {
    trashDriveFileSafe_(driveId);
  }

  sheet.deleteRow(rowIndex);
  return { ok: true, status: "success", id, driveId };
}

function getInstrumentProfileSheet_() {
  return getSheet_(INSTRUMENT_PROFILE_SHEET, INSTRUMENT_PROFILE_HEADERS);
}

function normalizeProcedureKey_(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (key === "tkr" || key === "thr" || key === "bipolar" || key === "stem") return key;
  return "";
}

function normalizeCatalogNo_(value) {
  return String(value || "").trim().toUpperCase();
}

function mapInstrumentProfileRow_(row) {
  const driveId = normalizeDriveId_(row[6]);
  return {
    id: String(row[0] || ""),
    procedureKey: normalizeProcedureKey_(row[1]),
    catalogNo: normalizeCatalogNo_(row[2]),
    name: String(row[3] || "").trim(),
    category: String(row[4] || "Tray").trim() || "Tray",
    qty: Number(row[5] || 1),
    driveId: driveId,
    imageSrc: driveIdToImageUrl_(driveId),
    createdAt: String(row[8] || ""),
    updatedAt: String(row[9] || ""),
  };
}

function readInstrumentProfiles_() {
  const sheet = getInstrumentProfileSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet
    .getRange(2, 1, lastRow - 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues();
  return values
    .map(function (row) {
      return mapInstrumentProfileRow_(row);
    })
    .filter(function (item) {
      return item.id && item.procedureKey && item.catalogNo && item.name;
    });
}

function findInstrumentProfileRowById_(sheet, id) {
  return findRowById_(sheet, id, 1);
}

function findInstrumentProfileRowByProcedureCatalog_(sheet, procedureKey, catalogNo) {
  const targetProcedure = normalizeProcedureKey_(procedureKey);
  const targetCatalog = normalizeCatalogNo_(catalogNo);
  if (!targetProcedure || !targetCatalog) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const values = sheet
    .getRange(2, 1, lastRow - 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues();

  for (let i = 0; i < values.length; i += 1) {
    const rowProcedure = normalizeProcedureKey_(values[i][1]);
    const rowCatalog = normalizeCatalogNo_(values[i][2]);
    if (rowProcedure === targetProcedure && rowCatalog === targetCatalog) {
      return i + 2;
    }
  }
  return -1;
}

function createInstrumentProfile_(payload) {
  const item = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const procedureKey = normalizeProcedureKey_(item.procedureKey || payload.procedureKey);
  const catalogNo = normalizeCatalogNo_(item.catalogNo || payload.catalogNo);
  const name = String(item.name || payload.name || "").trim();
  const category = String(item.category || payload.category || "Tray").trim() || "Tray";
  const qtyRaw = Number(item.qty || payload.qty || 1);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : 1;

  if (!procedureKey) throw new Error("procedureKey wajib diisi: tkr/thr/bipolar/stem.");
  if (!catalogNo) throw new Error("catalogNo wajib diisi.");
  if (!name) throw new Error("name wajib diisi.");

  const sheet = getInstrumentProfileSheet_();
  const now = isoNow_();
  const fallbackId = `${procedureKey}-${catalogNo}`;
  const id = String(item.id || payload.id || fallbackId).trim() || fallbackId;

  const duplicateRowById = findInstrumentProfileRowById_(sheet, id);
  const duplicateRowByCode = findInstrumentProfileRowByProcedureCatalog_(
    sheet,
    procedureKey,
    catalogNo
  );
  const existingRowIndex = duplicateRowById > 1 ? duplicateRowById : duplicateRowByCode;

  let createdAt = now;
  let currentDriveId = "";
  if (existingRowIndex > 1) {
    const current = sheet
      .getRange(existingRowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
      .getValues()[0];
    createdAt = String(current[8] || now);
    currentDriveId = String(current[6] || "");
  }

  let driveId = normalizeDriveId_(item.driveId || payload.driveId);
  if (item.imageDataUrl) {
    driveId = uploadImageFromDataUrl_(item);
  }
  if (driveId) {
    assertValidDriveId_(driveId);
    setDriveFilePublicSafe_(driveId);
  }

  const imageSrc = driveId ? driveIdToImageUrl_(driveId) : "";
  const nextRow = [
    id,
    procedureKey,
    catalogNo,
    name,
    category,
    qty,
    driveId,
    imageSrc,
    createdAt,
    now,
  ];

  if (existingRowIndex > 1) {
    sheet
      .getRange(existingRowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
      .setValues([nextRow]);
    if (
      payload.deleteOldDriveFile &&
      currentDriveId &&
      driveId &&
      currentDriveId !== driveId
    ) {
      trashDriveFileSafe_(currentDriveId);
    }
  } else {
    sheet.appendRow(nextRow);
  }

  return {
    ok: true,
    status: "success",
    item: mapInstrumentProfileRow_(nextRow),
  };
}

function updateInstrumentProfile_(payload) {
  const item = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const id = String(payload.id || item.id || "").trim();
  if (!id) throw new Error("id wajib diisi untuk update instrument profile.");

  const sheet = getInstrumentProfileSheet_();
  const rowIndex = findInstrumentProfileRowById_(sheet, id);
  if (rowIndex < 2) throw new Error(`Instrument profile id ${id} tidak ditemukan.`);

  const current = sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues()[0];
  const procedureKey = normalizeProcedureKey_(item.procedureKey || current[1]);
  const catalogNo = normalizeCatalogNo_(item.catalogNo || current[2]);
  const name = String(item.name || current[3] || "").trim();
  const category = String(item.category || current[4] || "Tray").trim() || "Tray";
  const qtyRaw = Number(item.qty || current[5] || 1);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : 1;
  const createdAt = String(current[8] || isoNow_());
  const currentDriveId = String(current[6] || "");

  if (!procedureKey) throw new Error("procedureKey wajib diisi: tkr/thr/bipolar/stem.");
  if (!catalogNo) throw new Error("catalogNo wajib diisi.");
  if (!name) throw new Error("name wajib diisi.");

  let driveId = hasOwnKey_(item, "driveId")
    ? normalizeDriveId_(item.driveId)
    : normalizeDriveId_(currentDriveId);

  if (item.imageDataUrl) {
    driveId = uploadImageFromDataUrl_(item);
  }

  if (driveId) {
    assertValidDriveId_(driveId);
    setDriveFilePublicSafe_(driveId);
  }

  const imageSrc = driveId ? driveIdToImageUrl_(driveId) : "";
  const updatedAt = isoNow_();

  const nextRow = [
    id,
    procedureKey,
    catalogNo,
    name,
    category,
    qty,
    driveId,
    imageSrc,
    createdAt,
    updatedAt,
  ];

  sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .setValues([nextRow]);

  if (
    payload.deleteOldDriveFile &&
    currentDriveId &&
    driveId &&
    currentDriveId !== driveId
  ) {
    trashDriveFileSafe_(currentDriveId);
  }

  return {
    ok: true,
    status: "success",
    item: mapInstrumentProfileRow_(nextRow),
  };
}

function deleteInstrumentProfile_(payload) {
  const sheet = getInstrumentProfileSheet_();
  const payloadItem = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const id = String(payload.id || payloadItem.id || "").trim();
  if (!id) throw new Error("id wajib diisi untuk delete instrument profile.");

  const rowIndex = findInstrumentProfileRowById_(sheet, id);
  if (rowIndex < 2) throw new Error(`Instrument profile id ${id} tidak ditemukan.`);

  const row = sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues()[0];
  const driveId = String(row[6] || "");

  sheet.deleteRow(rowIndex);

  if (payload.deleteDriveFile && driveId) {
    trashDriveFileSafe_(driveId);
  }

  return {
    ok: true,
    status: "success",
    id: id,
    driveId: driveId,
  };
}

function getSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const isDifferent = headers.some(function (header, index) {
    return currentHeaders[index] !== header;
  });
  if (isDifferent) {
    headerRange.setValues([headers]);
  }
}

function readItems_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
  return values
    .map(function (row) {
      return mapRowToItem_(row);
    })
    .filter(function (item) {
      return item.id && item.driveId;
    });
}

function mapRowToItem_(row) {
  const driveId = normalizeDriveId_(row[3]);
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    tags: String(row[2] || ""),
    driveId: driveId,
    imageSrc: driveIdToImageUrl_(driveId),
    createdAt: String(row[4] || ""),
    updatedAt: String(row[5] || ""),
  };
}

function driveIdToImageUrl_(driveId) {
  if (!driveId) return "";
  return `https://lh3.googleusercontent.com/d/${driveId}=w1600`;
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
  const byDownload = raw.match(/download\?id=([a-zA-Z0-9_-]+)/);
  if (byDownload && byDownload[1]) return byDownload[1];
  const byLh3 = raw.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (byLh3 && byLh3[1]) return byLh3[1];
  return raw;
}

function assertValidDriveId_(driveId) {
  if (!DRIVE_ID_PATTERN.test(String(driveId || "").trim())) {
    throw new Error("driveId tidak valid. Pastikan ini File ID Google Drive, bukan nama/slug.");
  }
}

function findRowById_(sheet, id, columnIndex) {
  const targetColumn = Number(columnIndex || 1);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const idColumnValues = sheet.getRange(2, targetColumn, lastRow - 1, 1).getValues();
  for (let i = 0; i < idColumnValues.length; i += 1) {
    if (String(idColumnValues[i][0] || "") === String(id || "")) {
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

function setDriveFilePublicSafe_(driveId) {
  try {
    const file = DriveApp.getFileById(driveId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (_ignored) {
    return false;
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

function normalizeAction_(value) {
  return String(value || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
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
    ContentService.MimeType.JSON
  );
}

function getErrorMessage_(error) {
  return error && error.message ? String(error.message) : String(error);
}
