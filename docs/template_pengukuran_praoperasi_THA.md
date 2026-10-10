# Template pengukuran radiologis pra-operasi THA

Versi 0.1, 10 Oktober 2026. Berlaku untuk foto AP pelvis pada pasien DDH, AVN, dan fraktur neck femur.
Dokumen ini adalah alat bantu perencanaan, bukan pengganti penilaian dokter bedah. Nilai ambang diambil dari referensi standar dan perlu disahkan oleh tim klinis sebelum dipakai.

---

## 1. Identitas pemeriksaan

| Isian | Nilai |
|---|---|
| ID pasien / nomor akses | |
| Tanggal foto | |
| Sisi yang dioperasi | Kanan / Kiri |
| Diagnosis | DDH / AVN / Fraktur neck / Lainnya |
| Pengukur | |
| Tanggal pengukuran | |

## 2. Kelayakan foto

Centang sebelum mengukur. Jika ada yang tidak terpenuhi, catat dan tandai pengukuran terkait sebagai "perkiraan".

- [ ] AP pelvis berpusat di simfisis; foramen obturator simetris
- [ ] Kedua tungkai rotasi interna sekitar 15° (trokanter minor hampir tidak menonjol)
- [ ] Ada penanda kalibrasi atau penggaris dengan panjang diketahui
- [ ] Kedua kepala femur dan atap asetabulum terlihat (tidak tertutup jaringan lunak)
- [ ] Femur proksimal terlihat minimal 15 cm di bawah trokanter minor
- [ ] Fraktur neck: sisi sehat terlihat penuh untuk templating

## 3. Kalibrasi

| Isian | Nilai |
|---|---|
| Panjang acuan sebenarnya (mm) | |
| Panjang acuan pada gambar (px) | |
| Skala (px per mm) = px / mm | |
| Koreksi magnifikasi (%) | |

Catatan: penggaris yang ditambahkan perangkat lunak pada tepi gambar mengukur bidang detektor, bukan bidang panggul. Tanpa bola kalibrasi setinggi trokanter, magnifikasi 10 sampai 20% tidak terkoreksi.

## 4. Titik acuan (landmark)

Setiap titik disimpan sebagai koordinat piksel (x, y) pada gambar asli. Kolom keandalan diisi: jelas / samar / tidak terlihat.

| ID | Titik | Cara menandai | Kanan | Kiri | Keandalan |
|---|---|---|---|---|---|
| TD | Teardrop | Ujung bawah bayangan teardrop | | | |
| IS | Tuber ischii | Titik terbawah tuber ischii | | | |
| LT | Trokanter minor | Titik paling menonjol ke medial | | | |
| GT | Trokanter mayor | Puncak trokanter mayor | | | |
| HC | Pusat kepala femur | Pusat lingkaran yang pas pada kontur kepala | | | |
| HR | Jari-jari kepala | Jari-jari lingkaran yang sama (px) | | | |
| AL | Tepi lateral atap asetabulum | Ujung lateral sourcil | | | |
| AM | Tepi medial sourcil | Ujung medial zona tumpu | | | |
| S1, S2 | Sumbu femur proksimal dan distal | Titik tengah kanal pada dua level, berjarak minimal 5 cm | | | |
| N1 | Titik tengah neck | Titik tengah bagian neck tersempit | | | |
| KI, KS | Garis Köhler | Tepi medial ilium dan tepi medial ischium | | | |

## 5. Garis dan pengukuran dasar (semua diagnosis)

| No | Pengukuran | Rumus dari titik acuan | Kanan | Kiri | Selisih |
|---|---|---|---|---|---|
| 1 | Garis inter-teardrop | Garis melalui TD kanan dan TD kiri | acuan | acuan | |
| 2 | Garis bi-ischial | Garis melalui IS kanan dan IS kiri | acuan | acuan | |
| 3 | Tinggi trokanter minor | Jarak tegak lurus LT ke garis 1 (atau garis 2) | | | LLD = kanan dikurangi kiri |
| 4 | Garis Köhler | Garis KI ke KS; catat apakah dasar asetabulum melewati garis | | | |
| 5 | Garis Shenton | Lengkung tepi bawah ramus pubis superior ke neck medial: utuh / putus | | | |
| 6 | Sumbu anatomis femur | Garis S1 ke S2 | acuan | acuan | |
| 7 | Pusat rotasi | Posisi HC: jarak horizontal dari TD dan jarak vertikal dari garis 1 | | | |
| 8 | Offset femoral | Jarak tegak lurus HC ke garis 6 | | | |
| 9 | Offset asetabular | Jarak horizontal HC ke TD | | | |
| 10 | Sudut neck-shaft (CCD) | Sudut antara garis HC ke N1 dan garis 6 | | | |
| 11 | Tinggi kepala terhadap trokanter | Jarak vertikal HC ke puncak GT | | | |

Interpretasi singkat:
- Sudut neck-shaft kurang dari 120° coxa vara; lebih dari 135° coxa valga.
- Garis 1 dan garis 2 seharusnya hampir sejajar. Selisih kemiringan yang besar berarti salah satu titik perlu ditandai ulang.

## 6. Bentuk kanal femur

| Pengukuran | Rumus | Nilai | Interpretasi |
|---|---|---|---|
| Canal-to-calcar ratio | Lebar kanal 10 cm di bawah LT dibagi lebar kanal setinggi LT | | Kurang dari 0,5 Dorr A; 0,5 sampai 0,75 Dorr B; lebih dari 0,75 Dorr C |
| Canal flare index | Lebar kanal 2 cm di atas LT dibagi lebar kanal di isthmus | | Kurang dari 3 stovepipe; 3 sampai 4,7 normal; lebih dari 4,7 champagne flute |
| Cortical thickness index | (Diameter luar dikurangi diameter kanal) dibagi diameter luar, 10 cm di bawah LT | | Nilai rendah: tulang osteoporotik |
| Klasifikasi Dorr | Penilaian visual AP dan lateral | A / B / C | |

