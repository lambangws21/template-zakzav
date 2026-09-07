

**ZakZav Templating** adalah perangkat lunak perencanaan implan berbasis web (*web-based implant planning software*) yang dirancang khusus untuk membantu ahli bedah ortopedi dalam melakukan analisis sumbu mekanis dan perencanaan koreksi sebelum prosedur pembedahan penggantian sendi lutut (Bicondylar Knee Replacement).

---

## Fitur Utama

* **Analisis Sumbu Mekanis & Sudut (Knee Axis Analysis):**
  * Mengukur parameter biomekanik secara presisi, seperti **mLPFA**, **AMA**, **Mikulicz line**, **MAD**, **mLDFA**, **JLCA**, **FSA-mTA**, **mFA-mTA**, **mMPTA**, **mLDTA**, dan **IAA**.
* **Simulasi Koreksi Sumbu & Reseksi (Axis Correction & Resection):**
  * Memungkinkan simulasi pemotongan/reseksi tulang (femur dan tibia) serta perhitungan koreksi sudut alignment.
* **Templating Implan Digital (Insert Implants):**
  * Katalog implan dari berbagai produsen (seperti *MicroPort*, *Corin*, *Medacta*, *Zimmer Biomet*).
  * Pemilihan ukuran komponen femoral, komponen tibial, serta ketebalan inlay (*CS/CR Inlay*) yang disesuaikan secara real-time.
* **Annotasi & Alat Ukur Lengkap:**
  * Dilengkapi penggaris (*Ruler*), pengukur sudut (*Angle* / *Interline Angle*), pemotong (*Cut*), lingkaran (*Circle*), penambahan teks, snapshot screenshot, serta fungsi *Undo/Redo*.
* **Log Perencanaan Otomatis (Planning Log):**
  * Menyajikan perbandingan data pengukuran sebelum (*Initial*) dan sesudah (*Planned*) perencanaan secara otomatis.
* **Penyimpanan & Pelaporan:**
  * Opsi untuk menyimpan proyek ke komputasi awan (*Save to cloud*) atau secara lokal (*Save locally*).
  * Penjanean laporan perencanaan bedah instan (*Create Report*).

---

## Cara Kerja Software

1. **Memuat Citra Medis (Rontgen Leg-Length):**
   * Pengguna mengunggah atau membuka citra X-Ray posisi berdiri (*long-leg radiograph*) atau AP view dan skyline view pasien pada viewer digital.

2. **Identifikasi Sumbu & Pengukuran Awal:**
   * Software dan pengguna menentukan titik-titik anatomi penting pada sendi panggul, lutut, dan pergelangan kaki.
   * Parameter awal (*Initial values*) dihitung otomatis untuk menentukan deviasi sumbu (seperti genu varum atau valgum).

3. **Axis Correction & Resection (Detail Alur Kerja & Fitur)**
Pada tahap ketiga dari alur *Bicondylar Knee Planning*, software memungkinkan ahli bedah melakukan simulasi pemotongan tulang (reseksi) dan koreksi deformitas sumbu mekanis secara mendalam:

* **Penentuan Bidang Reseksi Femur & Tibia (*Distal Femoral & Proximal Tibial Cut*):**
  * Memungkinkan simulasi pemotongan tulang distal femur dan proksimal tibia dengan sudut serta ketebalan (dalam milimeter) yang dapat disesuaikan.
  * Membantu menentukan sudut *resection line* yang tegak lurus terhadap sumbu mekanis target ($0^\circ$).

* **Koreksi Deformitas Sumbu Mekanis (*Mechanical Axis Alignment*):**
  * **Goal Target:** Mengoreksi sudut **mFA-mTA** dari deformitas awal (misalnya varus $-6,5^\circ$) menuju target netral $0^\circ$.
  * **Penyesuaian Parameter Sumbu:**
    * **mLDFA (*Mechanical Lateral Distal Femoral Angle*):** Mengoreksi sudut potong distal femur (nilai acuan fisiologis $87^\circ \pm 3^\circ$).
    * **mMPTA (*Mechanical Medial Proximal Tibial Angle*):** Mengatur tingkat ketegaklurusan potong proksimal tibia (nilai acuan fisiologis $87^\circ \pm 3^\circ$).
    ***JLCA (*Joint Line Convergence Angle*):** 
    Memperhitungkan penyempitan atau kelonggaran celah sendi (*laxity*).

