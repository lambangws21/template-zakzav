# Zakzav Templating

Aplikasi web untuk pengukuran radiografi dan perencanaan templating ortopedi.

## Menjalankan Lokal

1. Gunakan Node.js 20 atau versi LTS yang lebih baru.
2. Jalankan `npm ci`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi yang diperlukan.
4. Jalankan `npm run dev` dan buka `http://localhost:3000`.

Jangan memasukkan kredensial, data pasien, atau service-account JSON ke Git.

## Quality Gate

- `npm run lint`: pemeriksaan tipe seluruh source.
- `npm test`: unit test dengan Node test runner.
- `npm run build`: production build Next.js.
- `npm run check`: menjalankan seluruh pemeriksaan di atas.

## Struktur

- `src/app`: route, layout, dan API handlers Next.js.
- `src/components`: komponen UI yang dapat digunakan ulang.
- `src/context`: provider React lintas fitur.
- `src/data`: katalog dan data statis yang dibundel aplikasi.
- `src/hooks`: React hooks bersama.
- `src/lib`: domain logic, adapter layanan, dan utilitas tanpa UI.
- `public`: aset yang dilayani langsung oleh browser.
- `docs`: panduan operasional dan integrasi eksternal.
- `tests`: unit dan integration tests.

Aturan kepemilikan folder dan rencana modularisasi dijelaskan di
[`docs/architecture.md`](docs/architecture.md).
