"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Download,
  Printer,
  User,
  Calendar,
  Building2,
  Stethoscope,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function roundRect(doc, x, y, w, h, r, fill) {
  doc.roundedRect(x, y, w, h, r, r, fill || "F");
}

function getImageFormat(dataUrl) {
  if (!dataUrl) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

async function generatePreOpPDF({
  patientInfo,
  measurementRows,
  templateInventoryRows,
  hkaSummary,
  implantItem,
  canvasDataUrl,
  imageName,
  prefillCase = null,
  cupAssessment = null,
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 14;
  const CONTENT_W = W - MARGIN * 2;
  let cursor = 0;

  // ── color palette ──
  const NAVY = [15, 23, 42];
  const BLUE = [37, 99, 235];
  const TEAL = [13, 148, 136];
  const LIGHT = [241, 245, 249];
  const MID = [148, 163, 184];
  const WHITE = [255, 255, 255];
  const RED = [220, 38, 38];
  const GREEN = [22, 163, 74];

  function setColor(rgb, alpha = false) {
    if (alpha) doc.setFillColor(...rgb);
    else doc.setTextColor(...rgb);
  }

  function setFill(rgb) { doc.setFillColor(...rgb); }
  function setDraw(rgb) { doc.setDrawColor(...rgb); }
  function setFont(size, style = "normal") {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  }

  function addNewPageIfNeeded(needed) {
    if (cursor + needed > 277) {
      doc.addPage();
      cursor = MARGIN;
    }
  }

  // ════════════════════════════════════════════════
  // HEADER BAND
  // ════════════════════════════════════════════════
  setFill(NAVY);
  doc.rect(0, 0, W, 30, "F");

  // left accent bar
  setFill(BLUE);
  doc.rect(0, 0, 4, 30, "F");

  // title
  setFont(16, "bold");
  setColor(WHITE);
  doc.text("LAPORAN PRE-OPERASI", MARGIN + 2, 12);

  setFont(8, "normal");
  setColor(MID);
  doc.text("Digital Templating & Surgical Planning Report", MARGIN + 2, 18);

  // date top-right
  setFont(8, "normal");
  setColor(MID);
  const dateStr = patientInfo.surgeryDate || todayISO();
  doc.text(dateStr, W - MARGIN, 12, { align: "right" });
  doc.text(imageName || "—", W - MARGIN, 18, { align: "right" });

  cursor = 34;

  // ════════════════════════════════════════════════
  // PATIENT INFO SECTION
  // ════════════════════════════════════════════════
  setFill(LIGHT);
  roundRect(doc, MARGIN, cursor, CONTENT_W, 36, 3);

  // section title
  setFont(8, "bold");
  setColor(NAVY);
  doc.text("DATA PASIEN", MARGIN + 4, cursor + 6);
  setFill(TEAL);
  doc.rect(MARGIN + 4, cursor + 7, 20, 0.8, "F");

  const COL1 = MARGIN + 4;
  const COL2 = MARGIN + CONTENT_W / 2 + 2;
  const ROW_H = 7;
  let infoY = cursor + 13;

  function infoRow(label, value, x, y) {
    setFont(7, "normal");
    setColor(MID);
    doc.text(label, x, y);
    setFont(8, "bold");
    setColor(NAVY);
    doc.text(value || "—", x, y + 4);
  }

  infoRow("Nama Pasien", patientInfo.patientName, COL1, infoY);
  infoRow("No. Rekam Medis", patientInfo.medicalRecord, COL2, infoY);

  infoY += ROW_H + 3;
  infoRow("Usia / Jenis Kelamin", `${patientInfo.age || "—"} thn / ${patientInfo.gender || "—"}`, COL1, infoY);
  infoRow("Diagnosis", patientInfo.diagnosis, COL2, infoY);

  cursor += 40;

  // ── second row: procedure + surgeon ──
  setFill(LIGHT);
  roundRect(doc, MARGIN, cursor, CONTENT_W, 28, 3);

  let procY = cursor + 13;
  infoRow("Prosedur", patientInfo.procedure, COL1, procY);
  infoRow("Sisi Operasi", patientInfo.laterality, COL2, procY);
  procY += ROW_H + 3;
  infoRow("Dokter Bedah", patientInfo.surgeon, COL1, procY);
  infoRow("Institusi", patientInfo.institution, COL2, procY);

  cursor += 32;

  // ════════════════════════════════════════════════
  // X-RAY IMAGE
  // ════════════════════════════════════════════════
  if (canvasDataUrl) {
    addNewPageIfNeeded(100);
    const IMG_MAX_H = 100;
    const IMG_MAX_W = CONTENT_W;

    // create a temp image to get dimensions
    const img = new Image();
    img.src = canvasDataUrl;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
    const imgH = Math.min(IMG_MAX_H, IMG_MAX_W * ratio);
    const imgW = Math.min(IMG_MAX_W, imgH / ratio);
    const imgX = MARGIN + (CONTENT_W - imgW) / 2;

    // image border + shadow effect
    setFill([30, 41, 59]);
    roundRect(doc, imgX - 1, cursor - 1, imgW + 2, imgH + 2, 2);

    doc.addImage(canvasDataUrl, getImageFormat(canvasDataUrl), imgX, cursor, imgW, imgH);

    setFont(7, "normal");
    setColor(MID);
    doc.text("Gambar X-Ray dengan Overlay Pengukuran", W / 2, cursor + imgH + 5, { align: "center" });

    cursor += imgH + 10;
  }

  // ════════════════════════════════════════════════
  // HKA / DEFORMITY ANALYSIS
  // ════════════════════════════════════════════════
  if (hkaSummary && hkaSummary.length > 0) {
    addNewPageIfNeeded(20);

    setFill(TEAL);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("ANALISIS DEFORMITAS (HKA)", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    for (const h of hkaSummary) {
      addNewPageIfNeeded(12);
      const isVarus = h.direction === "varus";
      setFill(isVarus ? [254, 242, 242] : [240, 253, 244]);
      roundRect(doc, MARGIN, cursor, CONTENT_W, 10, 2);
      setFont(8, "bold");
      setColor(isVarus ? RED : GREEN);
      doc.text(`${h.label}  •  ${h.deviation}°  ${h.direction.toUpperCase()}  (${h.side})`, MARGIN + 4, cursor + 6.5);
      cursor += 13;
    }
    cursor += 2;
  }

  // ════════════════════════════════════════════════
  // CUP ASSESSMENT (acetabular cup positioning)
  // ════════════════════════════════════════════════
  if (cupAssessment) {
    addNewPageIfNeeded(30);
    const AMBER = [245, 158, 11];
    setFill(AMBER);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("PENILAIAN POSISI CUP ACETABULAR", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    const cupInc = parseFloat(cupAssessment.inclination).toFixed(1);
    const cupAv = parseFloat(cupAssessment.anteversion).toFixed(1);
    const cupSide = cupAssessment.side === "left" ? "Kiri" : "Kanan";
    const halfW = (CONTENT_W - 2) / 2;

    // Row 1: Inclination + Anteversion
    setFill(LIGHT);
    roundRect(doc, MARGIN, cursor, halfW, 14, 2);
    roundRect(doc, MARGIN + halfW + 2, cursor, halfW, 14, 2);
    setFont(7, "normal"); setColor([100, 116, 139]);
    doc.text("Inklinasi", MARGIN + 4, cursor + 5);
    doc.text("Anteversion", MARGIN + halfW + 6, cursor + 5);
    setFont(12, "bold"); setColor([245, 158, 11]);
    doc.text(`${cupInc}°`, MARGIN + 4, cursor + 12);
    setColor([14, 165, 233]);
    doc.text(`${cupAv}°`, MARGIN + halfW + 6, cursor + 12);
    cursor += 17;

    // Row 2: side + zone
    setFill(LIGHT);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 10, 2);
    setFont(8, "bold"); setColor(NAVY);
    doc.text(`Sisi: ${cupSide}  •  Status: ${cupAssessment.zone || "—"}`, MARGIN + 4, cursor + 6.5);
    if (cupAssessment.savedAt) {
      setFont(6, "normal"); setColor([148, 163, 184]);
      doc.text(`Disimpan: ${cupAssessment.savedAt}`, MARGIN + CONTENT_W - 4, cursor + 6.5, { align: "right" });
    }
    cursor += 13;
  }

  // ════════════════════════════════════════════════
  // RENCANA PRE-OPERASI (implant plan)
  // ════════════════════════════════════════════════
  const preComponents = prefillCase?.implantLabel
    ? prefillCase.implantLabel.split(" · ").filter(Boolean)
    : implantItem ? [implantItem.label].filter(Boolean) : [];

  if (preComponents.length > 0) {
    addNewPageIfNeeded(20);
    setFill(BLUE);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("RENCANA IMPLAN PRE-OPERASI", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    preComponents.forEach((comp, idx) => {
      addNewPageIfNeeded(9);
      setFill(idx % 2 === 0 ? WHITE : LIGHT);
      doc.rect(MARGIN, cursor, CONTENT_W, 8, "F");
      setFont(8, "bold");
      setColor(NAVY);
      doc.text(`${idx + 1}.  ${comp}`, MARGIN + 4, cursor + 5.5);
      if (idx === 0 && prefillCase?.preOpSizeNum != null) {
        setFont(7, "normal");
        setColor(BLUE);
        doc.text(`Uk. ${prefillCase.preOpSizeNum}`, MARGIN + CONTENT_W - 4, cursor + 5.5, { align: "right" });
      }
      setDraw(LIGHT);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, cursor + 8, MARGIN + CONTENT_W, cursor + 8);
      cursor += 8;
    });
    cursor += 4;
  }

  // ════════════════════════════════════════════════
  // DATA AKTUAL POST-OPERASI
  // ════════════════════════════════════════════════
  if (prefillCase?.actualImplantLabel) {
    addNewPageIfNeeded(30);
    setFill(GREEN);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("DATA AKTUAL POST-OPERASI", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    // Operation date + HKA post-op side by side
    if (prefillCase.operationDate || prefillCase.postOpHka != null) {
      addNewPageIfNeeded(14);
      const halfW = (CONTENT_W - 4) / 2;
      setFill(LIGHT);
      roundRect(doc, MARGIN, cursor, halfW, 12, 2);
      setFont(7, "normal"); setColor(MID);
      doc.text("Tanggal Operasi", MARGIN + 4, cursor + 5);
      setFont(8, "bold"); setColor(NAVY);
      doc.text(prefillCase.operationDate || "—", MARGIN + 4, cursor + 10);

      setFill(LIGHT);
      roundRect(doc, MARGIN + halfW + 4, cursor, halfW, 12, 2);
      setFont(7, "normal"); setColor(MID);
      doc.text("HKA Post-Op", MARGIN + halfW + 8, cursor + 5);
      setFont(8, "bold"); setColor(NAVY);
      doc.text(prefillCase.postOpHka != null ? `${prefillCase.postOpHka}°` : "—", MARGIN + halfW + 8, cursor + 10);
      cursor += 16;
    }

    // Actual components
    const actualComponents = prefillCase.actualImplantLabel.split(" · ").filter(Boolean);
    actualComponents.forEach((comp, idx) => {
      addNewPageIfNeeded(9);
      setFill(idx % 2 === 0 ? WHITE : [240, 253, 244]);
      doc.rect(MARGIN, cursor, CONTENT_W, 8, "F");
      setFont(8, "bold");
      setColor([15, 78, 46]);
      doc.text(`${idx + 1}.  ${comp}`, MARGIN + 4, cursor + 5.5);
      setDraw([187, 247, 208]);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, cursor + 8, MARGIN + CONTENT_W, cursor + 8);
      cursor += 8;
    });

    // Accuracy comparison
    if (prefillCase.actualSizeNum != null && prefillCase.preOpSizeNum != null) {
      addNewPageIfNeeded(13);
      const diff = prefillCase.actualSizeNum - prefillCase.preOpSizeNum;
      const exact = diff === 0;
      const close = Math.abs(diff) <= 1;
      setFill(exact ? [240, 253, 244] : close ? [255, 251, 235] : [254, 242, 242]);
      roundRect(doc, MARGIN, cursor + 2, CONTENT_W, 10, 2);
      setFont(8, "bold");
      setColor(exact ? GREEN : close ? [161, 98, 7] : RED);
      const accText = exact
        ? "✓ Exact Match — Templating Akurat"
        : `Selisih ${diff > 0 ? "+" : ""}${diff.toFixed(1)} — Actual ${diff > 0 ? "lebih besar" : "lebih kecil"}`;
      doc.text(accText, MARGIN + 4, cursor + 8.5);
      cursor += 15;
    }

    // Post-op notes
    if (prefillCase.postOpNotes) {
      addNewPageIfNeeded(14);
      const noteLines = doc.splitTextToSize(prefillCase.postOpNotes, CONTENT_W - 8);
      const noteH = Math.min(noteLines.length, 3) * 5 + 8;
      setFill(LIGHT);
      roundRect(doc, MARGIN, cursor, CONTENT_W, noteH, 2);
      setFont(7, "normal"); setColor(MID);
      doc.text("Catatan Post-Op", MARGIN + 4, cursor + 5);
      setFont(7, "normal"); setColor(NAVY);
      doc.text(noteLines.slice(0, 3), MARGIN + 4, cursor + 9.5);
      cursor += noteH + 3;
    }
    cursor += 2;
  }

  // ════════════════════════════════════════════════
  // MEASUREMENTS TABLE (only when no prefillCase)
  // ════════════════════════════════════════════════
  if (!prefillCase && measurementRows.length > 0) {
    addNewPageIfNeeded(20);
    setFill(BLUE);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("HASIL PENGUKURAN", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    const COL_W = [10, 60, CONTENT_W - 70];
    let row = 0;
    for (const m of measurementRows) {
      addNewPageIfNeeded(9);
      setFill(row % 2 === 0 ? WHITE : LIGHT);
      doc.rect(MARGIN, cursor, CONTENT_W, 8, "F");
      setFont(7, "normal"); setColor(MID);
      doc.text(String(row + 1), MARGIN + 2, cursor + 5.5);
      setFont(7.5, "bold"); setColor(NAVY);
      doc.text(m.type, MARGIN + COL_W[0] + 2, cursor + 5.5);
      setFont(8, "normal"); setColor(BLUE);
      doc.text(m.value || "—", MARGIN + COL_W[0] + COL_W[1] + 2, cursor + 5.5);
      setDraw(LIGHT);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, cursor + 8, MARGIN + CONTENT_W, cursor + 8);
      cursor += 8;
      row++;
    }
    cursor += 4;
  }

  // ════════════════════════════════════════════════
  // TEMPLATE INVENTORY (only when no prefillCase)
  // ════════════════════════════════════════════════
  if (!prefillCase && templateInventoryRows.length > 0) {
    addNewPageIfNeeded(20);
    setFill([79, 70, 229]);
    roundRect(doc, MARGIN, cursor, CONTENT_W, 8, 2);
    setFont(8, "bold");
    setColor(WHITE);
    doc.text("TEMPLATE & FRAGMENT AKTIF", MARGIN + 4, cursor + 5.5);
    cursor += 11;

    let row = 0;
    for (const t of templateInventoryRows.slice(0, 10)) {
      addNewPageIfNeeded(8);
      setFill(row % 2 === 0 ? WHITE : LIGHT);
      doc.rect(MARGIN, cursor, CONTENT_W, 7, "F");
      setFont(7, "normal"); setColor(NAVY);
      doc.text(`${row + 1}. ${t.kind} — ${t.name}`, MARGIN + 2, cursor + 4.8);
      setFont(7, "normal"); setColor(MID);
      doc.text(`${t.size}  |  Rotasi: ${t.rotation}  |  Opacity: ${t.opacity}`, MARGIN + CONTENT_W - 70, cursor + 4.8);
      setDraw(LIGHT);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, cursor + 7, MARGIN + CONTENT_W, cursor + 7);
      cursor += 7;
      row++;
    }
    cursor += 4;
  }

  // ════════════════════════════════════════════════
  // CATATAN KLINIS
  // ════════════════════════════════════════════════
  addNewPageIfNeeded(32);
  setFill(LIGHT);
  roundRect(doc, MARGIN, cursor, CONTENT_W, 30, 3);
  setFont(8, "bold");
  setColor(NAVY);
  doc.text("CATATAN KLINIS", MARGIN + 4, cursor + 6);
  setFont(8, "normal");
  setColor(NAVY);
  if (patientInfo.notes) {
    const lines = doc.splitTextToSize(patientInfo.notes, CONTENT_W - 8);
    doc.text(lines.slice(0, 3), MARGIN + 4, cursor + 13);
  }
  cursor += 34;

  // ════════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ════════════════════════════════════════════════
  addNewPageIfNeeded(36);
  const SIG_W = (CONTENT_W - 8) / 2;

  setFill(LIGHT);
  roundRect(doc, MARGIN, cursor, SIG_W, 32, 3);
  setFont(7, "normal");
  setColor(MID);
  doc.text("Dokter Pemeriksa,", MARGIN + 4, cursor + 6);
  setFont(8, "bold");
  setColor(NAVY);
  doc.text(patientInfo.surgeon || "Dr. ——————————", MARGIN + 4, cursor + 26);
  setDraw(MID);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 4, cursor + 24, MARGIN + SIG_W - 4, cursor + 24);

  setFill(LIGHT);
  roundRect(doc, MARGIN + SIG_W + 8, cursor, SIG_W, 32, 3);
  setFont(7, "normal");
  setColor(MID);
  doc.text("Mengetahui,", MARGIN + SIG_W + 12, cursor + 6);
  setFont(8, "bold");
  setColor(NAVY);
  doc.text("——————————————", MARGIN + SIG_W + 12, cursor + 26);
  doc.line(MARGIN + SIG_W + 12, cursor + 24, MARGIN + CONTENT_W - 4, cursor + 24);

  cursor += 36;

  // ════════════════════════════════════════════════
  // FOOTER every page
  // ════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setFill([30, 41, 59]);
    doc.rect(0, 287, W, 10, "F");
    setFont(6.5, "normal");
    setColor([100, 116, 139]);
    doc.text(
      "Dokumen ini dibuat secara digital menggunakan sistem templating ortopedi zakzav.",
      W / 2,
      293,
      { align: "center" }
    );
    setColor(MID);
    doc.text(`Halaman ${i} / ${totalPages}`, W - MARGIN, 293, { align: "right" });
  }

  return doc;
}

