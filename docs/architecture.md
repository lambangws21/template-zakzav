# Arsitektur Repository

## Tujuan

Struktur ini memisahkan routing, UI, domain logic, data statis, dan integrasi eksternal. Perubahan baru harus mengikuti batas tersebut agar bundle client dan API server tidak saling mencampur tanggung jawab.

## Batas Folder

### `src/app`

Berisi entry point App Router. File `page`, `layout`, `loading`, `error`, dan `route` harus tipis: validasi input, komposisi komponen, lalu delegasi ke modul domain atau service.

API handler tidak boleh mengimpor komponen React. Route client tidak boleh mengimpor modul server seperti Firebase Admin, `nodemailer`, atau secret environment.

### `src/components`

Komponen lintas fitur ditempatkan berdasarkan domain:

- `components/media`: rendering gambar dan fallback media.
- `components/hka`: workflow HKA.
- `components/digitalTemplating`: workflow TKA/THA digital.
- `components/workspace`: shell dan kontrol workspace bersama.

Komponen yang hanya dipakai satu route sebaiknya berada dekat route tersebut. Jangan membuat dua file dengan basename sama dan ekstensi `.js`/`.jsx` karena resolusi import menjadi ambigu.

### `src/lib`

Berisi kalkulasi domain, adapter Firebase/Appwrite/Google Drive, serializer, dan utilitas. Modul server-only harus dipisahkan dari modul browser dan hanya diimpor oleh route server.

### `src/data`

Satu sumber resmi untuk JSON atau konstanta katalog yang dibundel ke aplikasi. Salinan data untuk dokumentasi tidak boleh diimpor oleh runtime.

### `public` dan `docs`

`public` hanya untuk aset yang dibutuhkan browser. `docs` hanya untuk dokumentasi dan contoh integrasi; jangan menyimpan kredensial atau data pasien.

## Environment

- Gunakan `NEXT_PUBLIC_*` hanya untuk konfigurasi yang aman dikirim ke browser.
- Secret menggunakan nama tanpa prefix publik dan hanya boleh dibaca di server.
- `.env.example` hanya berisi placeholder.
- `.env.local`, service-account JSON, dan workspace lokal tidak boleh dilacak Git.
- Prefix `VITE_*` masih didukung sebagai kompatibilitas sementara. Konfigurasi deployment baru harus memakai `NEXT_PUBLIC_*`.

Jika secret pernah masuk commit, menghapusnya dari file terbaru tidak cukup. Secret harus dirotasi dan riwayat Git dibersihkan melalui prosedur terpisah.

## Quality Gate Produksi

Jalankan sebelum merge:

```bash
npm ci
npm run check
```

Build harus bebas type error. API yang mengubah data membutuhkan validasi input, autentikasi/otorisasi, batas ukuran payload, dan respons error yang tidak membocorkan secret.

## Utang Teknis Prioritas

`src/components/XrayCalibrationWorkspace.js` saat ini memegang state, event canvas, modal, toolbar, persistence, dan rendering dalam satu modul besar. Pemecahan harus dilakukan bertahap dengan urutan berikut:

1. Ekstrak komponen presentasional mobile dan modal tanpa memindahkan state.
2. Ekstrak hooks per domain: viewport, selection, layer transform, dan persistence.
3. Pindahkan kalkulasi murni ke `src/lib/xray` dan tambahkan unit test.
4. Setelah kontrak stabil, pecah workspace menjadi shell, canvas stage, dan panel controllers.

Setiap tahap harus mempertahankan perilaku dan lolos `npm run check`; hindari rewrite sekaligus pada modul ini.
