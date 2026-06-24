/**
 * Landmark definitions per X-ray view.
 * category: "native" = tulang asli, "post-op" = sudah terpasang implant
 * hasSideCondition: true → landmark list dibuild dinamis berdasarkan kondisi tiap sisi
 * hint: panduan singkat DIMANA harus klik di foto X-ray
 */

// ── Dynamic side-condition templates (AP Hip) ─────────────────────────────────

export const SIDE_CONDITION_TEMPLATES = {
  native: {
    kiri: [
      { id: "caput_femur_kiri",        label: "Caput Femur Kiri",        color: "#ef4444", hint: "Titik paling superior (atas) kepala femur kiri — puncak lingkaran bulat kepala femur." },
      { id: "acetabulum_kiri",         label: "Acetabulum Kiri",         color: "#eab308", hint: "Tepi superolateral (atas-luar) cangkir asetabulum kiri — batas tajam atap acetabulum." },
      { id: "greater_trochanter_kiri", label: "Greater Trochanter Kiri", color: "#06b6d4", hint: "Prosesus tulang lateral menonjol di femur proksimal kiri — tonjolan terluar femur atas." },
      { id: "lesser_trochanter_kiri",  label: "Lesser Trochanter Kiri",  color: "#ec4899", hint: "Tonjolan kecil medial-inferior di bawah femoral neck kiri — sisi dalam femur proksimal." },
    ],
    kanan: [
      { id: "caput_femur_kanan",        label: "Caput Femur Kanan",        color: "#ef4444", hint: "Titik paling superior kepala femur kanan — simetris dengan kiri." },
      { id: "acetabulum_kanan",         label: "Acetabulum Kanan",         color: "#eab308", hint: "Tepi superolateral asetabulum kanan — batas tajam atap acetabulum kanan." },
      { id: "greater_trochanter_kanan", label: "Greater Trochanter Kanan", color: "#06b6d4", hint: "Prosesus tulang lateral menonjol di femur proksimal kanan." },
      { id: "lesser_trochanter_kanan",  label: "Lesser Trochanter Kanan",  color: "#ec4899", hint: "Tonjolan kecil medial-inferior di bawah femoral neck kanan." },
    ],
  },

  thr: {
    kiri: [
      { id: "head_center_kiri",           label: "Pusat Kepala Prostetik Kiri",  color: "#ef4444", hint: "Titik PUSAT geometrik bola logam prostetik femur kiri. Estimasi titik tengah lingkaran kepala prostetik." },
      { id: "cup_rim_sup_lateral_kiri",   label: "Cup Rim Superolateral Kiri",   color: "#eab308", hint: "Tepi atas-luar (superolateral) cup acetabular kiri — sudut terluar rim logam cup." },
      { id: "cup_rim_sup_medial_kiri",    label: "Cup Rim Superomedial Kiri",    color: "#84cc16", hint: "Tepi atas-dalam (superomedial) cup acetabular kiri — sudut paling medial rim cup bagian atas." },
      { id: "stem_tip_kiri",              label: "Stem Tip Kiri",                color: "#ec4899", hint: "Ujung distal batang stem femoral kiri — titik paling inferior stem di dalam kanal femur." },
      { id: "calcar_kiri",                label: "Calcar Femoral Kiri",          color: "#fb923c", hint: "Level medial calcar kiri — tepi medial femur proksimal di bawah collar stem." },
      { id: "greater_trochanter_kiri",    label: "Greater Trochanter Kiri",      color: "#06b6d4", hint: "Greater trochanter tulang asli kiri — masih terlihat di sisi lateral femur proksimal." },
    ],
    kanan: [
      { id: "head_center_kanan",          label: "Pusat Kepala Prostetik Kanan", color: "#ef4444", hint: "Titik PUSAT geometrik bola logam prostetik femur kanan." },
      { id: "cup_rim_sup_lateral_kanan",  label: "Cup Rim Superolateral Kanan",  color: "#eab308", hint: "Tepi atas-luar cup acetabular kanan." },
      { id: "cup_rim_sup_medial_kanan",   label: "Cup Rim Superomedial Kanan",   color: "#84cc16", hint: "Tepi atas-dalam cup acetabular kanan." },
      { id: "stem_tip_kanan",             label: "Stem Tip Kanan",               color: "#ec4899", hint: "Ujung distal stem femoral kanan di dalam kanal femur." },
      { id: "calcar_kanan",               label: "Calcar Femoral Kanan",         color: "#fb923c", hint: "Level medial calcar kanan — tepi medial femur proksimal bawah collar stem." },
      { id: "greater_trochanter_kanan",   label: "Greater Trochanter Kanan",     color: "#06b6d4", hint: "Greater trochanter tulang asli kanan — masih terlihat di sisi lateral femur proksimal." },
    ],
  },

  hemi: {
    kiri: [
      { id: "head_center_hemi_kiri",    label: "Pusat Kepala Prostetik Kiri",    color: "#ef4444", hint: "Pusat geometrik bola prostetik — estimasi titik tengah lingkaran kepala Austin Moore / bipolar kiri." },
      { id: "acetabulum_sup_kiri",      label: "Acetabulum Superolateral Kiri",  color: "#eab308", hint: "Tepi superolateral asetabulum ASLI kiri — atap acetabulum tulang yang masih ada (tidak diganti cup)." },
      { id: "teardrop_kiri",            label: "Teardrop Figure Kiri",           color: "#06b6d4", hint: "Titik paling inferior figura teardrop kiri — landmark referensi pelvis standar." },
      { id: "greater_trochanter_kiri",  label: "Greater Trochanter Kiri",        color: "#8b5cf6", hint: "Greater trochanter tulang asli kiri." },
      { id: "stem_tip_kiri",            label: "Stem Tip Kiri",                  color: "#ec4899", hint: "Ujung distal stem prostetik kiri di dalam kanal femur." },
    ],
    kanan: [
      { id: "head_center_hemi_kanan",   label: "Pusat Kepala Prostetik Kanan",   color: "#ef4444", hint: "Pusat geometrik bola prostetik kanan." },
      { id: "acetabulum_sup_kanan",     label: "Acetabulum Superolateral Kanan", color: "#eab308", hint: "Tepi superolateral asetabulum ASLI kanan — atap acetabulum tulang yang masih ada." },
      { id: "teardrop_kanan",           label: "Teardrop Figure Kanan",          color: "#06b6d4", hint: "Titik paling inferior figura teardrop kanan." },
      { id: "greater_trochanter_kanan", label: "Greater Trochanter Kanan",       color: "#8b5cf6", hint: "Greater trochanter tulang asli kanan." },
      { id: "stem_tip_kanan",           label: "Stem Tip Kanan",                 color: "#ec4899", hint: "Ujung distal stem prostetik kanan di dalam kanal femur." },
    ],
  },

  not_visible: {
    kiri: [],
    kanan: [],
  },

  rusak: {
    kiri: [],
    kanan: [],
  },
};