// ─── Input Field ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text", textarea = false }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none ring-0 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      )}
    </label>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label, color = "text-slate-600" }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</span>
      <div className="h-px flex-1 bg-slate-200/70" />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PreOpReportModal({
  isOpen,
  onClose,
  measurementRows = [],
  templateInventoryRows = [],
  hkaSets = [],
  imageName = "",
  selectedImplantLibraryItem = null,
  getCanvasSnapshot,
  getHkaMeasurementResult,
  cupAssessment = null,
  // Optional: pre-fill from a saved patient case
  prefillCase = null,
}) {
  const [patientInfo, setPatientInfo] = useState({
    patientName: "",
    medicalRecord: "",
    age: "",
    gender: "L",
    diagnosis: "",
    procedure: "Total Knee Arthroplasty (TKA)",
    laterality: "Kanan",
    surgeon: "",
    institution: "",
    surgeryDate: todayISO(),
    notes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from case record when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setDone(false);
    setError("");
    if (prefillCase) {
      setPatientInfo((prev) => ({
        ...prev,
        patientName: prefillCase.patientName || prev.patientName,
        procedure: prefillCase.procedure || prev.procedure,
        surgeryDate: prefillCase.operationDate || prev.surgeryDate,
        notes: prefillCase.notes || prev.notes,
      }));
    }
  }, [isOpen, prefillCase]);

  const set = useCallback((key) => (val) => setPatientInfo((p) => ({ ...p, [key]: val })), []);

  const hkaSummary = useMemo(() => (hkaSets || []).map((item) => {
    const result = getHkaMeasurementResult ? getHkaMeasurementResult(item) : null;
    if (!result || result.absoluteDeviation === null) return null;
    return {
      label: `HKA ${result.side?.toUpperCase() || ""}`,
      deviation: result.absoluteDeviation.toFixed(1),
      direction: result.direction || "—",
      side: result.side || "—",
    };
  }).filter(Boolean), [hkaSets, getHkaMeasurementResult]);

  const handleGenerate = useCallback(async (print = false) => {
    setGenerating(true);
    setError("");
    setDone(false);
    try {
      let canvasDataUrl = null;
      if (getCanvasSnapshot) {
        const canvas = getCanvasSnapshot("laporan pre-op", { exportScale: 1.5 });
        if (canvas) {
          try { canvasDataUrl = canvas.toDataURL("image/jpeg", 0.9); } catch { canvasDataUrl = null; }
        }
      }

      const doc = await generatePreOpPDF({
        patientInfo,
        measurementRows,
        templateInventoryRows,
        hkaSummary,
        implantItem: selectedImplantLibraryItem,
        canvasDataUrl,
        imageName,
        prefillCase,
        cupAssessment,
      });

      if (print) {
        doc.autoPrint();
        doc.output("dataurlnewwindow");
      } else {
        const dateTag = new Date().toISOString().slice(0, 10);
        const safeName = (patientInfo.patientName || "pasien").replace(/[^a-zA-Z0-9]/g, "-");
        doc.save(`pre-op-${safeName}-${dateTag}.pdf`);
      }
      setDone(true);
    } catch (e) {
      console.error(e);
      setError("Gagal membuat PDF. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }, [patientInfo, measurementRows, templateInventoryRows, hkaSummary, selectedImplantLibraryItem, imageName, getCanvasSnapshot]);

  if (typeof document === "undefined") return null;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,660px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-slate-200/60 bg-[#0f172a] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600">
                <FileText className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Laporan Pre-Operasi</p>
                <p className="text-[10px] text-slate-400">Digital Surgical Planning Report</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* scrollable body */}
            <div className="max-h-[calc(94dvh-140px)] overflow-y-auto">
              <div className="space-y-5 px-5 py-5">

                {/* ── IDENTITAS PASIEN ── */}
                <div className="space-y-3">
                  <SectionLabel icon={User} label="Identitas Pasien" color="text-blue-600" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <Field label="Nama Lengkap" value={patientInfo.patientName} onChange={set("patientName")} placeholder="Nama pasien" />
                    </div>
                    <Field label="No. Rekam Medis" value={patientInfo.medicalRecord} onChange={set("medicalRecord")} placeholder="RM-XXXX" />
                    <Field label="Usia (tahun)" value={patientInfo.age} onChange={set("age")} placeholder="45" type="number" />
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Jenis Kelamin</span>
                      <select
                        value={patientInfo.gender}
                        onChange={(e) => set("gender")(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </label>
                    <Field label="Diagnosis" value={patientInfo.diagnosis} onChange={set("diagnosis")} placeholder="OA Genu Bilateral" />
                  </div>
                </div>

                {/* ── INFORMASI OPERASI ── */}
                <div className="space-y-3">
                  <SectionLabel icon={Stethoscope} label="Informasi Operasi" color="text-teal-600" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prosedur</span>
                        <select
                          value={patientInfo.procedure}
                          onChange={(e) => set("procedure")(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option>Total Knee Arthroplasty (TKA)</option>
                          <option>Total Hip Arthroplasty (THA)</option>
                          <option>Unicompartmental Knee Arthroplasty (UKA)</option>
                          <option>Revision Knee Arthroplasty</option>
                          <option>Revision Hip Arthroplasty</option>
                          <option>Hemiarthroplasty Hip</option>
                          <option>Osteotomy</option>
                          <option>Lainnya</option>
                        </select>
                      </label>
                    </div>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sisi Operasi</span>
                      <select
                        value={patientInfo.laterality}
                        onChange={(e) => set("laterality")(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option>Kanan</option>
                        <option>Kiri</option>
                        <option>Bilateral</option>
                      </select>
                    </label>
                    <Field label="Tanggal Rencana Operasi" value={patientInfo.surgeryDate} onChange={set("surgeryDate")} type="date" />
                  </div>
                </div>

                {/* ── DOKTER & INSTITUSI ── */}
                <div className="space-y-3">
                  <SectionLabel icon={Building2} label="Dokter & Institusi" color="text-purple-600" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Nama Dokter Bedah" value={patientInfo.surgeon} onChange={set("surgeon")} placeholder="dr. Nama SpOT" />
                    <Field label="Rumah Sakit / Klinik" value={patientInfo.institution} onChange={set("institution")} placeholder="RSUP Dr. Kariadi" />
                  </div>
                </div>

                {/* ── RINGKASAN DATA ── */}
                <div className="space-y-3">
                  <SectionLabel icon={Activity} label="Ringkasan Temuan" color="text-rose-600" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-wider text-blue-500">Pengukuran</p>
                      <p className="mt-1 text-2xl font-black text-blue-700">{measurementRows.length}</p>
                      <p className="text-[8px] text-blue-400">total item</p>
                    </div>
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-wider text-purple-500">Template</p>
                      <p className="mt-1 text-2xl font-black text-purple-700">{templateInventoryRows.length}</p>
                      <p className="text-[8px] text-purple-400">overlay aktif</p>
                    </div>
                    <div className={`rounded-2xl border p-3 ${hkaSummary.length > 0 ? "border-teal-100 bg-teal-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className={`text-[8px] font-black uppercase tracking-wider ${hkaSummary.length > 0 ? "text-teal-500" : "text-slate-400"}`}>HKA</p>
                      <p className={`mt-1 text-2xl font-black ${hkaSummary.length > 0 ? "text-teal-700" : "text-slate-400"}`}>{hkaSummary.length}</p>
                      <p className={`text-[8px] ${hkaSummary.length > 0 ? "text-teal-400" : "text-slate-400"}`}>
                        {hkaSummary.length > 0 ? hkaSummary[0].direction : "belum ada"}
                      </p>
                    </div>
                  </div>

                  {/* HKA detail pills */}
                  {hkaSummary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hkaSummary.map((h, i) => (
                        <span
                          key={i}
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${h.direction === "varus" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                        >
                          {h.label} • {h.deviation}° {h.direction.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cup Assessment */}
                  {cupAssessment && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                      <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">⊙ Cup Assessment</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                          INC {parseFloat(cupAssessment.inclination).toFixed(1)}°
                        </span>
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-black text-sky-800">
                          AV {parseFloat(cupAssessment.anteversion).toFixed(1)}°
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${cupAssessment.side === "left" ? "bg-sky-100 text-sky-700" : "bg-orange-100 text-orange-700"}`}>
                          {cupAssessment.side === "left" ? "◁ Kiri" : "Kanan ▷"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-600">
                          {cupAssessment.zone}
                        </span>
                      </div>
                      {cupAssessment.savedAt && (
                        <p className="text-[8px] text-amber-400">Disimpan pukul {cupAssessment.savedAt}</p>
                      )}
                    </div>
                  )}

                  {/* Implant: case layers (multi) or single library item */}
                  {prefillCase?.implantLabel ? (
                    <div className="space-y-1">
                      {prefillCase.implantLabel.split(" · ").filter(Boolean).map((part, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
                          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <p className="truncate text-[10px] font-black text-slate-800">{part.trim()}</p>
                          {i === 0 && prefillCase.preOpSizeNum != null && (
                            <span className="ml-auto shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-black text-blue-700">
                              Uk. {prefillCase.preOpSizeNum}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : selectedImplantLibraryItem ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-black text-slate-800">{selectedImplantLibraryItem.label}</p>
                        <p className="text-[8px] text-slate-400">{selectedImplantLibraryItem.brand} — {selectedImplantLibraryItem.system} — Uk. {selectedImplantLibraryItem.size}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ── CATATAN ── */}
                <div className="space-y-2">
                  <SectionLabel icon={FileText} label="Catatan Klinis" color="text-amber-600" />
                  <Field label="" value={patientInfo.notes} onChange={set("notes")} placeholder="Catatan tambahan, instruksi khusus, rencana implant alternatif..." textarea />
                </div>

                {/* status feedback */}
                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-2xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> PDF berhasil dibuat dan diunduh!
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <AlertCircle className="h-4 w-4" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* footer buttons */}
            <div className="flex gap-2.5 border-t border-slate-200/60 bg-[#f1f5f9] px-5 py-4">
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] px-4 py-3 text-xs font-black text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] transition disabled:opacity-50 active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                {generating ? "Membuat PDF..." : "Unduh PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition disabled:opacity-50 active:scale-[0.98]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500 transition active:scale-[0.98]"
              >
                <X className="h-3.5 w-3.5" />
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