# Bicondylar Knee Planning Workflow

**Bicondylar Knee Planning** adalah alur kerja perencanaan bedah utama untuk prosedur *Total Knee Arthroplasty* (TKA) / penggantian sendi lutut total. Modul ini memungkinkan ahli bedah ortopedi untuk menganalisis alignment sumbu mekanis, merencanakan sudut serta tinggi reseksi tulang (femur & tibia), dan menempatkan komponen implan secara presisi untuk mengembalikan fungsi biomekanik lutut.

---

## Alur Kerja Utama (Step-by-Step Workflow)

Proses perencanaan dibagi menjadi 6 tahap sistematis pada panel navigasi utama:

1. **Select Body Side:**
   * Penentuan sisi ekstremitas bawah yang dianalisis (*Left* atau *Right*).
2. **Knee Axis Analysis:**
   * Evaluasi sudut dan sumbu biomekanik awal (*Initial Measurements*) berdasarkan landmark anatomi pada citra *long-leg radiograph*.
3. **Axis Correction & Resection:**
   * Simulasi pemotongan tulang dan penyesuaian sudut koreksi sumbu mekanis (*mFA-mTA*) menuju target netral $0^\circ$.
4. **Insert Implants:**
   * Pemilihan katalog produsen, tipe implan, serta penentuan ukuran (*size*) komponen femoral, tibial tray, dan ketebalan *inlay/insert*.
5. **Implant Kit:**
   * Pengelolaan konfigurasi set dan instrumen implan yang digunakan selama perencanaan.
6. **Surgical Technique:**
   * Verifikasi teknik bedah dan orientasi pemasangan instrumen reseksi sesuai panduan pabrikan implan.

---

## Parameter Biomekanik & Nilai Rujukan (Planning Log)

Software menghitung nilai pengukuran awal (**INITIAL**) dan menyajikannya secara berdampingan dengan nilai target setelah simulasi (**PLANNED**):

| Parameter Measurement | Deskripsi Anatomi | Nilai Fisiologis / Norm | Target Perencanaan (*Planned*) |
| :--- | :--- | :--- | :--- |
| **mLPFA** | *Mechanical Lateral Proximal Femoral Angle* | $90^\circ \pm 5^\circ$ | Menjaga alignment femoral proksimal |
| **AMA** | *Anatomical-Mechanical Angle* | $5^\circ - 7^\circ$ | Sumbu anatomi vs sumbu mekanis femur |
| **Mikulicz** | *Mikulicz Line / Mechanical Axis Line* | Sumbu beban mekanis (mm) | Melewati pusat sendi lutut |
| **MAD** | *Mechanical Axis Deviation* | $\approx 4 \pm 2\text{ mm}$ (medial) | $0\text{ mm}$ (garis tengah/netral) |
| **mLDFA** | *Mechanical Lateral Distal Femoral Angle* | $87^\circ \pm 3^\circ$ | Mengatur sudut reseksi distal femur |
| **JLCA** | *Joint Line Convergence Angle* | $1^\circ - 3^\circ$ (medial) | Evaluasi keselarasan celah sendi |
| **FSA-mTA** | *Femoral Shaft Axis - Mechanical Tibial Axis* | Indikator hubungan batang femur & tibia | Menyesuaikan deformitas |
| **mFA-mTA** | *Mechanical Femoral Axis - Mechanical Tibial Axis* | - | **Target: $0^\circ$** (Koreksi Varus/Valgus) |
| **mMPTA** | *Mechanical Medial Proximal Tibial Angle* | $87^\circ \pm 3^\circ$ | Mengatur sudut reseksi proksimal tibia |
| **mLDTA** | *Mechanical Lateral Distal Tibial Angle* | $89^\circ \pm 3^\circ$ | Alignment ankle proksimal |
| **IAA** | *Interline / Intercondylar Angle* | Sudut inklinasi artikular | Menyesuaikan keseimbangan sendi |

---

## Pengaturan Koreksi & Resection (Correction Settings)

* **Angle $\alpha$ ($90^\circ + \alpha$):** Sudut penyesuaian bidang reseksi terhadap sumbu mekanis.
* **Femoral Resection Height:** Ketebalan potong tulang distal femur (contoh default: $10\text{ mm}$).
* **Tibial Resection Height:** Ketebalan potong tulang proksimal tibia (contoh default: $8\text{ mm}$).
* **Resected Bone Segment Visibility:** Pengaturan visibilitas potongan tulang pada viewer (*Off*, *Transparent*, *Full*).

