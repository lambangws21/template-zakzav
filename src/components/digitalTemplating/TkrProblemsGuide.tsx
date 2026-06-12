"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "mild" | "moderate" | "severe";
type Phase = "early" | "late" | "any";

interface Solution {
  title: string;
  steps: string[];
  type: "conservative" | "surgical" | "diagnostic";
}

interface Reference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  url: string;
  note?: string; // catatan relevansi spesifik
}

interface Problem {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  lightColor: string;
  severity: Severity;
  phase: Phase;
  incidence: string;
  description: string;
  causes: string[];
  solutions: Solution[];
  references: Reference[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS: Problem[] = [
  {
    id: "stiffness",
    title: "Kekakuan Sendi",
    subtitle: "Arthrofibrosis / Limited ROM",
    color: "#6366f1",
    lightColor: "#e0e7ff",
    severity: "moderate",
    phase: "early",
    incidence: "~1.3–13%",
    description:
      "ROM post-op < 90° fleksi atau ekstensi lag > 10°. Terjadi akibat pembentukan jaringan parut berlebihan dalam kapsul sendi. Prevalensi rata-rata 4.54% pada studi terkini.",
    causes: [
      "Tight flexion/extension gap intraoperatif",
      "Komponen oversized atau malposisi",
      "Rehabilitasi tidak adekuat",
      "Pre-op ROM yang sudah terbatas",
      "Hematoma post-op yang tidak tertangani",
    ],
    solutions: [
      {
        title: "Fisioterapi Intensif",
        type: "conservative",
        steps: [
          "CPM (Continuous Passive Motion) 6–8 jam/hari",
          "Stretching aktif-pasif terstruktur",
          "Hydroterapi untuk mengurangi nyeri saat latihan",
          "Target ROM > 90° dalam 6 minggu",
        ],
      },
      {
        title: "Manipulation Under Anesthesia (MUA)",
        type: "surgical",
        steps: [
          "Dilakukan < 3 bulan post-op (gain fleksi 2× lebih besar vs delayed)",
          "GA atau spinal anestesi",
          "Manipulasi bertahap: fleksi paksa lembut + ekstensi",
          "Perhatian: 17.2% kasus MUA memerlukan intervensi lanjutan",
        ],
      },
      {
        title: "Arthroscopic Lysis of Adhesions",
        type: "surgical",
        steps: [
          "Jika MUA gagal atau > 6 bulan post-op",
          "Release kapsul anterior + posterior",
          "Reseksi jaringan parut supra-infrapatellar",
          "Rehab intensif segera post-prosedur",
        ],
      },
    ],
    references: [
      {
        authors: "Ippolito JA, et al.",
        year: 2024,
        title: "Outcomes of Early Versus Delayed Manipulation Under Anesthesia for Stiffness Following Total Knee Arthroplasty: A Systematic Review and Meta-Analysis",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(24)00531-X/abstract",
        note: "Early MUA gain fleksi 2× lebih besar; 17.2% reoperation rate",
      },
      {
        authors: "Thiengwittayaporn S, et al.",
        year: 2021,
        title: "Stiffness After Total Knee Arthroplasty: Prevalence and Treatment Outcome",
        journal: "PMC / Orthopedic Surgery",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8544175/",
        note: "Prevalensi stiffness 4.54%; rentang 1.3–13%",
      },
      {
        authors: "Christensen CP, et al.",
        year: 2022,
        title: "Manipulation Following Primary Total Knee Arthroplasty is Associated With Increased Rates of Infection and Revision",
        journal: "PubMed / Journal of Arthroplasty",
        url: "https://pubmed.ncbi.nlm.nih.gov/36191695/",
        note: "MUA meningkatkan risiko infeksi dan revisi",
      },
    ],
  },
  {
    id: "instability",
    title: "Instabilitas Lutut",
    subtitle: "Varus / Valgus / Flexion Instability",
    color: "#f97316",
    lightColor: "#ffedd5",
    severity: "severe",
    phase: "any",
    incidence: "~1–3%",
    description:
      "Lutut terasa 'giving way', nyeri, efusi berulang. Dapat berupa instabilitas koronal (varus/valgus), sagital (fleksi), atau global.",
    causes: [
      "Ketidakseimbangan flexion/extension gap",
      "Kerusakan atau tidak terpantaunya MCL/LCL",
      "Undersizing komponen femoral",
      "Tibial slope berlebihan",
      "Kelemahan otot quadriceps berat",
    ],
    solutions: [
      {
        title: "Penguatan Otot & Bracing",
        type: "conservative",
        steps: [
          "Program penguatan quadriceps + hamstring",
          "Knee brace korektif varus/valgus 3–6 bulan",
          "Propriosepsi training bertahap",
          "Evaluasi ulang jika tidak membaik dalam 3 bulan",
        ],
      },
      {
        title: "Evaluasi Diagnostik",
        type: "diagnostic",
        steps: [
          "X-ray stress views: ukur opening varus/valgus",
          "Fluoroscopy dinamis: cek gap fleksi",
          "CT scan: evaluasi rotasi komponen",
          "Klasifikasi: ligamentous vs bony vs component",
        ],
      },
      {
        title: "Revision TKR",
        type: "surgical",
        steps: [
          "Ganti ke constrained condylar knee (CCK) atau hinged",
          "Koreksi tibial slope yang berlebihan",
          "Rekonstruksi atau augmentasi ligamen",
          "Pertimbangkan stem extension untuk fiksasi lebih baik",
        ],
      },
    ],
    references: [
      {
        authors: "Vanlommel J, et al.",
        year: 2024,
        title: "Trends and Epidemiology in Revision Total Knee Arthroplasty: A Large Database Study",
        journal: "The Journal of Arthroplasty / PubMed",
        url: "https://pubmed.ncbi.nlm.nih.gov/39622423/",
        note: "Instabilitas: 7% penyebab revisi TKA; tren meningkat dari 1,369 → 2,610 per 100k TKA",
      },
      {
        authors: "Abdel MP, et al.",
        year: 2014,
        title: "Current Modes of Failure in TKA: Infection, Instability, and Stiffness Predominate",
        journal: "PMC / Clinical Orthopaedics and Related Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4048402/",
        note: "Instabilitas sebagai salah satu 3 penyebab utama kegagalan TKA",
      },
    ],
  },
  {
    id: "anterior_pain",
    title: "Nyeri Anterior Lutut",
    subtitle: "Patellofemoral Syndrome Post-TKR",
    color: "#ec4899",
    lightColor: "#fce7f3",
    severity: "mild",
    phase: "any",
    incidence: "~5–30%",
    description:
      "Nyeri di sekitar patela, krepitasi, atau clunk saat naik turun tangga. Salah satu keluhan paling umum post-TKR.",
    causes: [
      "Patella tidak di-resurface (tanpa resurfacing)",
      "Maltracking patela: komponen femoral overrotasi internal",
      "Overhang komponen femoral anterior",
      "Patellar clunk syndrome (PS-design)",
      "Insufficient lateral release",
    ],
    solutions: [
      {
        title: "Konservatif & Fisioterapi",
        type: "conservative",
        steps: [
          "Penguatan VMO (Vastus Medialis Oblique)",
          "Taping McConnell untuk koreksi tracking",
          "NSAID dan injeksi kortikosteroid intraartikular",
          "Hindari aktivitas high-impact (naik tangga berulang)",
        ],
      },
      {
        title: "Arthroscopic Debridement",
        type: "surgical",
        steps: [
          "Reseksi fibrous nodule penyebab clunk syndrome",
          "Lateral retinacular release jika tracking buruk",
          "Bersihkan osteophyte residual di trochlear groove",
          "Evaluasi tracking patela di bawah visualisasi langsung",
        ],
      },
      {
        title: "Patellar Resurfacing / Revision",
        type: "surgical",
        steps: [
          "Secondary patellar resurfacing jika belum dilakukan",
          "Koreksi rotasi komponen femoral (revision)",
          "Medialisasi tibial tubercle jika TT-TG > 20 mm",
          "Ganti femoral component dengan trochlear groove lebih dalam",
        ],
      },
    ],
    references: [
      {
        authors: "Parvizi J, et al.",
        year: 2018,
        title: "Complications of Total Knee Arthroplasty: Standardized List and Definitions of The Knee Society",
        journal: "PMC / Clinical Orthopaedics and Related Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3528930/",
        note: "Klasifikasi standar komplikasi TKA termasuk nyeri anterior",
      },
      {
        authors: "Meftah M, et al.",
        year: 2016,
        title: "Complications after Total Knee Arthroplasty: Stiffness, Periprosthetic Joint Infection, and Periprosthetic Fracture",
        journal: "IntechOpen",
        url: "https://www.intechopen.com/chapters/82864",
        note: "Nyeri anterior patellofemoral 5–30%; penyebab dan tatalaksana",
      },
    ],
  },
  {
    id: "loosening",
    title: "Aseptic Loosening",
    subtitle: "Pelepasan Komponen Non-Infeksi",
    color: "#eab308",
    lightColor: "#fef9c3",
    severity: "severe",
    phase: "late",
    incidence: "~1–2% per tahun",
    description:
      "Nyeri progresif, mobilitas komponen pada X-ray, lucent line > 2 mm. Umumnya terjadi > 5 tahun post-op akibat wear debris dan stress shielding.",
    causes: [
      "Osteolisis akibat polyethylene wear debris",
      "Malalignment mekanikal (varus stress berulang)",
      "Inadequate bone preparation / undersized implant",
      "Osteoporosis berat",
      "High-impact activity berlebihan",
    ],
    solutions: [
      {
        title: "Monitoring & Proteksi",
        type: "conservative",
        steps: [
          "Serial X-ray setiap 6 bulan untuk monitor progresi",
          "Modifikasi aktivitas: hindari high-impact",
          "Optimasi bone mineral density (bisphosphonat)",
          "Pertimbangkan operasi jika lucent line progresif",
        ],
      },
      {
        title: "Work-up Diagnostik",
        type: "diagnostic",
        steps: [
          "X-ray: perhatikan lucent line, subsidence, tilt",
          "CT scan: evaluasi osteolisis dan bone stock",
          "Bone scan: konfirmasi loosening vs infeksi",
          "Lab: CRP, ESR, aspirasi sendi untuk singkirkan PJI",
        ],
      },
      {
        title: "Revision TKR",
        type: "surgical",
        steps: [
          "Removal komponen longgar + curettage lesi osteolitik",
          "Bone graft atau augment untuk defek tulang",
          "Stem extension untuk distribusi beban lebih baik",
          "Pertimbangkan constrained design jika bone stock buruk",
        ],
      },
    ],
    references: [
      {
        authors: "Boese CK, et al.",
        year: 2024,
        title: "Septic complications are on the rise and aseptic loosening has decreased in total joint arthroplasty: an updated complication based analysis using worldwide arthroplasty registers",
        journal: "Archives of Orthopaedic and Trauma Surgery",
        url: "https://link.springer.com/article/10.1007/s00402-024-05379-2",
        note: "Aseptic loosening menurun (20.5% revisi); septic komplikasi meningkat — data register 2023–2024",
      },
      {
        authors: "Hasan S, et al.",
        year: 2024,
        title: "Comprehensive evaluation of risk factors for aseptic loosening in cemented TKA: Systematic review and meta-analysis",
        journal: "PMC / Knee Surgery",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11260281/",
        note: "Faktor risiko loosening: malalignment, BMI, aktivitas high-impact",
      },
    ],
  },
  {
    id: "pji",
    title: "Infeksi Sendi Prostetik (PJI)",
    subtitle: "Periprosthetic Joint Infection",
    color: "#ef4444",
    lightColor: "#fee2e2",
    severity: "severe",
    phase: "any",
    incidence: "~1–2%",
    description:
      "Komplikasi paling serius post-TKR. Manifestasi: nyeri, bengkak, hangat, demam, atau sinus tract. Membutuhkan diagnosis dan tatalaksana cepat.",
    causes: [
      "Kontaminasi intraoperatif (Staph. aureus, CoNS)",
      "Hematogenous seeding dari fokus infeksi jauh",
      "Faktor risiko: DM, obesitas, imunosupresi, RA",
      "Wound healing yang buruk / dehiscence",
      "Operasi sebelumnya di lutut yang sama",
    ],
    solutions: [
      {
        title: "Diagnosis (Kriteria MSIS 2018)",
        type: "diagnostic",
        steps: [
          "Mayor: 2 kultur positif organisme sama ATAU sinus tract ke sendi",
          "Minor: CRP > 10 mg/L + ESR > 30 mm/h; leukosit sinovial > 3000/μL; PMN > 80%",
          "Alpha defensin / leukocyte esterase strip (sensitivitas tinggi)",
          "Biopsi periprosthetic tissue ≥3 sampel; alpha defensin sensitivitas 97.7%, spesifisitas 99.5%",
        ],
      },
      {
        title: "DAIR (Debridement, Antibiotics, Implant Retention)",
        type: "surgical",
        steps: [
          "Hanya untuk early acute PJI (< 4 minggu gejala)",
          "Implant masih stabil dan biofilm belum matur",
          "Debridement radikal + ganti poly insert",
          "Antibiotik IV 6 minggu + oral suppression",
        ],
      },
      {
        title: "Two-Stage Revision",
        type: "surgical",
        steps: [
          "Stage 1: Removal semua komponen + antibiotic spacer",
          "Antibiotik IV 6 minggu berdasarkan kultur",
          "Stage 2: Reimplantasi setelah marker infeksi normal",
          "Eradication rate ~85–90%; 5-year implant survival 71.7%",
        ],
      },
    ],
    references: [
      {
        authors: "Parvizi J, et al.",
        year: 2018,
        title: "The 2018 Definition of Periprosthetic Hip and Knee Infection (MSIS Criteria)",
        journal: "PMC / The Journal of Arthroplasty",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8559719/",
        note: "Kriteria diagnostik MSIS 2018; sensitivitas 97.7%, spesifisitas 99.5%",
      },
      {
        authors: "Alrashidi Y, et al.",
        year: 2024,
        title: "Advancements in treatment strategies for periprosthetic joint infections: A comprehensive review",
        journal: "PMC / Journal of Orthopaedic Surgery and Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11324841/",
        note: "DAIR, two-stage revision, antibiotik suppression; 5-year survival 71.7%",
      },
      {
        authors: "Varnum C, et al.",
        year: 2024,
        title: "Point of care testing for the diagnosis of periprosthetic joint infections: a review",
        journal: "SICOT-J",
        url: "https://www.sicot-j.org/articles/sicotj/full_html/2024/01/sicotj240041/sicotj240041.html",
        note: "Alpha defensin, leukocyte esterase sebagai biomarker POC",
      },
    ],
  },
  {
    id: "malalignment",
    title: "Malalignment Komponen",
    subtitle: "Malposisi Rotasi / Koronal / Sagital",
    color: "#14b8a6",
    lightColor: "#ccfbf1",
    severity: "moderate",
    phase: "early",
    incidence: "~2–5%",
    description:
      "Nyeri mekanis persisten, wear asimetris, patella maltracking. Sering baru terdeteksi pada follow-up 1–2 tahun post-op.",
    causes: [
      "Femoral component internal rotasi > 3°",
      "Tibial component varus > 3° pada standing X-ray",
      "Tibial slope berlebihan atau defisien",
      "Posterior condylar axis tidak akurat sebagai referensi",
      "Navigasi/robotic tidak digunakan atau error",
    ],
    solutions: [
      {
        title: "Evaluasi Diagnostik Lengkap",
        type: "diagnostic",
        steps: [
          "Long-leg alignment X-ray: ukur HKA axis",
          "CT rotational study: femoral & tibial rotation",
          "Fluoroscopy: cek posterior condylar contact",
          "Bandingkan dengan templating pre-op",
        ],
      },
      {
        title: "Konservatif (Malalignment Ringan)",
        type: "conservative",
        steps: [
          "Fisioterapi untuk kompensasi muskular",
          "Ortosis / heel wedge untuk koreksi varus ringan",
          "Monitoring serial 6 bulan",
          "Threshold revisi: malalignment > 5° atau simptomatik berat",
        ],
      },
      {
        title: "Component Revision",
        type: "surgical",
        steps: [
          "Isolated tibial revision untuk varus tibial",
          "Femoral revision untuk koreksi rotasi",
          "Distal femoral osteotomy jika malalignment ekstraartikular",
          "Pertimbangkan robot-assisted untuk presisi lebih tinggi",
        ],
      },
    ],
    references: [
      {
        authors: "Vigdorchik JM, et al.",
        year: 2025,
        title: "Why Are Primary Total Knee Arthroplasties Failing? A Systematic Review and Meta-Analysis",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00509-1/abstract",
        note: "Malalignment sebagai kontributor kegagalan TKA; data meta-analisis terbaru 2025",
      },
      {
        authors: "Abdel MP, et al.",
        year: 2014,
        title: "Current Modes of Failure in TKA: Infection, Instability, and Stiffness Predominate",
        journal: "PMC / Clinical Orthopaedics and Related Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4048402/",
        note: "Rotational malalignment femoral component sebagai penyebab patellofemoral problem",
      },
    ],
  },
  {
    id: "fracture",
    title: "Fraktur Periprostetik",
    subtitle: "Periprosthetic Fracture Post-TKR",
    color: "#a855f7",
    lightColor: "#f3e8ff",
    severity: "severe",
    phase: "late",
    incidence: "~0.3–2.5%",
    description:
      "Fraktur distal femur atau tibial proximal di sekitar implant. Umumnya akibat trauma minor pada tulang osteoporotik atau notching anterior femur.",
    causes: [
      "Anterior femoral notching saat chamfer cut",
      "Osteoporosis / bone mineral density rendah",
      "Osteolisis periprostetik yang melemahkan tulang",
      "Trauma jatuh (low-energy fall)",
      "Stress riser di ujung stem",
    ],
    solutions: [
      {
        title: "Evaluasi & Klasifikasi",
        type: "diagnostic",
        steps: [
          "X-ray: lokasi, displacement, kondisi implant",
          "CT scan: detail fraktur + evaluasi loosening",
          "Klasifikasi Su (distal femur): Su I 27%, Su II 41%, Su III 32%",
          "Klasifikasi Felix (tibia): kategori I–III, subgroup A–C",
        ],
      },
      {
        title: "Osteosintesis (Implant Stabil)",
        type: "surgical",
        steps: [
          "ORIF dengan LISS plate / retrograde IM nail",
          "Retrograde nail: hanya jika intercondylar box cukup",
          "Augmentasi dengan bone graft jika defek tulang",
          "Nonunion rate ~10%; pertimbangkan early bone grafting",
        ],
      },
      {
        title: "Revision + Osteosintesis (Implant Longgar)",
        type: "surgical",
        steps: [
          "Revision TKR dengan distal femoral replacement (DFR)",
          "Tumor prosthesis atau megaprosthesis untuk bone stock minimal",
          "Stem extension melewati zona fraktur",
          "Rehab mobilisasi dini dengan WB sesuai toleransi",
        ],
      },
    ],
    references: [
      {
        authors: "Lizaur-Utrilla A, et al.",
        year: 2021,
        title: "Periprosthetic fracture management around total knee arthroplasty",
        journal: "PMC / EFORT Open Reviews",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7876523/",
        note: "Klasifikasi Su & Felix; insidensi ~2% primary TKA; nonunion rate 10%",
      },
      {
        authors: "Meftah M, et al.",
        year: 2019,
        title: "Periprosthetic fractures of the knee: a comprehensive review",
        journal: "PMC / European Journal of Orthopaedic Surgery",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7138771/",
        note: "Anterior notching sebagai faktor risiko; algoritma tatalaksana ORIF vs revision",
      },
    ],
  },
  {
    id: "gap_imbalance",
    title: "Gap Imbalance",
    subtitle: "Flexion / Extension Gap Mismatch",
    color: "#22c55e",
    lightColor: "#dcfce7",
    severity: "moderate",
    phase: "early",
    incidence: "~3–7%",
    description:
      "Fleksi gap ≠ ekstensi gap, menyebabkan instabilitas di salah satu range atau overstuffing yang membatasi ROM. Sering dideteksi saat trial reduction.",
    causes: [
      "Reseksi distal femur berlebihan (↑ ekstensi gap)",
      "Tibial slope berlebihan (↑ fleksi gap)",
      "Undersizing atau oversizing komponen femoral",
      "Posterior condylar offset tidak terkompensasi",
      "PCL tidak seimbang (CR-design)",
    ],
    solutions: [
      {
        title: "Intraoperative Correction",
        type: "surgical",
        steps: [
          "Gunakan spacer block / tensor untuk ukur gap akurat",
          "Tight fleksi gap: up-size femoral atau tambah posterior slope",
          "Tight ekstensi gap: distal femoral augment atau reseksi lebih",
          "Asymmetric gap: koreksi rotasi femoral component",
        ],
      },
      {
        title: "Poly Exchange (Simptomatik Pasca-Op)",
        type: "surgical",
        steps: [
          "Ganti poly insert ke ketebalan lebih sesuai",
          "Hanya jika komponen well-fixed dan aligned",
          "Re-evaluasi balance dengan tensor intraop",
          "Pertimbangkan revision jika poly exchange tidak cukup",
        ],
      },
      {
        title: "Fisioterapi Gap-Targeted",
        type: "conservative",
        steps: [
          "Ekstensi lag: prone hanging, extension board stretch",
          "Fleksi terbatas: heel-slide, CPM, wall slide",
          "Quadriceps setting untuk stabilisasi dinamis",
          "Monitor progress ROM setiap 2 minggu",
        ],
      },
    ],
    references: [
      {
        authors: "Abdel MP, et al.",
        year: 2014,
        title: "Current Modes of Failure in TKA: Infection, Instability, and Stiffness Predominate",
        journal: "PMC / Clinical Orthopaedics and Related Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4048402/",
        note: "Gap imbalance sebagai mekanisme instabilitas dan stiffness post-TKA",
      },
      {
        authors: "Vigdorchik JM, et al.",
        year: 2025,
        title: "Why Are Primary Total Knee Arthroplasties Failing? A Systematic Review and Meta-Analysis",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00509-1/abstract",
        note: "Flexion/extension gap mismatch sebagai kontributor utama kegagalan primer TKA",
      },
    ],
  },
];

// ─── Severity badge ───────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<Severity, string> = {
  mild: "Ringan",
  moderate: "Sedang",
  severe: "Berat",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  mild: "#22c55e",
  moderate: "#f97316",
  severe: "#ef4444",
};

const PHASE_LABEL: Record<Phase, string> = {
  early: "< 3 bulan",
  late: "> 1 tahun",
  any: "Kapan saja",
};

const SOLUTION_TYPE_STYLE: Record<Solution["type"], { bg: string; label: string; dot: string }> = {
  conservative: { bg: "#dcfce7", label: "Konservatif", dot: "#22c55e" },
  surgical:     { bg: "#fee2e2", label: "Operatif",    dot: "#ef4444" },
  diagnostic:   { bg: "#e0f2fe", label: "Diagnostik",  dot: "#0ea5e9" },
};

// ─── Animated SVG per problem ─────────────────────────────────────────────────

function StiffnessAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {/* Femur */}
      <motion.rect x={cx-18} y={10} width={36} height={90} rx={8} fill="#6366f1" opacity={0.2}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Implant */}
      <motion.rect x={cx-28} y={100} width={56} height={14} rx={4} fill="#6366f1" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      {/* Poly */}
      <motion.rect x={cx-24} y={114} width={48} height={10} rx={3} fill="#a5b4fc" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      {/* Tibia */}
      <motion.rect x={cx-18} y={124} width={36} height={60} rx={8} fill="#6366f1" opacity={0.15}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: 0.1 }} />
      {/* ROM arc — restricted (only ~60deg) */}
      <motion.path
        d={`M${cx},110 A60,60,0,0,1,${cx + 60 * Math.sin((60 * Math.PI) / 180)},${110 + 60 * (1 - Math.cos((60 * Math.PI) / 180))}`}
        fill="none" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="80" strokeDashoffset={80}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
      />
      <text x={cx + 52} y={155} fontSize={9} fill="#6366f1" fontWeight={800}>60°</text>
      {/* Restricted label */}
      <motion.rect x={cx + 36} y={100} width={52} height={14} rx={5} fill="#ef4444" opacity={0}
        animate={{ opacity: 0.15 }} transition={{ delay: 0.8 }} />
      <text x={cx + 62} y={111} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight={700}
        opacity={0}>
        <animate attributeName="opacity" from="0" to="1" begin="0.8s" fill="freeze" />
        ROM ↓
      </text>
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#6366f1" opacity={0.6} fontWeight={600}>Fleksi terbatas</text>
    </svg>
  );
}

function InstabilityAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={80} rx={8} fill="#f97316" opacity={0.2}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      <motion.rect x={cx-28} y={90} width={56} height={12} rx={4} fill="#f97316" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      <motion.rect x={cx-24} y={102} width={48} height={10} rx={3} fill="#fdba74" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      {/* Tibia shifted laterally — valgus instability */}
      <motion.rect x={cx-18} y={112} width={36} height={70} rx={8} fill="#f97316" opacity={0.15}
        animate={{ x: [0, 22, 0, 22, 0] }}
        transition={{ duration: 2, delay: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
      />
      {/* Shift arrow */}
      <motion.path d={`M${cx+20},140 L${cx+44},140`}
        fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, delay: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
      />
      <motion.path d={`M${cx+40},136 L${cx+46},140 L${cx+40},144`}
        fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, delay: 0.65, repeat: Infinity, repeatDelay: 1.5 }}
      />
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#f97316" opacity={0.6} fontWeight={600}>Tibial shift lateral</text>
    </svg>
  );
}

function AnteriorPainAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={90} rx={8} fill="#ec4899" opacity={0.15}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Patella maltracking */}
      <motion.ellipse cx={cx - 50} cy={100} rx={18} ry={13} fill="#ec4899" opacity={0.4}
        animate={{ cx: [cx - 50, cx - 30, cx - 50] }}
        transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 1 }}
      />
      {/* Pain burst */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line key={i}
          x1={cx - 50 + 22 * Math.cos((deg * Math.PI) / 180)}
          y1={100 + 22 * Math.sin((deg * Math.PI) / 180)}
          x2={cx - 50 + 32 * Math.cos((deg * Math.PI) / 180)}
          y2={100 + 32 * Math.sin((deg * Math.PI) / 180)}
          stroke="#ef4444" strokeWidth={1.5}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 1, delay: 1.2 + i * 0.05, repeat: Infinity, repeatDelay: 2 }}
        />
      ))}
      <motion.rect x={cx-26} y={100} width={52} height={12} rx={4} fill="#ec4899" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      <motion.rect x={cx-22} y={112} width={44} height={9} rx={3} fill="#f9a8d4" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      <motion.rect x={cx-18} y={121} width={36} height={66} rx={8} fill="#ec4899" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#ec4899" opacity={0.6} fontWeight={600}>Patella maltracking</text>
    </svg>
  );
}