## 7. Modul tambahan per diagnosis

### 7a. DDH

| Pengukuran | Rumus | Nilai | Interpretasi |
|---|---|---|---|
| Sudut center-edge lateral | Sudut antara garis vertikal melalui HC (tegak lurus garis 1) dan garis HC ke AL | | Normal 25° sampai 40°; kurang dari 20° displasia |
| Sudut Tönnis | Sudut garis AM ke AL terhadap garis 1 | | Normal 0° sampai 10°; lebih dari 10° displasia |
| Sudut Sharp | Sudut garis TD ke AL terhadap garis 1 | | Normal sekitar 33° sampai 38°; lebih dari 42° displasia |
| Extrusion index | Bagian kepala di lateral AL dibagi lebar kepala | | Normal kurang dari 25% |
| Crowe | Jarak vertikal garis 1 ke batas kepala-leher medial, dibagi tinggi pelvis | | I kurang dari 10%; II 10 sampai 15%; III 15 sampai 20%; IV lebih dari 20% |
| Hartofilakidis | Penilaian visual | | Displasia / dislokasi rendah / dislokasi tinggi |
| Asetabulum sejati | Segitiga Ranawat: sisi 20% tinggi pelvis, mulai 5 mm lateral dari perpotongan garis Shenton dan Köhler | | Target posisi cup |
| Anteversi femur dan asetabulum | Dari CT | | |

### 7b. AVN

| Pengukuran | Rumus | Nilai | Interpretasi |
|---|---|---|---|
| Stadium Ficat-Arlet atau ARCO | Foto polos dan MRI | | |
| Sudut Kerboul gabungan | Jumlah busur nekrosis pada AP dan lateral | | Lebih dari 200° lesi luas |
| Depresi kepala | Selisih kontur kepala terhadap lingkaran ideal (mm) | | |
| Keterlibatan asetabulum | Penyempitan celah sendi: ya / tidak | | |

### 7c. Fraktur neck femur

| Pengukuran | Rumus | Nilai | Interpretasi |
|---|---|---|---|
| Garden | Penilaian visual AP | I / II / III / IV | |
| Sudut Pauwels | Sudut garis fraktur terhadap garis 1 | | I kurang dari 30°; II 30° sampai 50°; III lebih dari 50° |
| Templating dari sisi sehat | Pengukuran 7 sampai 11 diambil dari sisi kontralateral | | Sisi fraktur tidak dipakai sebagai acuan |
| Dorr dan cortical thickness index | Lihat bagian 6 | | Dorr C mengarah ke stem cemented |

## 8. Ringkasan rencana

| Isian | Nilai |
|---|---|
| Koreksi panjang tungkai yang dituju (mm) | |
| Koreksi offset yang dituju (mm) | |
| Level osteotomi neck di atas LT (mm) | |
| Inklinasi dan anteversi cup yang dituju | |
| Ukuran cup perkiraan | |
| Jenis stem, ukuran, dan varian neck perkiraan | |
| Pengukuran yang ditandai "perkiraan" | |
| Catatan | |

---

## Lampiran A. Contoh pengisian (foto AP pelvis, 10 Oktober 2026)

Penandaan manual pada tangkapan layar 1373 x 757 piksel. Skala dari penggaris pada gambar: 373 px untuk 160 mm, yaitu 2,33 px per mm, tanpa koreksi magnifikasi.

| ID | Kanan (x, y) | Kiri (x, y) | Keandalan |
|---|---|---|---|
| TD | 322, 500 | 692, 490 | samar |
| IS | 410, 628 | 615, 622 | jelas |
| LT | 258, 588 | 738, 590 | jelas |
| HC | 262, 428 | 748, 425 | tidak terlihat (perkiraan) |
| S1, S2 | 180, 585 dan 176, 745 | 818, 585 dan 818, 745 | samar (batang femur pendek) |

| Pengukuran | Kanan | Kiri | Selisih |
|---|---|---|---|
| Tinggi LT terhadap garis bi-ischial | 44,4 px (19,0 mm) | 28,4 px (12,2 mm) | sekitar 7 mm, kanan lebih tinggi |
| Pusat rotasi, offset, sudut neck-shaft | tidak diukur | tidak diukur | kepala femur tertutup jaringan lunak |

Angka pada lampiran ini hanya contoh cara mengisi dan tidak untuk keputusan klinis.

## Lampiran B. Struktur data untuk aplikasi

```json
{
  "study": { "id": "", "side": "R", "diagnosis": "DDH", "imageWidth": 1373, "imageHeight": 757 },
  "calibration": { "pxPerMm": 2.33, "magnificationPct": null, "method": "ruler" },
  "landmarks": {
    "TD_R": { "x": 322, "y": 500, "confidence": "samar" },
    "TD_L": { "x": 692, "y": 490, "confidence": "samar" },
    "LT_R": { "x": 258, "y": 588, "confidence": "jelas" }
  },
  "measurements": {
    "ltHeight_R_mm": 19.0,
    "ltHeight_L_mm": 12.2,
    "lld_mm": 6.9,
    "estimated": ["HC_R", "HC_L"]
  }
}
```

Prinsipnya: simpan hanya titik acuan dan kalibrasi. Semua garis dan angka dihitung ulang dari titik, sehingga menggeser satu titik memperbarui semua hasil.
