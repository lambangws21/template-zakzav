**Modul:** Limb length discrepancy – arthroplasty planning


## 1. Top Bar Tools (Alat Bantu Utama)
Aplikasi menyediakan *toolbar* bagian atas untuk manipulasi gambar, anotasi, dan pengelolaan data:

* **Save to cloud / Save locally:** Menyimpan status proyek perencanaan ke cloud atau perangkat lokal.
* **Ruler:** Mengukur jarak linier antara dua titik pada citra X-ray.
* **Angle:** Mengukur besar sudut anatomi.
* **Cut:** Memotong bagian tertentu dari gambar.
* **Lines:** Membuat garis referensi lurus (seperti garis inter-teardrop atau bi-ischial).
* **Interline Angle:** Mengukur sudut perpotongan antara dua garis referensi.
* **Circle:** Membuat lingkaran bantu (misalnya untuk menentukan *Center of Rotation*).
* **Quick Flip:** Membalik tampilan citra X-ray secara cepat.
* **Insert Text:** Menambahkan anotasi atau catatan teks kustom pada citra.
* **Undo / Redo / Delete:** Membatalkan, mengulangi, atau menghapus tindakan/elemen pengukuran.
* **Snapshot:** Mengambil tangkapan layar dari area perencanaan.
* **Create Report:** Membuat laporan perencanaan operasi secara otomatis dalam bentuk dokumen PDF.

---

## 2. Hip Planning Workflow (Alur Perencanaan Hip Arthroplasty)

### Step 1: Select Body Side
* **Fungsi:** Memilih sisi tubuh yang akan direncanakan untuk tindakan operasi (*Left* atau *Right*).
* **Aksi:** Menentukan panggul target pada citra X-ray (misalnya sisi kanan yang ditandai *R/SUPINE*).

### Step 2: Pelvic Analysis
* **Fungsi:** Menganalisis geometri panggul awal serta mendeteksi *Limb Length Discrepancy* (LLD).
* **Aksi:** 
  * Menetapakan garis referensi pelvis horizontal.
  * Menentukan titik *Center of Rotation* (CoR) anatomi.
  * Mengukur nilai parameter seperti *Femoral Offset* (FO), *Caput-Collum-Diaphyseal Angle* (CCD), dan *Femoral Head Diameter* (FHD).

### Step 3: Manual Femoral Resection
* **Fungsi:** Menentukan garis potong leher tulang paha (*femoral neck osteotomy*).
* **Aksi:**
  * Menempatkan tingkat dan sudut reses osteotomi relatif terhadap *lesser trochanter*.
  * Memastikan sisa panjang leher femur cukup untuk memuat komponen *stem*.

### Step 4: Insert Implants
* **Fungsi:** Pemilihan dan penempatan implan digital (*templating*) pada posisi optimal.
* **Aksi:**
  * Memilih produsen (*Manufacturer*) dan tipe produk (*Product*) untuk **Acetabular Cup** (contoh: *aap JOINTS - VarioCup*) dan **Stem** (contoh: *aap JOINTS - VarioLoc*).
  * Posisi dan ukuran implan disesuaikan untuk mengoreksi LLD dan memulihkan offset femoral secara presisi.

### Step 5: Implant Kit
* **Fungsi:** Verifikasi komponen implan secara menyeluruh.
* **Aksi:**
  * Meninjau ringkasan daftar implan yang dipilih mencakup ukuran *cup*, *stem*, *head*, maupun *liner*.
  * Memastikan kompatibilitas antar komponen sebelum tindakan bedah.

### Step 6: Surgical Technique
* **Fungsi:** Evaluasi hasil perencanaan bedah akhir.
* **Aksi:**
  * Meninjau instruksi resected length, target pengubahan panjang tungkai (*planned correction*), serta posisi implan akhir.
  * Menyelesaikan rencana operasi untuk siap ditransfer ke laporan medis.

---

## 3. Planning Log (Panel Log Perencanaan)
Panel di sebelah kanan mencatat seluruh data kuantitatif dan catatan elemen secara otomatis:

