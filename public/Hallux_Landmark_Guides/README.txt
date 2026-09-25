PANDUAN LANDMARK HALLUX — GARIS SESUAI VIDEO

Sumber metode: video pengguna Hallux Valgus.mp4, durasi sekitar 120 detik.
Latar panduan: ilustrasi Foot_Cartoon_3D yang sudah dibuat, 1000 x 1573 px.

ISI: 5 SVG dengan kartun + 5 SVG Lines_Only transparan.
HVA: sumbu metatarsal I dan falang proksimal hallux.
IMA: sumbu metatarsal I dan metatarsal II.
DMAA: garis tepi permukaan artikular distal MT I dan garis tegak lurus sumbu MT I.
HIA: sumbu falang proksimal dan distal hallux.
TMT I: garis contoh orientasi sendi metatarsocuneiform pertama, bukan sudut numerik.

Titik kuning adalah contoh titik tepi tulang; titik putih merupakan titik tengah
pasangan; garis putus pendek menghubungkan pasangan titik pada dua level shaft.
Sumbu dibuat melalui kedua titik tengah tersebut, mengikuti contoh video.
Pada DMAA, dua titik tambahan menandai ujung garis permukaan artikular.
Sektor ungu menunjukkan pasangan arah garis; tidak menampilkan nilai sudut.
Bonus temuan sesamoid/MT I pendek pada video tidak direplikasi sebagai hasil
diagnosis atau pengukuran baru pada ilustrasi.

EDIT DAN INTEGRASI
Semua file memakai viewBox 0 0 1000 1573, sama dengan kartun sebelumnya.
Overlay Lines_Only berisi vektor saja. Kartun adalah raster tertanam di SVG.
Pertahankan posisi, ukuran kontainer, dan preserveAspectRatio yang sama.
Path/line/circle memiliki ID masing-masing; koordinat juga tersedia dalam JSON.
SVG bersifat statis: menggeser circle saja di editor tidak menghitung ulang garis.
Aplikasi harus menghitung ulang midpoint, axis, dan perpendicular ketika
titik diubah. Tidak ada deteksi landmark otomatis dalam file ini.

BATASAN
Titik dipasang manual sebagai contoh visual pada gambar kartun AI, bukan
hasil segmentasi radiograf dan bukan landmark pasien tervalidasi.
Jangan menyalin koordinat ini langsung ke radiograf asli atau radiograf pasien.
Tidak dicantumkan nilai sudut normal, diagnosis, atau hasil pengukuran pasien.
Gunakan sebagai panduan UI; pengukuran dilakukan pada radiograf yang sesuai.