# Unicondylar Knee Planning (UKA Workflow)

**Unicondylar Knee Planning** adalah alur kerja perencanaan presisi untuk prosedur *Unicondylar Knee Arthroplasty* (UKA) atau penggantian sendi lutut parsial/satu kompartemen. Fitur ini dirancang untuk mempertahankan jaringan ligamen serta struktur kompartemen lutut yang sehat dengan menerapkan logika koronal konstitusional (*native/constitutional coronal logic*).

---

## Konfigurasi Workflow

Sebelum memulai penentuan landmark anatomi, pengguna mengonfigurasi parameter dasar perencanaan:

* **Select Body Side:** Pemilihan sisi ekstremitas pasien (*Left* atau *Right*).
* **Image Type:** 
  * *Stehende AP-Ganzbeinaufnahme* (Rontgen posisi berdiri *long-leg AP radiograph*).
  * *Partial image / not suitable* (Citra parsial).
* **Landmark Profile:** 
  * *Kompakt* (Profil ringkas untuk penentuan landmark utama).
  * *Erweitert* (Profil diperluas untuk analisis anatomi lebih detail).
* **Compartment Selection:** Pemilihan kompartemen lutut yang akan ditangani (*Medial* atau *Lateral*).

---

## Tahapan Penentuan Landmark Anatomi (Step-by-Step)

Workflow memandu pengguna melalui 24 langkah penentuan titik (*Schritt 1 / 24*) secara sistematis:

1. **Femoral Head Center:** Penentuan titik pusat kepala femur menggunakan metode 3-point circle.
2. **Femoral Knee Base:** Penentuan landasan distal femur.
3. **Tibial Knee Base:** Penentuan landasan proksimal tibia.
4. **Ankle Base (Sprunggelenk-Basis):** Penentuan sumbu dan pusat sendi pergelangan kaki.
5. **Anatomical Axes (Optional):** Penentuan sumbu anatomis tambahan jika diperlukan.

---

## Output Parameter Biomekanik & Nilai Rujukan (Planning Log)

Software menghitung nilai pengukuran awal (**INITIAL**) dan membandingkannya dengan target perencanaan (**PLANNED**) serta nilai rentang fisiologis/normal:

| Parameter | Deskripsi Anatomi | Nilai Fisiologis / Norm |
| :--- | :--- | :--- |
| **mLPFA** | *Mechanical Lateral Proximal Femoral Angle* | $90^\circ \pm 5^\circ$ |
| **AMA** | *Anatomical-Mechanical Angle* (Femur) | $5^\circ - 7^\circ$ |
| **Mikulicz** | Line / Mechanical Axis Line | Sumbu beban mekanis (mm) |
| **MAD** | *Mechanical Axis Deviation* | $\approx 4 \pm 2\text{ mm}$ (medial) |
| **mLDFA** | *Mechanical Lateral Distal Femoral Angle* | $87^\circ \pm 3^\circ$ |
| **JLCA** | *Joint Line Convergence Angle* | $1^\circ - 3^\circ$ (medial) |
| **FSA-mTA** | *Femoral Shaft Axis - Mechanical Tibial Axis* | Sudut hubungan batang femur & sumbu tibia |
| **mFA-mTA** | *Mechanical Femoral Axis - Mechanical Tibial Axis* | **Target: $0^\circ$** (Koreksi Alignment) |
| **mMPTA** | *Mechanical Medial Proximal Tibial Angle* | $87^\circ \pm 3^\circ$ |
| **mLDTA** | *Mechanical Lateral Distal Tibial Angle* | $89^\circ \pm 3^\circ$ |
| **IAA** | *Interincisal / Intercondylar Angle* | Sudut inklinasi artikular |

---

## Fitur Simulasi & Templating Unicondylar

* **Reseksi Kompartemen Parsial:** Simulasi pemotongan tulang khusus pada kompartemen terdampak (medial/lateral) tanpa mengubah struktur kompartemen kontra-lateral yang sehat.
* **Fit Komponen Unicondylar:** Penyesuaian ukuran implan *unicondylar femoral component*, *tibial tray*, dan *inlay/insert* secara independen.
* **Evaluasi Celah Sendi Real-time:** Pemantauan perubahan parameter **JLCA** dan **MAD** secara *real-time* untuk mencegah *overcorrection* atau *undercorrection* pada alignment koronal konstitusional.