### Measurements (Pengukuran Anatomi)
Menampilkan perbandingan nilai **Initial** (kondisi pra-operasi) dan **Planned** (target pasca-operasi):
* **LLD (Limb Length Discrepancy):** Perbedaan panjang tungkai bilateral.
* **FO [L] / FO [R] (Femoral Offset):** Jarak pusat rotasi kaput femoris ke aksis medularis femur (Kiri/Kanan).
* **CCD [L] / CCD [R] (Neck-Shaft Angle):** Sudut antara leher femur dan shaft medularis. Menampilkan indikator jika nilai berada di luar rentang referensi normal (114° – 140°).
* **FHD [L] / FHD [R] (Femoral Head Diameter):** Diameter kepala femur.

### Section Log Tambahan
* **Implants:** Ringkasan nama produsen (*Manufacturer*), nama produk (*Product*), dan ukuran (*Size*) implan yang digunakan.
* **Custom Texts:** Daftar teks anotasi kustom yang ditambahkan pada citra.
* **Image Crops:** Potongan citra fokus yang disimpan dari area perencanaan tertentu.

# Hip Planning Workflow

**Hip Planning** adalah modul perencanaan bedah untuk analisis ketimpangan panjang tungkai (*Limb Length Discrepancy - LLD*) dan arthroplasty panggul (*Total Hip Arthroplasty / THA*). Modul ini membantu ahli bedah ortopedi mengevaluasi anatomi panggul, mengukur offset femoral, merencanakan tinggi reseksi leher femur, serta menempatkan komponen implan secara akurat.

---

## Tahapan Alur Kerja Utama (6-Step Workflow)

Panel navigasi memandu perencanaan secara berurutan dalam 6 tahapan berikut:

1. **Select Body Side:**
   * Pemilihan sisi panggul target yang akan dianalisis (*Left* atau *Right*).

2. **Pelvic Analysis:**
   * **Identifikasi Referensi Panggul (AP View):** Penentuan garis referensi panggul horizontal (misalnya garis inter-teardrop atau garis ischial).
   * **Pusat Rotasi & Analisis LLD:** Penentuan *Femoral Head Center* dan evaluasi awal ketimpangan panjang tungkai (*Limb Length Discrepancy*).

3. **Manual Femoral Resection:**
   * **Tentukan Osteotomy Line:** Simulasi garis pemotongan leher femur (*femoral neck resection*) dengan penyesuaian sudut dan jarak dari *lesser trochanter*.
   * **Sumbuan Femur:** Penentuan sumbu anatomi batang femur (*femoral shaft axis*) untuk memandu pemasangan *stem*.

4. **Insert Implants:**
   * **Templating Implan Panggul:** Pemilihan *Acetabular Cup*, *Femoral Stem*, serta panjang leher (*head/neck offset*) dari katalog produsen.
   * **Simulasi Alignment Implan:** Penyesuaian derajat inklinasi & anteversi *cup* serta *fit & fill* komponen *stem* pada kanalis medularis.

5. **Implant Kit:**
   * Pengelolaan daftar komponen implan, ukuran pilihan, serta set instrumen bedah yang akan disiapkan di kamar operasi.

6. **Surgical Technique:**
   * Verifikasi orientasi alat dan panduan teknik bedah dari produsen untuk memastikan eksekusi reseksi dan impaksi implan sesuai target rencana.

---

## Alat Ukur & Fitur Perencanaan Tambahan

* **Leg Length & Offset Correction:** Kalkulasi *real-time* perubahan panjang tungkai (*Leg Length*) dan *Femoral Offset* sebelum dan sesudah penempatan implan pada **Planning Log**.
* **Annotation & Tools Bar:** Dilengkapi alat pengukur jarak (*Ruler*), sudut (*Angle* / *Interline Angle*), lingkaran (*Circle*), pemotong (*Cut*), snapshot (*Snapshot*), dan pembuatan laporan (*Create Report*).