"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Download,
  Expand,
  Eye,
  ImageIcon,
  Loader2,
  MinusCircle,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Stethoscope,
  X,
} from "lucide-react";
import DriveImageWithFallback from "@/components/DriveImageWithFallback.jsx";
import {
  FloatingInputField,
  FloatingSelectField,
} from "@/components/FloatingFields";
import {
  buildGoogleDriveDirectImageUrl,
  extractDriveIdFromRecord,
  toSafeImageSrc,
} from "@/lib/googleDriveImage";
import Image from "next/image";

// Endpoint Web App Apps Script (yang sudah di-upgrade)
const GOOGLE_SHEET_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzuQk2jdWiJT8ANVR3XdoFQiWInwMGnJM9ZtHUHIf6MipXdNs5moRMx4NV-nXzfJ_6q/exec";

const ACTION_LIST_INSTRUMENT_PROFILE_CANDIDATES = [
  "list_instrument_profiles",
  "read_instrument_profiles",
  "listinstrumentprofiles",
  "readinstrumentprofiles",
  "list",
  "read",
];
const ACTION_LIST_IMPLANT_USAGE_CANDIDATES = [
  "list_implant_usage",
  "read_implant_usage",
  "listimplantusage",
  "readimplantusage",
];
const INSTRUMENT_PROFILE_SHEET_NAME = "InstrumentProfiles";
const IMPLANT_USAGE_SHEET_NAME = "ImplantUsageSubmissions";

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
    title: "Cementless & Cemented Stem System",
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

const STORAGE_KEY = "normed-instrument-checklist-v3";

const GROUP_COLOR_VARIANTS = [
  {
    card: "border-sky-200",
    header: "bg-sky-50",
    title: "text-sky-900",
    meta: "text-sky-700",
    badge: "bg-sky-100 text-sky-800",
    quickCheck: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100",
    quickUncheck: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
  },
  {
    card: "border-emerald-200",
    header: "bg-emerald-50",
    title: "text-emerald-900",
    meta: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    quickCheck: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    quickUncheck: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
  },
  {
    card: "border-violet-200",
    header: "bg-violet-50",
    title: "text-violet-900",
    meta: "text-violet-700",
    badge: "bg-violet-100 text-violet-800",
    quickCheck: "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100",
    quickUncheck: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
  },
  {
    card: "border-amber-200",
    header: "bg-amber-50",
    title: "text-amber-900",
    meta: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    quickCheck: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    quickUncheck: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
  },
  {
    card: "border-rose-200",
    header: "bg-rose-50",
    title: "text-rose-900",
    meta: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
    quickCheck: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
    quickUncheck: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
  },
];

const DEFAULT_GROUP_PRIORITY_RULES = [
  ["femoral"],
  ["tibial", "tibia"],
  ["trial"],
  ["alignment"],
  ["cutting", "chamfer"],
  ["reamer"],
  ["impactor"],
  ["extractor"],
  ["drill"],
  ["gap"],
  ["pin", "spike"],
  ["tambahan", "custom"],
];

const PROCEDURE_GROUP_PRIORITY_RULES = {
  tkr: [
    ["femoral"],
    ["tibial", "tibia"],
    ["gap"],
    ["trial"],
    ["alignment"],
    ["cutting", "chamfer"],
    ["ps"],
    ["drill"],
    ["impactor"],
    ["extractor"],
    ["pin", "spike"],
    ["tambahan", "custom"],
  ],
  thr: [
    ["reamer"],
    ["cup trial", "cup"],
    ["trial liner", "liner"],
    ["impactor"],
    ["trial"],
    ["alignment"],
    ["drill"],
    ["extractor"],
    ["stem", "femoral"],
    ["tambahan", "custom"],
  ],
  bipolar: [
    ["bipolar trial cup", "trial cup"],
    ["trial"],
    ["measurement", "caliper"],
    ["assembly"],
    ["impactor"],
    ["extractor"],
    ["stem", "femoral"],
    ["tambahan", "custom"],
  ],
  stem: [
    ["trial stem"],
    ["trial head"],
    ["trial reamer"],
    ["trial"],
    ["reamer"],
    ["impactor"],
    ["extractor"],
    ["stem basic", "stem"],
    ["tambahan", "custom"],
  ],
};

const PROCEDURE_STAGE_RULES = {
  tkr: [
    { key: "femoral", label: "Femoral", keywords: ["femoral"] },
    { key: "tibial", label: "Tibial", keywords: ["tibial", "tibia"] },
    { key: "gap", label: "Gap", keywords: ["gap"] },
    { key: "trial", label: "Trial", keywords: ["trial"] },
  ],
  thr: [
    { key: "reamer", label: "Reamer", keywords: ["reamer"] },
    { key: "cup", label: "Cup Trial", keywords: ["cup trial", "cup"] },
    { key: "liner", label: "Trial Liner", keywords: ["trial liner", "liner"] },
    { key: "impactor", label: "Impactor", keywords: ["impactor"] },
  ],
  bipolar: [
    { key: "trial_cup", label: "Trial Cup", keywords: ["trial cup", "bipolar trial cup"] },
    { key: "assembly", label: "Assembly", keywords: ["assembly", "segment"] },
    { key: "impactor", label: "Impactor", keywords: ["impactor"] },
    { key: "stem", label: "Stem", keywords: ["stem", "femoral"] },
  ],
  stem: [
    { key: "trial_stem", label: "Trial Stem", keywords: ["trial stem"] },
    { key: "trial_head", label: "Trial Head", keywords: ["trial head"] },
    { key: "trial_reamer", label: "Trial Reamer", keywords: ["trial reamer"] },
    { key: "impactor", label: "Impactor", keywords: ["impactor"] },
  ],
};

const CRITICAL_ITEM_KEYWORDS = [
  "impactor",
  "drill",
  "reamer",
  "guide",
  "cutting",
  "chamfer",
  "jig",
  "punch",
  "housing",
  "alignment",
  "trial stem",
  "stem extraction",
];

const PROCEDURE_THEME_VARIANTS = {
  tkr: {
    iconBg: "bg-blue-100 text-blue-700",
    bar: "from-blue-500 to-cyan-500",
    badge: "bg-blue-100 text-blue-700",
    active: "border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-blue-100/70",
    inactive: "border-slate-200 bg-white/90",
  },
  bipolar: {
    iconBg: "bg-violet-100 text-violet-700",
    bar: "from-violet-500 to-fuchsia-500",
    badge: "bg-violet-100 text-violet-700",
    active:
      "border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-violet-100/70",
    inactive: "border-slate-200 bg-white/90",
  },
  thr: {
    iconBg: "bg-emerald-100 text-emerald-700",
    bar: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-100 text-emerald-700",
    active:
      "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-emerald-100/70",
    inactive: "border-slate-200 bg-white/90",
  },
  stem: {
    iconBg: "bg-amber-100 text-amber-700",
    bar: "from-amber-500 to-orange-500",
    badge: "bg-amber-100 text-amber-700",
    active: "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-amber-100/70",
    inactive: "border-slate-200 bg-white/90",
  },
};

function getProcedureTheme(key) {
  return PROCEDURE_THEME_VARIANTS[key] || PROCEDURE_THEME_VARIANTS.tkr;
}

function getGroupColorVariant(groupName) {
  const raw = String(groupName || "").trim().toLowerCase();
  const hash = raw.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GROUP_COLOR_VARIANTS[hash % GROUP_COLOR_VARIANTS.length];
}

function getGroupPriority(groupName, procedureKey = "") {
  const raw = String(groupName || "").trim().toLowerCase();
  if (!raw) return 999;
  const normalizedProcedure = normalizeProcedureKey(procedureKey);
  const procedureRules =
    PROCEDURE_GROUP_PRIORITY_RULES[normalizedProcedure] ||
    DEFAULT_GROUP_PRIORITY_RULES;
  for (let index = 0; index < procedureRules.length; index += 1) {
    const keywords = procedureRules[index];
    const matched = keywords.some((keyword) => raw.includes(keyword));
    if (matched) return index;
  }
  for (let index = 0; index < DEFAULT_GROUP_PRIORITY_RULES.length; index += 1) {
    const keywords = DEFAULT_GROUP_PRIORITY_RULES[index];
    const matched = keywords.some((keyword) => raw.includes(keyword));
    if (matched) return index + 100;
  }
  return 999;
}

