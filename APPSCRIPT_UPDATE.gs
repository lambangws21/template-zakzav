// ═══════════════════════════════════════════════════════════════════════════
// INSTRUKSI:
// 1. Buka Google Apps Script kamu: https://script.google.com
// 2. Buka project script yang URL-nya ada di NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT
// 3. Tambahkan fungsi listDriveFolder_ di bawah ini (paste sebelum doGet/doPost)
// 4. Di dalam fungsi doGet(e) yang sudah ada, tambahkan case baru (lihat bagian bawah)
// 5. Klik "Deploy" → "Manage deployments" → pilih deployment aktif → klik "Edit" (pensil)
//    → pilih "New version" → klik "Deploy"
// ═══════════════════════════════════════════════════════════════════════════


// ─── Fungsi pembantu: list isi folder Drive ────────────────────────────────
// Paste fungsi ini ke Apps Script kamu (di luar doGet/doPost)

function listDriveFolder_(folderId, withFiles) {
  try {
    var folder = DriveApp.getFolderById(folderId);

    var result = {
      ok: true,
      id: folder.getId(),
      name: folder.getName(),
      subfolders: [],
      files: []
    };

    // List subfolder (kategori implant)
    var subIter = folder.getFolders();
    while (subIter.hasNext()) {
      var sub = subIter.next();
      var subData = {
        id: sub.getId(),
        name: sub.getName(),
        files: []
      };

      // Jika withFiles=true, ambil juga gambar di dalam subfolder
      if (withFiles) {
        var fIter = sub.getFiles();
        while (fIter.hasNext()) {
          var f = fIter.next();
          var mime = f.getMimeType();
          if (mime && mime.indexOf('image/') === 0) {
            subData.files.push({
              id: f.getId(),
              name: f.getName(),
              mimeType: mime
            });
          }
        }
      }

      result.subfolders.push(subData);
    }

    // Gambar langsung di root folder ini (jika ada)
    var rootIter = folder.getFiles();
    while (rootIter.hasNext()) {
      var rf = rootIter.next();
      var rm = rf.getMimeType();
      if (rm && rm.indexOf('image/') === 0) {
        result.files.push({
          id: rf.getId(),
          name: rf.getName(),
          mimeType: rm
        });
      }
    }

    return result;

  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}


// ─── Tambahkan ke dalam doGet(e) yang sudah ada ────────────────────────────
// Cari fungsi doGet(e) di script kamu, lalu tambahkan block if ini
// di bagian paling ATAS sebelum logic lain:

/*

function doGet(e) {
  var action = e.parameter.action || '';

  // ── TAMBAHKAN INI ──────────────────────────────────────────────────────
  if (action === 'list_drive_folder') {
    var folderId  = e.parameter.folderId  || '';
    var withFiles = e.parameter.withFiles === 'true';
    var data = listDriveFolder_(folderId, withFiles);
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ── AKHIR TAMBAHAN ─────────────────────────────────────────────────────

  // ... sisa kode doGet kamu yang sudah ada ...
}

*/


// ─── Test manual (opsional) ────────────────────────────────────────────────
// Jalankan fungsi ini dari editor Apps Script untuk cek hasilnya sebelum deploy

function testListFolder() {
  var FOLDER_ID = '1QqGQnEkostRPxNPiMPmvU7BRiqSJZh7w'; // folder library implant kamu
  var result = listDriveFolder_(FOLDER_ID, true);
  Logger.log(JSON.stringify(result, null, 2));
}


// ═══════════════════════════════════════════════════════════════════════════
// PATCH 2 — SIMPAN FOTO PRE-OP TAMBAHAN (prePhotos) KE DRIVE/SHEET
//
// KENAPA INI PERLU: foto pre-op tambahan yang di-upload di Case Manager tidak
// pernah benar-benar tersimpan di Google Sheet / Google Drive. Script kamu
// sudah tahu cara menyimpan "postOpPhotos" (foto post-op), tapi TIDAK PERNAH
// diberi tahu cara menyimpan "prePhotos" (foto pre-op tambahan) — datanya
// dikirim dari aplikasi tapi diabaikan begitu saja oleh script.
//
// CARA PAKAI — tinggal copy-paste, bukan cari-ganti manual:
// 1. Buka project Apps Script kamu (script.google.com).
// 2. Untuk SETIAP blok di bawah ini: cari nama yang sama persis di script
//    kamu (mis. "const PATIENT_CASES_HEADERS = [...]" atau
//    "function readPatientCases_() { ... }"), select seluruhnya (dari kata
//    pertama sampai kurung kurawal/kurung siku penutup terakhirnya), lalu
//    HAPUS dan GANTI dengan blok yang sama dari sini (copy-paste langsung,
//    semua sudah kode jadi, tidak perlu diedit lagi).
// 3. Setelah ke-4 blok diganti, klik "Deploy" → "Manage deployments" →
//    pilih deployment aktif → "Edit" (pensil) → "New version" → "Deploy".
// 4. Tidak perlu ubah apa pun di Google Sheet secara manual — kolom baru
//    "prePhotosJson" otomatis dibuat sendiri oleh script (lihat
//    ensureHeaders_ yang sudah ada di script kamu).
//
// CATATAN: foto yang sudah terlanjur diupload SEBELUM patch ini aktif tidak
// otomatis muncul kembali (memang belum pernah tersimpan) — upload ulang
// sekali saja setelah patch ini live.
// ═══════════════════════════════════════════════════════════════════════════


// ─── GANTI 1 — const PATIENT_CASES_HEADERS ─────────────────────────────────

const PATIENT_CASES_HEADERS = [
  "id", "createdAt", "patientName", "procedure", "notes",
  "imageName", "measurementCount", "templateCount",
  "hkaSummaryJson", "implantLabel",
  "snapshotDriveId", "snapshotUrl", "source",
  "preOpSizeNum", "operationDate", "actualImplantLabel",
  "actualSizeNum", "postOpHka", "postOpNotes", "postOpUpdatedAt",
  "cupAssessmentJson",
  "postOpPhotosJson",
  "prePhotosJson",
];


// ─── GANTI 2 — function readPatientCases_() ────────────────────────────────

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
      postOpPhotosJson: String(row[21] || ""),
      prePhotosJson: String(row[22] || "[]"),
    };
  }).filter(function (item) { return item.id; });
}


