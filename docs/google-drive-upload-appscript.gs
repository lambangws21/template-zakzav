const SHEET_NAME = "images";
const DRIVE_FOLDER_ID = "1Lrwz8rfwO418Ul5TF1ORjLTyEzgio64O";
const SPREADSHEET_ID = "1YazKry6R9KYlVl_uV9V6m1g5X2n1fmxA5CHnQD5slbM";
const SHEET_HEADERS = ["id", "name", "tags", "driveId", "createdAt", "updatedAt"];
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{20,}$/;

const PATIENT_CASES_SHEET = "PatientCases";
const PATIENT_CASES_HEADERS = [
  "id", "createdAt", "patientName", "procedure", "notes",
  "imageName", "measurementCount", "templateCount",
  "hkaSummaryJson", "implantLabel",
  "snapshotDriveId", "snapshotUrl", "source",
  "preOpSizeNum", "operationDate", "actualImplantLabel",
  "actualSizeNum", "postOpHka", "postOpNotes", "postOpUpdatedAt",
  "cupAssessmentJson",
];

const IMPLANT_SUBMISSION_SHEET = "ImplantUsageSubmissions";
const IMPLANT_ITEM_SHEET = "ImplantUsageItems";
const IMPLANT_SIGNATURE_SHEET = "ImplantUsageSignatures";

const IMPLANT_SUBMISSION_HEADERS = [
  "submissionId",
  "createdAt",
  "operationDate",
  "doctorName",
  "hospitalName",
  "repAssist",
  "systemName",
  "invoiceTo",
  "patientName",
  "medrec",
  "region",
  "slotsCount",
  "slotsWithPhoto",
  "signaturesCount",
  "signaturesWithPhoto",
  "patientStickerDriveId",
  "patientStickerUrl",
  "officeDocumentationDriveId",
  "officeDocumentationUrl",
  "hospitalDocumentationDriveId",
  "hospitalDocumentationUrl",
  "checklistJson",
  "slotsJson",
  "signaturesJson",
  "source",
  "reviewStatus",
  "reviewNote",
  "reviewedAt",
  "reviewedBy",
];

const IMPLANT_ITEM_HEADERS = [
  "submissionId",
  "createdAt",
  "slotNumber",
  "slotLabel",
  "implantName",
  "implantCode",
  "driveId",
  "imageUrl",
];

const IMPLANT_SIGNATURE_HEADERS = [
  "submissionId",
  "createdAt",
  "signatureNumber",
  "signatureId",
  "roleLabel",
  "personName",
  "driveId",
  "imageUrl",
];

const INSTRUMENT_PROFILE_SHEET = "InstrumentProfiles";
const IMPLANT_PROFILE_SHEET = "ImplantProfiles";
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

function isInstrumentProfileAction_(action) {
  return (
    action === "list_instrument_profiles" ||
    action === "read_instrument_profiles" ||
    action === "listinstrumentprofiles" ||
    action === "readinstrumentprofiles"
  );
}

function isImplantProfileAction_(action) {
  return (
    action === "list_implant_profiles" ||
    action === "read_implant_profiles" ||
    action === "listimplantprofiles" ||
    action === "readimplantprofiles"
  );
}

function isCreateProfileAction_(action) {
  return (
    action === "create_instrument_profile" ||
    action === "createinstrumentprofile" ||
    action === "create_implant_profile" ||
    action === "createimplantprofile"
  );
}

function isUpdateProfileAction_(action) {
  return (
    action === "update_instrument_profile" ||
    action === "updateinstrumentprofile" ||
    action === "update_implant_profile" ||
    action === "updateimplantprofile"
  );
}

function isUpdateProfilePhotoAction_(action) {
  return (
    action === "update_instrument_profile_photo" ||
    action === "updateinstrumentprofilephoto" ||
    action === "update_implant_profile_photo" ||
    action === "updateimplantprofilephoto"
  );
}

function isDeleteProfilePhotoAction_(action) {
  return (
    action === "delete_instrument_profile_photo" ||
    action === "deleteinstrumentprofilephoto" ||
    action === "delete_implant_profile_photo" ||
    action === "deleteimplantprofilephoto"
  );
}

function isDeleteProfileAction_(action) {
  return (
    action === "delete_instrument_profile" ||
    action === "deleteinstrumentprofile" ||
    action === "delete_implant_profile" ||
    action === "deleteimplantprofile"
  );
}

function isRepairProfileImageAccessAction_(action) {
  return (
    action === "repair_instrument_profile_image_access" ||
    action === "repairinstrumentprofileimageaccess" ||
    action === "repair_implant_profile_image_access" ||
    action === "repairimplantprofileimageaccess"
  );
}

function isDriveOrphanScanAction_(action) {
  return (
    action === "scan_orphan_drive_files" ||
    action === "list_orphan_drive_files" ||
    action === "scanorphandrivefiles" ||
    action === "listorphandrivefiles"
  );
}

function isDriveOrphanDeleteAction_(action) {
  return (
    action === "delete_orphan_drive_files" ||
    action === "cleanup_orphan_drive_files" ||
    action === "deleteorphandrivefiles" ||
    action === "cleanuporphandrivefiles"
  );
}

function isImageCreateAction_(action) {
  return (
    action === "create" ||
    action === "upload" ||
    action === "upload_image" ||
    action === "uploadimage" ||
    action === "create_image" ||
    action === "createimage" ||
    action === "upload_report" ||
    action === "uploadreport"
  );
}

function isImplantReviewUpdateAction_(action) {
  return (
    action === "update_implant_usage_review" ||
    action === "updateimplantusagereview" ||
    action === "set_implant_usage_review_status" ||
    action === "setimplantusagereviewstatus" ||
    action === "update_implant_usage_submission" ||
    action === "updateimplantusagesubmission"
  );
}

function reauthDrive_(){ Logger.log(DriveApp.getRootFolder().getId()); };

function normalizeSheetHint_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isInstrumentProfileHint_(value) {
  const normalized = normalizeSheetHint_(value);
  return (
    normalized === "instrumentprofiles" ||
    normalized === normalizeSheetHint_(INSTRUMENT_PROFILE_SHEET)
  );
}

function isImplantProfileHint_(value) {
  const normalized = normalizeSheetHint_(value);
  return (
    normalized === "implantprofiles" ||
    normalized === normalizeSheetHint_(IMPLANT_PROFILE_SHEET)
  );
}

function resolveProfileScope_(action, source) {
  if (isImplantProfileAction_(action)) return "implant";
  if (isInstrumentProfileAction_(action)) return "instrument";
  if (!source || typeof source !== "object") return "";
  if (
    isImplantProfileHint_(source.sheetName) ||
    isImplantProfileHint_(source.sheet) ||
    isImplantProfileHint_(source.table) ||
    isImplantProfileHint_(source.tab)
  ) {
    return "implant";
  }
  if (
    isInstrumentProfileHint_(source.sheetName) ||
    isInstrumentProfileHint_(source.sheet) ||
    isInstrumentProfileHint_(source.table) ||
    isInstrumentProfileHint_(source.tab)
  ) {
    return "instrument";
  }
  return "";
}

function resolveProfileSheetName_(action, source) {
  const scope = resolveProfileScope_(action, source);
  if (scope === "implant") return IMPLANT_PROFILE_SHEET;
  if (scope === "instrument") return INSTRUMENT_PROFILE_SHEET;
  return "";
}

function shouldUseInstrumentProfileSheet_(action, source) {
  return resolveProfileSheetName_(action, source) === INSTRUMENT_PROFILE_SHEET;
}