function parseBooleanLike(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return false;
  return ["1", "true", "yes", "y", "ya", "ok", "critical", "kritikal"].includes(raw);
}

function isCriticalInstrument(item) {
  if (!item || typeof item !== "object") return false;
  if (Boolean(item.isCritical)) return true;
  const source = `${item.catalogNo || ""} ${item.name || ""} ${item.category || ""}`.toLowerCase();
  return CRITICAL_ITEM_KEYWORDS.some((keyword) => source.includes(keyword));
}

function resolveProcedureStages(procedureKey) {
  const normalized = normalizeProcedureKey(procedureKey);
  const base = PROCEDURE_STAGE_RULES[normalized] || [];
  return base.length
    ? base
    : [{ key: "all", label: "Semua Tahap", keywords: [] }];
}

function matchesGroupStage(groupName, stage) {
  const raw = String(groupName || "").trim().toLowerCase();
  const keywords = Array.isArray(stage?.keywords) ? stage.keywords : [];
  if (!keywords.length) return true;
  return keywords.some((keyword) => raw.includes(String(keyword || "").toLowerCase()));
}

function getTodayKey(dateInput = new Date()) {
  const sourceDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(sourceDate.getTime())) return "";
  return sourceDate.toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
}

function inferProcedureKeyFromText(value) {
  const raw = String(value || "").toLowerCase();
  if (!raw) return "";
  if (raw.includes("tkr") || raw.includes("gordion") || raw.includes("knee")) return "tkr";
  if (raw.includes("bipolar")) return "bipolar";
  if (raw.includes("stem")) return "stem";
  if (raw.includes("thr") || raw.includes("acetabular") || raw.includes("hip")) return "thr";
  return "";
}

function normalizeProcedureKey(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "tkr" || raw === "thr" || raw === "bipolar" || raw === "stem") {
    return raw;
  }
  return "";
}

function normalizeCatalogNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function driveIdToImageUrl(driveId) {
  const id = String(driveId || "").trim();
  if (!id) return "";
  return buildGoogleDriveDirectImageUrl(id);
}

function parseTagMetadata(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};

  const parsedJson = parseJsonSafe(raw);
  if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) {
    return parsedJson;
  }

  const meta = {};
  raw.split(/[;|]/).forEach((segment) => {
    const entry = String(segment || "").trim();
    if (!entry) return;
    const equalIndex = entry.indexOf("=");
    const colonIndex = entry.indexOf(":");
    const dividerIndex =
      equalIndex >= 0 && colonIndex >= 0
        ? Math.min(equalIndex, colonIndex)
        : Math.max(equalIndex, colonIndex);
    if (dividerIndex <= 0) return;
    const key = entry.slice(0, dividerIndex).trim();
    const val = entry.slice(dividerIndex + 1).trim();
    if (!key || !val) return;
    meta[key] = val;
  });
  return meta;
}

function normalizeInstrumentProfileRows(rows) {
  const next = {};
  if (!Array.isArray(rows)) return next;

  rows.forEach((rawRow) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const meta = parseTagMetadata(
      rawRow.tags || rawRow.tag || rawRow.metadata || rawRow.meta
    );
    const procedureKey = normalizeProcedureKey(
      rawRow.procedureKey ||
        rawRow.procedure ||
        rawRow.systemKey ||
        rawRow.procedurekey ||
        rawRow.systemkey ||
        rawRow.system ||
        rawRow.system_name ||
        rawRow.tindakan ||
        rawRow.operation ||
        rawRow.profil ||
        meta.procedureKey ||
        meta.procedure ||
        meta.systemKey ||
        meta.system ||
        meta.operation
    );
    const catalogNo = normalizeCatalogNo(
      rawRow.catalogNo ||
        rawRow.code ||
        rawRow.catalogno ||
        rawRow.kode ||
        rawRow.katalog ||
        rawRow.itemCode ||
        rawRow.itemcode ||
        meta.catalogNo ||
        meta.code ||
        meta.kode ||
        meta.itemCode
    );
    if (!procedureKey || !catalogNo) return;

    const qtyValue = Number(
      rawRow.qty ||
        rawRow.piece ||
        rawRow.pieces ||
        rawRow.pcs ||
        rawRow.jumlah ||
        meta.qty ||
        meta.piece ||
        meta.pieces ||
        1
    );
    const isCritical =
      parseBooleanLike(
        rawRow.isCritical ||
          rawRow.critical ||
          rawRow.kritikal ||
          rawRow.is_critical ||
          meta.isCritical ||
          meta.critical ||
          meta.kritikal
      ) || false;
    const driveId = extractDriveIdFromRecord({ ...(meta || {}), ...(rawRow || {}) });
    const imageSource =
      driveIdToImageUrl(driveId) ||
      String(
        rawRow.imageSrc ||
          rawRow.imageUrl ||
          rawRow.image ||
          rawRow.photourl ||
          rawRow.photoUrl ||
          rawRow.foto ||
          rawRow.thumbnail ||
          meta.imageSrc ||
          meta.imageUrl ||
          meta.photoUrl ||
          ""
      ).trim();
    const normalizedRow = {
      id:
        String(rawRow.id || "").trim() ||
        `${procedureKey}-remote-${catalogNo.toLowerCase()}`,
      procedureKey,
      catalogNo,
      name: String(
        rawRow.name ||
          rawRow.description ||
          rawRow.deskripsi ||
          rawRow.instrument ||
          rawRow.title ||
          meta.name ||
          meta.description ||
          ""
      ).trim(),
      qty: Number.isFinite(qtyValue) && qtyValue > 0 ? Math.round(qtyValue) : 1,
      category:
        String(
          rawRow.category ||
            rawRow.group ||
            rawRow.kategori ||
            rawRow.groupName ||
            rawRow.subgroup ||
            meta.category ||
            meta.group ||
            meta.kategori ||
            "Tray"
        ).trim() ||
        "Tray",
      imageUrl: toSafeImageSrc(imageSource, ""),
      driveId,
      isCritical,
      updatedAt: String(rawRow.updatedAt || rawRow.updatedat || "").trim(),
      isRemote: true,
    };

    if (!next[procedureKey]) next[procedureKey] = {};
    next[procedureKey][catalogNo] = normalizedRow;
  });

  return next;
}

function parseJsonSafe(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseCsvRows(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsv = (line) =>
    line
      .split(",")
      .map((item) => String(item || "").trim().replace(/^"|"$/g, ""));

  const headers = splitCsv(lines[0]).map((header) => header.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsv(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });
    rows.push(row);
  }
  return rows;
}

function extractProfileRowsFromRemote(remote) {
  if (!remote || typeof remote !== "object") return [];

  const direct =
    (Array.isArray(remote.items) && remote.items) ||
    (Array.isArray(remote.rows) && remote.rows) ||
    (Array.isArray(remote.instrumentProfiles) && remote.instrumentProfiles) ||
    (Array.isArray(remote?.data?.instrumentProfiles) && remote.data.instrumentProfiles) ||
    (Array.isArray(remote.data) && remote.data) ||
    [];
  if (direct.length) return direct;

  if (Array.isArray(remote.payload)) return remote.payload;

  const parsedPayload = parseJsonSafe(remote.payload);
  if (parsedPayload && typeof parsedPayload === "object") {
    return extractProfileRowsFromRemote(parsedPayload);
  }

  if (typeof remote.payload === "string") {
    return parseCsvRows(remote.payload);
  }

  return [];
}

function extractUsageSnapshotFromRemote(remote) {
  if (!remote || typeof remote !== "object") {
    return { submissions: [], items: [] };
  }

  const root = remote?.data && typeof remote.data === "object" ? remote.data : remote;
  const submissions =
    root?.submissions ||
    root?.implantUsageSubmissions ||
    root?.rows ||
    root?.items ||
    remote?.submissions ||
    remote?.implantUsageSubmissions ||
    [];
  const items =
    root?.itemsRows ||
    root?.implantUsageItems ||
    remote?.implantUsageItems ||
    [];

  return {
    submissions: Array.isArray(submissions) ? submissions : [],
    items: Array.isArray(items) ? items : [],
  };
}

