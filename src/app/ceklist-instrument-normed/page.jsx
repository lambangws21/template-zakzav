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

// Ganti dengan URL Google Apps Script Web App Anda
// Contoh: https://script.google.com/macros/s/AKfycbxxx/exec
const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

const CHECKLISTS = [
  {
    key: "tkr",
    title: "TKR Normed / Gordion Knee",
    subtitle: "Checklist Instrument Total Knee Replacement",
    description:
      "Instrument utama untuk femoral preparation, tibial preparation, gap confirmation, trialing, dan PS box preparation.",
    items: [
      { id: "tkr-001", catalogNo: "TKR100", name: "T-Handle", qty: 1, category: "Basic / Handle", imageUrl: "/images/instruments/tkr/t-handle.jpg" },
      { id: "tkr-002", catalogNo: "TKR101", name: "Starter", qty: 1, category: "Femoral / Tibial Canal", imageUrl: "/images/instruments/tkr/starter.jpg" },
      { id: "tkr-003", catalogNo: "TKR103", name: "Extramedullary Alignment Tower", qty: 1, category: "Alignment", imageUrl: "/images/instruments/tkr/em-alignment-tower.jpg" },
      { id: "tkr-004", catalogNo: "TKR104", name: "Femoral A/P Chamfer Guide Handle", qty: 2, category: "Femoral Preparation", imageUrl: "/images/instruments/tkr/ap-chamfer-handle.jpg" },
      { id: "tkr-005", catalogNo: "TKR105", name: "8 mm Twist Drill", qty: 1, category: "Drill", imageUrl: "/images/instruments/tkr/8mm-twist-drill.jpg" },
      { id: "tkr-006", catalogNo: "TKR107", name: "Bone File", qty: 1, category: "Finishing", imageUrl: "/images/instruments/tkr/bone-file.jpg" },
      { id: "tkr-007", catalogNo: "TKR108", name: "Femoral IM Alignment Guide", qty: 1, category: "Femoral Alignment", imageUrl: "/images/instruments/tkr/femoral-im-alignment-guide.jpg" },
      { id: "tkr-008", catalogNo: "TKR109", name: "Distal Femoral Alignment Guide", qty: 1, category: "Femoral Alignment", imageUrl: "/images/instruments/tkr/distal-femoral-alignment-guide.jpg" },
      { id: "tkr-009", catalogNo: "TKR110", name: "Distal Femoral Cutting Guide", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/distal-femoral-cutting-guide.jpg" },
      { id: "tkr-010", catalogNo: "TKR111", name: "PS Cutting Jig Drill Guide", qty: 1, category: "PS Preparation", imageUrl: "/images/instruments/tkr/ps-cutting-jig-drill-guide.jpg" },
      { id: "tkr-011", catalogNo: "TKR112", name: "Femoral A/P Chamfer Cutting Guide Size 1", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/ap-chamfer-cutting-guide.jpg" },
      { id: "tkr-012", catalogNo: "TKR113", name: "Femoral A/P Chamfer Cutting Guide Size 2", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/ap-chamfer-cutting-guide.jpg" },
      { id: "tkr-013", catalogNo: "TKR114", name: "Femoral A/P Chamfer Cutting Guide Size 3", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/ap-chamfer-cutting-guide.jpg" },
      { id: "tkr-014", catalogNo: "TKR115", name: "Femoral A/P Chamfer Cutting Guide Size 4", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/ap-chamfer-cutting-guide.jpg" },
      { id: "tkr-015", catalogNo: "TKR116", name: "Femoral A/P Chamfer Cutting Guide Size 5", qty: 1, category: "Femoral Cutting", imageUrl: "/images/instruments/tkr/ap-chamfer-cutting-guide.jpg" },
      { id: "tkr-016", catalogNo: "TKR124", name: "Femoral IM Rod 400 mm", qty: 1, category: "Femoral Alignment", imageUrl: "/images/instruments/tkr/femoral-im-rod.jpg" },
      { id: "tkr-017", catalogNo: "TKR130", name: "Femoral Condyle Drill", qty: 1, category: "Drill", imageUrl: "/images/instruments/tkr/femoral-condyle-drill.jpg" },
      { id: "tkr-018", catalogNo: "TKR131", name: "PS Reamer", qty: 1, category: "PS Preparation", imageUrl: "/images/instruments/tkr/ps-reamer.jpg" },
      { id: "tkr-019", catalogNo: "TKR133", name: "Pin Extractor", qty: 1, category: "Extractor", imageUrl: "/images/instruments/tkr/pin-extractor.jpg" },
      { id: "tkr-020", catalogNo: "TKR134", name: "Spike and Tibial EM Guide Extractor", qty: 1, category: "Extractor", imageUrl: "/images/instruments/tkr/spike-em-guide-extractor.jpg" },
      { id: "tkr-021", catalogNo: "TKR135", name: "Femoral Impactor", qty: 1, category: "Impactor", imageUrl: "/images/instruments/tkr/femoral-impactor.jpg" },
      { id: "tkr-022", catalogNo: "TKR136", name: "PS Housing Punch", qty: 1, category: "PS Preparation", imageUrl: "/images/instruments/tkr/ps-housing-punch.jpg" },
      { id: "tkr-023", catalogNo: "TKR137", name: "PS Housing Impactor", qty: 1, category: "PS Preparation", imageUrl: "/images/instruments/tkr/ps-housing-impactor.jpg" },
      { id: "tkr-024", catalogNo: "TKR140", name: "Femoral Sizer", qty: 1, category: "Femoral Sizing", imageUrl: "/images/instruments/tkr/femoral-sizer.jpg" },
      { id: "tkr-025", catalogNo: "TKR145", name: "Tibial IM Rod", qty: 1, category: "Tibial Alignment", imageUrl: "/images/instruments/tkr/tibial-im-rod.jpg" },
      { id: "tkr-026", catalogNo: "TKR169", name: "Cemented Tibial Punch Handle", qty: 1, category: "Tibial Preparation", imageUrl: "/images/instruments/tkr/tibial-punch-handle.jpg" },
      { id: "tkr-027", catalogNo: "TKR170", name: "Tibial Baseplate Handle", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-handle.jpg" },
      { id: "tkr-028", catalogNo: "TKR171", name: "Tibial IM Alignment Guide", qty: 1, category: "Tibial Alignment", imageUrl: "/images/instruments/tkr/tibial-im-alignment-guide.jpg" },
      { id: "tkr-029", catalogNo: "TKR172", name: "Tibial EM Alignment Guide", qty: 1, category: "Tibial Alignment", imageUrl: "/images/instruments/tkr/tibial-em-alignment-guide.jpg" },
      { id: "tkr-030", catalogNo: "TKR190", name: "Cemented Tibia Punch L", qty: 1, category: "Tibial Preparation", imageUrl: "/images/instruments/tkr/cemented-tibia-punch.jpg" },
      { id: "tkr-031", catalogNo: "TKR191", name: "Cemented Tibia Punch M", qty: 1, category: "Tibial Preparation", imageUrl: "/images/instruments/tkr/cemented-tibia-punch.jpg" },
      { id: "tkr-032", catalogNo: "TKR192", name: "Cemented Tibia Punch S", qty: 1, category: "Tibial Preparation", imageUrl: "/images/instruments/tkr/cemented-tibia-punch.jpg" },
      { id: "tkr-033", catalogNo: "TKR193", name: "Gap Gauge 9 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/instruments/tkr/gap-gauge.jpg" },
      { id: "tkr-034", catalogNo: "TKR194", name: "Gap Gauge 11 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/instruments/tkr/gap-gauge.jpg" },
      { id: "tkr-035", catalogNo: "TKR195", name: "Gap Gauge 13 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/instruments/tkr/gap-gauge.jpg" },
      { id: "tkr-036", catalogNo: "TKR196", name: "Gap Gauge 15 mm", qty: 1, category: "Gap Balancing", imageUrl: "/images/instruments/tkr/gap-gauge.jpg" },
      { id: "tkr-037", catalogNo: "TKR198", name: "Tibial Stylus", qty: 1, category: "Tibial Resection", imageUrl: "/images/instruments/tkr/tibial-stylus.jpg" },
      { id: "tkr-038", catalogNo: "TKR025", name: "Tibial Baseplate Trial Size 1", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
      { id: "tkr-039", catalogNo: "TKR026", name: "Tibial Baseplate Trial Size 2", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
      { id: "tkr-040", catalogNo: "TKR027", name: "Tibial Baseplate Trial Size 3", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
      { id: "tkr-041", catalogNo: "TKR028", name: "Tibial Baseplate Trial Size 4", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
      { id: "tkr-042", catalogNo: "TKR029", name: "Tibial Baseplate Trial Size 5", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
      { id: "tkr-043", catalogNo: "TKR205", name: "Tibial Baseplate Trial Size 6", qty: 1, category: "Tibial Trial", imageUrl: "/images/instruments/tkr/tibial-baseplate-trial.jpg" },
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
];

const STORAGE_KEY = "normed-instrument-checklist-v2";

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
    } catch (error) {
      console.error("Gagal membaca localStorage", error);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ checked, operatorName, hospitalName, doctorName, patientCode, caseNote, procedureKey })
    );
  }, [checked, operatorName, hospitalName, doctorName, patientCode, caseNote, procedureKey]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return selected.items;

    return selected.items.filter((item) => {
      return [item.catalogNo, item.name, item.category, item.note || ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [query, selected.items]);

  const categories = useMemo(() => {
    return Array.from(new Set(filteredItems.map((item) => item.category)));
  }, [filteredItems]);

  const total = selected.items.length;
  const completed = selected.items.filter((item) => checked[item.id]).length;
  const missingItems = selected.items.filter((item) => !checked[item.id]);
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  function toggleItem(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function resetSelectedProcedure() {
    const next = { ...checked };
    selected.items.forEach((item) => {
      delete next[item.id];
    });
    setChecked(next);
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
      procedureTitle: selected.title,
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
      items: selected.items.map((item) => ({
        id: item.id,
        catalogNo: item.catalogNo,
        name: item.name,
        category: item.category,
        qty: item.qty,
        checked: Boolean(checked[item.id]),
      })),
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

    if (!GOOGLE_SCRIPT_URL) {
      setMessage("NEXT_PUBLIC_GOOGLE_SCRIPT_URL belum diisi di file .env.local");
      return;
    }

    if (!operatorName || !hospitalName) {
      setMessage("Nama TS/operator dan rumah sakit wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const photoBase64 = documentationPhoto ? await fileToBase64(documentationPhoto) : "";
      const payload = buildPayload(photoBase64);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Gagal menyimpan data.");
      }

      setMessage("Checklist berhasil disimpan ke Google Sheet.");
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
            const done = procedure.items.filter((item) => checked[item.id]).length;
            const pct = Math.round((done / procedure.items.length) * 100);

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
              </button>
            );
          })}
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

          <div className="mt-6 space-y-6">
            {categories.map((category) => {
              const items = filteredItems.filter((item) => item.category === category);

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{category}</h3>
                    <span className="text-xs text-slate-400">{items.length} item</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => {
                      const isChecked = Boolean(checked[item.id]);

                      return (
                        <motion.button
                          key={item.id}
                          layout
                          onClick={() => toggleItem(item.id)}
                          className={`overflow-hidden rounded-2xl border text-left transition ${
                            isChecked
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex gap-3 p-3">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <ImageIcon size={26} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {item.catalogNo}
                                </p>
                                {isChecked ? (
                                  <CheckCircle2 className="shrink-0 text-emerald-600" size={22} />
                                ) : (
                                  <Circle className="shrink-0 text-slate-300" size={22} />
                                )}
                              </div>
                              <p className="font-semibold leading-snug text-slate-900">{item.name}</p>
                              <p className="mt-1 text-xs font-medium text-slate-500">Qty {item.qty}</p>
                              {item.note ? <p className="mt-1 text-xs text-slate-500">{item.note}</p> : null}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