function LooseningSvg() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={80} rx={8} fill="#eab308" opacity={0.2}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      <motion.rect x={cx-28} y={90} width={56} height={12} rx={4} fill="#eab308" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      <motion.rect x={cx-22} y={102} width={44} height={9} rx={3} fill="#fde68a" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      {/* Tibial component — subsiding */}
      <motion.rect x={cx-30} y={111} width={60} height={13} rx={4} fill="#eab308" opacity={0.5}
        animate={{ y: [111, 118, 111] }}
        transition={{ duration: 3, delay: 0.8, repeat: Infinity, repeatDelay: 1 }}
      />
      {/* Lucent line */}
      <motion.rect x={cx-28} y={124} width={56} height={3} rx={1} fill="white" opacity={0}
        animate={{ opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 3, delay: 0.8, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.rect x={cx-18} y={127} width={36} height={60} rx={8} fill="#eab308" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#eab308" opacity={0.7} fontWeight={600}>Subsidence + lucent line</text>
    </svg>
  );
}

function PjiAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={80} rx={8} fill="#ef4444" opacity={0.15}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Effusion / swelling */}
      <motion.ellipse cx={cx} cy={108} rx={52} ry={28}
        fill="#ef4444" opacity={0}
        animate={{ opacity: [0, 0.12, 0.12, 0], rx: [40, 55, 55, 40] }}
        transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
      />
      <motion.rect x={cx-26} y={96} width={52} height={12} rx={4} fill="#ef4444" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      <motion.rect x={cx-22} y={108} width={44} height={9} rx={3} fill="#fca5a5" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      <motion.rect x={cx-18} y={117} width={36} height={70} rx={8} fill="#ef4444" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Bacteria dots */}
      {[[-30, 90], [30, 95], [-20, 115], [24, 112], [0, 88]].map(([dx, dy], i) => (
        <motion.circle key={i} cx={cx + dx} cy={dy} r={3}
          fill="#ef4444"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 0.9, 0.6] }}
          transition={{ duration: 0.5, delay: 0.8 + i * 0.15, repeat: Infinity, repeatDelay: 3 }}
        />
      ))}
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#ef4444" opacity={0.7} fontWeight={600}>Efusi + tanda infeksi</text>
    </svg>
  );
}

function MalalignmentAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {/* Mechanical axis — deviated */}
      <motion.line x1={cx - 18} y1={10} x2={cx + 18} y2={185}
        stroke="#14b8a6" strokeWidth={2} strokeDasharray="8 4" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }}
      />
      {/* Ideal axis */}
      <motion.line x1={cx} y1={10} x2={cx} y2={185}
        stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.3}
        initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 0.1 }}
      />
      <motion.rect x={cx-18} y={10} width={36} height={75} rx={8} fill="#14b8a6" opacity={0.18}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Tibial component — varus tilt */}
      <motion.g animate={{ rotate: 5 }} style={{ transformOrigin: `${cx}px 110px` }}>
        <rect x={cx-30} y={96} width={60} height={12} rx={4} fill="#14b8a6" opacity={0.55} />
        <rect x={cx-24} y={108} width={48} height={9} rx={3} fill="#99f6e4" opacity={0.7} />
        <rect x={cx-20} y={117} width={40} height={60} rx={8} fill="#14b8a6" opacity={0.15} />
      </motion.g>
      {/* Angle arc */}
      <motion.path d={`M${cx},96 L${cx},70 A26,26,0,0,1,${cx + 26 * Math.sin((5 * Math.PI) / 180)},${96 - 26 * Math.cos((5 * Math.PI) / 180)}`}
        fill="none" stroke="#14b8a6" strokeWidth={1.5}
        strokeDasharray="50" strokeDashoffset={50}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
      />
      <text x={cx + 18} y={80} fontSize={9} fill="#14b8a6" fontWeight={800}>5°</text>
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#14b8a6" opacity={0.6} fontWeight={600}>Tibial varus malignment</text>
    </svg>
  );
}

function FractureAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={85} rx={8} fill="#a855f7" opacity={0.18}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Fracture line */}
      <motion.path d={`M${cx - 26},55 L${cx - 8},65 L${cx + 10},58 L${cx + 28},68`}
        fill="none" stroke="#ef4444" strokeWidth={2.8}
        strokeDasharray="70" strokeDashoffset={70}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.55, delay: 0.4 }}
      />
      {/* Fragment displacement */}
      <motion.rect x={cx - 18} y={10} width={36} height={44} rx={8} fill="#a855f7" opacity={0.22}
        animate={{ x: [0, 6, 6], y: [0, 4, 4] }}
        transition={{ duration: 0.4, delay: 1.0, times: [0, 0.5, 1] }}
      />
      <motion.rect x={cx-28} y={95} width={56} height={12} rx={4} fill="#a855f7" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      <motion.rect x={cx-22} y={107} width={44} height={9} rx={3} fill="#d8b4fe" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      <motion.rect x={cx-18} y={116} width={36} height={68} rx={8} fill="#a855f7" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#a855f7" opacity={0.6} fontWeight={600}>Fraktur distal femur</text>
    </svg>
  );
}

function GapImbalanceAnim() {
  const W = 280, H = 200, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <motion.rect x={cx-18} y={10} width={36} height={70} rx={8} fill="#22c55e" opacity={0.18}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
      {/* Extension gap marker */}
      <motion.rect x={cx-28} y={80} width={56} height={12} rx={4} fill="#22c55e" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.2 }} />
      {/* Gap: tight extension */}
      <motion.line x1={cx + 40} y1={80} x2={cx + 40} y2={92}
        stroke="#22c55e" strokeWidth={2} strokeDasharray="12" strokeDashoffset={12}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.3, delay: 0.4 }}
      />
      <text x={cx + 46} y={89} fontSize={8} fill="#22c55e" fontWeight={800}>EXT</text>
      {/* Poly — thin */}
      <motion.rect x={cx-22} y={92} width={44} height={6} rx={2} fill="#86efac" opacity={0.7}
        initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }} />
      <motion.rect x={cx-28} y={98} width={56} height={12} rx={4} fill="#22c55e" opacity={0.5}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.25 }} />
      {/* Flexion gap — large */}
      <motion.line x1={cx + 40} y1={110} x2={cx + 40} y2={150}
        stroke="#f97316" strokeWidth={2} strokeDasharray="40" strokeDashoffset={40}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
      />
      <motion.line x1={cx+36} y1={110} x2={cx+44} y2={110} stroke="#f97316" strokeWidth={1.5}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} />
      <motion.line x1={cx+36} y1={150} x2={cx+44} y2={150} stroke="#f97316" strokeWidth={1.5}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} />
      <text x={cx + 46} y={133} fontSize={8} fill="#f97316" fontWeight={800}>FLX↑</text>
      <motion.rect x={cx-18} y={150} width={36} height={40} rx={8} fill="#22c55e" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.15 }} />
      <text x={cx} y={H - 6} textAnchor="middle" fontSize={8} fill="#22c55e" opacity={0.6} fontWeight={600}>Ext tight · Flx gap lebar</text>
    </svg>
  );
}

