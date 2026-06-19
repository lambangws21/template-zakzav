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