export const SIDE_CONDITION_OPTIONS = [
  { key: "native",      label: "Native (Tulang Asli)",            color: "#60a5fa", badge: "ASLI" },
  { key: "thr",         label: "THA / Total Hip Replacement",     color: "#f43f5e", badge: "THA" },
  { key: "hemi",        label: "Hemiarthroplasty (Austin Moore)", color: "#d946ef", badge: "HEMI" },
  { key: "not_visible", label: "Terpotong / Di Luar Frame",       color: "#475569", badge: "N/A" },
  { key: "rusak",       label: "Rusak / Tidak Terbaca",           color: "#92400e", badge: "RSK" },
];

export function getSideLandmarks(conditionKey, sideKey) {
  return SIDE_CONDITION_TEMPLATES[conditionKey]?.[sideKey] ?? [];
}

// ── Static view definitions ───────────────────────────────────────────────────

export const LANDMARK_VIEWS = [

  // ── NATIVE ───────────────────────────────────────────────────────────────────

  {
    id: "ap_hip",
    label: "AP Hip / Pelvis",
    category: "native",
    color: "#f97316",
    hasSideCondition: true,   // landmark list dibuild dinamis di panel
    landmarks: [],             // selalu kosong — diisi getSideLandmarks()
  },

  {
    id: "ap_knee",
    label: "AP Knee",
    category: "native",
    color: "#06b6d4",
    landmarks: [
      { id: "kondilus_medial_femur_kiri",   label: "Kondilus Medial Femur Kiri",   color: "#ef4444", hint: "Ujung paling inferior kondilus medial femur kiri — tepi bawah-dalam femur distal." },
      { id: "kondilus_lateral_femur_kiri",  label: "Kondilus Lateral Femur Kiri",  color: "#f97316", hint: "Ujung paling inferior kondilus lateral femur kiri — tepi bawah-luar femur distal." },
      { id: "tibial_plateau_medial_kiri",   label: "Tibial Plateau Medial Kiri",   color: "#eab308", hint: "Permukaan superior plateau medial tibia kiri — garis datar sisi dalam tibia proksimal." },
      { id: "tibial_plateau_lateral_kiri",  label: "Tibial Plateau Lateral Kiri",  color: "#84cc16", hint: "Permukaan superior plateau lateral tibia kiri — garis datar sisi luar tibia proksimal." },
      { id: "kondilus_medial_femur_kanan",  label: "Kondilus Medial Femur Kanan",  color: "#06b6d4", hint: "Ujung paling inferior kondilus medial femur kanan." },
      { id: "kondilus_lateral_femur_kanan", label: "Kondilus Lateral Femur Kanan", color: "#8b5cf6", hint: "Ujung paling inferior kondilus lateral femur kanan." },
      { id: "tibial_plateau_medial_kanan",  label: "Tibial Plateau Medial Kanan",  color: "#ec4899", hint: "Permukaan superior plateau medial tibia kanan." },
      { id: "tibial_plateau_lateral_kanan", label: "Tibial Plateau Lateral Kanan", color: "#14b8a6", hint: "Permukaan superior plateau lateral tibia kanan." },
    ],
  },

  {
    id: "ap_femur",
    label: "AP Femur (Full)",
    category: "native",
    color: "#8b5cf6",
    landmarks: [
      { id: "caput_femur",       label: "Caput Femur",              color: "#ef4444", hint: "Titik paling superior kepala femur — puncak bulatan kepala femur." },
      { id: "greater_trochanter",label: "Greater Trochanter",       color: "#f97316", hint: "Tonjolan terluar femur proksimal — paling lateral di femur atas." },
      { id: "lesser_trochanter", label: "Lesser Trochanter",        color: "#eab308", hint: "Tonjolan kecil di sisi medial-inferior femur proksimal." },
      { id: "kondilus_medial",   label: "Kondilus Medial Distal",   color: "#06b6d4", hint: "Ujung inferior kondilus medial femur — tepi bawah dalam femur distal." },
      { id: "kondilus_lateral",  label: "Kondilus Lateral Distal",  color: "#8b5cf6", hint: "Ujung inferior kondilus lateral femur — tepi bawah luar femur distal." },
    ],
  },

  {
    id: "ap_proximal_femur",
    label: "AP Proksimal Femur",
    category: "native",
    color: "#10b981",
    description: "Foto setengah / partial — hanya area proksimal femur yang masuk frame",
    landmarks: [
      { id: "caput_femur",        label: "Caput Femur",             color: "#ef4444", hint: "Puncak kepala femur — titik tertinggi lingkaran kepala femur." },
      { id: "acetabulum_sup",     label: "Acetabulum (sebagian)",   color: "#f97316", hint: "Tepi superolateral acetabulum yang terlihat dalam frame foto." },
      { id: "greater_trochanter", label: "Greater Trochanter",      color: "#eab308", hint: "Tonjolan terluar femur proksimal — titik paling lateral." },
      { id: "lesser_trochanter",  label: "Lesser Trochanter",       color: "#06b6d4", hint: "Tonjolan kecil medial-inferior bawah femoral neck." },
      { id: "femoral_neck_center",label: "Pusat Leher Femur",       color: "#8b5cf6", hint: "Titik tengah sumbu leher femur — midpoint antara caput dan trochanter." },
      { id: "intertroch_medial",  label: "Garis Intertroch Medial", color: "#ec4899", hint: "Ujung medial (bawah-dalam) garis intertrochanteric." },
      { id: "intertroch_lateral", label: "Garis Intertroch Lateral",color: "#14b8a6", hint: "Ujung lateral (atas-luar) garis intertrochanteric." },
    ],
  },

  {
    id: "ap_ankle",
    label: "AP Ankle",
    category: "native",
    color: "#10b981",
    landmarks: [
      { id: "malleolus_medial",  label: "Malleolus Medial",  color: "#ef4444", hint: "Ujung distal malleolus medial tibia — tonjolan tulang di sisi dalam pergelangan kaki." },
      { id: "malleolus_lateral", label: "Malleolus Lateral", color: "#f97316", hint: "Ujung distal malleolus lateral fibula — tonjolan tulang di sisi luar pergelangan kaki." },
      { id: "talus_dome_medial", label: "Talus Dome Medial", color: "#06b6d4", hint: "Permukaan superior sisi medial talus — tepi atas dalam tulang talus." },
      { id: "talus_dome_lateral",label: "Talus Dome Lateral",color: "#8b5cf6", hint: "Permukaan superior sisi lateral talus — tepi atas luar tulang talus." },
      { id: "tibia_plafond",     label: "Tibia Plafond",     color: "#10b981", hint: "Permukaan artikular inferior tibia — garis lurus bawah tibia yang bertemu talus." },
    ],
  },

  {
    id: "lateral_hip",
    label: "Lateral Hip",
    category: "native",
    color: "#ec4899",
    landmarks: [
      { id: "caput_femur",         label: "Caput Femur",         color: "#ef4444", hint: "Titik pusat kepala femur — bulatan paling menonjol di proyeksi lateral." },
      { id: "greater_trochanter",  label: "Greater Trochanter",  color: "#f97316", hint: "Puncak greater trochanter — titik paling posterior dan superior femur proksimal." },
      { id: "acetabulum_anterior", label: "Acetabulum Anterior", color: "#06b6d4", hint: "Tepi anterior asetabulum — batas depan cangkir asetabulum di proyeksi lateral." },
      { id: "acetabulum_posterior",label: "Acetabulum Posterior",color: "#8b5cf6", hint: "Tepi posterior asetabulum — batas belakang cangkir asetabulum di proyeksi lateral." },
    ],
  },

  {
    id: "lateral_knee",
    label: "Lateral Knee",
    category: "native",
    color: "#f59e0b",
    landmarks: [
      { id: "kondilus_femur_posterior", label: "Kondilus Femur Posterior", color: "#ef4444", hint: "Titik paling posterior kondilus femur — kurva paling belakang femur distal." },
      { id: "kondilus_femur_anterior",  label: "Kondilus Femur Anterior",  color: "#f97316", hint: "Batas anterior kondilus femur — transisi ke trochlear groove." },
      { id: "tibial_plateau_anterior",  label: "Tibial Plateau Anterior",  color: "#06b6d4", hint: "Tepi anterior tibial plateau — sudut depan permukaan tibia proksimal." },
      { id: "tibial_plateau_posterior", label: "Tibial Plateau Posterior", color: "#8b5cf6", hint: "Tepi posterior tibial plateau — sudut belakang permukaan tibia proksimal." },
      { id: "patella_proximal",         label: "Patella Proximal",         color: "#10b981", hint: "Titik paling superior (atas) patela." },
      { id: "patella_distal",           label: "Patella Distal",           color: "#ec4899", hint: "Titik paling inferior (bawah) patela." },
    ],
  },

  // ── POST-OP ───────────────────────────────────────────────────────────────────

  {
    id: "ap_knee_tka",
    label: "AP Knee — Post TKA",
    category: "post-op",
    color: "#0ea5e9",
    description: "Total Knee Arthroplasty — kondilus sudah terganti komponen prostetik",
    landmarks: [
      { id: "femoral_comp_medial_kiri",   label: "Femoral Component Medial Kiri",   color: "#ef4444", hint: "Tepi inferior-medial komponen femoral kiri — sudut bawah-dalam logam femur." },
      { id: "femoral_comp_lateral_kiri",  label: "Femoral Component Lateral Kiri",  color: "#f97316", hint: "Tepi inferior-lateral komponen femoral kiri — sudut bawah-luar logam femur." },
      { id: "tibial_tray_medial_kiri",    label: "Tibial Tray Medial Kiri",         color: "#eab308", hint: "Tepi medial tibial tray kiri — sisi dalam logam/polyethylene tibia proksimal." },
      { id: "tibial_tray_lateral_kiri",   label: "Tibial Tray Lateral Kiri",        color: "#84cc16", hint: "Tepi lateral tibial tray kiri — sisi luar logam/polyethylene tibia proksimal." },
      { id: "joint_line_medial_kiri",     label: "Joint Line Medial Kiri",          color: "#06b6d4", hint: "Garis sendi medial kiri — celah antara femoral component dan tibial insert sisi medial." },
      { id: "joint_line_lateral_kiri",    label: "Joint Line Lateral Kiri",         color: "#8b5cf6", hint: "Garis sendi lateral kiri — celah antara femoral component dan tibial insert sisi lateral." },
      { id: "femoral_comp_medial_kanan",  label: "Femoral Component Medial Kanan",  color: "#ec4899", hint: "Tepi inferior-medial komponen femoral kanan." },
      { id: "femoral_comp_lateral_kanan", label: "Femoral Component Lateral Kanan", color: "#14b8a6", hint: "Tepi inferior-lateral komponen femoral kanan." },
      { id: "tibial_tray_medial_kanan",   label: "Tibial Tray Medial Kanan",        color: "#a78bfa", hint: "Tepi medial tibial tray kanan." },
      { id: "tibial_tray_lateral_kanan",  label: "Tibial Tray Lateral Kanan",       color: "#34d399", hint: "Tepi lateral tibial tray kanan." },
      { id: "joint_line_medial_kanan",    label: "Joint Line Medial Kanan",         color: "#fb923c", hint: "Garis sendi medial kanan." },
      { id: "joint_line_lateral_kanan",   label: "Joint Line Lateral Kanan",        color: "#38bdf8", hint: "Garis sendi lateral kanan." },
    ],
  },

  {
    id: "ap_proximal_femur_thr",
    label: "AP Proksimal Femur — Post THR",
    category: "post-op",
    color: "#f43f5e",
    description: "Foto setengah / partial dengan implant THA — hanya proximal femur dalam frame",
    landmarks: [
      { id: "head_center",           label: "Pusat Kepala Prostetik", color: "#ef4444", hint: "Pusat geometrik bola prostetik — estimasi titik tengah lingkaran kepala implant." },
      { id: "cup_rim_superolateral", label: "Cup Rim Superolateral",  color: "#f97316", hint: "Tepi atas-luar cup acetabular — sudut terluar rim logam cup." },
      { id: "cup_rim_superomedial",  label: "Cup Rim Superomedial",   color: "#eab308", hint: "Tepi atas-dalam cup acetabular — sudut paling medial rim cup atas." },
      { id: "stem_tip",             label: "Stem Tip",               color: "#06b6d4", hint: "Ujung distal stem femoral di dalam kanal femur — titik paling inferior stem." },
      { id: "calcar",               label: "Calcar Femoral",         color: "#8b5cf6", hint: "Level medial calcar — tepi medial femur proksimal di area bawah collar stem." },
      { id: "greater_trochanter",   label: "Greater Trochanter",     color: "#ec4899", hint: "Greater trochanter tulang asli — masih terlihat lateral di femur proksimal." },
    ],
  },

];

export function getViewsByCategory(category) {
  return LANDMARK_VIEWS.filter((v) => v.category === category);
}