function shouldUseImplantProfileSheet_(action, source) {
  return resolveProfileSheetName_(action, source) === IMPLANT_PROFILE_SHEET;
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = normalizeAction_(params.action || "");

    if (
      !action ||
      action === "all" ||
      action === "read_all" ||
      action === "list_all" ||
      action === "snapshot" ||
      action === "overview"
    ) {
      return jsonOutput_(buildAllDataSnapshot_());
    }

    if (shouldUseInstrumentProfileSheet_(action, params)) {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readInstrumentProfiles_(),
      });
    }

    if (shouldUseImplantProfileSheet_(action, params)) {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readImplantProfiles_(),
      });
    }

    if (isDriveOrphanScanAction_(action)) {
      return jsonOutput_(scanOrphanDriveFiles_(params));
    }

    if (action === "listimplantusage" || action === "readimplantusage" || action === "list_implant_usage" || action === "read_implant_usage") {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readImplantSubmissions_(),
      });
    }

    if (action === "listpatientcases" || action === "list_patient_cases" || action === "readpatientcases") {
      return jsonOutput_({ ok: true, status: "success", items: readPatientCases_() });
    }

    const sheet = getSheet_();
    const items = readItems_(sheet);
    return jsonOutput_({ ok: true, status: "success", items: items });
  } catch (error) {
    return jsonOutput_({ ok: false, status: "error", error: getErrorMessage_(error) });
  }
}

function buildAllDataSnapshot_() {
  const imageItems = readItems_(getSheet_());
  const instrumentProfiles = readInstrumentProfiles_();
  const implantProfiles = readImplantProfiles_();
  const implantUsageSubmissions = readImplantSubmissions_();
  const implantUsageItems = readImplantUsageItems_();
  const implantUsageSignatures = readImplantUsageSignatures_();

  return {
    ok: true,
    status: "success",
    message: "Semua data berhasil diambil.",
    items: imageItems,
    instrumentProfiles: instrumentProfiles,
    implantProfiles: implantProfiles,
    implantUsageSubmissions: implantUsageSubmissions,
    implantUsageItems: implantUsageItems,
    implantUsageSignatures: implantUsageSignatures,
    data: {
      images: imageItems,
      instrumentProfiles: instrumentProfiles,
      implantProfiles: implantProfiles,
      implantUsageSubmissions: implantUsageSubmissions,
      implantUsageItems: implantUsageItems,
      implantUsageSignatures: implantUsageSignatures,
    },
    counts: {
      images: imageItems.length,
      instrumentProfiles: instrumentProfiles.length,
      implantProfiles: implantProfiles.length,
      implantUsageSubmissions: implantUsageSubmissions.length,
      implantUsageItems: implantUsageItems.length,
      implantUsageSignatures: implantUsageSignatures.length,
    },
  };
}

function toPositiveInt_(value, fallback, min, max) {
  const parsed = Number(value);
  const defaultValue = Number.isFinite(fallback) ? fallback : 0;
  const minValue = Number.isFinite(min) ? min : 1;
  const maxValue = Number.isFinite(max) ? max : 100000;
  const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : defaultValue;
  return Math.max(minValue, Math.min(maxValue, normalized));
}

function toBoolean_(value, fallback) {
  if (typeof value === "boolean") return value;
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return Boolean(fallback);
  return raw === "1" || raw === "true" || raw === "yes" || raw === "y";
}

function addUsedDriveIdRef_(index, rawDriveId, source, refId) {
  const driveId = normalizeDriveId_(rawDriveId);
  if (!driveId) return;
  if (!index[driveId]) {
    index[driveId] = {
      count: 0,
      refs: [],
    };
  }
  index[driveId].count += 1;
  if (index[driveId].refs.length < 5) {
    index[driveId].refs.push({
      source: String(source || ""),
      refId: String(refId || ""),
    });
  }
}

function buildUsedDriveIdIndex_() {
  const index = {};

  const imageItems = readItems_(getSheet_());
  imageItems.forEach(function (item) {
    addUsedDriveIdRef_(index, item.driveId, "images", item.id);
  });

  const instrumentProfiles = readInstrumentProfiles_();
  instrumentProfiles.forEach(function (item) {
    addUsedDriveIdRef_(index, item.driveId, "instrumentProfiles", item.id);
  });

  const implantProfiles = readImplantProfiles_();
  implantProfiles.forEach(function (item) {
    addUsedDriveIdRef_(index, item.driveId, "implantProfiles", item.id);
  });

  const submissions = readImplantSubmissions_();
  submissions.forEach(function (item) {
    addUsedDriveIdRef_(
      index,
      item.patientStickerDriveId,
      "implantUsageSubmissions",
      item.submissionId
    );
  });

  const usageItems = readImplantUsageItems_();
  usageItems.forEach(function (item) {
    addUsedDriveIdRef_(
      index,
      item.driveId,
      "implantUsageItems",
      `${item.submissionId}#slot-${item.slotNumber}`
    );
  });

  const signatures = readImplantUsageSignatures_();
  signatures.forEach(function (item) {
    addUsedDriveIdRef_(
      index,
      item.driveId,
      "implantUsageSignatures",
      `${item.submissionId}#signature-${item.signatureNumber}`
    );
  });

  return index;
}

function getManagedDriveFolder_() {
  if (DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  }
  return DriveApp.getRootFolder();
}

function mapDriveFileMeta_(file) {
  const meta = {
    driveId: String(file.getId() || ""),
    name: String(file.getName() || ""),
    mimeType: String(file.getMimeType() || ""),
    sizeBytes: Number(file.getSize() || 0),
    url: String(file.getUrl() || ""),
    createdAt: file.getDateCreated() ? file.getDateCreated().toISOString() : "",
    updatedAt: file.getLastUpdated() ? file.getLastUpdated().toISOString() : "",
    imageSrc: driveIdToImageUrl_(file.getId()),
  };
  try {
    const md5 = file.getMd5Checksum();
    if (md5) meta.md5 = String(md5);
  } catch (_ignored) {}
  return meta;
}

function buildDuplicateGroups_(items) {
  const groupsByKey = {};
  items.forEach(function (item) {
    const key =
      item.md5 && String(item.md5).trim()
        ? `md5:${String(item.md5).trim()}`
        : `name-size:${String(item.name || "").trim().toLowerCase()}|${Number(item.sizeBytes || 0)}`;
    if (!groupsByKey[key]) groupsByKey[key] = [];
    groupsByKey[key].push(item);
  });

  const groups = [];
  Object.keys(groupsByKey).forEach(function (key) {
    const list = groupsByKey[key] || [];
    if (list.length < 2) return;
    groups.push({
      key: key,
      count: list.length,
      items: list.slice(0, 50),
    });
  });
  return groups.sort(function (a, b) {
    return b.count - a.count;
  });
}