* **Simulasi Gabungan & Real-Time Recalculation:**
  * Setiap kali garis resection atau sudut koreksi digeser pada viewer, nilai **MAD (*Mechanical Axis Deviation*)** dan **Mikulicz Line** akan diperbarui secara otomatis pada panel *Planning Log* di kolom **PLANNED**.

# Tibia Slope [LAT] Workflow

**Tibia Slope [LAT]** adalah modul perencanaan dan pengukuran sagital khusus untuk menganalisis inklinasi posterior proksimal tibia (*Posterior Tibial Slope / PTS*) menggunakan citra X-Ray lutut posisi lateral (*lateral knee radiograph*). Pengukuran ini sangat krusial dalam prosedur arthroplasty lutut (TKA/UKA) dan rekonstruksi ligamen (seperti ACL/PCL) untuk menjaga stabilitas fleksi-ekstensi serta kinematis sendi.

---

## Prasyarat & Persiapan Citra Medis

Sebelum memulai alur kerja pengukuran **Tibia Slope [LAT]**:
1. Pastikan citra rontgen lutut tampak samping (*Lateral View*) telah diunggah ke dalam **Study Manager**.
2. Lakukan penandaan jenis citra sebagai **Lateral View** dan selesaikan kalkulasi/kalibrasi skala ukuran (*calibration*) terlebih dahulu pada Study Manager.

---

## Langkah-Langkah Operasional (Step-by-Step Workflow)

1. **Select Body Side (Pemilihan Sisi Ekstremitas):**
   * Pilih sisi kaki pasien yang akan dianalisis (*Left* atau *Right*).
2. **Identifikasi Sumbu Koronal/Sagital Tibia (Proximal Tibial Anatomical Axis / PTAA):**
   * Tentukan titik-titik referensi sumbu proksimal dan diafisis tibia pada pandangan lateral.
3. **Penentuan Garis Tangensial Platina Tibia (Tibial Plateau Line):**
   * Tempatkan titik tangensial sepanjang garis artikular proksimal tibia (*medial & lateral plateau rims*).
4. **Kalkulasi Posterior Tibial Slope (PTS):**
   * Software secara otomatis menghitung sudut inklinasi antara garis tegak lurus sumbu anatomi tibia (*perpendicular to tibial axis*) dan garis platina tibia.

---

## Parameter Pengukuran & Log Hasil (Planning Log)

| Parameter Measurement | Deskripsi Anatomi | Nilai Fisiologis / Normal | Target Perencanaan (*Planned*) |
| :--- | :--- | :--- | :--- |
| **Posterior Tibial Slope (PTS)** | Sudut kemiringan posterior dari permukaan artikular proksimal tibia | $5^\circ - 10^\circ$ (tergantung variasi anatomi & tipe implan) | Disesuaikan dengan desain *tibial tray* / *insert slope* |

---

## Manfaat Klinik Simulasi Tibia Slope

* **Pencegahan Impingement & Dislokasi:** Menghindari pemotongan tulang dengan slope berlebihan yang dapat memicu keandasan anterior-posterior atau kelonggaran ligamen (*ligamentous laxity*).
* **Penyesuaian Reseksi Proksimal Tibia:** Menentukan sudut pemotongan proksimal tibia (*posterior slope cut*) pada jig pemotong agar sesuai dengan target biomekanik implan.
* **Integrasi Laporan:** Nilai *Initial* dan *Planned Slope* direkam otomatis ke dalam tabel **Planning Log** dan dapat dimasukkan secara langsung ke dalam laporan bedah (*Create Report*).

4. **Penempatan & Penyesuaian Implan:**
   * Pengguna memilih produsen implan, jenis sistem, ukuran komponen femoral/tibial, dan ketebalan *inlay* yang paling pas dengan anatomi pasien.

5. **Verifikasi Planning Log & Pembuatan Laporan:**
   * Software memperbarui tabel perbandingan *Initial* vs *Planned* untuk memastikan seluruh parameter berada pada rentang normal/fisiologis.
   * Laporan bedah dapat dicetak atau diunduh untuk dijadikan acuan saat prosedur operasi berlangsung.