function ProblemIllustration({ id }: { id: string }) {
  switch (id) {
    case "stiffness":     return <StiffnessAnim />;
    case "instability":   return <InstabilityAnim />;
    case "anterior_pain": return <AnteriorPainAnim />;
    case "loosening":     return <LooseningSvg />;
    case "pji":           return <PjiAnim />;
    case "malalignment":  return <MalalignmentAnim />;
    case "fracture":      return <FractureAnim />;
    case "gap_imbalance": return <GapImbalanceAnim />;
    default:              return null;
  }
}

// ─── References Section ───────────────────────────────────────────────────────

function ReferencesSection({ refs, color }: { refs: Reference[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left w-full group"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none"
          style={{ color }}>
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          Referensi Jurnal ({refs.length})
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" style={{ color }}>
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {refs.map((ref, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-white/60 bg-white/50 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 leading-snug">
                        {ref.authors} ({ref.year})
                      </p>
                      <p className="text-[10px] text-slate-600 leading-snug mt-0.5 italic">
                        {ref.title}
                      </p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color }}>
                        {ref.journal}
                      </p>
                      {ref.note && (
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">
                          ↳ {ref.note}
                        </p>
                      )}
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-black rounded-lg px-2 py-0.5 text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: color }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                          <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Buka Jurnal
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Solution Card ────────────────────────────────────────────────────────────

function SolutionCard({ sol, index, color }: { sol: Solution; index: number; color: string }) {
  const [open, setOpen] = useState(false);
  const s = SOLUTION_TYPE_STYLE[sol.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl border border-white/60 overflow-hidden"
      style={{ backgroundColor: s.bg + "99" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: s.dot }}>
            {s.label}
          </span>
          <p className="text-[12px] font-black text-slate-800 leading-tight">{sol.title}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5">
              {sol.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Problem Card (list item) ─────────────────────────────────────────────────

function ProblemListItem({
  problem, active, onClick,
}: {
  problem: Problem; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border px-3 py-2.5 transition-all hover:scale-[1.01] active:scale-95"
      style={{
        backgroundColor: active ? problem.lightColor : "rgba(255,255,255,0.5)",
        borderColor: active ? problem.color + "55" : "rgba(255,255,255,0.6)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: problem.color }}
        />
        <span className="text-[11px] font-black text-slate-700 leading-tight line-clamp-1">
          {problem.title}
        </span>
        <span
          className="ml-auto text-[8px] font-black rounded-lg px-1.5 py-0.5 text-white shrink-0"
          style={{ backgroundColor: SEVERITY_COLOR[problem.severity] }}
        >
          {SEVERITY_LABEL[problem.severity]}
        </span>
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5 ml-4 font-medium">{problem.incidence}</p>
    </button>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type FilterSeverity = "all" | Severity;
type FilterPhase = "all" | Phase;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TkrProblemsGuide() {
  const [selected, setSelected] = useState<string>(PROBLEMS[0].id);
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [filterPhase, setFilterPhase] = useState<FilterPhase>("all");

  const filtered = PROBLEMS.filter(
    (p) =>
      (filterSeverity === "all" || p.severity === filterSeverity) &&
      (filterPhase === "all" || p.phase === filterPhase || p.phase === "any")
  );

  const problem = PROBLEMS.find((p) => p.id === selected) ?? PROBLEMS[0];

  // if selected is filtered out, reset
  const selectedVisible = filtered.some((p) => p.id === selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Panduan Klinis TKR
          </p>
          <h1 className="text-2xl font-black text-slate-800">
            Problem & Solusi Post-TKR
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {PROBLEMS.length} komplikasi · Diagnosis · Tatalaksana
          </p>
        </div>

        {/* Filter row */}
        <div className="mb-4 flex flex-wrap gap-2 justify-center">
          {/* Severity filter */}
          <div className="flex gap-1 rounded-2xl border border-white/60 bg-white/50 p-1">
            {(["all", "mild", "moderate", "severe"] as FilterSeverity[]).map((s) => (
              <button key={s}
                onClick={() => setFilterSeverity(s)}
                className="rounded-xl px-2.5 py-1 text-[10px] font-black transition-all"
                style={filterSeverity === s
                  ? { backgroundColor: s === "all" ? "#64748b" : SEVERITY_COLOR[s as Severity], color: "#fff" }
                  : { color: "#94a3b8" }
                }
              >
                {s === "all" ? "Semua" : SEVERITY_LABEL[s as Severity]}
              </button>
            ))}
          </div>
          {/* Phase filter */}
          <div className="flex gap-1 rounded-2xl border border-white/60 bg-white/50 p-1">
            {(["all", "early", "late"] as FilterPhase[]).map((p) => (
              <button key={p}
                onClick={() => setFilterPhase(p)}
                className="rounded-xl px-2.5 py-1 text-[10px] font-black transition-all"
                style={filterPhase === p
                  ? { backgroundColor: "#475569", color: "#fff" }
                  : { color: "#94a3b8" }
                }
              >
                {p === "all" ? "Semua Fase" : PHASE_LABEL[p as Phase]}
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Left: problem list */}
          <div className="lg:w-56 shrink-0 space-y-1.5">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Tidak ada data untuk filter ini.</p>
            )}
            {filtered.map((p) => (
              <ProblemListItem
                key={p.id}
                problem={p}
                active={p.id === selected && selectedVisible}
                onClick={() => setSelected(p.id)}
              />
            ))}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.28 }}
                className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-sm shadow-[4px_4px_24px_rgba(148,163,184,0.15),-4px_-4px_24px_rgba(255,255,255,0.9)] overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="px-5 pt-5 pb-3 flex items-start gap-3"
                  style={{ borderBottom: `2px solid ${problem.lightColor}` }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: problem.lightColor }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: problem.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: problem.color }}>
                        Komplikasi TKR
                      </p>
                      <span
                        className="text-[8px] font-black rounded-lg px-1.5 py-0.5 text-white"
                        style={{ backgroundColor: SEVERITY_COLOR[problem.severity] }}
                      >
                        {SEVERITY_LABEL[problem.severity]}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 rounded-lg border border-slate-200 px-1.5 py-0.5">
                        {PHASE_LABEL[problem.phase]}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{problem.title}</h2>
                    <p className="text-[11px] text-slate-500 font-semibold">{problem.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] text-slate-400 font-bold">Insidensi</p>
                    <p className="text-sm font-black" style={{ color: problem.color }}>{problem.incidence}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4">

                    {/* Illustration */}
                    <div
                      className="sm:w-48 shrink-0 rounded-2xl p-3"
                      style={{ backgroundColor: problem.lightColor + "55" }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div key={problem.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ duration: 0.25 }}
                        >
                          <ProblemIllustration id={problem.id} />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Description */}
                      <p className="text-[12px] text-slate-600 leading-relaxed">{problem.description}</p>

                      {/* Causes */}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Penyebab Umum
                        </p>
                        <div className="space-y-1">
                          {problem.causes.map((c, i) => (
                            <motion.div key={i}
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-start gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: problem.color }} />
                              <p className="text-[11px] text-slate-600">{c}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Solutions */}
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Pilihan Penyelesaian
                    </p>
                    <div className="space-y-2">
                      {problem.solutions.map((sol, i) => (
                        <SolutionCard key={i} sol={sol} index={i} color={problem.color} />
                      ))}
                    </div>
                  </div>

                  {/* References */}
                  <div
                    className="mt-4 rounded-2xl border px-4 py-3"
                    style={{ borderColor: problem.color + "33", backgroundColor: problem.lightColor + "44" }}
                  >
                    <ReferencesSection refs={problem.references} color={problem.color} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        <p className="mt-5 text-center text-[9px] text-slate-400 font-semibold">
          Panduan edukatif · Selalu sesuaikan dengan kondisi klinis individual pasien
        </p>
      </div>
    </div>
  );
}