function scanOrphanDriveFiles_(payload) {
  const params = payload && typeof payload === "object" ? payload : {};
  const includeUsedRefs = toBoolean_(params.includeUsedRefs, false);
  const maxScan = toPositiveInt_(params.maxScan || params.limit, 5000, 1, 50000);
  const previewLimit = toPositiveInt_(params.previewLimit, 300, 1, 5000);

  const folder = getManagedDriveFolder_();
  const usedIndex = buildUsedDriveIdIndex_();
  const usedIds = Object.keys(usedIndex);

  const files = folder.getFiles();
  const orphanFiles = [];
  const allScannedMeta = [];
  let scanned = 0;
  let usedInSheet = 0;

  while (files.hasNext() && scanned < maxScan) {
    const file = files.next();
    scanned += 1;
    const fileId = String(file.getId() || "");
    const meta = mapDriveFileMeta_(file);
    allScannedMeta.push(meta);

    if (usedIndex[fileId]) {
      usedInSheet += 1;
      continue;
    }
    if (orphanFiles.length < previewLimit) {
      orphanFiles.push(meta);
    }
  }

  const duplicateOrphanGroups = buildDuplicateGroups_(orphanFiles);
  const duplicateAllGroups = buildDuplicateGroups_(allScannedMeta);

  return {
    ok: true,
    status: "success",
    folderId: DRIVE_FOLDER_ID || "",
    folderName: folder.getName(),
    summary: {
      scanned: scanned,
      maxScan: maxScan,
      scanTruncated: files.hasNext(),
      totalUsedIdsInSheets: usedIds.length,
      usedInScannedFolder: usedInSheet,
      orphanInScannedFolder: Math.max(0, scanned - usedInSheet),
      previewCount: orphanFiles.length,
    },
    orphanFiles: orphanFiles,
    duplicates: {
      orphanGroups: duplicateOrphanGroups,
      allFileGroups: duplicateAllGroups,
    },
    usedDriveIds: includeUsedRefs ? usedIndex : undefined,
  };
}

