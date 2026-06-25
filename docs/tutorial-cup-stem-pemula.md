# Tutorial Pemula: Menggunakan Template Cup dan Stem

Panduan ini menjelaskan alur dasar menggunakan aplikasi templating X-ray untuk memasang template cup acetabular dan stem femoral. Gunakan panduan ini sebagai bantuan workflow visual. Keputusan ukuran implant tetap harus diverifikasi oleh dokter/operator.

## 1. Masuk ke Aplikasi

1. Buka aplikasi di browser.
2. Login jika halaman meminta akun.
3. Masuk ke halaman `Simple UI`.
4. Pastikan tampilan utama sudah terbuka dengan canvas kosong dan `Quick Panel` di sisi kiri.

## 2. Upload X-ray

1. Di `Quick Panel`, buka bagian `Upload & Sheet`.
2. Pilih salah satu sumber:
   - `Drive` untuk mengambil X-ray dari library/Google Drive.
   - `Lokal` untuk upload file dari komputer.
3. Pilih gambar X-ray AP pelvis atau AP hip yang akan digunakan.
4. Tunggu sampai gambar tampil di canvas.

Tips gambar:
- Gunakan X-ray AP pelvis/hip yang lurus dan tidak terlalu miring.
- Pastikan marker kalibrasi, ruler, atau referensi ukuran terlihat bila tersedia.
- Untuk templating THA, area acetabulum dan femur proximal harus terlihat jelas.

## 3. Kalibrasi Skala

Kalibrasi penting agar ukuran template mendekati skala nyata.

1. Di `Quick Panel`, klik `Kalibrasi`.
2. Pilih atau buat garis referensi pada marker/ruler di X-ray.
3. Letakkan dua titik ujung garis pada referensi yang ukurannya diketahui.
4. Isi nilai ukuran real, misalnya `25 mm`, `50 mm`, atau sesuai marker.
5. Klik `Simpan Kalibrasi`.
6. Pastikan status kalibrasi berubah menjadi aktif.

Jika tidak ada marker:
- Template masih bisa dipakai sebagai panduan visual.
- Akurasi ukuran akan lebih rendah.
- Sesuaikan template dengan anatomi secara manual dan verifikasi secara klinis.

## 4. Membuka Implant Library

1. Di `Quick Panel`, buka bagian `Implant Library`.
2. Pilih tab sesuai implant:
   - `CUP` untuk acetabular cup.
   - `STEM` untuk femoral stem.
3. List implant akan dikelompokkan berdasarkan sistem/brand.
4. Klik group untuk membuka atau menutup daftar item.
5. Pilih ukuran/template yang ingin digunakan.

## 5. Menambahkan Template Cup

1. Buka `Implant Library`.
2. Klik tab `CUP`.
3. Pilih template cup yang sesuai, misalnya Trilogy Cup atau item cup lain yang tersedia.
4. Klik `Pakai`.
5. Template cup akan masuk ke canvas sebagai layer implant.

Setelah cup muncul di canvas:
1. Pilih layer cup jika belum aktif.
2. Gunakan mode `Move` untuk menggeser template.
3. Posisikan cup pada acetabulum.
4. Buka `Layer Settings` bila perlu mengatur:
   - `Scale`
   - `Rotate`
   - `Opacity`
   - `Contrast`
   - `Level`
5. Sesuaikan cup sampai kontur template mengikuti acetabulum.

Target visual umum:
- Cup berada di pusat acetabulum.
- Ukuran cup tidak terlalu medial atau lateral.
- Abduction/inclination diperkirakan sesuai rencana operator.
- Coverage superior dan medial terlihat masuk akal.

## 6. Menambahkan Template Stem

1. Buka kembali `Implant Library`.
2. Klik tab `STEM`.
3. Pilih template stem yang diinginkan.
4. Klik `Pakai`.
5. Template stem akan ditambahkan sebagai layer baru.