// ─── GANTI 3 — function createPatientCase_(payload) ────────────────────────

function createPatientCase_(payload) {
  var data = payload && payload.data && typeof payload.data === "object" ? payload.data : (payload || {});
  var now = isoNow_();
  var id = String(data.id || "").trim() || Utilities.getUuid();
  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var existingRowIndex = findRowById_(sheet, id);
  if (existingRowIndex >= 2) {
    var existingRow = sheet.getRange(existingRowIndex, 1, 1, PATIENT_CASES_HEADERS.length).getValues()[0];
    return {
      ok: true,
      status: "success",
      message: "Kasus pasien sudah tersedia.",
      id: id,
      createdAt: String(existingRow[1] || now),
      snapshotDriveId: String(existingRow[10] || ""),
      snapshotUrl: String(existingRow[11] || ""),
      existing: true,
    };
  }

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
    "[]",
    "[]",
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


// ─── GANTI 4 — function updatePatientCase_(payload) ─────────────────────────

function updatePatientCase_(payload) {
  var id = String((payload && payload.id) || "").trim();
  if (!id) throw new Error("id wajib diisi untuk update kasus pasien.");

  var sheet = ensureSheetByName_(PATIENT_CASES_SHEET, PATIENT_CASES_HEADERS);
  var rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error("Kasus pasien id " + id + " tidak ditemukan.");

  var row = sheet.getRange(rowIndex, 1, 1, PATIENT_CASES_HEADERS.length).getValues()[0];
  var data = (payload && payload.data && typeof payload.data === "object") ? payload.data : (payload || {});
  var now = isoNow_();

  // Pre-op fields (editable from EditCaseModal)
  if (data.patientName !== undefined) row[2] = String(data.patientName || "");
  if (data.procedure !== undefined) row[3] = String(data.procedure || "");
  if (data.notes !== undefined) row[4] = String(data.notes || "");
  if (data.implantLabel !== undefined) row[9] = String(data.implantLabel || "");
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
  // cupAssessmentJson (row[20]) tidak diupdate di sini — diset saat createCase

  // Upload foto post-op ke Drive, simpan URL-nya (bukan dataURL mentah)
  if (Array.isArray(data.postOpPhotos)) {
    var existingUrls = [];
    try { existingUrls = JSON.parse(String(row[21] || "[]")); } catch (_e) {}
    var photoUrls = [];
    for (var i = 0; i < data.postOpPhotos.length; i++) {
      var photoSrc = String(data.postOpPhotos[i] || "");
      if (photoSrc.startsWith("data:image")) {
        try {
          var driveId = uploadImageFromDataUrl_({
            imageDataUrl: photoSrc,
            fileName: "postop-" + id + "-" + i + ".jpg",
            mimeType: "image/jpeg",
          });
          if (driveId) photoUrls.push(driveIdToImageUrl_(driveId));
        } catch (_err) { /* lewati foto yang gagal */ }
      } else if (photoSrc.startsWith("http")) {
        photoUrls.push(photoSrc); // sudah URL Drive, pertahankan
      }
    }
    row[21] = JSON.stringify(photoUrls);
  }

  // Upload foto pre-op tambahan ke Drive, simpan URL-nya (bukan dataURL mentah)
  if (Array.isArray(data.prePhotos)) {
    var prePhotoUrls = [];
    for (var j = 0; j < data.prePhotos.length; j++) {
      var prePhotoSrc = String(data.prePhotos[j] || "");
      if (prePhotoSrc.startsWith("data:image")) {
        try {
          var preDriveId = uploadImageFromDataUrl_({
            imageDataUrl: prePhotoSrc,
            fileName: "preop-" + id + "-" + j + ".jpg",
            mimeType: "image/jpeg",
          });
          if (preDriveId) prePhotoUrls.push(driveIdToImageUrl_(preDriveId));
        } catch (_err) { /* lewati foto yang gagal */ }
      } else if (prePhotoSrc.startsWith("http")) {
        prePhotoUrls.push(prePhotoSrc); // sudah URL Drive, pertahankan
      }
    }
    row[22] = JSON.stringify(prePhotoUrls);
  }

  sheet.getRange(rowIndex, 1, 1, PATIENT_CASES_HEADERS.length).setValues([row]);
  return {
    ok: true,
    status: "success",
    id: id,
    postOpUpdatedAt: now,
    postOpPhotosJson: String(row[21] || "[]"),
    prePhotosJson: String(row[22] || "[]"),
  };
}