function deleteOrphanDriveFiles_(payload) {
  const params = payload && typeof payload === "object" ? payload : {};
  const confirmDelete = toBoolean_(params.confirmDelete || params.forceDelete, false);
  const onlyDuplicates = toBoolean_(
    params.onlyDuplicates || params.deleteOnlyDuplicates,
    false
  );
  const maxDelete = toPositiveInt_(params.maxDelete, 1000, 1, 10000);
  const scanResult = scanOrphanDriveFiles_({
    maxScan: params.maxScan || maxDelete,
    previewLimit: params.previewLimit || maxDelete,
    includeUsedRefs: false,
  });

  if (!confirmDelete) {
    return {
      ok: false,
      status: "error",
      error:
        "Mode delete butuh konfirmasi. Kirim confirmDelete=true untuk memindahkan file orphan ke Trash.",
      scan: scanResult,
    };
  }

  const deleted = [];
  const failed = [];
  const orphanFiles = Array.isArray(scanResult.orphanFiles)
    ? scanResult.orphanFiles
    : [];

  let candidates = orphanFiles.slice();
  if (onlyDuplicates) {
    const grouped = {};
    candidates.forEach(function (item) {
      const key =
        item.md5 && String(item.md5).trim()
          ? `md5:${String(item.md5).trim()}`
          : `name-size:${String(item.name || "").trim().toLowerCase()}|${Number(
              item.sizeBytes || 0
            )}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const duplicateCandidates = [];
    Object.keys(grouped).forEach(function (key) {
      const list = grouped[key] || [];
      if (list.length < 2) return;
      for (let i = 1; i < list.length; i += 1) {
        duplicateCandidates.push(list[i]);
      }
    });
    candidates = duplicateCandidates;
  }

  const totalTarget = Math.min(candidates.length, maxDelete);

  for (let i = 0; i < totalTarget; i += 1) {
    const item = candidates[i];
    const driveId = String(item.driveId || "").trim();
    if (!driveId) continue;
    try {
      DriveApp.getFileById(driveId).setTrashed(true);
      deleted.push({
        driveId: driveId,
        name: String(item.name || ""),
      });
    } catch (error) {
      failed.push({
        driveId: driveId,
        name: String(item.name || ""),
        error: getErrorMessage_(error),
      });
    }
  }

  return {
    ok: true,
    status: "success",
    message: "Pembersihan orphan selesai.",
    summary: {
      mode: onlyDuplicates ? "duplicates-only" : "all-orphans",
      requested: totalTarget,
      deleted: deleted.length,
      failed: failed.length,
    },
    deleted: deleted,
    failed: failed,
    scan: scanResult.summary,
  };
}

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = normalizeAction_(payload.action || "list");

    if (action === "list" || action === "read") {
      if (shouldUseInstrumentProfileSheet_(action, payload)) {
        return jsonOutput_({
          ok: true,
          status: "success",
          items: readInstrumentProfiles_(),
        });
      }
      if (shouldUseImplantProfileSheet_(action, payload)) {
        return jsonOutput_({
          ok: true,
          status: "success",
          items: readImplantProfiles_(),
        });
      }
      const sheet = getSheet_();
      return jsonOutput_({ ok: true, status: "success", items: readItems_(sheet) });
    }

    if (action === "createimplantusage" || action === "create_implant_usage") {
      return jsonOutput_(createImplantUsage_(payload));
    }

    if (action === "createpatientcase" || action === "create_patient_case") {
      return jsonOutput_(createPatientCase_(payload));
    }

    if (action === "deletepatientcase" || action === "delete_patient_case") {
      return jsonOutput_(deletePatientCase_(payload));
    }

    if (action === "updatepatientcase" || action === "update_patient_case") {
      return jsonOutput_(updatePatientCase_(payload));
    }

    if (isImplantReviewUpdateAction_(action)) {
      return jsonOutput_(updateImplantUsageReviewStatus_(payload));
    }

    if (isCreateProfileAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(createInstrumentProfile_(payload, profileSheet));
    }

    if (isUpdateProfileAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(updateInstrumentProfile_(payload, profileSheet));
    }

    if (isUpdateProfilePhotoAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(updateInstrumentProfilePhoto_(payload, profileSheet));
    }

    if (isDeleteProfilePhotoAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(deleteInstrumentProfilePhoto_(payload, profileSheet));
    }

    if (isDeleteProfileAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(deleteInstrumentProfile_(payload, profileSheet));
    }

    if (isRepairProfileImageAccessAction_(action)) {
      const profileSheet =
        resolveProfileSheetName_(action, payload) || INSTRUMENT_PROFILE_SHEET;
      return jsonOutput_(repairInstrumentProfileImageAccess_(payload, profileSheet));
    }

    if (isDriveOrphanScanAction_(action)) {
      return jsonOutput_(scanOrphanDriveFiles_(payload));
    }

    if (isDriveOrphanDeleteAction_(action)) {
      return jsonOutput_(deleteOrphanDriveFiles_(payload));
    }

    if (isInstrumentProfileAction_(action)) {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readInstrumentProfiles_(),
      });
    }

    if (isImplantProfileAction_(action)) {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readImplantProfiles_(),
      });
    }

    if (isImageCreateAction_(action) && isImplantUsagePayload_(payload)) {
      return jsonOutput_(createImplantUsage_(payload));
    }

    if (isImageCreateAction_(action)) {
      return jsonOutput_(createItem_(payload));
    }

    if (action === "update") {
      return jsonOutput_(updateItem_(payload));
    }

    if (action === "delete") {
      return jsonOutput_(deleteItem_(payload));
    }

    if (action === "listimplantusage" || action === "readimplantusage" || action === "list_implant_usage" || action === "read_implant_usage") {
      return jsonOutput_({
        ok: true,
        status: "success",
        items: readImplantSubmissions_(),
      });
    }

    return jsonOutput_({
      ok: false,
      status: "error",
      error: `Action tidak didukung: ${action}`,
    });
  } catch (error) {
    return jsonOutput_({ ok: false, status: "error", error: getErrorMessage_(error) });
  }
}

function createItem_(payload) {
  const sheet = getSheet_();
  const item = buildItemFromPayload_(payload);
  const now = isoNow_();

  let driveId = normalizeDriveId_(item.driveId);
  if (item.imageDataUrl || item.dataUrl || item.imageBase64 || item.base64) {
    driveId = uploadImageFromDataUrl_(item);
  }
  if (!driveId) {
    throw new Error(
      "driveId kosong. Kirim driveId, imageDataUrl, atau imageBase64."
    );
  }
  assertValidDriveId_(driveId);

  const idInput = String(item.id || payload.id || "").trim();
  const id = idInput || Utilities.getUuid();
  const name = String(item.name || "").trim() || `Image ${id.slice(0, 8)}`;
  const tags = String(item.tags || "").trim();
  const row = [id, name, tags, driveId, now, now];

  sheet.appendRow(row);
  return { ok: true, status: "success", item: mapRowToItem_(row) };
}

function updateItem_(payload) {
  const sheet = getSheet_();
  const item = buildItemFromPayload_(payload);
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
  if (item.imageDataUrl || item.dataUrl || item.imageBase64 || item.base64) {
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
  return { ok: true, status: "success", item: mapRowToItem_(nextRow) };
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
  return { ok: true, status: "success", id: id, driveId: driveId };
}

function buildItemFromPayload_(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const baseItem =
    source.item && typeof source.item === "object" ? source.item : {};
  const item = {};

  Object.keys(baseItem).forEach(function (key) {
    item[key] = baseItem[key];
  });

  [
    "imageDataUrl",
    "dataUrl",
    "imageBase64",
    "base64",
    "fileName",
    "filename",
    "mimeType",
    "contentType",
    "driveId",
    "name",
    "tags",
  ].forEach(function (key) {
    if (!hasOwnKey_(item, key) && hasOwnKey_(source, key)) {
      item[key] = source[key];
    }
  });

  return item;
}

function createImplantUsage_(payload) {
  const data =
    payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload || {};

  const createdAt = isoNow_();
  const submissionId = createSubmissionId_(data.submissionId);
  const source = String(data.source || "implant-usage-sheet").trim();

  const submissionSheet = ensureSheetByName_(IMPLANT_SUBMISSION_SHEET, IMPLANT_SUBMISSION_HEADERS);
  const itemSheet = ensureSheetByName_(IMPLANT_ITEM_SHEET, IMPLANT_ITEM_HEADERS);
  const signatureSheet = ensureSheetByName_(IMPLANT_SIGNATURE_SHEET, IMPLANT_SIGNATURE_HEADERS);

  const patientSticker = uploadImagePayloadIfAny_(
    data.patientStickerUpload,
    `patient-sticker-${submissionId}`
  );
  let officeDocumentation = uploadImagePayloadIfAny_(
    data.officeDocumentationUpload,
    `office-documentation-${submissionId}`
  );
  let hospitalDocumentation = uploadImagePayloadIfAny_(
    data.hospitalDocumentationUpload,
    `hospital-documentation-${submissionId}`
  );
  if (!officeDocumentation.driveId && patientSticker.driveId) {
    officeDocumentation = patientSticker;
  }
  if (!hospitalDocumentation.driveId && patientSticker.driveId) {
    hospitalDocumentation = patientSticker;
  }

  const slots = Array.isArray(data.slots) ? data.slots : [];
  const signatures = Array.isArray(data.signatures) ? data.signatures : [];
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];

  const slotItems = [];
  let slotsWithPhoto = 0;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i] || {};
    const slotNumber = Number(slot.slotNumber || i + 1);
    const image = uploadImagePayloadIfAny_(
      slot.imageUpload,
      `slot-${slotNumber}-${submissionId}`
    );
    if (image.driveId) slotsWithPhoto += 1;

    const row = [
      submissionId,
      createdAt,
      slotNumber,
      String(slot.label || ""),
      String(slot.implantName || ""),
      String(slot.implantCode || ""),
      image.driveId,
      image.imageSrc,
    ];
    itemSheet.appendRow(row);

    slotItems.push({
      slotNumber: slotNumber,
      label: String(slot.label || ""),
      implantName: String(slot.implantName || ""),
      implantCode: String(slot.implantCode || ""),
      driveId: image.driveId,
      imageSrc: image.imageSrc,
    });
  }

  const signatureItems = [];
  let signaturesWithPhoto = 0;
  for (let j = 0; j < signatures.length; j += 1) {
    const signature = signatures[j] || {};
    const signatureNumber = Number(signature.signatureNumber || j + 1);
    const image = uploadImagePayloadIfAny_(
      signature.imageUpload,
      `signature-${signatureNumber}-${submissionId}`
    );
    if (image.driveId) signaturesWithPhoto += 1;

    const row = [
      submissionId,
      createdAt,
      signatureNumber,
      String(signature.signatureId || ""),
      String(signature.roleLabel || ""),
      String(signature.personName || ""),
      image.driveId,
      image.imageSrc,
    ];
    signatureSheet.appendRow(row);

    signatureItems.push({
      signatureNumber: signatureNumber,
      signatureId: String(signature.signatureId || ""),
      roleLabel: String(signature.roleLabel || ""),
      personName: String(signature.personName || ""),
      driveId: image.driveId,
      imageSrc: image.imageSrc,
    });
  }

  const submissionRow = [
    submissionId,
    createdAt,
    String(data.operationDate || ""),
    String(data.doctorName || ""),
    String(data.hospitalName || ""),
    String(data.repAssist || ""),
    String(data.systemName || ""),
    String(data.invoiceTo || ""),
    String(data.patientName || ""),
    String(data.medrec || ""),
    String(data.region || ""),
    slots.length,
    slotsWithPhoto,
    signatures.length,
    signaturesWithPhoto,
    patientSticker.driveId,
    patientSticker.imageSrc,
    officeDocumentation.driveId,
    officeDocumentation.imageSrc,
    hospitalDocumentation.driveId,
    hospitalDocumentation.imageSrc,
    JSON.stringify(checklist),
    JSON.stringify(slotItems),
    JSON.stringify(signatureItems),
    source,
    String(data.reviewStatus || ""),
    String(data.reviewNote || ""),
    String(data.reviewedAt || ""),
    String(data.reviewedBy || ""),
  ];
  submissionSheet.appendRow(submissionRow);

  return {
    ok: true,
    status: "success",
    message: "Implant usage berhasil disimpan.",
    submissionId: submissionId,
    meta: {
      slotsCount: slots.length,
      slotsWithPhoto: slotsWithPhoto,
      signaturesCount: signatures.length,
      signaturesWithPhoto: signaturesWithPhoto,
      hasPatientSticker: Boolean(patientSticker.driveId),
      hasOfficeDocumentation: Boolean(officeDocumentation.driveId),
      hasHospitalDocumentation: Boolean(hospitalDocumentation.driveId),
    },
  };
}

function readImplantSubmissions_() {
  const submissionSheet = ensureSheetByName_(IMPLANT_SUBMISSION_SHEET, IMPLANT_SUBMISSION_HEADERS);
  const lastRow = submissionSheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = submissionSheet
    .getRange(2, 1, lastRow - 1, IMPLANT_SUBMISSION_HEADERS.length)
    .getValues();
  return values.map(function (row) {
    return {
      submissionId: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      operationDate: String(row[2] || ""),
      doctorName: String(row[3] || ""),
      hospitalName: String(row[4] || ""),
      repAssist: String(row[5] || ""),
      systemName: String(row[6] || ""),
      invoiceTo: String(row[7] || ""),
      patientName: String(row[8] || ""),
      medrec: String(row[9] || ""),
      region: String(row[10] || ""),
      slotsCount: Number(row[11] || 0),
      slotsWithPhoto: Number(row[12] || 0),
      signaturesCount: Number(row[13] || 0),
      signaturesWithPhoto: Number(row[14] || 0),
      patientStickerDriveId: String(row[15] || ""),
      patientStickerUrl: String(row[16] || ""),
      officeDocumentationDriveId: String(row[17] || ""),
      officeDocumentationUrl: String(row[18] || ""),
      hospitalDocumentationDriveId: String(row[19] || ""),
      hospitalDocumentationUrl: String(row[20] || ""),
      checklistJson: String(row[21] || "[]"),
      slotsJson: String(row[22] || "[]"),
      signaturesJson: String(row[23] || "[]"),
      source: String(row[24] || ""),
      reviewStatus: String(row[25] || ""),
      reviewNote: String(row[26] || ""),
      reviewedAt: String(row[27] || ""),
      reviewedBy: String(row[28] || ""),
    };
  });
}

function findImplantSubmissionRowById_(sheet, submissionId) {
  const target = String(submissionId || "").trim();
  if (!target) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || "").trim() === target) {
      return i + 2;
    }
  }
  return -1;
}

function updateImplantUsageReviewStatus_(payload) {
  const item =
    payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const data =
    payload && payload.data && typeof payload.data === "object" ? payload.data : {};

  const submissionId = String(
    payload.submissionId ||
      item.submissionId ||
      data.submissionId ||
      payload.id ||
      item.id ||
      ""
  ).trim();
  if (!submissionId) {
    throw new Error("submissionId wajib diisi untuk update review status.");
  }

  function pickValue_(key, fallback) {
    if (hasOwnKey_(payload, key)) return payload[key];
    if (hasOwnKey_(item, key)) return item[key];
    if (hasOwnKey_(data, key)) return data[key];
    return fallback;
  }

  const hasReviewStatusInput =
    hasOwnKey_(payload, "reviewStatus") ||
    hasOwnKey_(item, "reviewStatus") ||
    hasOwnKey_(data, "reviewStatus") ||
    hasOwnKey_(payload, "statusReview") ||
    hasOwnKey_(item, "statusReview") ||
    hasOwnKey_(data, "statusReview") ||
    hasOwnKey_(payload, "review_state") ||
    hasOwnKey_(item, "review_state") ||
    hasOwnKey_(data, "review_state");
  const hasReviewNoteInput =
    hasOwnKey_(payload, "reviewNote") ||
    hasOwnKey_(item, "reviewNote") ||
    hasOwnKey_(data, "reviewNote") ||
    hasOwnKey_(payload, "note") ||
    hasOwnKey_(item, "note") ||
    hasOwnKey_(data, "note");
  const hasReviewedAtInput =
    hasOwnKey_(payload, "reviewedAt") ||
    hasOwnKey_(item, "reviewedAt") ||
    hasOwnKey_(data, "reviewedAt");
  const hasReviewedByInput =
    hasOwnKey_(payload, "reviewedBy") ||
    hasOwnKey_(item, "reviewedBy") ||
    hasOwnKey_(data, "reviewedBy");

  const reviewStatus = String(
    pickValue_("reviewStatus", "") ||
      pickValue_("statusReview", "") ||
      pickValue_("review_state", "") ||
      ""
  )
    .trim()
    .toLowerCase();

  const reviewNote = String(
    pickValue_("reviewNote", "") || pickValue_("note", "") || ""
  ).trim();
  const reviewedAt = String(
    pickValue_("reviewedAt", "") || isoNow_()
  ).trim();
  const reviewedBy = String(
    pickValue_("reviewedBy", "") || pickValue_("source", "") || "admin-ui"
  ).trim();

  const submissionSheet = ensureSheetByName_(IMPLANT_SUBMISSION_SHEET, IMPLANT_SUBMISSION_HEADERS);
  const rowIndex = findImplantSubmissionRowById_(submissionSheet, submissionId);
  if (rowIndex < 2) {
    throw new Error(`Submission ${submissionId} tidak ditemukan di ${IMPLANT_SUBMISSION_SHEET}.`);
  }

  const row = submissionSheet
    .getRange(rowIndex, 1, 1, IMPLANT_SUBMISSION_HEADERS.length)
    .getValues()[0];

  const statusCol = IMPLANT_SUBMISSION_HEADERS.indexOf("reviewStatus");
  const noteCol = IMPLANT_SUBMISSION_HEADERS.indexOf("reviewNote");
  const reviewedAtCol = IMPLANT_SUBMISSION_HEADERS.indexOf("reviewedAt");
  const reviewedByCol = IMPLANT_SUBMISSION_HEADERS.indexOf("reviewedBy");
  const operationDateCol = IMPLANT_SUBMISSION_HEADERS.indexOf("operationDate");
  const doctorNameCol = IMPLANT_SUBMISSION_HEADERS.indexOf("doctorName");
  const hospitalNameCol = IMPLANT_SUBMISSION_HEADERS.indexOf("hospitalName");
  const repAssistCol = IMPLANT_SUBMISSION_HEADERS.indexOf("repAssist");
  const systemNameCol = IMPLANT_SUBMISSION_HEADERS.indexOf("systemName");
  const invoiceToCol = IMPLANT_SUBMISSION_HEADERS.indexOf("invoiceTo");
  const patientNameCol = IMPLANT_SUBMISSION_HEADERS.indexOf("patientName");
  const medrecCol = IMPLANT_SUBMISSION_HEADERS.indexOf("medrec");
  const regionCol = IMPLANT_SUBMISSION_HEADERS.indexOf("region");
  const checklistJsonCol = IMPLANT_SUBMISSION_HEADERS.indexOf("checklistJson");
  const patientStickerDriveCol = IMPLANT_SUBMISSION_HEADERS.indexOf("patientStickerDriveId");
  const patientStickerUrlCol = IMPLANT_SUBMISSION_HEADERS.indexOf("patientStickerUrl");
  const officeDriveCol = IMPLANT_SUBMISSION_HEADERS.indexOf("officeDocumentationDriveId");
  const officeUrlCol = IMPLANT_SUBMISSION_HEADERS.indexOf("officeDocumentationUrl");
  const hospitalDriveCol = IMPLANT_SUBMISSION_HEADERS.indexOf("hospitalDocumentationDriveId");
  const hospitalUrlCol = IMPLANT_SUBMISSION_HEADERS.indexOf("hospitalDocumentationUrl");

  function assignTextIfProvided_(columnIndex, value) {
    if (columnIndex < 0) return;
    if (value === undefined || value === null) return;
    row[columnIndex] = String(value).trim();
  }

  assignTextIfProvided_(operationDateCol, pickValue_("operationDate", undefined));
  assignTextIfProvided_(doctorNameCol, pickValue_("doctorName", undefined));
  assignTextIfProvided_(hospitalNameCol, pickValue_("hospitalName", undefined));
  assignTextIfProvided_(repAssistCol, pickValue_("repAssist", undefined));
  assignTextIfProvided_(systemNameCol, pickValue_("systemName", undefined));
  assignTextIfProvided_(invoiceToCol, pickValue_("invoiceTo", undefined));
  assignTextIfProvided_(patientNameCol, pickValue_("patientName", undefined));
  assignTextIfProvided_(medrecCol, pickValue_("medrec", undefined));
  assignTextIfProvided_(regionCol, pickValue_("region", undefined));

  const checklistJsonInput = pickValue_("checklistJson", undefined);
  if (checklistJsonCol >= 0 && checklistJsonInput !== undefined && checklistJsonInput !== null) {
    if (Array.isArray(checklistJsonInput)) {
      row[checklistJsonCol] = JSON.stringify(checklistJsonInput);
    } else {
      const checklistRaw = String(checklistJsonInput || "").trim();
      row[checklistJsonCol] = checklistRaw || "[]";
    }
  }

  const patientStickerUpload = pickValue_("patientStickerUpload", null);
  const officeDocumentationUpload = pickValue_("officeDocumentationUpload", null);
  const hospitalDocumentationUpload = pickValue_("hospitalDocumentationUpload", null);
  const deleteOldPatientSticker = toBoolean_(pickValue_("deleteOldPatientSticker", false), false);
  const deleteOldOfficeDocumentation = toBoolean_(
    pickValue_("deleteOldOfficeDocumentation", false),
    false
  );
  const deleteOldHospitalDocumentation = toBoolean_(
    pickValue_("deleteOldHospitalDocumentation", false),
    false
  );

  const oldPatientStickerDriveId =
    patientStickerDriveCol >= 0 ? String(row[patientStickerDriveCol] || "") : "";
  const oldOfficeDriveId = officeDriveCol >= 0 ? String(row[officeDriveCol] || "") : "";
  const oldHospitalDriveId = hospitalDriveCol >= 0 ? String(row[hospitalDriveCol] || "") : "";

  const patientSticker = uploadImagePayloadIfAny_(
    patientStickerUpload,
    `patient-sticker-${submissionId}`
  );
  const officeDocumentation = uploadImagePayloadIfAny_(
    officeDocumentationUpload,
    `office-documentation-${submissionId}`
  );
  const hospitalDocumentation = uploadImagePayloadIfAny_(
    hospitalDocumentationUpload,
    `hospital-documentation-${submissionId}`
  );

  if (patientSticker.driveId) {
    if (patientStickerDriveCol >= 0) row[patientStickerDriveCol] = patientSticker.driveId;
    if (patientStickerUrlCol >= 0) row[patientStickerUrlCol] = patientSticker.imageSrc;
    if (
      deleteOldPatientSticker &&
      oldPatientStickerDriveId &&
      oldPatientStickerDriveId !== patientSticker.driveId
    ) {
      trashDriveFileSafe_(oldPatientStickerDriveId);
    }
  }

  if (officeDocumentation.driveId) {
    if (officeDriveCol >= 0) row[officeDriveCol] = officeDocumentation.driveId;
    if (officeUrlCol >= 0) row[officeUrlCol] = officeDocumentation.imageSrc;
    if (
      deleteOldOfficeDocumentation &&
      oldOfficeDriveId &&
      oldOfficeDriveId !== officeDocumentation.driveId
    ) {
      trashDriveFileSafe_(oldOfficeDriveId);
    }
  }

  if (hospitalDocumentation.driveId) {
    if (hospitalDriveCol >= 0) row[hospitalDriveCol] = hospitalDocumentation.driveId;
    if (hospitalUrlCol >= 0) row[hospitalUrlCol] = hospitalDocumentation.imageSrc;
    if (
      deleteOldHospitalDocumentation &&
      oldHospitalDriveId &&
      oldHospitalDriveId !== hospitalDocumentation.driveId
    ) {
      trashDriveFileSafe_(oldHospitalDriveId);
    }
  }

  if (statusCol >= 0 && hasReviewStatusInput) row[statusCol] = reviewStatus;
  if (noteCol >= 0 && hasReviewNoteInput) row[noteCol] = reviewNote;
  if (reviewedAtCol >= 0 && (hasReviewedAtInput || hasReviewStatusInput || hasReviewNoteInput)) {
    row[reviewedAtCol] = reviewedAt;
  }
  if (reviewedByCol >= 0 && (hasReviewedByInput || hasReviewStatusInput || hasReviewNoteInput)) {
    row[reviewedByCol] = reviewedBy;
  }

  submissionSheet
    .getRange(rowIndex, 1, 1, IMPLANT_SUBMISSION_HEADERS.length)
    .setValues([row]);

  return {
    ok: true,
    status: "success",
    message: "Review status submission berhasil diperbarui.",
    submissionId: submissionId,
    reviewStatus: statusCol >= 0 ? String(row[statusCol] || "") : "",
    reviewNote: noteCol >= 0 ? String(row[noteCol] || "") : "",
    reviewedAt: reviewedAtCol >= 0 ? String(row[reviewedAtCol] || "") : "",
    reviewedBy: reviewedByCol >= 0 ? String(row[reviewedByCol] || "") : "",
    officeDocumentationDriveId: officeDriveCol >= 0 ? String(row[officeDriveCol] || "") : "",
    officeDocumentationUrl: officeUrlCol >= 0 ? String(row[officeUrlCol] || "") : "",
    hospitalDocumentationDriveId:
      hospitalDriveCol >= 0 ? String(row[hospitalDriveCol] || "") : "",
    hospitalDocumentationUrl: hospitalUrlCol >= 0 ? String(row[hospitalUrlCol] || "") : "",
  };
}

function readImplantUsageItems_() {
  const itemSheet = ensureSheetByName_(IMPLANT_ITEM_SHEET, IMPLANT_ITEM_HEADERS);
  const lastRow = itemSheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = itemSheet
    .getRange(2, 1, lastRow - 1, IMPLANT_ITEM_HEADERS.length)
    .getValues();
  return values.map(function (row) {
    return {
      submissionId: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      slotNumber: Number(row[2] || 0),
      slotLabel: String(row[3] || ""),
      implantName: String(row[4] || ""),
      implantCode: String(row[5] || ""),
      driveId: String(row[6] || ""),
      imageUrl: String(row[7] || ""),
    };
  });
}

function readImplantUsageSignatures_() {
  const signatureSheet = ensureSheetByName_(IMPLANT_SIGNATURE_SHEET, IMPLANT_SIGNATURE_HEADERS);
  const lastRow = signatureSheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = signatureSheet
    .getRange(2, 1, lastRow - 1, IMPLANT_SIGNATURE_HEADERS.length)
    .getValues();
  return values.map(function (row) {
    return {
      submissionId: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      signatureNumber: Number(row[2] || 0),
      signatureId: String(row[3] || ""),
      roleLabel: String(row[4] || ""),
      personName: String(row[5] || ""),
      driveId: String(row[6] || ""),
      imageUrl: String(row[7] || ""),
    };
  });
}

function getProfileSheet_(sheetName) {
  const target = String(sheetName || "").trim() || INSTRUMENT_PROFILE_SHEET;
  return ensureSheetByName_(target, INSTRUMENT_PROFILE_HEADERS);
}

function getInstrumentProfileSheet_() {
  return getProfileSheet_(INSTRUMENT_PROFILE_SHEET);
}

function getImplantProfileSheet_() {
  return getProfileSheet_(IMPLANT_PROFILE_SHEET);
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
  const imageFromRow = String(row[7] || "").trim();
  const imageSrc = driveId ? driveIdToImageUrl_(driveId) : imageFromRow;
  return {
    id: String(row[0] || ""),
    procedureKey: normalizeProcedureKey_(row[1]),
    catalogNo: normalizeCatalogNo_(row[2]),
    name: String(row[3] || "").trim(),
    category: String(row[4] || "Tray").trim() || "Tray",
    qty: Number(row[5] || 1),
    driveId: driveId,
    imageSrc: imageSrc,
    updatedAt: String(row[9] || ""),
    createdAt: String(row[8] || ""),
  };
}

function readProfilesBySheetName_(sheetName) {
  const sheet = getProfileSheet_(sheetName);
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

function readInstrumentProfiles_() {
  return readProfilesBySheetName_(INSTRUMENT_PROFILE_SHEET);
}

function readImplantProfiles_() {
  return readProfilesBySheetName_(IMPLANT_PROFILE_SHEET);
}

function findInstrumentProfileRowById_(sheet, id) {
  const targetId = String(id || "").trim();
  if (!targetId) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || "").trim() === targetId) return i + 2;
  }
  return -1;
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

function findInstrumentProfileRow_(sheet, payload, item) {
  const id = String((payload && payload.id) || (item && item.id) || "").trim();
  const byId = findInstrumentProfileRowById_(sheet, id);
  if (byId > 1) return byId;

  const procedureKey = normalizeProcedureKey_(
    (item && item.procedureKey) || (payload && payload.procedureKey)
  );
  const catalogNo = normalizeCatalogNo_(
    (item && item.catalogNo) || (payload && payload.catalogNo)
  );
  const byProcedureCatalog = findInstrumentProfileRowByProcedureCatalog_(
    sheet,
    procedureKey,
    catalogNo
  );
  if (byProcedureCatalog > 1) return byProcedureCatalog;
  return -1;
}

function createInstrumentProfile_(payload, sheetName) {
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

  const sheet = getProfileSheet_(sheetName);
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

function updateInstrumentProfile_(payload, sheetName) {
  const item = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const sheet = getProfileSheet_(sheetName);
  const rowIndex = findInstrumentProfileRow_(sheet, payload, item);
  if (rowIndex < 2) {
    throw new Error("Instrument profile tidak ditemukan. Kirim id atau kombinasi procedureKey+catalogNo yang valid.");
  }

  const current = sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues()[0];
  const id =
    String(payload.id || item.id || current[0] || "").trim() ||
    String(current[0] || "").trim();
  if (!id) throw new Error("id wajib diisi untuk update instrument profile.");

  const procedureKey = normalizeProcedureKey_(item.procedureKey || current[1]);
  const catalogNo = normalizeCatalogNo_(item.catalogNo || current[2]);
  const name = String(item.name || current[3] || "").trim();
  const category = String(item.category || current[4] || "Tray").trim() || "Tray";
  const qtyRaw = Number(item.qty || current[5] || 1);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : 1;
  const createdAt = String(current[8] || isoNow_());
  const currentDriveId = String(current[6] || "");
  const clearImage = Boolean(item.clearImage || payload.clearImage);

  if (!procedureKey) throw new Error("procedureKey wajib diisi: tkr/thr/bipolar/stem.");
  if (!catalogNo) throw new Error("catalogNo wajib diisi.");
  if (!name) throw new Error("name wajib diisi.");

  let driveId = normalizeDriveId_(item.driveId || currentDriveId);
  if (clearImage) {
    driveId = "";
  } else if (item.imageDataUrl) {
    driveId = uploadImageFromDataUrl_(item);
  }
  if (driveId) {
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

function updateInstrumentProfilePhoto_(payload, sheetName) {
  const item = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const sheet = getProfileSheet_(sheetName);
  const rowIndex = findInstrumentProfileRow_(sheet, payload, item);
  if (rowIndex < 2) {
    throw new Error("Instrument profile tidak ditemukan untuk update foto.");
  }

  const row = sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues()[0];
  const id = String(row[0] || "");
  const currentDriveId = String(row[6] || "");
  const clearImage = Boolean(item.clearImage || payload.clearImage);

  let nextDriveId = normalizeDriveId_(item.driveId || payload.driveId || currentDriveId);
  if (clearImage) {
    nextDriveId = "";
  } else if (item.imageDataUrl || payload.imageDataUrl) {
    nextDriveId = uploadImageFromDataUrl_({
      imageDataUrl: item.imageDataUrl || payload.imageDataUrl,
      mimeType: item.mimeType || payload.mimeType,
      fileName: item.fileName || payload.fileName,
    });
  }
  if (nextDriveId) {
    setDriveFilePublicSafe_(nextDriveId);
  }

  row[6] = nextDriveId;
  row[7] = nextDriveId ? driveIdToImageUrl_(nextDriveId) : "";
  row[9] = isoNow_();
  sheet.getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length).setValues([row]);

  if (
    payload.deleteOldDriveFile &&
    currentDriveId &&
    currentDriveId !== nextDriveId
  ) {
    trashDriveFileSafe_(currentDriveId);
  }

  return {
    ok: true,
    status: "success",
    item: mapInstrumentProfileRow_(row),
  };
}

function deleteInstrumentProfilePhoto_(payload, sheetName) {
  const item = payload && payload.item && typeof payload.item === "object" ? payload.item : {};
  const sheet = getProfileSheet_(sheetName);
  const rowIndex = findInstrumentProfileRow_(sheet, payload, item);
  if (rowIndex < 2) {
    throw new Error("Instrument profile tidak ditemukan untuk hapus foto.");
  }

  const row = sheet
    .getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues()[0];
  const driveId = String(row[6] || "");
  row[6] = "";
  row[7] = "";
  row[9] = isoNow_();
  sheet.getRange(rowIndex, 1, 1, INSTRUMENT_PROFILE_HEADERS.length).setValues([row]);

  if (payload.deleteDriveFile && driveId) {
    trashDriveFileSafe_(driveId);
  }

  return {
    ok: true,
    status: "success",
    item: mapInstrumentProfileRow_(row),
    deletedDriveId: driveId,
  };
}

function deleteInstrumentProfile_(payload, sheetName) {
  const sheet = getProfileSheet_(sheetName);
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

function repairInstrumentProfileImageAccess_(payload, sheetName) {
  const sheet = getProfileSheet_(sheetName);
  const filterProcedure = normalizeProcedureKey_(payload.procedureKey || "");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      ok: true,
      status: "success",
      total: 0,
      repaired: 0,
      failed: 0,
      errors: [],
    };
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, INSTRUMENT_PROFILE_HEADERS.length)
    .getValues();
  let total = 0;
  let repaired = 0;
  let failed = 0;
  const errors = [];

  values.forEach(function (row) {
    const procedureKey = normalizeProcedureKey_(row[1]);
    if (filterProcedure && procedureKey !== filterProcedure) return;

    const driveId = normalizeDriveId_(row[6]);
    if (!driveId) return;

    total += 1;
    const ok = setDriveFilePublicSafe_(driveId);
    if (ok) {
      repaired += 1;
    } else {
      failed += 1;
      if (errors.length < 10) {
        errors.push({
          id: String(row[0] || ""),
          procedureKey: procedureKey,
          catalogNo: String(row[2] || ""),
          driveId: driveId,
        });
      }
    }
  });

  return {
    ok: true,
    status: "success",
    total: total,
    repaired: repaired,
    failed: failed,
    errors: errors,
  };
}

function getSheet_() {
  return ensureSheetByName_(SHEET_NAME, SHEET_HEADERS);
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      "Spreadsheet tidak ditemukan. Isi SPREADSHEET_ID atau bind script ke Google Sheet."
    );
  }
  return active;
}

function ensureSheetByName_(sheetName, headers) {
  const spreadsheet = getSpreadsheet_();
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
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`;
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
  const rawDataUrl = String(item.imageDataUrl || item.dataUrl || "").trim();
  const rawBase64 = String(item.imageBase64 || item.base64 || "").trim();
  const dataUrlMatch = rawDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const base64DataUrlMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!dataUrlMatch && !rawBase64) {
    throw new Error("imageDataUrl/imageBase64 tidak valid.");
  }

  const explicitMimeType = String(
    item.mimeType || item.contentType || "",
  ).trim();
  const mimeType = String(
    explicitMimeType ||
      (dataUrlMatch && dataUrlMatch[1]) ||
      (base64DataUrlMatch && base64DataUrlMatch[1]) ||
      "image/png",
  );
  const base64 = dataUrlMatch
    ? dataUrlMatch[2]
    : base64DataUrlMatch
      ? base64DataUrlMatch[2]
      : rawBase64.replace(/^base64,/, "");
  const bytes = Utilities.base64Decode(base64);
  const extension = getExtensionByMime_(mimeType);
  const fileName =
    String(item.fileName || item.filename || "").trim() ||
    `image-${new Date().getTime()}.${extension}`;

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();
  const file = folder.createFile(blob);
  makeDriveFilePublicSafe_(file);
  return file.getId();
}

function makeDriveFilePublicSafe_(file) {
  try {
    if (!file) return false;
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (_ignored) {
    return false;
  }
}

function uploadImagePayloadIfAny_(uploadPayload, fallbackName) {
  if (!uploadPayload || typeof uploadPayload !== "object") {
    return { driveId: "", imageSrc: "" };
  }

  const dataUrl = String(uploadPayload.dataUrl || "").trim();
  if (!dataUrl) {
    return { driveId: "", imageSrc: "" };
  }

  const fileName = String(uploadPayload.fileName || fallbackName || "").trim();
  const mimeType = String(uploadPayload.mimeType || "").trim();
  const driveId = uploadImageFromDataUrl_({
    imageDataUrl: dataUrl,
    fileName: fileName || `${fallbackName || "upload"}-${Date.now()}.jpg`,
    mimeType: mimeType,
  });

  assertValidDriveId_(driveId);
  return {
    driveId: driveId,
    imageSrc: driveIdToImageUrl_(driveId),
  };
}

function createSubmissionId_(value) {
  const external = String(value || "").trim();
  if (external) return external;
  return `IMP-${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss")}-${Math.floor(
    Math.random() * 9000 + 1000
  )}`;
}

function isImplantUsagePayload_(payload) {
  const data = payload && payload.data && typeof payload.data === "object" ? payload.data : null;
  if (!data) return false;
  const hasSlots = Array.isArray(data.slots);
  const hasSignatures = Array.isArray(data.signatures);
  const hasSticker = Boolean(data.patientStickerUpload && typeof data.patientStickerUpload === "object");
  const hasOfficePhoto = Boolean(
    data.officeDocumentationUpload && typeof data.officeDocumentationUpload === "object"
  );
  const hasHospitalPhoto = Boolean(
    data.hospitalDocumentationUpload && typeof data.hospitalDocumentationUpload === "object"
  );
  return hasSlots || hasSignatures || hasSticker || hasOfficePhoto || hasHospitalPhoto;
}

function trashDriveFileSafe_(driveId) {
  try {
    const file = DriveApp.getFileById(driveId);
    file.setTrashed(true);
  } catch (_ignored) {}
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

// ─── Patient Cases ─────────────────────────────────────────────────────────────

function readPatientCases_() {
  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, PATIENT_CASES_HEADERS.length).getValues();
  return values.map(function (row) {
    var actualSizeRaw = row[16];
    var postOpHkaRaw = row[17];
    return {
      id: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      patientName: String(row[2] || ""),
      procedure: String(row[3] || ""),
      notes: String(row[4] || ""),
      imageName: String(row[5] || ""),
      measurementCount: Number(row[6] || 0),
      templateCount: Number(row[7] || 0),
      hkaSummaryJson: String(row[8] || "[]"),
      implantLabel: String(row[9] || ""),
      snapshotDriveId: String(row[10] || ""),
      snapshotUrl: String(row[11] || ""),
      source: String(row[12] || ""),
      preOpSizeNum: row[13] !== "" && row[13] !== null ? Number(row[13]) || null : null,
      operationDate: String(row[14] || ""),
      actualImplantLabel: String(row[15] || ""),
      actualSizeNum: actualSizeRaw !== "" && actualSizeRaw !== null ? Number(actualSizeRaw) || null : null,
      postOpHka: postOpHkaRaw !== "" && postOpHkaRaw !== null ? Number(postOpHkaRaw) || null : null,
      postOpNotes: String(row[18] || ""),
      postOpUpdatedAt: String(row[19] || ""),
      cupAssessmentJson: String(row[20] || ""),
    };
  }).filter(function (item) { return item.id; });
}

function createPatientCase_(payload) {
  var data = payload && payload.data && typeof payload.data === "object" ? payload.data : (payload || {});
  var now = isoNow_();
  var id = String(data.id || "").trim() || Utilities.getUuid();

  var snapshotDriveId = "";
  var snapshotUrl = "";
  if (data.snapshotDataUrl && typeof data.snapshotDataUrl === "string" && data.snapshotDataUrl.length > 100) {
    try {
      snapshotDriveId = uploadImageFromDataUrl_({
        imageDataUrl: data.snapshotDataUrl,
        fileName: "case-snapshot-" + id + ".jpg",
        mimeType: "image/jpeg",
      });
      if (snapshotDriveId) snapshotUrl = driveIdToImageUrl_(snapshotDriveId);
    } catch (_ignored) {}
  }

  var hkaSummaryJson = "[]";
  if (Array.isArray(data.hkaSummary)) {
    hkaSummaryJson = JSON.stringify(data.hkaSummary);
  } else if (typeof data.hkaSummaryJson === "string") {
    hkaSummaryJson = data.hkaSummaryJson;
  }

  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var row = [
    id, now,
    String(data.patientName || ""),
    String(data.procedure || ""),
    String(data.notes || ""),
    String(data.imageName || ""),
    Number(data.measurementCount || 0),
    Number(data.templateCount || 0),
    hkaSummaryJson,
    String(data.implantLabel || ""),
    snapshotDriveId,
    snapshotUrl,
    String(data.source || "zakzav-templating"),
    data.preOpSizeNum != null ? Number(data.preOpSizeNum) : "",
    "", "", "", "", "", "",
    String(data.cupAssessmentJson || ""),
  ];
  sheet.appendRow(row);

  return {
    ok: true,
    status: "success",
    message: "Kasus pasien berhasil disimpan.",
    id: id,
    createdAt: now,
    snapshotDriveId: snapshotDriveId,
    snapshotUrl: snapshotUrl,
  };
}

function updatePatientCase_(payload) {
  var id = String((payload && payload.id) || "").trim();
  if (!id) throw new Error("id wajib diisi untuk update kasus pasien.");

  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error("Kasus pasien id " + id + " tidak ditemukan.");

  var row = sheet.getRange(rowIndex, 1, 1, PATIENT_CASES_HEADERS.length).getValues()[0];
  var data = (payload && payload.data && typeof payload.data === "object") ? payload.data : (payload || {});
  var now = isoNow_();

  if (data.preOpSizeNum !== undefined && data.preOpSizeNum !== null && data.preOpSizeNum !== "") {
    row[13] = Number(data.preOpSizeNum);
  }
  if (data.operationDate !== undefined) row[14] = String(data.operationDate || "");
  if (data.actualImplantLabel !== undefined) row[15] = String(data.actualImplantLabel || "");
  if (data.actualSizeNum !== undefined && data.actualSizeNum !== null && data.actualSizeNum !== "") {
    row[16] = Number(data.actualSizeNum);
  }
  if (data.postOpHka !== undefined && data.postOpHka !== null && data.postOpHka !== "") {
    row[17] = Number(data.postOpHka);
  }
  if (data.postOpNotes !== undefined) row[18] = String(data.postOpNotes || "");
  row[19] = now;

  sheet.getRange(rowIndex, 1, 1, PATIENT_CASES_HEADERS.length).setValues([row]);
  return { ok: true, status: "success", id: id, postOpUpdatedAt: now };
}

function deletePatientCase_(payload) {
  var id = String((payload && payload.id) || (payload && payload.item && payload.item.id) || "").trim();
  if (!id) throw new Error("id wajib diisi untuk delete kasus pasien.");

  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error("Kasus pasien id " + id + " tidak ditemukan.");

  var row = sheet.getRange(rowIndex, 1, 1, PATIENT_CASES_HEADERS.length).getValues()[0];
  var snapshotDriveId = String(row[10] || "");
  sheet.deleteRow(rowIndex);

  if (payload.deleteSnapshot && snapshotDriveId) {
    trashDriveFileSafe_(snapshotDriveId);
  }

  return { ok: true, status: "success", id: id };
}
