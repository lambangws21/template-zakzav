"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Download,
  ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Stethoscope,
  X,
} from "lucide-react";

// Endpoint Web App Apps Script (yang sudah di-upgrade)
const GOOGLE_SHEET_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "";

const CHECKLISTS = [
  {
    key: "tkr",
    title: "TKR Normed / Gordion Knee",
    subtitle: "Checklist Instrument Total Knee Replacement",
    description:
      "Instrument utama untuk femoral preparation, tibial preparation, gap confirmation, trialing, dan PS box preparation.",
    items: [
      { id: "tkr-001", catalogNo: "TKR100", name: "T-Handle", qty: 1, category: "Basic / Handle", imageUrl: "/images/tkr-normed/T-Handle.png" },
      { id: "tkr-002", catalogNo: "TKR101", name: "Starter", qty: 1, category: "Femoral / Tibial Canal", imageUrl: "/images/tkr-normed/Starter.png" },
      { id: "tkr-003", catalogNo: "TKR103", name: "Extramedullary Alignment Tower", qty: 1, category: "Alignment", imageUrl: "/images/tkr-normed/IM-ROD.png" },
      { id: "tkr-004", catalogNo: "TKR104", name: "Femoral A/P Chamfer Guide Handle", qty: 2, category: "Femoral Preparation", imageUrl: "/images/tkr-normed/ap-chamfer-handle.png" },
      { id: "tkr-005", catalogNo: "TKR105", name: "8 mm Twist Drill", qty: 1, category: "Drill", imageUrl: "/images/tkr-normed/TwistDrill.png" },
      { id: "tkr-006", catalogNo: "TKR107", name: "Bone File", qty: 1, category: "Finishing", imageUrl: "/images/tkr-normed/bone-file.jpg" },
      { id: "tkr-007", catalogNo: "TKR108", name: "Femoral IM Alignment Guide", qty: 1, category: "Femoral Alignment", imageUrl: "/images/tkr-normed/femoral-im-alignment-guide.png" },
      { id: "tkr-008", catalogNo: "TKR109", name: "Distal Femoral Alignment Guide", qty: 1, category: "Femoral Alignment", imageUrl: "/images/tkr-normed/distal-femoral-alignment-guide.png" },
      { id: "tkr-009", catalogNo: "TKR110", name: "Distal Femoral Cutting Guide", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/distal-femoral-cutting-guide.png" },
      { id: "tkr-010", catalogNo: "TKR111", name: "PS Cutting Jig Drill Guide", qty: 1, category: "PS Preparation", imageUrl: "/images/tkr-normed/ps-cutting-jig-drill-guide1.png" },
      { id: "tkr-011", catalogNo: "TKR112", name: "Femoral A/P Chamfer Cutting Guide Size 1", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/ap-chamfer-cutting-guide.png" },
      { id: "tkr-012", catalogNo: "TKR113", name: "Femoral A/P Chamfer Cutting Guide Size 2", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/ap-chamfer-cutting-guide.png" },
      { id: "tkr-013", catalogNo: "TKR114", name: "Femoral A/P Chamfer Cutting Guide Size 3", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/ap-chamfer-cutting-guide.png" },
      { id: "tkr-014", catalogNo: "TKR115", name: "Femoral A/P Chamfer Cutting Guide Size 4", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/ap-chamfer-cutting-guide.png" },
      { id: "tkr-015", catalogNo: "TKR116", name: "Femoral A/P Chamfer Cutting Guide Size 5", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/ap-chamfer-cutting-guide.png" },
      { id: "tkr-0015", catalogNo: "TKR102", name: "Lower point gauge", qty: 1, category: "Femoral Cutting", imageUrl: "/images/tkr-normed/lower-point-gauge.png" },
      { id: "tkr-016", catalogNo: "TKR124", name: "Femoral IM Rod 400 mm", qty: 1, category: "Femoral Alignment", imageUrl: "/images/tkr-normed/femoral-im-rod.png" },
      { id: "tkr-017", catalogNo: "TKR130", name: "Femoral Condyle Drill", qty: 1, category: "Drill", imageUrl: "/images/tkr-normed/femoral-condyle-drill.png" },
      { id: "tkr-018", catalogNo: "TKR131", name: "PS Reamer", qty: 1, category: "PS Preparation", imageUrl: "/images/tkr-normed/ps-reamer.png" },
      { id: "tkr-019", catalogNo: "TKR133", name: "Pin Extractor", qty: 1, category: "Extractor", imageUrl: "/images/tkr-normed/pin-extractor.png" },
      { id: "tkr-020", catalogNo: "TKR134", name: "Spike and Tibial EM Guide Extractor", qty: 1, category: "Extractor", imageUrl: "/images/tkr-normed/spike-em-guide-extractor.png" },
      { id: "tkr-021", catalogNo: "TKR135", name: "Femoral Impactor", qty: 1, category: "Impactor", imageUrl: "/images/tkr-normed/femoral-impactor.png" },
      { id: "tkr-022", catalogNo: "TKR136", name: "PS Housing Punch", qty: 1, category: "PS Preparation", imageUrl: "/images/tkr-normed/ps-housing-punch.png" },
      { id: "tkr-023", catalogNo: "TKR137", name: "PS Housing Impactor", qty: 1, category: "PS Preparation", imageUrl: "/images/tkr-normed/ps-housing-impactor.png" },
      { id: "tkr-024", catalogNo: "TKR140", name: "Femoral Sizer", qty: 1, category: "Femoral Sizing", imageUrl: "/images/tkr-normed/femoral-sizer.png" },
      { id: "tkr-025", catalogNo: "TKR145", name: "Tibial IM Rod", qty: 1, category: "Tibial Alignment", imageUrl: "/images/tkr-normed/tibial-im-rod.png" },
      { id: "tkr-026", catalogNo: "TKR169", name: "Cemented Tibial Punch Handle", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/tibial-punch-handle.png" },
      { id: "tkr-027", catalogNo: "TKR170", name: "Tibial Baseplate Handle", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-handle.png" },
      { id: "tkr-0027", catalogNo: "TKR179", name: "Tibial Drill", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/tibial-drill.png" },
      { id: "tkr-0028", catalogNo: "TKR177-174", name: "Tibial Cutting Jig 0", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/tibial-cutting-jig.png" },
      { id: "tkr-0029", catalogNo: "TKR256-257", name: "Spikes", qty: 5, category: "Pin", imageUrl: "/images/tkr-normed/spikes.png" },


      { id: "tkr-028", catalogNo: "TKR171", name: "Tibial IM Alignment Guide", qty: 1, category: "Tibial Alignment", imageUrl: "/images/tkr-normed/tibial-im-alignment-guide.png" },
      { id: "tkr-029", catalogNo: "TKR172", name: "Tibial EM Alignment Guide", qty: 1, category: "Tibial Alignment", imageUrl: "/images/tkr-normed/tibial-em-alignment-guide.png" },
      { id: "tkr-0037", catalogNo: "TKR173", name: "Tibia Drill Guuide", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/tibial-drill-guide.png" },
      { id: "tkr-030", catalogNo: "TKR190", name: "Cemented Tibia Punch L", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/cemented-tibia-punch.png" },
      { id: "tkr-031", catalogNo: "TKR191", name: "Cemented Tibia Punch M", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/cemented-tibia-punch.png" },
      { id: "tkr-032", catalogNo: "TKR192", name: "Cemented Tibia Punch S", qty: 1, category: "Tibial Preparation", imageUrl: "/images/tkr-normed/cemented-tibia-punch.png" },
      { id: "tkr-033", catalogNo: "TKR193", name: "Gap Gauge 9 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/tkr-normed/gap-gauge.png" },
      { id: "tkr-034", catalogNo: "TKR194", name: "Gap Gauge 11 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/tkr-normed/gap-gauge-11.png" },
      { id: "tkr-035", catalogNo: "TKR195", name: "Gap Gauge 13 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/tkr-normed/gap-gauge-13.png" },
      // { id: "tkr-036", catalogNo: "TKR196", name: "Gap Gauge 15 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/tkr-normed/gap-gauge.jpg" },
      { id: "tkr-037", catalogNo: "TKR198", name: "Tibial Stylus", qty: 1, category: "Tibial Resection", imageUrl: "/images/tkr-normed/tibial-stylus.png" },
      
      { id: "tkr-038", catalogNo: "TKR025", name: "Tibial Baseplate Trial Size 1", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-trial.png" },
      { id: "tkr-039", catalogNo: "TKR026", name: "Tibial Baseplate Trial Size 2", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-trial.png" },
      { id: "tkr-040", catalogNo: "TKR027", name: "Tibial Baseplate Trial Size 3", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-trial.png" },
      { id: "tkr-041", catalogNo: "TKR028", name: "Tibial Baseplate Trial Size 4", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-trial.png" },
      { id: "tkr-042", catalogNo: "TKR029", name: "Tibial Baseplate Trial Size 5", qty: 1, category: "Tibial Trial", imageUrl: "/images/tkr-normed/tibial-baseplate-trial.png" },
      { id: "tkr-043", catalogNo: "TKR138", name: "Femoral Driver ", qty: 1, category: "Femoral Trial", imageUrl: "/images/tkr-normed/femoral-driver-trial.png" },
      { id: "tkr-044", catalogNo: "TKR182", name: "Tibial baseplate impactor ", qty: 1, category: "Impactor", imageUrl: "/images/tkr-normed/tibial-baseplate-impactor.png" },
    ],
  },
  {
    key: "bipolar",
    title: "Bipolar Normed / Hector Bipolar Head",
    subtitle: "Checklist Instrument Hemiarthroplasty Bipolar",
    description:
      "Instrument untuk sizing bipolar shell, trial reduction, perakitan bipolar head, locking ring, dan impaksi final head ke cone stem.",
    items: [
      { id: "bip-001", catalogNo: "THR105", name: "Ø46 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-002", catalogNo: "THR106", name: "Ø48 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-003", catalogNo: "THR107", name: "Ø50 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-004", catalogNo: "THR108", name: "Ø52 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-005", catalogNo: "THR109", name: "Ø44 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-006", catalogNo: "THR110", name: "Ø60 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-007", catalogNo: "THR111", name: "Ø54 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-008", catalogNo: "THR112", name: "Extractor", qty: 1, category: "Extractor", imageUrl: "/images/instruments/bipolar/extractor.jpg" },
      { id: "bip-009", catalogNo: "THR113", name: "Caliper", qty: 1, category: "Measurement", imageUrl: "/images/instruments/bipolar/caliper.jpg" },
      { id: "bip-010", catalogNo: "THR114", name: "Femoral Head Impactor", qty: 1, category: "Impactor", imageUrl: "/images/instruments/bipolar/femoral-head-impactor.jpg" },
      { id: "bip-011", catalogNo: "THR115", name: "Segment Forceps", qty: 1, category: "Bipolar Assembly", imageUrl: "/images/instruments/bipolar/segment-forceps.jpg" },
      { id: "bip-012", catalogNo: "THR116", name: "Bipolar Trial Impactor", qty: 1, category: "Trial / Impactor", imageUrl: "/images/instruments/bipolar/bipolar-trial-impactor.jpg" },
      { id: "bip-013", catalogNo: "THR117", name: "Ø56 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
      { id: "bip-014", catalogNo: "THR012", name: "Ø58 Bipolar Trial Cup", qty: 1, category: "Bipolar Trial Cup", imageUrl: "/images/instruments/bipolar/bipolar-trial-cup.jpg" },
    ],
  },
  {
    key: "thr",
    title: "THR Normed / Hector Acetabular System",
    subtitle: "Checklist Instrument Total Hip Replacement",
    description:
      "Instrument acetabular untuk reaming, trial cup, liner impaction, trial liner, dan orientasi cup THR.",
    items: [
      { id: "thr-001", catalogNo: "THR024", name: "Acetabular Reamer Handle", qty: 2, category: "Reamer Handle", imageUrl: "/images/instruments/thr/acetabular-reamer-handle.jpg" },
      { id: "thr-002", catalogNo: "THR005", name: "Trial Cup Handle", qty: 1, category: "Trial Handle", imageUrl: "/images/instruments/thr/trial-cup-handle.jpg" },
      { id: "thr-003", catalogNo: "THR002", name: "Liner Impactor Head Ø28", qty: 1, category: "Liner Impactor", imageUrl: "/images/instruments/thr/liner-impactor-head.jpg" },
      { id: "thr-004", catalogNo: "THR003", name: "Liner Impactor Head Ø32", qty: 1, category: "Liner Impactor", imageUrl: "/images/instruments/thr/liner-impactor-head.jpg" },
      { id: "thr-005", catalogNo: "THR004", name: "Liner Impactor Head Ø36", qty: 1, category: "Liner Impactor", imageUrl: "/images/instruments/thr/liner-impactor-head.jpg" },
      { id: "thr-006", catalogNo: "THR037", name: "Cup Trial Ø46", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-007", catalogNo: "THR038", name: "Cup Trial Ø48", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-008", catalogNo: "THR039", name: "Cup Trial Ø54", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-009", catalogNo: "THR040", name: "Cup Trial Ø60", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-010", catalogNo: "THR041", name: "Cup Trial Ø56", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-011", catalogNo: "THR042", name: "Cup Trial Ø62", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-012", catalogNo: "THR043", name: "Cup Trial Ø58", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-013", catalogNo: "THR044", name: "Cup Trial Ø64", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-014", catalogNo: "THR045", name: "Cup Trial Ø50", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-015", catalogNo: "THR046", name: "Cup Trial Ø52", qty: 1, category: "Cup Trial", imageUrl: "/images/instruments/thr/cup-trial.jpg" },
      { id: "thr-016", catalogNo: "THR061", name: "Trial Liner 36/54/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
      { id: "thr-017", catalogNo: "THR062", name: "Trial Liner 36/56/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
      { id: "thr-018", catalogNo: "THR063", name: "Trial Liner 36/60/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
      { id: "thr-019", catalogNo: "THR064", name: "Trial Liner 36/62/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
      { id: "thr-020", catalogNo: "THR065", name: "Trial Liner 36/64/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
      { id: "thr-021", catalogNo: "THR066", name: "Trial Liner 36/58/20°", qty: 1, category: "Trial Liner 20°", imageUrl: "/images/instruments/thr/trial-liner.jpg" },
    ],
  },
  {
    key: "stem",
    title: "THR Normed / Cementless & Cemented Stem System",
    subtitle: "Checklist Instrument Femoral Stem",
    description:
      "Daftar instrumen stem system (kode, deskripsi, piece) dari dokumen surgical technique.",
    items: [
      { id: "stem-001", catalogNo: "THR019", name: "Box Osteotomy", qty: 1, category: "Stem Basic" },
      { id: "stem-002", catalogNo: "THR021", name: "Trial Stem Standard Neck 0", qty: 1, category: "Trial Stem" },
      { id: "stem-003", catalogNo: "THR022", name: "Trial Stem Standard Neck 1-10", qty: 1, category: "Trial Stem" },
      { id: "stem-004", catalogNo: "THR023", name: "Trial Stem Lateral Neck 1-10", qty: 1, category: "Trial Stem" },
      { id: "stem-005", catalogNo: "THR099", name: "Fixed Offset Adaptor", qty: 1, category: "Stem Basic" },
      { id: "stem-006", catalogNo: "THR025", name: "Femoral Reamer", qty: 1, category: "Reamer" },
      { id: "stem-007", catalogNo: "THR096", name: "Stem Impactor", qty: 1, category: "Impactor" },
      { id: "stem-008", catalogNo: "THR007", name: "Stem Extraction", qty: 1, category: "Extractor" },
      { id: "stem-009", catalogNo: "THR009", name: "Modular Knock Plate", qty: 1, category: "Stem Basic" },
      { id: "stem-010", catalogNo: "THR097", name: "Bolt", qty: 1, category: "Stem Basic" },
      { id: "stem-011", catalogNo: "THR082", name: "Trial Head Ø28 / +12", qty: 1, category: "Trial Head" },
      { id: "stem-012", catalogNo: "THR081", name: "Trial Head Ø28 / +8", qty: 1, category: "Trial Head" },
      { id: "stem-013", catalogNo: "THR080", name: "Trial Head Ø28 / +4", qty: 1, category: "Trial Head" },
      { id: "stem-014", catalogNo: "THR079", name: "Trial Head Ø28 / +0", qty: 1, category: "Trial Head" },
      { id: "stem-015", catalogNo: "THR078", name: "Trial Head Ø28 / -3", qty: 1, category: "Trial Head" },
      { id: "stem-016", catalogNo: "THR087", name: "Trial Head Ø32 / +12", qty: 1, category: "Trial Head" },
      { id: "stem-017", catalogNo: "THR086", name: "Trial Head Ø32 / +8", qty: 1, category: "Trial Head" },
      { id: "stem-018", catalogNo: "THR085", name: "Trial Head Ø32 / +4", qty: 1, category: "Trial Head" },
      { id: "stem-019", catalogNo: "THR084", name: "Trial Head Ø32 / +0", qty: 1, category: "Trial Head" },
      { id: "stem-020", catalogNo: "THR072", name: "Trial Head Ø32 / -3", qty: 1, category: "Trial Head" },
      { id: "stem-021", catalogNo: "THR089", name: "Trial Head Ø36 / +0", qty: 1, category: "Trial Head" },
      { id: "stem-022", catalogNo: "THR074", name: "Trial Head Ø36 / +4", qty: 1, category: "Trial Head" },
      { id: "stem-023", catalogNo: "THR075", name: "Trial Head Ø36 / +8", qty: 1, category: "Trial Head" },
      { id: "stem-024", catalogNo: "THR073", name: "Trial Head Ø36 / -3", qty: 1, category: "Trial Head" },
      { id: "stem-025", catalogNo: "THR076", name: "Femoral Trial Reamer 0", qty: 1, category: "Trial Reamer" },
      { id: "stem-026", catalogNo: "THR077", name: "Femoral Trial Reamer 1", qty: 1, category: "Trial Reamer" },
      { id: "stem-027", catalogNo: "THR083", name: "Femoral Trial Reamer 2", qty: 1, category: "Trial Reamer" },
      { id: "stem-028", catalogNo: "THR090", name: "Femoral Trial Reamer 3", qty: 1, category: "Trial Reamer" },
      { id: "stem-029", catalogNo: "THR088", name: "Femoral Trial Reamer 4", qty: 1, category: "Trial Reamer" },
      { id: "stem-030", catalogNo: "THR091", name: "Femoral Trial Reamer 5", qty: 1, category: "Trial Reamer" },
      { id: "stem-031", catalogNo: "THR067", name: "Femoral Trial Reamer 6", qty: 1, category: "Trial Reamer" },
      { id: "stem-032", catalogNo: "THR068", name: "Femoral Trial Reamer 7", qty: 1, category: "Trial Reamer" },
      { id: "stem-033", catalogNo: "THR069", name: "Femoral Trial Reamer 8", qty: 1, category: "Trial Reamer" },
      { id: "stem-034", catalogNo: "THR070", name: "Femoral Trial Reamer 9", qty: 1, category: "Trial Reamer" },
      { id: "stem-035", catalogNo: "THR071", name: "Femoral Trial Reamer 10", qty: 1, category: "Trial Reamer" },
    ],
  },
];

const IMAGE_BY_CATALOG = CHECKLISTS.reduce((map, procedure) => {
  (procedure.items || []).forEach((item) => {
    const code = String(item.catalogNo || "").trim();
    const imageUrl = String(item.imageUrl || "").trim();
    if (!code || !imageUrl || map.has(code)) return;
    map.set(code, imageUrl);
  });
  return map;
}, new Map());

function buildChecklistItems(key, rows) {
  return rows.map((row, index) => ({
    imageUrl:
      String(row.imageUrl || "").trim() ||
      IMAGE_BY_CATALOG.get(String(row.catalogNo || "").trim()) ||
      "",
    id: `${key}-${
      String(row.catalogNo || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || String(index + 1).padStart(3, "0")
    }`,
    catalogNo: String(row.catalogNo || "").trim(),
    name: String(row.name || "").trim(),
    qty: Number(row.qty || 1),
    category: String(row.category || "Tray").trim(),
  }));
}

function mergeByCatalogNo(key, firstRows, secondRows) {
  const merged = new Map();
  [...firstRows, ...secondRows].forEach((row) => {
    const code = String(row.catalogNo || "").trim();
    if (!code) return;
    if (merged.has(code)) return;
    merged.set(code, row);
  });
  return buildChecklistItems(key, Array.from(merged.values()));
}

const THR_TRAY_ROWS = [
  { catalogNo: "THR024", name: "Acetabular Reamer Handle", qty: 2, category: "Tray" },
  { catalogNo: "THR005", name: "Trial Cup Handle", qty: 1, category: "Tray" },
  { catalogNo: "THR002", name: "Liner Impactor Head Ø28", qty: 1, category: "Tray" },
  { catalogNo: "THR003", name: "Liner Impactor Head Ø32", qty: 1, category: "Tray" },
  { catalogNo: "THR004", name: "Liner Impactor Head Ø36", qty: 1, category: "Tray" },
  { catalogNo: "THR037", name: "Cup Trial Ø46", qty: 1, category: "Tray" },
  { catalogNo: "THR038", name: "Cup Trial Ø48", qty: 1, category: "Tray" },
  { catalogNo: "THR039", name: "Cup Trial Ø54", qty: 1, category: "Tray" },
  { catalogNo: "THR040", name: "Cup Trial Ø60", qty: 1, category: "Tray" },
  { catalogNo: "THR041", name: "Cup Trial Ø56", qty: 1, category: "Tray" },
  { catalogNo: "THR042", name: "Cup Trial Ø62", qty: 1, category: "Tray" },
  { catalogNo: "THR043", name: "Cup Trial Ø58", qty: 1, category: "Tray" },
  { catalogNo: "THR044", name: "Cup Trial Ø64", qty: 1, category: "Tray" },
  { catalogNo: "THR045", name: "Cup Trial Ø50", qty: 1, category: "Tray" },
  { catalogNo: "THR046", name: "Cup Trial Ø52", qty: 1, category: "Tray" },
  { catalogNo: "THR012", name: "Femoral Head Impactor", qty: 1, category: "Tray" },
  { catalogNo: "THR015", name: "Abduction Regulator", qty: 1, category: "Tray" },
  { catalogNo: "THR006", name: "Free Stem Impactor", qty: 1, category: "Tray" },
  { catalogNo: "THR011", name: "Positioner Impactor", qty: 1, category: "Tray" },
  { catalogNo: "THR001", name: "Drill Angle Guide", qty: 1, category: "Tray" },
  { catalogNo: "THR013", name: "Depth Gauge", qty: 1, category: "Tray" },
  { catalogNo: "THR014", name: "Impactor Bit", qty: 2, category: "Tray" },
  { catalogNo: "THR020", name: "T Handle Large", qty: 1, category: "Tray" },
  { catalogNo: "THR008", name: "Screw Forceps", qty: 1, category: "Tray" },
  { catalogNo: "THR016", name: "SW3.5 Screw Driver", qty: 1, category: "Tray" },
  { catalogNo: "THR017", name: "SW3.5 Jointed Screw Driver", qty: 1, category: "Tray" },
  { catalogNo: "THR010", name: "Flexible Reamer", qty: 1, category: "Tray" },
  { catalogNo: "THR026", name: "Acetabular Reamer Ø42", qty: 1, category: "Tray" },
  { catalogNo: "THR027", name: "Acetabular Reamer Ø44", qty: 1, category: "Tray" },
  { catalogNo: "THR028", name: "Acetabular Reamer Ø46", qty: 1, category: "Tray" },
  { catalogNo: "THR029", name: "Acetabular Reamer Ø48", qty: 1, category: "Tray" },
  { catalogNo: "THR030", name: "Acetabular Reamer Ø50", qty: 1, category: "Tray" },
  { catalogNo: "THR031", name: "Acetabular Reamer Ø52", qty: 1, category: "Tray" },
  { catalogNo: "THR032", name: "Acetabular Reamer Ø54", qty: 1, category: "Tray" },
  { catalogNo: "THR033", name: "Acetabular Reamer Ø56", qty: 1, category: "Tray" },
  { catalogNo: "THR034", name: "Acetabular Reamer Ø58", qty: 1, category: "Tray" },
  { catalogNo: "THR094", name: "Acetabular Reamer Ø60", qty: 1, category: "Tray" },
  { catalogNo: "THR035", name: "Acetabular Reamer Ø62", qty: 1, category: "Tray" },
  { catalogNo: "THR036", name: "Acetabular Reamer Ø64", qty: 1, category: "Tray" },
  { catalogNo: "THR047", name: "Trial Liner 28/46/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR048", name: "Trial Liner 28/48/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR049", name: "Trial Liner 32/50/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR050", name: "Trial Liner 32/52/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR051", name: "Trial Liner 36/54/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR052", name: "Trial Liner 28/46/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR053", name: "Trial Liner 28/48/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR054", name: "Trial Liner 32/50/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR055", name: "Trial Liner 32/52/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR056", name: "Trial Liner 36/56/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR057", name: "Trial Liner 36/58/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR058", name: "Trial Liner 36/60/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR059", name: "Trial Liner 36/62/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR060", name: "Trial Liner 36/64/0°", qty: 1, category: "Tray" },
  { catalogNo: "THR061", name: "Trial Liner 36/54/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR062", name: "Trial Liner 36/56/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR063", name: "Trial Liner 36/60/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR064", name: "Trial Liner 36/62/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR065", name: "Trial Liner 36/64/20°", qty: 1, category: "Tray" },
  { catalogNo: "THR066", name: "Trial Liner 36/58/20°", qty: 1, category: "Tray" },
];

const BIPOLAR_TRAY_ROWS = [
  { catalogNo: "THR105", name: "Ø46 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR106", name: "Ø48 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR107", name: "Ø50 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR108", name: "Ø52 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR109", name: "Ø44 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR110", name: "Ø60 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR111", name: "Ø54 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR117", name: "Ø56 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR012", name: "Ø58 Bipolar Trial Cup", qty: 1, category: "Tray" },
  { catalogNo: "THR112", name: "Extractor", qty: 1, category: "Tray" },
  { catalogNo: "THR113", name: "Caliper", qty: 1, category: "Tray" },
  { catalogNo: "THR114", name: "Femoral Head Impactor", qty: 1, category: "Tray" },
  { catalogNo: "THR115", name: "Segment Forceps", qty: 1, category: "Tray" },
  { catalogNo: "THR116", name: "Bipolar Trial Impactor", qty: 1, category: "Tray" },
];

const STEM_TRAY_ROWS = [
  { catalogNo: "THR019", name: "Box Osteotomy", qty: 1, category: "Tray" },
  { catalogNo: "THR021", name: "Trial Stem Standard Neck 0", qty: 1, category: "Tray" },
  { catalogNo: "THR022", name: "Trial Stem Standard Neck 1-10", qty: 1, category: "Tray" },
  { catalogNo: "THR023", name: "Trial Stem Lateral Neck 1-10", qty: 1, category: "Tray" },
  { catalogNo: "THR099", name: "Fixed Offset Adaptor", qty: 1, category: "Tray" },
  { catalogNo: "THR025", name: "Femoral Reamer", qty: 1, category: "Tray" },
  { catalogNo: "THR096", name: "Stem Impactor", qty: 1, category: "Tray" },
  { catalogNo: "THR007", name: "Stem Extraction", qty: 1, category: "Tray" },
  { catalogNo: "THR009", name: "Modular Knock Plate", qty: 1, category: "Tray" },
  { catalogNo: "THR097", name: "Bolt", qty: 1, category: "Tray" },
  { catalogNo: "THR082", name: "Trial Head Ø28 / +12", qty: 1, category: "Tray" },
  { catalogNo: "THR081", name: "Trial Head Ø28 / +8", qty: 1, category: "Tray" },
  { catalogNo: "THR080", name: "Trial Head Ø28 / +4", qty: 1, category: "Tray" },
  { catalogNo: "THR079", name: "Trial Head Ø28 / +0", qty: 1, category: "Tray" },
  { catalogNo: "THR078", name: "Trial Head Ø28 / -3", qty: 1, category: "Tray" },
  { catalogNo: "THR087", name: "Trial Head Ø32 / +12", qty: 1, category: "Tray" },
  { catalogNo: "THR086", name: "Trial Head Ø32 / +8", qty: 1, category: "Tray" },
  { catalogNo: "THR085", name: "Trial Head Ø32 / +4", qty: 1, category: "Tray" },
  { catalogNo: "THR084", name: "Trial Head Ø32 / +0", qty: 1, category: "Tray" },
  { catalogNo: "THR072", name: "Trial Head Ø32 / -3", qty: 1, category: "Tray" },
  { catalogNo: "THR089", name: "Trial Head Ø36 / +0", qty: 1, category: "Tray" },
  { catalogNo: "THR074", name: "Trial Head Ø36 / +4", qty: 1, category: "Tray" },
  { catalogNo: "THR075", name: "Trial Head Ø36 / +8", qty: 1, category: "Tray" },
  { catalogNo: "THR073", name: "Trial Head Ø36 / -3", qty: 1, category: "Tray" },
  { catalogNo: "THR076", name: "Femoral Trial Reamer 0", qty: 1, category: "Tray" },
  { catalogNo: "THR077", name: "Femoral Trial Reamer 1", qty: 1, category: "Tray" },
  { catalogNo: "THR083", name: "Femoral Trial Reamer 2", qty: 1, category: "Tray" },
  { catalogNo: "THR090", name: "Femoral Trial Reamer 3", qty: 1, category: "Tray" },
  { catalogNo: "THR088", name: "Femoral Trial Reamer 4", qty: 1, category: "Tray" },
  { catalogNo: "THR091", name: "Femoral Trial Reamer 5", qty: 1, category: "Tray" },
  { catalogNo: "THR067", name: "Femoral Trial Reamer 6", qty: 1, category: "Tray" },
  { catalogNo: "THR068", name: "Femoral Trial Reamer 7", qty: 1, category: "Tray" },
  { catalogNo: "THR069", name: "Femoral Trial Reamer 8", qty: 1, category: "Tray" },
  { catalogNo: "THR070", name: "Femoral Trial Reamer 9", qty: 1, category: "Tray" },
  { catalogNo: "THR071", name: "Femoral Trial Reamer 10", qty: 1, category: "Tray" },
];

const TKR_TRAY_ROWS = [
  { catalogNo: "TKR100", name: "T-Handle", qty: 1, category: "Tray" },
  { catalogNo: "TKR101", name: "Starter", qty: 1, category: "Tray" },
  { catalogNo: "TKR103", name: "Extramedullary Alignment Tower", qty: 1, category: "Tray" },
  { catalogNo: "TKR104", name: "Femoral A/P Chamfer Guide Handle", qty: 2, category: "Tray" },
  { catalogNo: "TKR105", name: "8 mm Twist Drill", qty: 1, category: "Tray" },
  { catalogNo: "TKR107", name: "Bone File", qty: 1, category: "Tray" },
  { catalogNo: "TKR108", name: "Femoral IM Alignment Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR109", name: "Distal Femoral Alignment Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR110", name: "Distal Femoral Cutting Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR111", name: "PS Cutting Jig Drill Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR112", name: "Femoral A/P Chamfer Cutting Guide Size 1", qty: 1, category: "Tray" },
  { catalogNo: "TKR113", name: "Femoral A/P Chamfer Cutting Guide Size 2", qty: 1, category: "Tray" },
  { catalogNo: "TKR114", name: "Femoral A/P Chamfer Cutting Guide Size 3", qty: 1, category: "Tray" },
  { catalogNo: "TKR115", name: "Femoral A/P Chamfer Cutting Guide Size 4", qty: 1, category: "Tray" },
  { catalogNo: "TKR116", name: "Femoral A/P Chamfer Cutting Guide Size 5", qty: 1, category: "Tray" },
  { catalogNo: "TKR118", name: "PS Notch Cutting Jig Size 3", qty: 1, category: "Tray" },
  { catalogNo: "TKR119", name: "PS Notch Cutting Jig Size 1", qty: 1, category: "Tray" },
  { catalogNo: "TKR120", name: "PS Notch Cutting Jig Size 2", qty: 1, category: "Tray" },
  { catalogNo: "TKR121", name: "PS Notch Cutting Jig Size 4", qty: 1, category: "Tray" },
  { catalogNo: "TKR122", name: "PS Notch Cutting Jig Size 5", qty: 1, category: "Tray" },
  { catalogNo: "TKR124", name: "Femoral IM Rod 400 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR130", name: "Femoral Condyle Drill", qty: 1, category: "Tray" },
  { catalogNo: "TKR131", name: "PS Reamer", qty: 1, category: "Tray" },
  { catalogNo: "TKR133", name: "Pin Extractor", qty: 1, category: "Tray" },
  { catalogNo: "TKR134", name: "Spike and Tibial EM Guide Extractor", qty: 1, category: "Tray" },
  { catalogNo: "TKR135", name: "Femoral Impactor", qty: 1, category: "Tray" },
  { catalogNo: "TKR136", name: "PS Housing Punch", qty: 1, category: "Tray" },
  { catalogNo: "TKR137", name: "PS Housing Impactor", qty: 1, category: "Tray" },
  { catalogNo: "TKR138", name: "Tibial Insert Impactor", qty: 1, category: "Tray" },
  { catalogNo: "TKR139", name: "Tibial Insert Extractor", qty: 1, category: "Tray" },
  { catalogNo: "TKR140", name: "Femoral Sizer", qty: 1, category: "Tray" },
  { catalogNo: "TKR145", name: "Tibial IM Rod", qty: 1, category: "Tray" },
  { catalogNo: "TKR169", name: "Cemented Tibial Punch Handle", qty: 1, category: "Tray" },
  { catalogNo: "TKR170", name: "Tibial Baseplate Handle", qty: 1, category: "Tray" },
  { catalogNo: "TKR171", name: "Tibial IM Alignment Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR172", name: "Tibial EM Alignment Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR173", name: "Tibial Drill Guide", qty: 1, category: "Tray" },
  { catalogNo: "TKR174", name: "Tibial Cutting Jig 0° Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR175", name: "Tibial Cutting Jig 5° Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR176", name: "Tibial Cutting Jig 0° Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR177", name: "Tibial Cutting Jig 5° Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR178", name: "Alignment Rod", qty: 1, category: "Tray" },
  { catalogNo: "TKR182", name: "Tibial Baseplate Impactor", qty: 1, category: "Tray" },
  { catalogNo: "TKR183", name: "Posterior Stabilization Part", qty: 1, category: "Tray" },
  { catalogNo: "TKR190", name: "Cemented Tibia Punch L", qty: 1, category: "Tray" },
  { catalogNo: "TKR191", name: "Cemented Tibia Punch M", qty: 1, category: "Tray" },
  { catalogNo: "TKR192", name: "Cemented Tibia Punch S", qty: 1, category: "Tray" },
  { catalogNo: "TKR193", name: "Gap Gauge 9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR194", name: "Gap Gauge 11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR195", name: "Gap Gauge 13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR196", name: "Gap Gauge 15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR198", name: "Tibial Stylus", qty: 1, category: "Tray" },
  { catalogNo: "TKR205", name: "Tibial Baseplate Trial Size 6", qty: 1, category: "Tray" },
  { catalogNo: "TKR254", name: "Femoral A/P Chamfer Cutting Guide Size 6", qty: 1, category: "Tray" },
  { catalogNo: "TKR255", name: "PS Notch Cutting Jig Size 6", qty: 1, category: "Tray" },
  { catalogNo: "TKR256-257", name: "Spikes", qty: 1, category: "Tray" },
  { catalogNo: "TKR300", name: "Femoral Driver", qty: 1, category: "Tray" },
  { catalogNo: "TKR001", name: "Femoral Trial CR Size 1 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR002", name: "Femoral Trial CR Size 2 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR003", name: "Femoral Trial PS Size 3 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR004", name: "Femoral Trial PS Size 4 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR005", name: "Femoral Trial CR Size 5 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR007", name: "Tibial Insert Trial 5-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR008", name: "Femoral Trial CR Size 2 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR009", name: "Femoral Trial CR Size 3 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR010", name: "Femoral Trial CR Size 1 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR011", name: "Tibial Insert Trial 5-15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR019", name: "Femoral Trial PS Size 1 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR020", name: "Femoral Trial PS Size 2 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR021", name: "Femoral Trial CR Size 3 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR022", name: "Femoral Trial PS Size 6 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR023", name: "Femoral Trial PS Size 5 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR025", name: "Tibial Baseplate Trial Size 1", qty: 1, category: "Tray" },
  { catalogNo: "TKR026", name: "Tibial Baseplate Trial Size 2", qty: 1, category: "Tray" },
  { catalogNo: "TKR027", name: "Tibial Baseplate Trial Size 3", qty: 1, category: "Tray" },
  { catalogNo: "TKR028", name: "Tibial Baseplate Trial Size 4", qty: 1, category: "Tray" },
  { catalogNo: "TKR029", name: "Tibial Baseplate Trial Size 5", qty: 1, category: "Tray" },
  { catalogNo: "TKR201", name: "Femoral Trial CR Size 6 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR202", name: "Femoral Trial CR Size 6 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR204", name: "Femoral Trial CR Size 4 Left", qty: 1, category: "Tray" },
  { catalogNo: "TKR206", name: "Tibial Insert Trial 1-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR207", name: "Tibial Insert Trial 1-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR208", name: "Tibial Insert Trial 2-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR209", name: "Tibial Insert Trial 1-15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR210", name: "Tibial Insert Trial 1-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR211", name: "Tibial Insert Trial 2-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR212", name: "Tibial Insert Trial 2-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR213", name: "Tibial Insert Trial 2-15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR214", name: "Tibial Insert Trial 3-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR215", name: "Tibial Insert Trial 3-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR216", name: "Tibial Insert Trial 3-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR217", name: "Tibial Insert Trial 3-15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR218", name: "Femoral Trial CR Size 5 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR219", name: "Tibial Insert Trial 4-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR220", name: "Tibial Insert Trial 4-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR221", name: "Tibial Insert Trial 4-15 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR222", name: "Femoral Trial CR Size 4 Right", qty: 1, category: "Tray" },
  { catalogNo: "TKR223", name: "Tibial Insert Trial 4-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR224", name: "Tibial Insert Trial 5-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR225", name: "Tibial Insert Trial 5-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR226", name: "Tibial Insert Trial 6-9 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR227", name: "Tibial Insert Trial 6-11 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR228", name: "Tibial Insert Trial 6-13 mm", qty: 1, category: "Tray" },
  { catalogNo: "TKR229", name: "Tibial Insert Trial 6-15 mm", qty: 1, category: "Tray" },
];

const BIPOLAR_ONLY_ITEMS = buildChecklistItems("bipolar", BIPOLAR_TRAY_ROWS);
const BIPOLAR_WITH_STEM_ITEMS = mergeByCatalogNo("bipolar", STEM_TRAY_ROWS, BIPOLAR_TRAY_ROWS);
const THR_ONLY_ITEMS = buildChecklistItems("thr", THR_TRAY_ROWS);
const THR_WITH_STEM_ITEMS = mergeByCatalogNo("thr", THR_TRAY_ROWS, STEM_TRAY_ROWS);

const TRAY_ITEMS = {
  tkr: buildChecklistItems("tkr", TKR_TRAY_ROWS),
  bipolar: BIPOLAR_ONLY_ITEMS,
  thr: THR_ONLY_ITEMS,
  stem: buildChecklistItems("stem", STEM_TRAY_ROWS),
};

function getProcedureItems(procedure, options = {}) {
  if (procedure.key === "bipolar" && options.bipolarIncludeStem) {
    return BIPOLAR_WITH_STEM_ITEMS;
  }
  if (procedure.key === "thr" && options.thrIncludeStem) {
    return THR_WITH_STEM_ITEMS;
  }
  return TRAY_ITEMS[procedure.key] || buildChecklistItems(procedure.key, procedure.items || []);
}

const STORAGE_KEY = "normed-instrument-checklist-v2";

function createCustomInstrumentId(procedureKey, catalogNo) {
  const normalizedCode = String(catalogNo || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${procedureKey}-custom-${normalizedCode || "item"}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function sanitizeCustomInstruments(value) {
  if (!value || typeof value !== "object") return {};

  const next = {};
  Object.entries(value).forEach(([procedureKey, rows]) => {
    if (!Array.isArray(rows)) return;
    const cleanedRows = rows
      .filter((row) => row && (row.id || row.catalogNo || row.name))
      .map((row, index) => {
        const catalogNo = String(row.catalogNo || "")
          .trim()
          .toUpperCase();
        const name = String(row.name || "").trim();
        const qtyValue = Number(row.qty || 1);
        return {
          id:
            String(row.id || "").trim() ||
            createCustomInstrumentId(procedureKey, `${catalogNo || "item"}-${index + 1}`),
          catalogNo,
          name,
          qty: Number.isFinite(qtyValue) && qtyValue > 0 ? Math.round(qtyValue) : 1,
          category: String(row.category || "Tambahan").trim() || "Tambahan",
          imageUrl: String(row.imageUrl || "").trim(),
          isCustom: true,
        };
      })
      .filter((row) => row.catalogNo && row.name);
    if (cleanedRows.length) {
      next[procedureKey] = cleanedRows;
    }
  });
  return next;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NormedInstrumentChecklistApp() {
  const [procedureKey, setProcedureKey] = useState("tkr");
  const [bipolarIncludeStem, setBipolarIncludeStem] = useState(true);
  const [thrIncludeStem, setThrIncludeStem] = useState(true);
  const [customInstrumentsByProcedure, setCustomInstrumentsByProcedure] = useState({});
  const [extraCatalogNo, setExtraCatalogNo] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [extraPiece, setExtraPiece] = useState("1");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState({});
  const [operatorName, setOperatorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [caseNote, setCaseNote] = useState("");
  const [documentationPhoto, setDocumentationPhoto] = useState(null);
  const [documentationPreview, setDocumentationPreview] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selected = CHECKLISTS.find((item) => item.key === procedureKey) || CHECKLISTS[0];
  const baseSelectedItems = useMemo(
    () =>
      getProcedureItems(selected, {
        bipolarIncludeStem,
        thrIncludeStem,
      }),
    [selected, bipolarIncludeStem, thrIncludeStem]
  );
  const selectedCustomItems = useMemo(
    () => customInstrumentsByProcedure[selected.key] || [],
    [customInstrumentsByProcedure, selected.key]
  );
  const selectedItems = useMemo(
    () => [...baseSelectedItems, ...selectedCustomItems],
    [baseSelectedItems, selectedCustomItems]
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setChecked(parsed.checked || {});
      setOperatorName(parsed.operatorName || "");
      setHospitalName(parsed.hospitalName || "");
      setDoctorName(parsed.doctorName || "");
      setPatientCode(parsed.patientCode || "");
      setCaseNote(parsed.caseNote || "");
      if (parsed.procedureKey) setProcedureKey(parsed.procedureKey);
      if (typeof parsed.bipolarIncludeStem === "boolean") {
        setBipolarIncludeStem(parsed.bipolarIncludeStem);
      }
      if (typeof parsed.thrIncludeStem === "boolean") {
        setThrIncludeStem(parsed.thrIncludeStem);
      }
      setCustomInstrumentsByProcedure(sanitizeCustomInstruments(parsed.customInstrumentsByProcedure));
    } catch (error) {
      console.error("Gagal membaca localStorage", error);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        checked,
        operatorName,
        hospitalName,
        doctorName,
        patientCode,
        caseNote,
        procedureKey,
        bipolarIncludeStem,
        thrIncludeStem,
        customInstrumentsByProcedure,
      })
    );
  }, [
    checked,
    operatorName,
    hospitalName,
    doctorName,
    patientCode,
    caseNote,
    procedureKey,
    bipolarIncludeStem,
    thrIncludeStem,
    customInstrumentsByProcedure,
  ]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return selectedItems;

    return selectedItems.filter((item) => {
      return [item.catalogNo, item.name, item.category || "", item.note || ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [query, selectedItems]);

  const total = selectedItems.length;
  const completed = selectedItems.filter((item) => checked[item.id]).length;
  const missingItems = selectedItems.filter((item) => !checked[item.id]);
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const selectedProcedureTitle = useMemo(() => {
    if (selected.key === "bipolar") {
      return bipolarIncludeStem ? `${selected.title} + Stem` : `${selected.title} (Bipolar Only)`;
    }
    if (selected.key === "thr") {
      return thrIncludeStem ? `${selected.title} + Stem` : `${selected.title} (Acetabular Only)`;
    }
    return selected.title;
  }, [selected.key, selected.title, bipolarIncludeStem, thrIncludeStem]);

  function toggleItem(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function resetSelectedProcedure() {
    const next = { ...checked };
    selectedItems.forEach((item) => {
      delete next[item.id];
    });
    setChecked(next);
  }

  function addExtraInstrument(event) {
    event.preventDefault();

    const catalogNo = extraCatalogNo.trim().toUpperCase();
    const name = extraDescription.trim();
    const qty = Number(extraPiece);

    if (!catalogNo || !name) {
      setMessage("Kode dan deskripsi instrument tambahan wajib diisi.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setMessage("Piece instrument tambahan harus lebih dari 0.");
      return;
    }

    const duplicatedInBase = baseSelectedItems.some(
      (item) => String(item.catalogNo || "").trim().toUpperCase() === catalogNo
    );
    const duplicatedInCustom = selectedCustomItems.some(
      (item) => String(item.catalogNo || "").trim().toUpperCase() === catalogNo
    );
    if (duplicatedInBase || duplicatedInCustom) {
      setMessage(`Kode ${catalogNo} sudah ada di checklist ${selected.title}.`);
      return;
    }

    const newItem = {
      id: createCustomInstrumentId(selected.key, catalogNo),
      catalogNo,
      name,
      qty: Math.round(qty),
      category: "Tambahan",
      imageUrl: "",
      isCustom: true,
    };

    setCustomInstrumentsByProcedure((prev) => ({
      ...prev,
      [selected.key]: [...(prev[selected.key] || []), newItem],
    }));
    setExtraCatalogNo("");
    setExtraDescription("");
    setExtraPiece("1");
    setMessage("Instrument tambahan berhasil ditambahkan.");
  }

  function removeExtraInstrument(itemId) {
    setCustomInstrumentsByProcedure((prev) => {
      const currentRows = prev[selected.key] || [];
      const nextRows = currentRows.filter((item) => item.id !== itemId);
      const next = { ...prev };
      if (nextRows.length) {
        next[selected.key] = nextRows;
      } else {
        delete next[selected.key];
      }
      return next;
    });
    setChecked((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSizeMb = 4;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setMessage(`Ukuran foto maksimal ${maxSizeMb} MB.`);
      return;
    }

    setDocumentationPhoto(file);
    setPhotoName(file.name);
    const base64 = await fileToBase64(file);
    setDocumentationPreview(base64);
  }

  function removePhoto() {
    setDocumentationPhoto(null);
    setDocumentationPreview("");
    setPhotoName("");
  }

  function buildPayload(photoBase64 = "") {
    return {
      action: "saveChecklist",
      procedureKey: selected.key,
      procedureTitle: selectedProcedureTitle,
      timestamp: new Date().toISOString(),
      operatorName,
      hospitalName,
      doctorName,
      patientCode,
      caseNote,
      progress,
      completed,
      total,
      status: progress === 100 ? "Lengkap" : "Belum Lengkap",
      missingCount: missingItems.length,
      missingItems: missingItems.map((item) => `${item.catalogNo} - ${item.name}`).join("; "),
      photoName,
      photoBase64,
      items: selectedItems.map((item) => ({
        id: item.id,
        catalogNo: item.catalogNo,
        name: item.name,
        category: item.category,
        qty: item.qty,
        isCustom: Boolean(item.isCustom),
        checked: Boolean(checked[item.id]),
      })),
    };
  }

  function buildImplantUsageData(photoBase64 = "") {
    const nowIso = new Date().toISOString();
    const photoMime =
      (photoBase64 && String(photoBase64).match(/^data:([^;]+);base64,/)?.[1]) ||
      "image/jpeg";

    const slots = selectedItems.map((item, index) => ({
      slotNumber: index + 1,
      label: `${item.catalogNo} - ${item.name}`,
      implantName: item.name,
      implantCode: [
        `CAT:${item.catalogNo}`,
        `QTY:${item.qty}`,
        `GROUP:${item.category}`,
        `CHECKED:${checked[item.id] ? "YES" : "NO"}`,
      ].join(" | "),
      imageUpload: null,
    }));

    return {
      source: "ceklist-instrument-normed",
      operationDate: nowIso.slice(0, 10),
      doctorName: doctorName || "-",
      hospitalName,
      repAssist: operatorName,
      systemName: selectedProcedureTitle,
      invoiceTo: hospitalName,
      patientName: patientCode ? `MRN ${patientCode}` : "",
      medrec: patientCode || "",
      region: hospitalName,
      checklist: selectedItems.map((item) => ({
        id: item.id,
        catalogNo: item.catalogNo,
        name: item.name,
        category: item.category,
        qty: item.qty,
        isCustom: Boolean(item.isCustom),
        checked: Boolean(checked[item.id]),
      })),
      patientStickerUpload: photoBase64
        ? {
            fileName: photoName || `normed-${selected.key}-${Date.now()}.jpg`,
            mimeType: photoMime,
            dataUrl: photoBase64,
          }
        : null,
      slots,
      signatures: [],
      note: caseNote || "",
      progress,
      completed,
      total,
      missingCount: missingItems.length,
    };
  }

  function exportJson() {
    const payload = buildPayload(documentationPreview);

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.key}-normed-checklist-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submitToGoogleSheet() {
    setMessage("");

    if (!GOOGLE_SHEET_ENDPOINT) {
      setMessage("NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT belum diisi di file .env.local");
      return;
    }

    if (!operatorName || !hospitalName) {
      setMessage("Nama TS/operator dan rumah sakit wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const photoBase64 = documentationPhoto ? await fileToBase64(documentationPhoto) : "";
      const payload = {
        url: GOOGLE_SHEET_ENDPOINT,
        action: "create_implant_usage",
        data: buildImplantUsageData(photoBase64),
      };

      const response = await fetch("/api/google-sheet-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const remote = result?.remote || result || {};
      const remoteStatus = String(remote?.status || "").toLowerCase();
      const remoteOk =
        typeof remote?.ok === "boolean"
          ? remote.ok
          : remoteStatus
            ? remoteStatus !== "error"
            : true;

      if (!response.ok || !result?.ok || !remoteOk) {
        throw new Error(
          remote?.error ||
            remote?.message ||
            result?.error ||
            `Gagal menyimpan data (HTTP ${response.status}).`
        );
      }

      setMessage(
        remote?.submissionId
          ? `Checklist berhasil disimpan ke Google Sheet. ID: ${remote.submissionId}`
          : "Checklist berhasil disimpan ke Google Sheet."
      );
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-100">
                <ClipboardCheck size={16} /> Normed Instrument Checklist
              </div>
              <h1 className="text-2xl font-bold md:text-4xl">Checklist Elektronik Instrument Operasi</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200 md:text-base">
                Checklist TKR, Bipolar, dan THR dengan dokumentasi foto serta integrasi Google Sheet.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
              <p className="text-sm text-slate-200">Progress</p>
              <p className="text-4xl font-bold">{progress}%</p>
              <p className="text-xs text-slate-300">
                {completed} dari {total} item selesai
              </p>
            </div>
          </div>
        </motion.div>

        <section className="grid gap-4 md:grid-cols-3">
          {CHECKLISTS.map((procedure) => {
            const active = procedure.key === procedureKey;
            const baseProcedureItems = getProcedureItems(procedure, {
              bipolarIncludeStem,
              thrIncludeStem,
            });
            const customProcedureItems = customInstrumentsByProcedure[procedure.key] || [];
            const procedureItems = [...baseProcedureItems, ...customProcedureItems];
            const done = procedureItems.filter((item) => checked[item.id]).length;
            const pct = procedureItems.length ? Math.round((done / procedureItems.length) * 100) : 0;

            return (
              <button
                key={procedure.key}
                onClick={() => setProcedureKey(procedure.key)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md ${
                  active ? "border-slate-900 bg-white" : "border-slate-200 bg-white/80"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Stethoscope className={active ? "text-slate-900" : "text-slate-400"} size={22} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {pct}%
                  </span>
                </div>
                <h2 className="font-semibold">{procedure.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{procedure.subtitle}</p>
                <p className="mt-2 text-xs text-slate-400">{done}/{procedureItems.length} item</p>
              </button>
            );
          })}
        </section>

        {procedureKey === "bipolar" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Mode Tray Bipolar</p>
                <p className="text-xs text-slate-500">
                  Pilih sumber list: hanya tray bipolar atau gabung tray stem + bipolar.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setBipolarIncludeStem(false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    !bipolarIncludeStem
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Bipolar saja
                </button>
                <button
                  type="button"
                  onClick={() => setBipolarIncludeStem(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    bipolarIncludeStem
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Bipolar + Stem
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {procedureKey === "thr" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Mode Tray THR</p>
                <p className="text-xs text-slate-500">
                  Pilih list THR acetabular saja atau gabung THR + Stem.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setThrIncludeStem(false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    !thrIncludeStem
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  THR Acetabular
                </button>
                <button
                  type="button"
                  onClick={() => setThrIncludeStem(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    thrIncludeStem
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  THR + Stem
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-800">Instrument Tambahan</p>
            <p className="text-xs text-slate-500">
              Tambahkan instrument di luar tray untuk prosedur aktif ({selected.title}).
            </p>
          </div>
          <form onSubmit={addExtraInstrument} className="grid gap-3 md:grid-cols-[160px_1fr_120px_130px]">
            <input
              value={extraCatalogNo}
              onChange={(event) => setExtraCatalogNo(event.target.value)}
              placeholder="Kode *"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
            <input
              value={extraDescription}
              onChange={(event) => setExtraDescription(event.target.value)}
              placeholder="Deskripsi *"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
            <input
              value={extraPiece}
              onChange={(event) => setExtraPiece(event.target.value)}
              type="number"
              min={1}
              placeholder="Piece"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Tambah Instrument
            </button>
          </form>

          {selectedCustomItems.length ? (
            <div className="mt-4 space-y-2">
              {selectedCustomItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">
                      {item.catalogNo} · {item.name}
                    </p>
                    <p className="text-xs text-slate-500">Piece: {item.qty}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExtraInstrument(item.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Belum ada instrument tambahan.</p>
          )}
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
          <input
            value={operatorName}
            onChange={(event) => setOperatorName(event.target.value)}
            placeholder="Nama TS / operator checklist *"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
          />
          <input
            value={hospitalName}
            onChange={(event) => setHospitalName(event.target.value)}
            placeholder="Rumah sakit / lokasi *"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
          />
          <input
            value={doctorName}
            onChange={(event) => setDoctorName(event.target.value)}
            placeholder="Dokter operator"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
          />
          <input
            value={patientCode}
            onChange={(event) => setPatientCode(event.target.value)}
            placeholder="Kode pasien / MRN"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
          />
          <input
            value={caseNote}
            onChange={(event) => setCaseNote(event.target.value)}
            placeholder="Catatan kasus"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">{selected.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">{selected.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetSelectedProcedure}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <Download size={16} /> Export JSON
              </button>
              <button
                onClick={submitToGoogleSheet}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Simpan ke Sheet
              </button>
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari catalog no, nama instrument, atau kategori..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Camera size={18} /> Ambil / Upload Foto Dokumentasi
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          {documentationPreview ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center">
              <img src={documentationPreview} alt="Preview dokumentasi" className="h-28 w-28 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">Foto dokumentasi siap disimpan</p>
                <p className="text-sm text-slate-500">{photoName}</p>
              </div>
              <button onClick={removePhoto} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-white">
                <X size={16} /> Hapus Foto
              </button>
            </div>
          ) : null}

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[64px_130px_1fr_90px_44px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Foto</span>
              <span>Kode</span>
              <span>Deskripsi</span>
              <span>Piece</span>
              <span className="text-right">Cek</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isChecked = Boolean(checked[item.id]);
                return (
                  <motion.button
                    key={item.id}
                    layout
                    onClick={() => toggleItem(item.id)}
                    className={`w-full px-4 py-3 text-left transition ${
                      isChecked ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 md:hidden">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {item.imageUrl ? (
                            <>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                  const fallback = event.currentTarget.nextElementSibling;
                                  if (fallback instanceof HTMLElement) fallback.classList.remove("hidden");
                                }}
                              />
                              <div className="hidden h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon size={18} />
                              </div>
                            </>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {item.catalogNo}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-snug text-slate-900">{item.name}</p>
                          {item.isCustom ? (
                            <p className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Tambahan
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">Piece: {item.qty}</p>
                        </div>
                      </div>
                      {isChecked ? (
                        <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />
                      ) : (
                        <Circle className="shrink-0 text-slate-300" size={20} />
                      )}
                    </div>

                    <div className="hidden grid-cols-[64px_130px_1fr_90px_44px] items-center gap-3 md:grid">
                      <div className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        {item.imageUrl ? (
                          <>
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                const fallback = event.currentTarget.nextElementSibling;
                                if (fallback instanceof HTMLElement) fallback.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden h-full w-full items-center justify-center text-slate-400">
                              <ImageIcon size={14} />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{item.catalogNo}</p>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                        {item.isCustom ? (
                          <p className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Tambahan
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">{item.qty}</p>
                      <div className="flex justify-end">
                        {isChecked ? (
                          <CheckCircle2 className="text-emerald-600" size={20} />
                        ) : (
                          <Circle className="text-slate-300" size={20} />
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Instrument tidak ditemukan.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
