# Google Drive + Google Sheet CRUD Setup

1. Buka Google Sheets baru.
2. Masuk ke `Extensions > Apps Script`.
3. Copy isi file [google-drive-sheet-crud-appscript.gs](/Users/macbookairm1/Documents/starter-for-nextjs/docs/google-drive-sheet-crud-appscript.gs) ke editor Apps Script.
4. (Opsional) isi `DRIVE_FOLDER_ID` jika upload harus masuk folder tertentu.
5. Klik `Deploy > New deployment > Web app`.
6. Set:
  - `Execute as`: `Me`
  - `Who has access`: `Anyone`
7. Copy URL Web App (`.../exec`) dan gunakan di halaman `/google-sheet-drive`.

## Payload dari UI

- `GET /api/google-sheet-images?url=...` -> baca list.
- `POST /api/google-sheet-images` action `create` -> create row + upload file (jika `imageDataUrl` ada).
- `PUT /api/google-sheet-images` action `update` -> update metadata / replace gambar.
- `DELETE /api/google-sheet-images` action `delete` -> hapus row (opsional hapus file Drive jika `deleteDriveFile: true`).

## Struktur kolom sheet

Header otomatis:

`id | name | tags | driveId | createdAt | updatedAt`

Preview gambar di UI dibentuk dari `driveId`:

`https://drive.google.com/uc?export=view&id=<driveId>`