function mergeProcedureItemsWithProfiles(baseItems, procedureKey, profilesByProcedure) {
  const profileMap = profilesByProcedure?.[procedureKey] || {};
  const merged = [];
  const usedCodes = new Set();

  baseItems.forEach((item) => {
    const catalogNo = normalizeCatalogNo(item.catalogNo);
    const profile = profileMap[catalogNo];
    usedCodes.add(catalogNo);
    merged.push({
      ...item,
      name: profile?.name || item.name,
      qty: Number(profile?.qty || item.qty || 1),
      category: profile?.category || item.category,
      imageUrl: profile?.imageUrl || item.imageUrl || "",
      isCritical:
        typeof profile?.isCritical === "boolean"
          ? profile.isCritical
          : Boolean(item.isCritical),
    });
  });

  Object.values(profileMap).forEach((profile) => {
    const catalogNo = normalizeCatalogNo(profile.catalogNo);
    if (!catalogNo || usedCodes.has(catalogNo)) return;
    merged.push({
      id: profile.id || `${procedureKey}-remote-${catalogNo.toLowerCase()}`,
      catalogNo,
      name: profile.name || catalogNo,
      qty: Number(profile.qty || 1),
      category: profile.category || "Tray",
      imageUrl: profile.imageUrl || "",
      isCritical: Boolean(profile.isCritical),
      isRemote: true,
    });
  });

  return merged;
}

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
  const [previewItem, setPreviewItem] = useState(null);
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);
  const [showMobilePhotos, setShowMobilePhotos] = useState(false);
  const [superCompactMobile, setSuperCompactMobile] = useState(true);
  const [checklistMenuOpen, setChecklistMenuOpen] = useState(false);
  const [operationControlModalOpen, setOperationControlModalOpen] = useState(false);
  const [checklistViewMode, setChecklistViewMode] = useState("group");
  const [activeGroupByProcedure, setActiveGroupByProcedure] = useState({});
  const [collapsedGroupsByProcedure, setCollapsedGroupsByProcedure] = useState({});
  const [wizardStageByProcedure, setWizardStageByProcedure] = useState({});
  const [profilesByProcedure, setProfilesByProcedure] = useState({});
  const [syncingProfiles, setSyncingProfiles] = useState(false);
  const [profilesLoadedAt, setProfilesLoadedAt] = useState("");
  const [dailyDashboard, setDailyDashboard] = useState({
    loading: false,
    at: "",
    totalToday: 0,
    completedToday: 0,
    byProcedure: {
      tkr: 0,
      thr: 0,
      bipolar: 0,
      stem: 0,
    },
  });

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
    () =>
      mergeProcedureItemsWithProfiles(
        [...baseSelectedItems, ...selectedCustomItems],
        selected.key,
        profilesByProcedure
      ),
    [baseSelectedItems, selectedCustomItems, selected.key, profilesByProcedure]
  );
  const selectedProfileCount = useMemo(
    () => Object.keys(profilesByProcedure?.[selected.key] || {}).length,
    [profilesByProcedure, selected.key]
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
      if (typeof parsed.showOnlyUnchecked === "boolean") {
        setShowOnlyUnchecked(parsed.showOnlyUnchecked);
      }
      if (typeof parsed.showMobilePhotos === "boolean") {
        setShowMobilePhotos(parsed.showMobilePhotos);
      }
      if (typeof parsed.superCompactMobile === "boolean") {
        setSuperCompactMobile(parsed.superCompactMobile);
      }
      if (parsed.checklistViewMode === "group" || parsed.checklistViewMode === "all") {
        setChecklistViewMode(parsed.checklistViewMode);
      }
      if (parsed.collapsedGroupsByProcedure && typeof parsed.collapsedGroupsByProcedure === "object") {
        setCollapsedGroupsByProcedure(parsed.collapsedGroupsByProcedure);
      }
      if (parsed.activeGroupByProcedure && typeof parsed.activeGroupByProcedure === "object") {
        setActiveGroupByProcedure(parsed.activeGroupByProcedure);
      }
      if (parsed.wizardStageByProcedure && typeof parsed.wizardStageByProcedure === "object") {
        setWizardStageByProcedure(parsed.wizardStageByProcedure);
      }
      setCustomInstrumentsByProcedure(sanitizeCustomInstruments(parsed.customInstrumentsByProcedure));
    } catch (error) {
      console.error("Gagal membaca localStorage", error);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setPreviewItem(null);
  }, [procedureKey]);

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
        showOnlyUnchecked,
        showMobilePhotos,
        superCompactMobile,
        checklistViewMode,
        activeGroupByProcedure,
        wizardStageByProcedure,
        collapsedGroupsByProcedure,
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
    showOnlyUnchecked,
    showMobilePhotos,
    superCompactMobile,
    checklistViewMode,
    activeGroupByProcedure,
    wizardStageByProcedure,
    collapsedGroupsByProcedure,
    customInstrumentsByProcedure,
  ]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    const bySearch = search
      ? selectedItems.filter((item) => {
          return [item.catalogNo, item.name, item.category || "", item.note || ""]
            .join(" ")
            .toLowerCase()
            .includes(search);
        })
      : selectedItems;

    if (!showOnlyUnchecked) return bySearch;
    return bySearch.filter((item) => !checked[item.id]);
  }, [checked, query, selectedItems, showOnlyUnchecked]);

  const groupedFilteredItems = useMemo(() => {
    const groupedMap = new Map();
    filteredItems.forEach((item) => {
      const groupKey = String(item.category || "Lainnya").trim() || "Lainnya";
      if (!groupedMap.has(groupKey)) groupedMap.set(groupKey, []);
      groupedMap.get(groupKey).push(item);
    });

    const groupedRows = Array.from(groupedMap.entries()).map(([groupName, items]) => {
      const completedInGroup = items.reduce(
        (total, item) => total + (checked[item.id] ? 1 : 0),
        0
      );
      return {
        groupName,
        items,
        total: items.length,
        completed: completedInGroup,
      };
    });

    groupedRows.sort((a, b) => {
      const priorityA = getGroupPriority(a.groupName, selected.key);
      const priorityB = getGroupPriority(b.groupName, selected.key);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.groupName.localeCompare(b.groupName, "id", { sensitivity: "base" });
    });

    return groupedRows;
  }, [checked, filteredItems, selected.key]);

  const activeGroupName = useMemo(() => {
    return String(activeGroupByProcedure[selected.key] || "all");
  }, [activeGroupByProcedure, selected.key]);

  const procedureStages = useMemo(
    () => resolveProcedureStages(selected.key),
    [selected.key]
  );
  const activeWizardStageIndex = useMemo(() => {
    const raw = Number(wizardStageByProcedure[selected.key] ?? 0);
    if (!Number.isFinite(raw)) return 0;
    if (!procedureStages.length) return 0;
    return Math.max(0, Math.min(procedureStages.length - 1, Math.floor(raw)));
  }, [procedureStages, selected.key, wizardStageByProcedure]);
  const activeWizardStage = useMemo(
    () => procedureStages[activeWizardStageIndex] || null,
    [activeWizardStageIndex, procedureStages]
  );

  const stageScopedGroupedItems = useMemo(() => {
    if (checklistViewMode !== "group") return groupedFilteredItems;
    if (!activeWizardStage) return groupedFilteredItems;
    const matched = groupedFilteredItems.filter((group) =>
      matchesGroupStage(group.groupName, activeWizardStage)
    );
    return matched.length ? matched : groupedFilteredItems;
  }, [activeWizardStage, checklistViewMode, groupedFilteredItems]);

  const displayedGroupedItems = useMemo(() => {
    if (checklistViewMode !== "group") return groupedFilteredItems;
    if (activeGroupName === "all") return stageScopedGroupedItems;
    return stageScopedGroupedItems.filter((group) => group.groupName === activeGroupName);
  }, [activeGroupName, checklistViewMode, groupedFilteredItems, stageScopedGroupedItems]);

  const visibleItems = useMemo(() => {
    if (checklistViewMode !== "group") return filteredItems;
    if (activeGroupName === "all") {
      return stageScopedGroupedItems.flatMap((group) => group.items);
    }
    const selectedGroup = stageScopedGroupedItems.find(
      (group) => group.groupName === activeGroupName
    );
    return selectedGroup ? selectedGroup.items : [];
  }, [activeGroupName, checklistViewMode, filteredItems, stageScopedGroupedItems]);

  const firstIncompleteGroupName = useMemo(() => {
    const row = stageScopedGroupedItems.find((group) => group.completed < group.total);
    return row?.groupName || "";
  }, [stageScopedGroupedItems]);

  const selectedGroupItemIds = useMemo(() => {
    const map = {};
    selectedItems.forEach((item) => {
      const groupKey = String(item.category || "Lainnya").trim() || "Lainnya";
      if (!map[groupKey]) map[groupKey] = [];
      map[groupKey].push(item.id);
    });
    return map;
  }, [selectedItems]);

  const setActiveGroupFilter = useCallback(
    (groupName) => {
      const nextValue = String(groupName || "all");
      setActiveGroupByProcedure((prev) => ({
        ...prev,
        [selected.key]: nextValue,
      }));
    },
    [selected.key]
  );

  const setWizardStageIndex = useCallback(
    (nextIndex) => {
      const safeIndex = Math.max(
        0,
        Math.min(procedureStages.length - 1, Math.floor(Number(nextIndex) || 0))
      );
      setWizardStageByProcedure((prev) => ({
        ...prev,
        [selected.key]: safeIndex,
      }));
      setActiveGroupByProcedure((prev) => ({
        ...prev,
        [selected.key]: "all",
      }));
    },
    [procedureStages.length, selected.key]
  );

  const goWizardPrev = useCallback(() => {
    setWizardStageIndex(activeWizardStageIndex - 1);
  }, [activeWizardStageIndex, setWizardStageIndex]);

  const goWizardNext = useCallback(() => {
    setWizardStageIndex(activeWizardStageIndex + 1);
  }, [activeWizardStageIndex, setWizardStageIndex]);

  const previewSourceItems = useMemo(() => {
    if (!previewItem) return visibleItems;
    const previewId = String(previewItem.id || "");
    const existsInFiltered = visibleItems.some((item) => item.id === previewId);
    return existsInFiltered ? visibleItems : selectedItems;
  }, [previewItem, selectedItems, visibleItems]);

  const previewIndex = useMemo(() => {
    if (!previewItem) return -1;
    const previewId = String(previewItem.id || "");
    return previewSourceItems.findIndex((item) => item.id === previewId);
  }, [previewItem, previewSourceItems]);

  const previewCurrentItem = useMemo(() => {
    if (!previewItem) return null;
    if (previewIndex >= 0) return previewSourceItems[previewIndex];
    return selectedItems.find((item) => item.id === previewItem.id) || null;
  }, [previewIndex, previewItem, previewSourceItems, selectedItems]);

  const previewHasPrev = previewIndex > 0;
  const previewHasNext =
    previewIndex >= 0 && previewIndex < previewSourceItems.length - 1;

  const visibleCompletedCount = useMemo(
    () => visibleItems.reduce((total, item) => total + (checked[item.id] ? 1 : 0), 0),
    [checked, visibleItems]
  );

  const total = selectedItems.length;
  const completed = selectedItems.filter((item) => checked[item.id]).length;
  const missingItems = selectedItems.filter((item) => !checked[item.id]);
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const progressRingStyle = useMemo(
    () => ({
      background: `conic-gradient(#2563eb ${progress}%, #e2e8f0 ${progress}% 100%)`,
    }),
    [progress]
  );
  const selectedProcedureTitle = useMemo(() => {
    if (selected.key === "bipolar") {
      return bipolarIncludeStem ? `${selected.title} + Stem` : `${selected.title} (Bipolar Only)`;
    }
    if (selected.key === "thr") {
      return thrIncludeStem ? `${selected.title} + Stem` : `${selected.title} (Acetabular Only)`;
    }
    return selected.title;
  }, [selected.key, selected.title, bipolarIncludeStem, thrIncludeStem]);

  const criticalItems = useMemo(
    () => selectedItems.filter((item) => isCriticalInstrument(item)),
    [selectedItems]
  );
  const checkedCriticalItems = useMemo(
    () => criticalItems.filter((item) => Boolean(checked[item.id])),
    [checked, criticalItems]
  );
  const mandatoryPhotoPending =
    checkedCriticalItems.length > 0 && !documentationPhoto && !documentationPreview;
  const isOperationInfoComplete =
    Boolean(operatorName.trim()) && Boolean(hospitalName.trim());
  const stageTotalItems = useMemo(
    () => stageScopedGroupedItems.reduce((totalCount, group) => totalCount + group.total, 0),
    [stageScopedGroupedItems]
  );
  const stageCompletedItems = useMemo(
    () =>
      stageScopedGroupedItems.reduce(
        (totalCount, group) => totalCount + group.completed,
        0
      ),
    [stageScopedGroupedItems]
  );
  const stageProgressPercent = stageTotalItems
    ? Math.round((stageCompletedItems / stageTotalItems) * 100)
    : 0;

  useEffect(() => {
    const groupEntries = Object.entries(selectedGroupItemIds);
    if (!groupEntries.length) return;
    setCollapsedGroupsByProcedure((prev) => {
      const byProcedure = prev[selected.key] || {};
      const nextByProcedure = { ...byProcedure };
      let changed = false;

      groupEntries.forEach(([groupName, ids]) => {
        if (!Array.isArray(ids) || !ids.length) return;
        const isDone = ids.every((id) => Boolean(checked[id]));
        if (isDone && !nextByProcedure[groupName]) {
          nextByProcedure[groupName] = true;
          changed = true;
        }
      });

      if (!changed) return prev;
      return {
        ...prev,
        [selected.key]: nextByProcedure,
      };
    });
  }, [checked, selected.key, selectedGroupItemIds]);

  useEffect(() => {
    if (checklistViewMode !== "group") return;
    if (activeGroupName === "all") return;
    const exists = stageScopedGroupedItems.some(
      (group) => group.groupName === activeGroupName
    );
    if (!exists) {
      setActiveGroupFilter("all");
    }
  }, [activeGroupName, checklistViewMode, setActiveGroupFilter, stageScopedGroupedItems]);

  const refreshInstrumentProfiles = useCallback(async (options = {}) => {
    if (!GOOGLE_SHEET_ENDPOINT) return;
    const silent = Boolean(options.silent);
    if (!silent) setMessage("");
    setSyncingProfiles(true);

    try {
      let lastError = "";
      let rows = [];

      for (const actionName of ACTION_LIST_INSTRUMENT_PROFILE_CANDIDATES) {
        const response = await fetch("/api/google-sheet-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: GOOGLE_SHEET_ENDPOINT,
            action: actionName,
            sheet: INSTRUMENT_PROFILE_SHEET_NAME,
            sheetName: INSTRUMENT_PROFILE_SHEET_NAME,
            table: INSTRUMENT_PROFILE_SHEET_NAME,
          }),
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
          const messageText =
            remote?.error || remote?.message || result?.error || "";
          lastError = messageText || `HTTP ${response.status}`;
          continue;
        }

        rows = extractProfileRowsFromRemote(remote);
        if (rows.length) {
          break;
        }
      }

      if (!rows.length) {
        const query = new URLSearchParams({
          sheet: INSTRUMENT_PROFILE_SHEET_NAME,
          sheetName: INSTRUMENT_PROFILE_SHEET_NAME,
          table: INSTRUMENT_PROFILE_SHEET_NAME,
        });
        const getResponse = await fetch(`/api/google-sheet-images?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const getResult = await getResponse.json();
        const remoteGet = getResult?.remote || getResult || {};
        const remoteGetStatus = String(remoteGet?.status || "").toLowerCase();
        const remoteGetOk =
          typeof remoteGet?.ok === "boolean"
            ? remoteGet.ok
            : remoteGetStatus
              ? remoteGetStatus !== "error"
              : true;

        if (getResponse.ok && getResult?.ok && remoteGetOk) {
          rows = extractProfileRowsFromRemote(remoteGet);
        }
      }

      if (!rows.length && lastError) {
        throw new Error(lastError);
      }

      const normalizedProfiles = normalizeInstrumentProfileRows(rows);
      const normalizedCount = Object.values(normalizedProfiles).reduce(
        (total, byCatalog) => total + Object.keys(byCatalog || {}).length,
        0
      );
      setProfilesByProcedure(normalizedProfiles);
      setProfilesLoadedAt(new Date().toISOString());
      if (!silent) {
        if (rows.length > 0 && normalizedCount === 0) {
          setMessage(
            "Data dari endpoint ditemukan, tapi format belum cocok. Pastikan sheet InstrumentProfiles punya kolom: procedureKey, catalogNo, name, qty/piece, category, imageSrc/driveId."
          );
        } else {
          setMessage(`Sinkron foto instrument selesai (${normalizedCount} data).`);
        }
      }
    } catch (error) {
      if (!silent) {
        setMessage(error?.message || "Gagal sinkron foto instrument.");
      }
    } finally {
      setSyncingProfiles(false);
    }
  }, []);

  const refreshDailyDashboard = useCallback(async (options = {}) => {
    if (!GOOGLE_SHEET_ENDPOINT) return;
    const silent = Boolean(options.silent);
    setDailyDashboard((prev) => ({ ...prev, loading: true }));

    try {
      let snapshot = { submissions: [], items: [] };
      let lastError = "";

      for (const actionName of ACTION_LIST_IMPLANT_USAGE_CANDIDATES) {
        const response = await fetch("/api/google-sheet-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: GOOGLE_SHEET_ENDPOINT,
            action: actionName,
            sheet: IMPLANT_USAGE_SHEET_NAME,
            sheetName: IMPLANT_USAGE_SHEET_NAME,
            table: IMPLANT_USAGE_SHEET_NAME,
          }),
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
          lastError = String(
            remote?.error || remote?.message || result?.error || `HTTP ${response.status}`
          );
          continue;
        }

        snapshot = extractUsageSnapshotFromRemote(remote);
        if (snapshot.submissions.length) break;
      }

      if (!snapshot.submissions.length && lastError && !silent) {
        setMessage(lastError);
      }

      const todayKey = getTodayKey(new Date());
      const byProcedure = { tkr: 0, thr: 0, bipolar: 0, stem: 0 };
      let completedToday = 0;
      let totalToday = 0;

      snapshot.submissions.forEach((submission) => {
        const dateValue =
          submission?.operationDate ||
          submission?.createdAt ||
          submission?.timestamp ||
          submission?.created_at ||
          "";
        if (getTodayKey(dateValue) !== todayKey) return;
        totalToday += 1;

        const procedureKey =
          normalizeProcedureKey(submission?.procedureKey) ||
          inferProcedureKeyFromText(submission?.systemName || submission?.procedureTitle || "");
        if (procedureKey && Object.prototype.hasOwnProperty.call(byProcedure, procedureKey)) {
          byProcedure[procedureKey] += 1;
        }

        const completionPercent = Number(submission?.progress || 0);
        if (
          completionPercent >= 100 ||
          String(submission?.status || "").toLowerCase().includes("lengkap")
        ) {
          completedToday += 1;
        }
      });

      setDailyDashboard({
        loading: false,
        at: new Date().toISOString(),
        totalToday,
        completedToday,
        byProcedure,
      });
    } catch (error) {
      setDailyDashboard((prev) => ({ ...prev, loading: false }));
      if (!silent) {
        setMessage(error?.message || "Gagal memuat dashboard harian.");
      }
    }
  }, []);

  useEffect(() => {
    refreshInstrumentProfiles({ silent: true });
    refreshDailyDashboard({ silent: true });
  }, [refreshDailyDashboard, refreshInstrumentProfiles]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshDailyDashboard({ silent: true });
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refreshDailyDashboard]);

  const openPreview = useCallback((item) => {
    if (!item) return;
    setPreviewItem(item);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const goToPreviousPreviewItem = useCallback(() => {
    if (!previewHasPrev) return;
    setPreviewItem(previewSourceItems[previewIndex - 1]);
  }, [previewHasPrev, previewIndex, previewSourceItems]);

  const goToNextPreviewItem = useCallback(() => {
    if (!previewHasNext) return;
    setPreviewItem(previewSourceItems[previewIndex + 1]);
  }, [previewHasNext, previewIndex, previewSourceItems]);

  useEffect(() => {
    if (!previewItem) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreview();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousPreviewItem();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextPreviewItem();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewItem, closePreview, goToPreviousPreviewItem, goToNextPreviewItem]);

  useEffect(() => {
    if (!checklistMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setChecklistMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checklistMenuOpen]);

  useEffect(() => {
    if (!operationControlModalOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOperationControlModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [operationControlModalOpen, isOperationInfoComplete]);

  const openOperationControlModal = useCallback(() => {
    setOperationControlModalOpen(true);
  }, []);

  const closeOperationControlModal = useCallback(() => {
    setOperationControlModalOpen(false);
  }, []);

  const handleProcedureChange = useCallback(
    (nextProcedureKey) => {
      if (!nextProcedureKey || nextProcedureKey === procedureKey) return;
      setProcedureKey(nextProcedureKey);
      setOperationControlModalOpen(true);
    },
    [procedureKey]
  );

  const ensureChecklistUnlocked = useCallback(() => {
    if (isOperationInfoComplete) return true;
    setOperationControlModalOpen(true);
    setMessage(
      "Lengkapi Nama TS/operator dan rumah sakit di Operasi & Kontrol Tambahan sebelum mulai checklist."
    );
    return false;
  }, [isOperationInfoComplete]);

  function toggleItem(id) {
    if (!ensureChecklistUnlocked()) return;
    setChecked((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  function setCheckedForItems(items, shouldCheck) {
    if (!ensureChecklistUnlocked()) return;
    if (!Array.isArray(items) || !items.length) return;
    setChecked((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (shouldCheck) {
          next[item.id] = true;
        } else {
          delete next[item.id];
        }
      });
      return next;
    });
  }

  function checkAllVisibleItems() {
    if (!ensureChecklistUnlocked()) return;
    setCheckedForItems(visibleItems, true);
  }

  function uncheckAllVisibleItems() {
    if (!ensureChecklistUnlocked()) return;
    setCheckedForItems(visibleItems, false);
  }

  function focusFirstIncompleteGroup() {
    if (!firstIncompleteGroupName) return;
    setActiveGroupFilter(firstIncompleteGroupName);
    setCollapsedGroupsByProcedure((prev) => {
      const byProcedure = { ...(prev[selected.key] || {}) };
      byProcedure[firstIncompleteGroupName] = false;
      return {
        ...prev,
        [selected.key]: byProcedure,
      };
    });
  }

  function toggleGroupCollapsed(groupName) {
    const key = String(groupName || "").trim();
    if (!key) return;
    setCollapsedGroupsByProcedure((prev) => {
      const byProcedure = prev[selected.key] || {};
      return {
        ...prev,
        [selected.key]: {
          ...byProcedure,
          [key]: !byProcedure[key],
        },
      };
    });
  }

  function isGroupCollapsed(groupName) {
    const key = String(groupName || "").trim();
    if (!key) return false;
    return Boolean(collapsedGroupsByProcedure[selected.key]?.[key]);
  }

  function setAllGroupsCollapsed(shouldCollapse) {
    const targetGroups =
      activeGroupName === "all" ? stageScopedGroupedItems : displayedGroupedItems;
    setCollapsedGroupsByProcedure((prev) => {
      const byProcedure = { ...(prev[selected.key] || {}) };
      targetGroups.forEach((group) => {
        byProcedure[group.groupName] = shouldCollapse;
      });
      return {
        ...prev,
        [selected.key]: byProcedure,
      };
    });
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

    const duplicated = selectedItems.some(
      (item) => String(item.catalogNo || "").trim().toUpperCase() === catalogNo
    );
    if (duplicated) {
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
      isCritical: false,
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
        isCritical: isCriticalInstrument(item),
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
        `CRITICAL:${isCriticalInstrument(item) ? "YES" : "NO"}`,
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
        isCritical: isCriticalInstrument(item),
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

    if (mandatoryPhotoPending) {
      setMessage(
        `Upload foto dokumentasi wajib karena ada ${checkedCriticalItems.length} item kritikal yang sudah dicentang.`
      );
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
      refreshDailyDashboard({ silent: true });
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  const extraInstrumentContent = (
    <>
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Instrument Tambahan</p>
        <p className="text-xs text-slate-500">
          Tambahkan instrument di luar tray untuk prosedur aktif ({selected.title}).
        </p>
      </div>
      <form onSubmit={addExtraInstrument} className="grid gap-3 md:grid-cols-[160px_1fr_120px_130px]">
        <FloatingInputField
          value={extraCatalogNo}
          onChange={(event) => setExtraCatalogNo(event.target.value)}
          label="Kode"
          required
          inputClassName="border-blue-200 focus:border-blue-400"
        />
        <FloatingInputField
          value={extraDescription}
          onChange={(event) => setExtraDescription(event.target.value)}
          label="Deskripsi"
          required
          inputClassName="border-blue-200 focus:border-blue-400"
        />
        <FloatingInputField
          value={extraPiece}
          onChange={(event) => setExtraPiece(event.target.value)}
          type="number"
          min={1}
          label="Piece"
          inputClassName="border-blue-200 focus:border-blue-400"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800 px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
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
    </>
  );

  const renderChecklistRow = (item) => {
    const isChecked = Boolean(checked[item.id]);
    return (
      <motion.div
        key={item.id}
        layout
        className={`w-full px-4 py-3 text-left transition ${
          isChecked ? "bg-emerald-50/70" : "hover:bg-slate-50"
        } ${superCompactMobile ? "md:px-4 px-3 py-2" : ""}`}
      >
        <div
          className={`flex items-start justify-between md:hidden ${
            superCompactMobile ? "gap-2" : "gap-3"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleItem(item.id)}
            className={`flex min-w-0 flex-1 items-start text-left ${
              superCompactMobile ? "gap-2" : "gap-2.5"
            }`}
          >
            {showMobilePhotos ? (
              <div
                className={`shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${
                  superCompactMobile ? "h-9 w-9" : "h-12 w-12"
                }`}
              >
                {item.imageUrl ? (
                  <>
                    <DriveImageWithFallback
                      src={item.imageUrl}
                      driveId={item.driveId}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageIcon size={16} />
                  </div>
                )}
              </div>
            ) : superCompactMobile ? null : (
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                <ImageIcon size={12} />
              </div>
            )}
            <div className="min-w-0">
              <p
                className={`inline-flex rounded-md bg-slate-100 font-semibold text-slate-700 ${
                  superCompactMobile ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
                }`}
              >
                {item.catalogNo}
              </p>
              <p
                className={`mt-1 font-medium leading-snug text-slate-900 ${
                  superCompactMobile ? "line-clamp-1 text-[12px]" : "line-clamp-2 text-sm"
                }`}
              >
                {item.name}
              </p>
              {item.isCustom ? (
                <p className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Tambahan
                </p>
              ) : null}
              {isCriticalInstrument(item) ? (
                <p className="mt-1 inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  Kritikal · Wajib Foto
                </p>
              ) : null}
              <p className={`${superCompactMobile ? "mt-0.5 text-[11px]" : "mt-1 text-xs"} text-slate-500`}>
                Piece: {item.qty}
              </p>
            </div>
          </button>
          <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => openPreview(item)}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="inline-flex rounded-full p-0.5"
            >
              {isChecked ? (
                <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />
              ) : (
                <Circle className="shrink-0 text-slate-300" size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="hidden grid-cols-[64px_130px_1fr_90px_110px] items-center gap-3 md:grid">
          <button
            type="button"
            onClick={() => openPreview(item)}
            className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
          >
            {item.imageUrl ? (
              <>
                <DriveImageWithFallback
                  src={item.imageUrl}
                  driveId={item.driveId}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <ImageIcon size={14} />
              </div>
            )}
          </button>
          <p className="text-sm font-semibold text-slate-700">{item.catalogNo}</p>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
            {item.isCustom ? (
              <p className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Tambahan
              </p>
            ) : null}
            {isCriticalInstrument(item) ? (
              <p className="mt-1 inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                Kritikal · Wajib Foto
              </p>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">{item.qty}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openPreview(item)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="inline-flex rounded-full p-0.5"
            >
              {isChecked ? (
                <CheckCircle2 className="text-emerald-600" size={20} />
              ) : (
                <Circle className="text-slate-300" size={20} />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const checklistControlPanel = (
    <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-3 shadow-[0_18px_35px_rgba(15,23,42,0.12)] backdrop-blur md:p-4">
      <div className="inline-flex w-full rounded-[20px] bg-slate-200/80 p-1.5">
        <button
          type="button"
          onClick={() => setChecklistViewMode("group")}
          className={`flex-1 rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
            checklistViewMode === "group"
              ? "bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Group Checklist
        </button>
        <button
          type="button"
          onClick={() => setChecklistViewMode("all")}
          className={`flex-1 rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
            checklistViewMode === "all"
              ? "bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All Checklist
        </button>
      </div>

      <div className="my-3 h-px bg-slate-200" />

      {checklistViewMode === "group" ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="relative">
            <FloatingSelectField
              value={activeGroupName}
              onChange={(event) => setActiveGroupFilter(event.target.value)}
              label="Group Checklist"
              selectClassName="h-12 appearance-none rounded-2xl border-2 border-blue-200 bg-blue-50/50 pr-10 text-sm font-medium text-slate-800 focus:border-blue-300"
            >
              <option value="all">Semua Group</option>
              {stageScopedGroupedItems.map((group) => (
                <option key={group.groupName} value={group.groupName}>
                  {group.groupName} ({group.completed}/{group.total})
                </option>
              ))}
            </FloatingSelectField>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>

          <button
            type="button"
            onClick={focusFirstIncompleteGroup}
            disabled={!firstIncompleteGroupName}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye size={18} />
            Fokus Belum Selesai
          </button>
        </div>
      ) : null}

      <div className={`mt-2 grid gap-2 ${checklistViewMode === "group" ? "md:grid-cols-2" : ""}`}>
        <button
          type="button"
          onClick={checkAllVisibleItems}
          disabled={!visibleItems.length}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check size={20} />
          Centang Semua Item
        </button>
        <button
          type="button"
          onClick={uncheckAllVisibleItems}
          disabled={!visibleItems.length}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-rose-600 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={20} />
          Batal Semua Item
        </button>
      </div>

      {checklistViewMode === "group" ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setAllGroupsCollapsed(true)}
            disabled={!displayedGroupedItems.length}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-500 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MinusCircle size={19} />
            Tutup Semua Group
          </button>
          <button
            type="button"
            onClick={() => setAllGroupsCollapsed(false)}
            disabled={!displayedGroupedItems.length}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-500 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Expand size={19} />
            Buka Semua Group
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">
        Tercentang <span className="font-semibold text-slate-900">{visibleCompletedCount}/{visibleItems.length}</span>{" "}
        item terlihat
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Item kritikal tercentang:{" "}
        <span className="font-semibold text-rose-700">{checkedCriticalItems.length}</span>
      </p>
      <div className="mt-3 h-px bg-slate-200" />
      <p className="mt-3 text-sm font-medium text-slate-700">
        Total: <span className="font-bold text-slate-900">{visibleItems.length} Instrument</span>
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-100/40 px-4 py-6 text-slate-900 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-[0_14px_34px_rgba(30,41,59,0.14)] md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-700">
                <ClipboardCheck size={14} /> Normed Instrument Checklist
              </div>
              <h1 className="text-xl font-bold text-slate-900 md:text-5xl md:leading-tight">Checklist Elektronik Instrument Operasi</h1>
              <p className="mt-2 hidden max-w-3xl text-sm text-slate-600 md:block">
                Checklist TKR, Bipolar, dan THR dengan dokumentasi foto serta integrasi Google Sheet.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full p-2 md:h-24 md:w-24" style={progressRingStyle}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 md:text-base">
                  {progress}%
                </div>
              </div>
              <div className="min-w-[135px] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-center shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Progress</p>
                <p className="text-3xl font-extrabold text-slate-900">{progress}%</p>
                <p className="text-[11px] text-slate-500">
                  {completed} dari {total} item selesai
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="md:hidden">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Prosedur</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHECKLISTS.map((procedure) => {
              const active = procedure.key === procedureKey;
              const theme = getProcedureTheme(procedure.key);
              const baseProcedureItems = getProcedureItems(procedure, {
                bipolarIncludeStem,
                thrIncludeStem,
              });
              const customProcedureItems = customInstrumentsByProcedure[procedure.key] || [];
              const procedureItems = [...baseProcedureItems, ...customProcedureItems];
              const done = procedureItems.filter((item) => checked[item.id]).length;
              return (
                <button
                  key={procedure.key}
                  onClick={() => handleProcedureChange(procedure.key)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left shadow-sm ${
                    active
                      ? `${theme.active} text-slate-900`
                      : `${theme.inactive} text-slate-700`
                  }`}
                >
                  <p className="text-xs font-semibold">{procedure.key.toUpperCase()}</p>
                  <p className="text-[11px] text-slate-500">
                    {done}/{procedureItems.length}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
          {CHECKLISTS.map((procedure) => {
            const active = procedure.key === procedureKey;
            const theme = getProcedureTheme(procedure.key);
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
                onClick={() => handleProcedureChange(procedure.key)}
                className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                  active ? theme.active : theme.inactive
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${theme.iconBg}`}>
                    <Stethoscope size={22} />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                    {pct}%
                  </span>
                </div>
                <h2 className="line-clamp-1 text-2xl font-bold text-slate-900">{procedure.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{procedure.subtitle}</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{done}/{procedureItems.length} Item</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-[0_14px_30px_rgba(30,41,59,0.12)] md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Wizard Per Tahap
              </p>
              <h3 className="text-lg font-bold text-slate-900 md:text-xl">
                {selected.key.toUpperCase()} · {activeWizardStage?.label || "Tahap"}
              </h3>
              <p className="text-xs text-slate-500">
                {stageCompletedItems}/{stageTotalItems} item tahap ini selesai ({stageProgressPercent}%)
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
              Step {activeWizardStageIndex + 1}/{procedureStages.length}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {procedureStages.map((stage, index) => {
              const active = index === activeWizardStageIndex;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setWizardStageIndex(index)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-blue-700 bg-blue-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={goWizardPrev}
              disabled={activeWizardStageIndex <= 0}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              onClick={goWizardNext}
              disabled={activeWizardStageIndex >= procedureStages.length - 1}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CalendarDays size={14} /> Dashboard Harian
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Submission hari ini ({getTodayKey(new Date())})
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshDailyDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {dailyDashboard.loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              Refresh
            </button>
          </div>
          <div className="mt-3 space-y-2 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Total</p>
                <p className="text-base font-bold text-slate-900">{dailyDashboard.totalToday}</p>
              </article>
              <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-emerald-700">Lengkap</p>
                <p className="text-base font-bold text-emerald-900">{dailyDashboard.completedToday}</p>
              </article>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-blue-700">TKR: {dailyDashboard.byProcedure.tkr}</span>
                <span className="font-semibold text-violet-700">Bipolar: {dailyDashboard.byProcedure.bipolar}</span>
                <span className="font-semibold text-teal-700">
                  THR/Stem: {dailyDashboard.byProcedure.thr + dailyDashboard.byProcedure.stem}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 hidden gap-2 sm:grid-cols-2 xl:grid-cols-5 md:grid">
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Total Hari Ini</p>
              <p className="text-lg font-bold text-slate-900">{dailyDashboard.totalToday}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-emerald-700">Lengkap</p>
              <p className="text-lg font-bold text-emerald-900">{dailyDashboard.completedToday}</p>
            </article>
            <article className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-blue-700">TKR</p>
              <p className="text-lg font-bold text-blue-900">{dailyDashboard.byProcedure.tkr}</p>
            </article>
            <article className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-violet-700">Bipolar</p>
              <p className="text-lg font-bold text-violet-900">{dailyDashboard.byProcedure.bipolar}</p>
            </article>
            <article className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-teal-700">THR / Stem</p>
              <p className="text-lg font-bold text-teal-900">
                {dailyDashboard.byProcedure.thr + dailyDashboard.byProcedure.stem}
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-gradient-to-r from-white via-slate-50 to-blue-50 px-4 py-4 shadow-[0_10px_24px_rgba(30,41,59,0.12)] md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Operasi &amp; Kontrol Tambahan</h3>
              <p className="mt-1 text-sm text-slate-600">
                Form mode tray, instrument tambahan, dan informasi operasi sekarang ada di modal popup.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold ${
                  isOperationInfoComplete
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isOperationInfoComplete ? "Data wajib lengkap" : "Lengkapi data wajib dulu"}
              </span>
              <button
                type="button"
                onClick={openOperationControlModal}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Buka Form Operasi
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Prosedur Aktif</p>
              <p className="text-sm font-bold text-slate-900">{selected.key.toUpperCase()}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Mode Tray</p>
              <p className="text-sm font-bold text-slate-900">
                {selected.key === "bipolar"
                  ? bipolarIncludeStem
                    ? "Bipolar + Stem"
                    : "Bipolar saja"
                  : selected.key === "thr"
                    ? thrIncludeStem
                      ? "THR + Stem"
                      : "THR Acetabular"
                    : "Default"}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Operator</p>
              <p className="truncate text-sm font-bold text-slate-900">{operatorName || "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Rumah Sakit</p>
              <p className="truncate text-sm font-bold text-slate-900">{hospitalName || "-"}</p>
            </article>
          </div>
        </section>

        {!isOperationInfoComplete ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Lengkapi Nama TS/operator dan Rumah Sakit dulu sebelum checklist.
              </p>
              <button
                type="button"
                onClick={openOperationControlModal}
                className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Lengkapi Sekarang
              </button>
            </div>
          </section>
        ) : null}

        <section
          className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 ${
            isOperationInfoComplete ? "" : "pointer-events-none opacity-60"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">{selected.title}</h2>
              <p className="mt-1 hidden max-w-3xl text-sm text-slate-500 md:block">{selected.description}</p>
            </div>
            <div className="hidden flex-wrap gap-2 md:flex">
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
              <a
                href="/ceklist-instrument-normed/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <ImageIcon size={16} />
                Manager Foto
              </a>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:hidden">
            <button
              onClick={submitToGoogleSheet}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Simpan ke Sheet
            </button>
            <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
                Aksi Lainnya
                <ChevronDown size={14} className="text-slate-500" />
              </summary>
              <div className="mt-2 grid gap-2">
                <button
                  onClick={resetSelectedProcedure}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  onClick={exportJson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <Download size={14} /> Export JSON
                </button>
                <a
                  href="/ceklist-instrument-normed/admin"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <ImageIcon size={14} /> Manager Foto
                </a>
              </div>
            </details>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          {checkedCriticalItems.length > 0 ? (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                mandatoryPhotoPending
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p className="inline-flex items-center gap-2 font-semibold">
                <AlertTriangle size={15} />
                Mandatory Foto Item Kritikal
              </p>
              <p className="mt-1 text-xs">
                {checkedCriticalItems.length} item kritikal sudah dicentang.
                {mandatoryPhotoPending
                  ? " Upload foto dokumentasi sebelum Simpan ke Sheet."
                  : " Foto dokumentasi sudah valid."}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder=" "
              className="peer h-11 w-full rounded-xl border border-indigo-200 bg-white pl-9 pr-3 pt-5 text-sm outline-none transition focus:border-indigo-400"
              />
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 rounded bg-white px-1 text-sm text-slate-500 transition-all duration-150 peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-indigo-600 peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:font-semibold peer-[&:not(:placeholder-shown)]:text-indigo-600">
                Cari kode / deskripsi
              </span>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal size={14} />
                  Filter & Foto
                </span>
                <ChevronDown size={14} className="text-slate-500" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnchecked((prev) => !prev)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                      showOnlyUnchecked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Belum dicek
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobilePhotos((prev) => !prev)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                      showMobilePhotos
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Tampilkan foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuperCompactMobile((prev) => !prev)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                      superCompactMobile
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Compact
                  </button>
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Camera size={14} /> Upload Foto Dokumentasi
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => refreshInstrumentProfiles()}
                  disabled={syncingProfiles}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncingProfiles ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Sync Foto Instrument
                </button>
                <p className="text-[11px] text-slate-500">
                  InstrumentProfiles: {selectedProfileCount} item ({selected.key.toUpperCase()})
                </p>
              </div>
            </details>
          </div>

          <div className="mt-4 hidden gap-4 md:grid md:grid-cols-[1fr_320px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOnlyUnchecked((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  showOnlyUnchecked
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Belum dicek
              </button>
              <button
                type="button"
                onClick={() => refreshInstrumentProfiles()}
                disabled={syncingProfiles}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncingProfiles ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCcw size={14} />
                )}
                Sync Foto Instrument
              </button>
              {profilesLoadedAt ? (
                <span className="text-[11px] text-slate-400">
                  Sync terakhir: {new Date(profilesLoadedAt).toLocaleTimeString("id-ID")}
                </span>
              ) : null}
              <span className="text-[11px] text-slate-500">
                InstrumentProfiles: {selectedProfileCount} item ({selected.key.toUpperCase()})
              </span>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Camera size={18} /> Ambil / Upload Foto Dokumentasi
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          {documentationPreview ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Image src={documentationPreview} alt="Preview dokumentasi" className="h-14 w-14 rounded-lg object-cover md:h-20 md:w-20" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">Foto dokumentasi siap disimpan</p>
                <p className="truncate text-xs text-slate-500">{photoName}</p>
              </div>
              <button onClick={removePhoto} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-white">
                <X size={14} /> Hapus
              </button>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Menu Checklist
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {checklistViewMode === "group" ? "Group Checklist" : "All Checklist"} ·{" "}
                  {visibleCompletedCount}/{visibleItems.length} item tercentang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChecklistMenuOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <SlidersHorizontal size={14} />
                Buka Menu
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan {visibleItems.length} / {total} instrument
            </span>
            {showOnlyUnchecked ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                Filter: Belum dicek
              </span>
            ) : null}
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
          </div>

          {checklistViewMode === "group" ? (
            <div className="mt-6 space-y-3">
              {displayedGroupedItems.map((group) => {
                const collapsed = isGroupCollapsed(group.groupName);
                const completedPct = group.total
                  ? Math.round((group.completed / group.total) * 100)
                  : 0;
                const groupStyle = getGroupColorVariant(group.groupName);
                const isGroupDone = group.total > 0 && group.completed === group.total;
                return (
                  <div
                    key={group.groupName}
                    className={`overflow-hidden rounded-2xl border bg-white ${groupStyle.card}`}
                  >
                    <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 md:px-4 ${groupStyle.header}`}>
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapsed(group.groupName)}
                        className="inline-flex items-center gap-2 text-left"
                      >
                        <ChevronDown
                          size={16}
                          className={`text-slate-500 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
                        />
                        <div>
                          <p className={`text-sm font-semibold ${groupStyle.title}`}>{group.groupName}</p>
                          <p className={`text-[11px] ${groupStyle.meta}`}>
                            {group.completed}/{group.total} selesai ({completedPct}%)
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${groupStyle.badge}`}>
                          {isGroupDone ? "Selesai · Minimize" : "On Progress"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckedForItems(group.items, true)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${groupStyle.quickCheck}`}
                        >
                          Centang semua
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckedForItems(group.items, false)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${groupStyle.quickUncheck}`}
                        >
                          Batal semua
                        </button>
                      </div>
                    </div>

                    {!collapsed ? (
                      <>
                        <div className="hidden grid-cols-[64px_130px_1fr_90px_44px] gap-3 border-b border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                          <span>Foto</span>
                          <span>Kode</span>
                          <span>Deskripsi</span>
                          <span>Piece</span>
                          <span className="text-right">Cek</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {group.items.map((item) => renderChecklistRow(item))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}

              {displayedGroupedItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Instrument tidak ditemukan.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="hidden grid-cols-[64px_130px_1fr_90px_44px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Foto</span>
                <span>Kode</span>
                <span>Deskripsi</span>
                <span>Piece</span>
                <span className="text-right">Cek</span>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleItems.map((item) => renderChecklistRow(item))}
              </div>
              {visibleItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Instrument tidak ditemukan.
                </div>
              ) : null}
            </div>
          )}
        </section>

        <AnimatePresence>
          {operationControlModalOpen ? (
            <motion.div
              key="operation-control-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
              onClick={closeOperationControlModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Operasi & Kontrol Tambahan
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selected.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeOperationControlModal}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-white"
                    aria-label="Tutup form operasi"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-[calc(90vh-126px)] space-y-4 overflow-y-auto p-4">
                  {!isOperationInfoComplete ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Isi minimal <span className="font-bold">Nama TS/operator</span> dan{" "}
                      <span className="font-bold">Rumah sakit/lokasi</span> untuk lanjut checklist.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Data wajib sudah lengkap. Checklist siap dilanjutkan.
                    </div>
                  )}

                  {procedureKey === "bipolar" ? (
                    <section className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Mode Tray Bipolar</p>
                          <p className="text-xs text-slate-500">
                            Pilih sumber list: hanya tray bipolar atau gabung tray stem + bipolar.
                          </p>
                        </div>
                        <div className="inline-flex rounded-xl border border-violet-200 bg-white/80 p-1">
                          <button
                            type="button"
                            onClick={() => setBipolarIncludeStem(false)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              !bipolarIncludeStem
                                ? "bg-violet-700 text-white shadow-sm"
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
                                ? "bg-violet-700 text-white shadow-sm"
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
                    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Mode Tray THR</p>
                          <p className="text-xs text-slate-500">
                            Pilih list THR acetabular saja atau gabung THR + Stem.
                          </p>
                        </div>
                        <div className="inline-flex rounded-xl border border-emerald-200 bg-white/80 p-1">
                          <button
                            type="button"
                            onClick={() => setThrIncludeStem(false)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              !thrIncludeStem
                                ? "bg-emerald-700 text-white shadow-sm"
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
                                ? "bg-emerald-700 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            THR + Stem
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-800">Informasi Operasi</p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <FloatingInputField
                        value={operatorName}
                        onChange={(event) => setOperatorName(event.target.value)}
                        label="Nama TS / operator checklist"
                        required
                      />
                      <FloatingInputField
                        value={hospitalName}
                        onChange={(event) => setHospitalName(event.target.value)}
                        label="Rumah sakit / lokasi"
                        required
                      />
                      <FloatingInputField
                        value={doctorName}
                        onChange={(event) => setDoctorName(event.target.value)}
                        label="Dokter operator"
                      />
                      <FloatingInputField
                        value={patientCode}
                        onChange={(event) => setPatientCode(event.target.value)}
                        label="Kode pasien / MRN"
                      />
                      <FloatingInputField
                        value={caseNote}
                        onChange={(event) => setCaseNote(event.target.value)}
                        label="Catatan khusus"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
                    {extraInstrumentContent}
                  </section>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeOperationControlModal}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOperationInfoComplete) {
                        setMessage(
                          "Lengkapi Nama TS/operator dan rumah sakit dulu sebelum mulai checklist."
                        );
                        return;
                      }
                      closeOperationControlModal();
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Simpan & Mulai Checklist
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {checklistMenuOpen ? (
            <motion.div
              key="checklist-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
              onClick={() => setChecklistMenuOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl md:p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Checklist Menu
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      Aksi cepat checklist dan filter group
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChecklistMenuOpen(false)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                    aria-label="Tutup menu checklist"
                  >
                    <X size={16} />
                  </button>
                </div>
                {checklistControlPanel}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {previewCurrentItem ? (
            <motion.div
              key="instrument-preview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
              onClick={closePreview}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {selected.key.toUpperCase()} · {previewCurrentItem.category || "Lainnya"}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {previewCurrentItem.catalogNo} · {previewCurrentItem.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goToPreviousPreviewItem}
                      disabled={!previewHasPrev}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={goToNextPreviewItem}
                      disabled={!previewHasNext}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={closePreview}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                      aria-label="Tutup preview"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {previewCurrentItem.imageUrl ? (
                      <DriveImageWithFallback
                        src={previewCurrentItem.imageUrl}
                        driveId={previewCurrentItem.driveId}
                        alt={previewCurrentItem.name}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full flex-col items-center justify-center gap-1 text-slate-400">
                        <ImageIcon size={26} />
                        <p className="text-xs font-medium">No image</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-700">
                      <span className="font-semibold">Kode:</span> {previewCurrentItem.catalogNo}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Deskripsi:</span> {previewCurrentItem.name}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Group:</span> {previewCurrentItem.category || "-"}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Piece:</span> {previewCurrentItem.qty}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Status:</span>{" "}
                      {checked[previewCurrentItem.id] ? "Sudah dicek" : "Belum dicek"}
                    </p>
                    {previewCurrentItem.isCustom ? (
                      <p className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Instrument Tambahan
                      </p>
                    ) : null}
                    {isCriticalInstrument(previewCurrentItem) ? (
                      <p className="inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Item Kritikal · Wajib Foto
                      </p>
                    ) : null}
                    <p className="text-[11px] text-slate-500">
                      {previewIndex >= 0
                        ? `Item ${previewIndex + 1} dari ${previewSourceItems.length}`
                        : ""}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Shortcut: ← Prev · → Next · Esc Close
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleItem(previewCurrentItem.id)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      checked[previewCurrentItem.id]
                        ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {checked[previewCurrentItem.id] ? "Batalkan Checklist" : "Centang Item Ini"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </main>
  );
}