Setelah stem muncul:
1. Pilih layer stem.
2. Gunakan `Move` untuk memindahkan stem ke femur proximal.
3. Gunakan `Rotate` untuk mengikuti axis femur.
4. Gunakan `Scale` bila ukuran perlu disesuaikan.
5. Atur `Opacity` agar X-ray dan template sama-sama terlihat.

Target visual umum:
- Stem mengikuti canal femur.
- Distal stem sejajar dengan shaft femur.
- Proximal stem mengisi metaphysis dengan baik.
- Neck dan head center mendekati pusat rotasi yang direncanakan.

## 7. Mengatur Layer Implant

Untuk membuka pengaturan layer:

1. Pilih implant di canvas atau buka panel layer/manager.
2. Klik `Layer Settings`.
3. Gunakan kontrol berikut:
   - `Move`: mengaktifkan mode geser.
   - `Center`: memindahkan layer ke tengah canvas.
   - `Copy`: menggandakan layer.
   - `Hide`: menyembunyikan layer sementara.
   - `Lock`: mengunci scale agar tidak berubah.
   - `Default`: mengembalikan rotasi, opacity, contrast, dan level.
   - `Flip H`: membalik horizontal jika orientasi tidak sesuai.
   - `Delete`: menghapus layer.

Bagian `Transform & Tampilan`:
- `Scale`: ukuran template di canvas.
- `Rotate`: sudut rotasi template.
- `Opacity`: transparansi template.
- `Contrast`: kontras layer implant.
- `Level`: brightness/level layer implant.

## 8. Mengganti Template yang Sudah Dipasang

Jika ingin mengganti cup atau stem tanpa mengulang posisi dari awal:

1. Pilih layer implant yang ingin diganti.
2. Buka `Implant Library`.
3. Pilih template baru.
4. Klik `Ganti`.
5. Template aktif akan diganti, sementara posisi dan beberapa setting layer dipertahankan.

Gunakan ini untuk membandingkan ukuran cup/stem yang berbeda.

## 9. Workflow Praktis THA Sederhana

Urutan kerja yang disarankan:

1. Upload X-ray AP pelvis.
2. Kalibrasi skala.
3. Tambahkan template cup.
4. Atur cup pada acetabulum.
5. Tambahkan template stem.
6. Atur stem mengikuti canal femur.
7. Evaluasi center of rotation, offset, dan leg length secara visual.
8. Coba ukuran lain dengan `Ganti` jika perlu.
9. Simpan atau export gambar rencana.

## 10. Export Hasil

1. Buka bagian `Actions & Export`.
2. Pilih format:
   - `PNG`
   - `JPEG`
   - `PDF`
3. Pastikan layer cup dan stem terlihat sebelum export.

## 11. Troubleshooting

Template terlalu besar atau terlalu kecil:
- Pastikan kalibrasi sudah disimpan.
- Pilih layer implant lalu atur `Scale`.
- Jika memakai marker, cek lagi nilai real marker.

Template susah terlihat:
- Turunkan `Opacity`.
- Atur `Contrast` dan `Level`.
- Gunakan `Hide` sementara pada layer lain.

Cup atau stem masuk terbalik:
- Gunakan `Flip H`.
- Atur ulang `Rotate`.

Layer tidak bisa digeser:
- Pastikan mode `Move` aktif.
- Pastikan layer tidak terkunci.
- Pilih layer yang benar di panel layer/manager.

List implant tidak muncul:
- Buka `Implant Library`.
- Pastikan tab yang dipilih benar: `CUP` atau `STEM`.
- Refresh halaman jika daftar baru saja diperbarui.

## 12. Catatan Keselamatan

Aplikasi ini adalah alat bantu visual untuk templating. Hasil templating harus dikonfirmasi dengan evaluasi klinis, kualitas X-ray, kalibrasi yang benar, ketersediaan implant, dan judgement operator.
