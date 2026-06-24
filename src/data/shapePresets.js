/**
 * Preset template bentuk anatomi untuk Free Warp overlay.
 *
 * Setiap preset menyimpan anchor points dalam koordinat ternormalisasi (rx, ry)
 * relatif terhadap dimensi gambar (0 = kiri/atas, 1 = kanan/bawah).
 * Saat diterapkan, koordinat ini diskalakan ke ukuran gambar aktual.
 */

export const SHAPE_PRESETS = [
  {
    id: "spine-full-8pt",
    name: "Columna Vertebralis",
    icon: "🦴",
    description: "8 anchor sepanjang tulang belakang — cervical hingga lumbar (lateral/AP view)",
    kind: "free-line",
    curveStrength: 0.35,
    // Berdasarkan plate1.svg: ellipse vertebra yang ternormalisasi ke A4 210×297 mm
    points: [
      { rx: 0.50, ry: 0.12 },
      { rx: 0.50, ry: 0.22 },
      { rx: 0.50, ry: 0.33 },
      { rx: 0.50, ry: 0.44 },
      { rx: 0.50, ry: 0.53 },
      { rx: 0.50, ry: 0.64 },
      { rx: 0.50, ry: 0.75 },
      { rx: 0.50, ry: 0.86 },
    ],
  },
  {
    id: "spine-lumbar-5pt",
    name: "Segmen Lumbar (L1–L5)",
    icon: "🦴",
    description: "5 anchor untuk vertebra lumbar — cocok untuk foto AP/lateral pinggang",
    kind: "free-line",
    curveStrength: 0.35,
    points: [
      { rx: 0.50, ry: 0.15 },
      { rx: 0.50, ry: 0.32 },
      { rx: 0.50, ry: 0.50 },
      { rx: 0.50, ry: 0.68 },
      { rx: 0.50, ry: 0.85 },
    ],
  },
  {
    id: "cobb-scoliosis-4pt",
    name: "Referensi Cobb (Scoliosis)",
    icon: "📐",
    description: "4 anchor dengan kurva — cocok untuk tracing kurva scoliosis pada AP spine",
    kind: "free-line",
    curveStrength: 0.5,
    points: [
      { rx: 0.42, ry: 0.12 },
      { rx: 0.52, ry: 0.35 },
      { rx: 0.44, ry: 0.58 },
      { rx: 0.54, ry: 0.85 },
    ],
  },
  {
    id: "vertical-axis-3pt",
    name: "Garis Acuan Vertikal",
    icon: "📏",
    description: "3 anchor garis lurus vertikal — referensi umum / midline",
    kind: "free-line",
    curveStrength: 0.0,
    points: [
      { rx: 0.50, ry: 0.08 },
      { rx: 0.50, ry: 0.50 },
      { rx: 0.50, ry: 0.92 },
    ],
  },
];
