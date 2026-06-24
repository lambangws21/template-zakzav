"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Info, TableProperties, Zap } from "lucide-react";
import { TRAUMA_CATEGORIES, TRAUMA_IMPLANTS, getTraumaByCategory } from "../data/traumaImplants";

// ── helpers ───────────────────────────────────────────────────────────────────

async function loadSvgAsObjectUrl(svgPath) {
  const res = await fetch(svgPath);
  if (!res.ok) throw new Error(`Failed to fetch ${svgPath}`);
  const text = await res.text();
  const blob = new Blob([text], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

async function loadSvgText(svgPath) {
  const res = await fetch(svgPath);
  if (!res.ok) throw new Error(`Failed to fetch ${svgPath}`);
  return res.text();
}

function escapeSvgText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createObjectUrlFromSvg(svgText) {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

function buildStraightPlateSvg(implant, sizeRow) {
  const widthMm = Number(implant?.plateWidthMm);
  const lengthMm = Number(sizeRow?.lengthMm);
  const holes = Number(sizeRow?.holes);
  if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(lengthMm) || lengthMm <= 0 || !Number.isFinite(holes) || holes <= 0) {
    return null;
  }

  const marginY = Math.min(lengthMm * 0.08, widthMm * 1.65);
  const usableLength = Math.max(widthMm, lengthMm - marginY * 2);
  const holePitch = holes > 1 ? usableLength / (holes - 1) : 0;
  const holeDiameter = Math.min(widthMm * 0.56, Math.max(3.2, Number(implant?.screwDiameterMm || 3.5) * 1.18));
  const slotHeight = Math.min(holeDiameter * 1.38, holePitch * 0.52 || holeDiameter * 1.38);
  const cx = widthMm / 2;
  const holeCenters = Array.from({ length: holes }, (_, index) => marginY + index * holePitch);
  const title = escapeSvgText(`${implant?.name || "Trauma plate"} ${holes} holes ${lengthMm}mm`);

  const maskHoles = holeCenters
    .map((cy) => `<ellipse cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" rx="${(holeDiameter / 2).toFixed(3)}" ry="${(slotHeight / 2).toFixed(3)}" fill="black"/>`)
    .join("");
  const holeOutlines = holeCenters
    .map((cy) => `
    <ellipse cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" rx="${(holeDiameter / 2).toFixed(3)}" ry="${(slotHeight / 2).toFixed(3)}" fill="none" stroke="#020617" stroke-width="${Math.max(0.22, widthMm * 0.035).toFixed(3)}"/>
    <circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${(holeDiameter * 0.24).toFixed(3)}" fill="none" stroke="#1f2937" stroke-width="${Math.max(0.16, widthMm * 0.026).toFixed(3)}"/>`)
    .join("");
  const tickMarks = holeCenters
    .map((cy) => `
    <path d="M ${(cx - widthMm * 0.39).toFixed(3)} ${cy.toFixed(3)} C ${(cx - widthMm * 0.25).toFixed(3)} ${(cy - slotHeight * 0.58).toFixed(3)}, ${(cx + widthMm * 0.25).toFixed(3)} ${(cy - slotHeight * 0.58).toFixed(3)}, ${(cx + widthMm * 0.39).toFixed(3)} ${cy.toFixed(3)}" fill="none" stroke="#64748b" stroke-width="${Math.max(0.1, widthMm * 0.018).toFixed(3)}" opacity="0.42"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${lengthMm}mm" viewBox="0 0 ${widthMm} ${lengthMm}" preserveAspectRatio="none" role="img" aria-label="${title}">
  <title>${title}</title>
  <defs>
    <linearGradient id="plateShade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.44" stop-color="#334155"/>
      <stop offset="0.56" stop-color="#64748b"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <mask id="plateCutouts">
      <rect x="0" y="0" width="${widthMm}" height="${lengthMm}" fill="black"/>
      <rect x="0.25" y="0.25" width="${(widthMm - 0.5).toFixed(3)}" height="${(lengthMm - 0.5).toFixed(3)}" rx="${(widthMm / 2).toFixed(3)}" ry="${(widthMm / 2).toFixed(3)}" fill="white"/>
      ${maskHoles}
    </mask>
  </defs>
  <rect x="0.25" y="0.25" width="${(widthMm - 0.5).toFixed(3)}" height="${(lengthMm - 0.5).toFixed(3)}" rx="${(widthMm / 2).toFixed(3)}" ry="${(widthMm / 2).toFixed(3)}" fill="url(#plateShade)" stroke="#020617" stroke-width="${Math.max(0.28, widthMm * 0.045).toFixed(3)}" mask="url(#plateCutouts)"/>
  <path d="M ${(widthMm * 0.21).toFixed(3)} ${(marginY * 0.5).toFixed(3)} C ${(widthMm * 0.38).toFixed(3)} ${marginY.toFixed(3)}, ${(widthMm * 0.62).toFixed(3)} ${marginY.toFixed(3)}, ${(widthMm * 0.79).toFixed(3)} ${(marginY * 0.5).toFixed(3)}" fill="none" stroke="#94a3b8" stroke-width="${Math.max(0.12, widthMm * 0.02).toFixed(3)}" opacity="0.45"/>
  <path d="M ${(widthMm * 0.21).toFixed(3)} ${(lengthMm - marginY * 0.5).toFixed(3)} C ${(widthMm * 0.38).toFixed(3)} ${(lengthMm - marginY).toFixed(3)}, ${(widthMm * 0.62).toFixed(3)} ${(lengthMm - marginY).toFixed(3)}, ${(widthMm * 0.79).toFixed(3)} ${(lengthMm - marginY * 0.5).toFixed(3)}" fill="none" stroke="#94a3b8" stroke-width="${Math.max(0.12, widthMm * 0.02).toFixed(3)}" opacity="0.45"/>
  ${tickMarks}
  ${holeOutlines}
</svg>`;
}

async function getTraumaSvgObjectUrl(implant, sizeRow, viewKey = "ap") {
  const selectedView =
    implant?.views?.find((view) => view.key === viewKey) ||
    implant?.views?.[0] ||
    null;
  const svgPath = selectedView?.svgPath || implant.svgPath;
  if (svgPath && sizeRow?.lengthMm) {
    const text = await loadSvgText(svgPath);
    const widthMm = Number(selectedView?.physicalWidthMm || implant?.plateWidthMm || 8);
    const heightMm = Number(sizeRow.lengthMm);
    const scaled = text
      .replace(/width="[^"]*"/, `width="${widthMm}mm"`)
      .replace(/height="[^"]*"/, `height="${heightMm}mm"`)
      .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="none"');
    return createObjectUrlFromSvg(scaled);
  }
  const generatedPlateSvg = buildStraightPlateSvg(implant, sizeRow);
  if (generatedPlateSvg) return createObjectUrlFromSvg(generatedPlateSvg);
  return loadSvgAsObjectUrl(svgPath);
}

// ── sub-components ────────────────────────────────────────────────────────────

function CategoryTab({ cat, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-[11px] font-black transition"
      style={
        active
          ? { background: "rgba(255,255,255,0.10)", color: cat.color, borderBottom: `2px solid ${cat.color}` }
          : { color: "#64748b" }
      }
    >
      {cat.label}
    </button>
  );
}

function ImplantCard({ implant, selected, onClick }) {
  const cat = TRAUMA_CATEGORIES.find((c) => c.id === implant.category);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border p-3 text-left transition active:scale-[0.98]"
      style={
        selected
          ? { background: `${cat?.color}18`, border: `1.5px solid ${cat?.color}60`, backdropFilter: "blur(8px)" }
          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }
      }
    >
      <div className="flex items-start gap-2">
        {/* SVG mini-preview */}
        <div
          className="h-14 w-10 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${cat?.color}30` }}
        >
          <img
            src={implant.svgPath}
            alt={implant.name}
            className="h-full object-contain"
            style={{ filter: "invert(1) opacity(0.85)" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black text-slate-100">{implant.name}</p>
          <p className="text-[9px] text-slate-400">{implant.manufacturer} · {implant.system}</p>
          {implant.screwDiameterMm && (
            <span
              className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black"
              style={{ background: `${cat?.color}20`, color: cat?.color }}
            >
              ⌀ {implant.screwDiameterMm}mm
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SizeRow({ row, selected, onSelect }) {
  return (
    <tr
      onClick={onSelect}
      className="cursor-pointer transition"
      style={selected ? { background: "rgba(249,115,22,0.15)" } : undefined}
    >
      <td className="px-3 py-2 font-black text-orange-400">{row.holes}</td>
      <td className="px-3 py-2 text-right text-slate-200">{row.lengthMm} mm</td>
      <td className="px-3 py-2 text-right">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black"
          style={selected
            ? { background: "#f97316", color: "#fff" }
            : { background: "rgba(255,255,255,0.08)", color: "#64748b" }
          }>
          {selected ? "✓" : "○"}
        </span>
      </td>
    </tr>
  );
}

function ImplantDetail({ implant, onAddToCanvas, adding }) {
  const [selectedSize, setSelectedSize] = useState(
    implant.sizeTable ? implant.sizeTable.find((s) => s.holes === 8) ?? implant.sizeTable[0] : null,
  );
  const [selectedViewKey, setSelectedViewKey] = useState(implant.views?.[0]?.key || "ap");
  useEffect(() => {
    setSelectedSize(
      implant.sizeTable ? implant.sizeTable.find((s) => s.holes === 8) ?? implant.sizeTable[0] : null,
    );
    setSelectedViewKey(implant.views?.[0]?.key || "ap");
  }, [implant.id, implant.sizeTable, implant.views]);
  const cat = TRAUMA_CATEGORIES.find((c) => c.id === implant.category);
  const selectedView =
    implant.views?.find((view) => view.key === selectedViewKey) ||
    implant.views?.[0] ||
    { key: "ap", label: "AP" };

  return (
    <div className="space-y-4">
      {/* Description */}
      {implant.description && (
        <div className="flex items-start gap-2 rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
          <p className="text-[10px] text-slate-400 leading-relaxed">{implant.description}</p>
        </div>
      )}

      {/* Specs chips */}
      <div className="flex flex-wrap gap-1.5">
        {implant.screwDiameterMm && (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-black"
            style={{ background: `${cat?.color}20`, color: cat?.color }}>
            Screw ⌀ {implant.screwDiameterMm}mm
          </span>
        )}
        {implant.plateWidthMm && (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-black"
            style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>
            Lebar plat {implant.plateWidthMm}mm
          </span>
        )}
        <span className="rounded-full px-2 py-0.5 text-[9px] font-black"
          style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>
          {implant.manufacturer}
        </span>
      </div>

      {implant.views?.length ? (
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            View
          </p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            {implant.views.map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setSelectedViewKey(view.key)}
                className="rounded-xl px-3 py-2 text-[10px] font-black transition"
                style={
                  selectedViewKey === view.key
                    ? { background: `${cat?.color}28`, color: cat?.color, border: `1px solid ${cat?.color}55` }
                    : { color: "#94a3b8", border: "1px solid transparent" }
                }
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Size table */}
      {implant.sizeTable && (
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Pilih Jumlah Lubang
          </p>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">Lubang</th>
                  <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-slate-400">Panjang</th>
                  <th className="px-3 py-2 text-right w-8" />
                </tr>
              </thead>
              <tbody>
                {implant.sizeTable.map((row) => (
                  <SizeRow
                    key={row.holes}
                    row={row}
                    selected={selectedSize?.holes === row.holes}
                    onSelect={() => setSelectedSize(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add to canvas CTA */}
      <button
        type="button"
        disabled={adding}
        onClick={() => onAddToCanvas(implant, selectedSize, selectedView)}
        className="w-full rounded-2xl py-3 text-sm font-black transition active:scale-[0.98] disabled:opacity-60"
        style={{
          background: adding ? "rgba(249,115,22,0.4)" : "rgba(249,115,22,0.85)",
          color: "#fff",
          border: "1px solid rgba(249,115,22,0.50)",
          boxShadow: adding ? "none" : "0 2px 12px rgba(249,115,22,0.30)",
        }}
      >
        {adding ? "Memuat…" : selectedSize
          ? `+ Tambah ke Canvas — ${selectedView.label} · ${selectedSize.holes} lubang (${selectedSize.lengthMm}mm)`
          : "+ Tambah ke Canvas"}
      </button>

      <p className="text-[9px] text-slate-500 text-center">
        Setelah ditambahkan, gunakan Calib/Ruler untuk menyesuaikan skala ke X-ray.
      </p>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function TraumaPlanningPanel({ isOpen, onClose, onAddTraumaLayer }) {
  const [activeCategory, setActiveCategory] = useState("plate");
  const [selectedImplantId, setSelectedImplantId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  const implants = getTraumaByCategory(activeCategory);
  const selectedImplant = TRAUMA_IMPLANTS.find((i) => i.id === selectedImplantId) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    const nextImplants = getTraumaByCategory(activeCategory);
    if (!nextImplants.length) {
      setSelectedImplantId(null);
      return;
    }
    if (!nextImplants.some((implant) => implant.id === selectedImplantId)) {
      setSelectedImplantId(nextImplants[0].id);
    }
  }, [activeCategory, isOpen, selectedImplantId]);

  const handleAddToCanvas = useCallback(
    async (implant, sizeRow, selectedView) => {
      if (!onAddTraumaLayer) return;
      setAdding(true);
      setNotice("");
      try {
        const objectUrl = await getTraumaSvgObjectUrl(implant, sizeRow, selectedView?.key);
        const name = sizeRow
          ? `${implant.name} — ${selectedView?.label || "AP"} — ${sizeRow.holes} lubang`
          : implant.name;
        onAddTraumaLayer({
          imageSrc: objectUrl,
          name,
          physicalWidthMm: selectedView?.physicalWidthMm ?? implant.plateWidthMm ?? null,
          physicalHeightMm: sizeRow?.lengthMm ?? null,
          viewKey: selectedView?.key || "ap",
        });
        setNotice(`"${name}" ditambahkan ke canvas.`);
        onClose();
      } catch {
        setNotice("Gagal memuat SVG implant. Cek koneksi / path file.");
      } finally {
        setAdding(false);
      }
    },
    [onAddTraumaLayer, onClose],
  );

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,560px)] overflow-hidden rounded-t-[24px] rounded-b-[24px] sm:rounded-[24px] flex flex-col"
            style={{
              background: "rgba(10,18,40,0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.30)",
            }}
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{
                background: "rgba(249,115,22,0.18)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "rgba(249,115,22,0.80)", boxShadow: "0 2px 8px rgba(249,115,22,0.30)" }}
              >
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4M9 3v18M9 3l6 6" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-100">Trauma Planning</p>
                <p className="text-[10px] text-orange-400">Template implant trauma — Plate · Nail · Screw</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                <X className="h-4 w-4 text-slate-300" />
              </button>
            </div>

            {/* Category tab bar */}
            <div
              className="flex px-4 pt-3 gap-0.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
            >
              {TRAUMA_CATEGORIES.map((cat) => (
                <CategoryTab
                  key={cat.id}
                  cat={cat}
                  active={activeCategory === cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedImplantId(null);
                  }}
                />
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-5 py-4 space-y-4">
                {/* Notice */}
                <AnimatePresence>
                  {notice && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl px-3 py-2 text-[10px] font-black text-green-400"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
                    >
                      {notice}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Implant list */}
                {implants.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-black text-slate-500">Belum ada template</p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Tambahkan SVG ke /public/implants/trauma/ dan entry di traumaImplants.js
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Template Tersedia
                    </p>
                    {implants.map((implant) => (
                      <ImplantCard
                        key={implant.id}
                        implant={implant}
                        selected={selectedImplantId === implant.id}
                        onClick={() =>
                          setSelectedImplantId(
                            selectedImplantId === implant.id ? null : implant.id,
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Detail panel for selected implant */}
                <AnimatePresence>
                  {selectedImplant && (
                    <motion.div
                      key={selectedImplant.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                    >
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{ border: "1px solid rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.06)" }}
                      >
                        <div
                          className="px-4 py-2.5"
                          style={{ borderBottom: "1px solid rgba(249,115,22,0.15)", background: "rgba(249,115,22,0.10)" }}
                        >
                          <p className="text-[10px] font-black text-orange-400">
                            {selectedImplant.name}
                          </p>
                        </div>
                        <div className="px-4 py-4">
                          <ImplantDetail
                            implant={selectedImplant}
                            onAddToCanvas={handleAddToCanvas}
                            adding={adding}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info */}
                <div
                  className="flex items-start gap-2 rounded-2xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Info className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-0.5" />
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Template SVG dioverlay di atas X-ray sebagai panduan visual. Gunakan kalibrasi untuk menyesuaikan skala ke gambar X-ray. Verifikasi intraoperatif tetap wajib dilakukan oleh dokter bedah.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl py-3 text-xs font-black text-slate-300 transition hover:text-slate-100 active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
