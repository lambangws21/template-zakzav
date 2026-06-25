"use client";
import { useEffect, useState } from "react";
import { SOFT_INSET_CLASS, SOFT_RAISED_CLASS, SOFT_SURFACE_CLASS } from "@/lib/uiTokens";
import Icon from "./Icon";

function getLineLength(line) {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

export const HIP_FUNCTION_SUMMARY_ITEMS = [
  {
    key: "offset",
    label: "Offset",
    shortLabel: "Offset umum",
    activeClass: "text-rose-700",
    detail:
      "Preset garis offset umum untuk membandingkan jarak antar landmark sesuai kebutuhan templating.",
    notice: "Gambar line pada landmark yang ingin dibandingkan.",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — Landmark mekanis: femoral offset (3), acetabular offset (4), hip length (5), LLD (6R/6L)",
  },
  {
    key: "femoralOffset",
    label: "F-Offset",
    shortLabel: "Femoral offset",
    activeClass: "text-emerald-700",
    detail:
      "Femoral offset: jarak terpendek antara pusat rotasi femoral head dan axis longitudinal femur proksimal (Scheerlinck 2010). Mengontrol tegangan & moment arm otot abduktor, beban implant, dan keausan acetabular.",
    notice:
      "Gambar garis dari pusat rotasi femoral head tegak lurus ke axis longitudinal femur.",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — Femoral offset (no.3): jarak horizontal dari pusat rotasi ke axis femur",
  },
  {
    key: "globalOffset",
    label: "G-Offset",
    shortLabel: "Combined offset",
    activeClass: "text-violet-700",
    detail:
      "Combined offset (femoral + acetabular offset): jumlah kedua offset yang mengontrol posisi relatif greater trochanter terhadap pelvis dan tegangan otot gluteal. Digunakan saat restorasi rotasi center asli tidak memungkinkan.",
    notice:
      "Pakai untuk membandingkan combined offset femoral dan acetabular dari pelvis sampai femur.",
    image: "/images/jurnal-scheerlinck/fig6-compensating-offset.jpeg",
    imageCaption: "Fig. 6 — Kompensasi offset: A. Normal, B. Cup medialisasi → femoral offset ditambah, C. Cup tinggi → stem lebih proud",
  },
  {
    key: "lld",
    label: "LLD",
    shortLabel: "Leg length",
    activeClass: "text-orange-700",
    detail:
      "LLD (Leg Length Discrepancy): beda panjang tungkai kiri-kanan diukur dari inferior teardrop ke lantai pada foto AP pelvis berdiri (Scheerlinck 2010). Bandingkan dengan hip length discrepancy untuk menentukan sumber perbedaan.",
    notice:
      "Gambar garis vertikal dari ujung inferior teardrop ke titik referensi yang sama di sisi kontralateral.",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — LLD (6R vs 6L): beda jarak inferior teardrop ke garis horizontal referensi",
  },
  {
    key: "interteardrop",
    label: "ITD",
    shortLabel: "Interteardrop line",
    activeClass: "text-teal-700",
    detail:
      "Interteardrop line: garis horizontal referensi yang menghubungkan ujung inferior teardrop kanan dan kiri (Scheerlinck 2010). Digunakan sebagai baseline untuk mengukur acetabular offset dan leg length discrepancy.",
    notice:
      "Gambar garis horizontal melewati ujung inferior kedua teardrop sebagai referensi utama pengukuran.",
    image: "/images/jurnal-scheerlinck/fig1-anatomical-landmarks.jpeg",
    imageCaption: "Fig. 1 — Teardrop (no.6): landmark acetabular inferior sebagai titik referensi garis ITD",
  },
  {
    key: "acetabularOffset",
    label: "A-Off",
    shortLabel: "Acetabular offset",
    activeClass: "text-amber-700",
    detail:
      "Acetabular offset: jarak terpendek antara pusat rotasi acetabulum dan garis tegak lurus interteardrop (Scheerlinck 2010). Mengontrol tegangan otot abduktor, lever arm beban tubuh, dan beban pada acetabulum.",
    notice:
      "Gambar garis dari pusat rotasi acetabular tegak lurus ke garis interteardrop.",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — Acetabular offset (no.4): jarak pusat rotasi acetabulum ke garis vertikal interteardrop",
  },
  {
    key: "hipLength",
    label: "H-Len",
    shortLabel: "Hip length",
    activeClass: "text-sky-700",
    detail:
      "Hip length: jarak dari ujung inferior teardrop ke titik referensi pada femur proksimal, misal batas atas lesser trochanter (Scheerlinck 2010). Digunakan untuk menilai leg length discrepancy pada level sendi panggul saja, terpisah dari LLD tungkai total.",
    notice:
      "Gambar garis dari ujung inferior teardrop ke titik referensi pada femur proksimal (misal: upper border lesser trochanter).",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — Hip length (no.5): dari inferior teardrop ke upper border lesser trochanter",
  },
  {
    key: "headDiameter",
    label: "Head-D",
    shortLabel: "Diameter kepala femur",
    activeClass: "text-pink-700",
    detail:
      "Diameter kepala femur: garis melalui titik terlebar kepala femur. Midpoint garis = Hip Rotation Centre (HRC/FRC). Nilai diameter digunakan untuk memilih ukuran kepala implan. Ditandai dengan crosshair (+) di titik tengah (HRC) dan tick mark di ujung.",
    notice:
      "Gambar garis dari tepi kepala femur satu sisi ke tepi sisi berlawanan, melewati titik terlebar. Titik tengah otomatis = HRC.",
    image: "/images/jurnal-scheerlinck/fig5-templating-rotation-centre.jpeg",
    imageCaption: "Fig. 5 — FRC (Femoral Rotation Centre): pusat kepala femur, basis templating rotasi implan",
  },
  {
    key: "femurAxis",
    label: "Fem-Axis",
    shortLabel: "Longitudinal axis femur proksimal",
    activeClass: "text-indigo-700",
    detail:
      "Longitudinal axis femur proksimal: garis sepanjang sumbu shaft femur. Digunakan untuk menghitung femoral offset secara presisi — jarak tegak lurus dari HRC (titik tengah Head-D) ke axis ini. Ditandai dengan ujung panah di kedua arah.",
    notice:
      "Gambar garis sepanjang sumbu medullary canal femur proksimal. Gunakan bersama Head-D untuk kalkulasi femoral offset otomatis.",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    imageCaption: "Fig. 3 — Sumbu femur (no.2): longitudinal axis femur proksimal untuk referensi offset",
  },
];

export const HIP_FUNCTION_SUMMARY_BY_KEY = HIP_FUNCTION_SUMMARY_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {},
);

// ── TKA Planning Items ────────────────────────────────────────────────────────
export const TKA_PLANNING_ITEMS = [
  {
    key: "mechanicalAxis",
    label: "Mech Axis",
    shortLabel: "Mechanical axis femur",
    color: "#0891b2",
    detail: "Mechanical axis femur: garis dari center femoral head ke center intercondylar notch. Digunakan sebagai referensi utama untuk menentukan sudut valgus distal femoral cut. Normal alignment adalah 5°–7° valgus dari axis anatomis.",
  },
  {
    key: "distalFemoralCut",
    label: "Distal Cut",
    shortLabel: "Distal femoral cut 5°–7° valgus",
    color: "#7c3aed",
    detail: "Distal femoral cut: potongan tegak lurus mechanical axis femur, dengan koreksi valgus 5°–7° dari axis anatomis. Tujuan: restorasi joint line dan alignment mekanis. Gunakan line guide valgus dari mechanical axis sebagai referensi.",
  },
  {
    key: "tibialAxis",
    label: "Tib Axis",
    shortLabel: "Tibial mechanical axis",
    color: "#059669",
    detail: "Tibial mechanical axis: garis dari center tibial plateau ke center ankle (talus). Tibial cut harus tegak lurus sumbu ini pada bidang koronal. Pada bidang sagital, posterior slope 3°–7° (rata-rata 5°) direkomendasikan.",
  },
  {
    key: "tibialSlope",
    label: "Slope",
    shortLabel: "Posterior tibial slope 3°–7°",
    color: "#d97706",
    detail: "Posterior tibial slope: kemiringan plateau tibia ke posterior pada bidang sagital. Normal 3°–7°. Slope berlebih meningkatkan risiko fleksi implan dan wear anterior PE. Slope kurang meningkatkan risiko kekakuan.",
  },
  {
    key: "jointLine",
    label: "Joint Line",
    shortLabel: "Level garis sendi",
    color: "#dc2626",
    detail: "Joint line: garis yang menghubungkan ujung kondilus femur distal. Restorasi joint line penting untuk keseimbangan fleksi-ekstensi. Perubahan > 5mm dari normal memengaruhi kinematik dan fungsi pasca TKA.",
  },
  {
    key: "anatomicAxis",
    label: "Anat Axis",
    shortLabel: "Anatomic axis femur",
    color: "#6366f1",
    detail: "Anatomic axis (medullary axis): sumbu shaft femur diafisis. Sudut antara anatomic axis dan mechanical axis (anatomico-mechanical angle) rata-rata 5°–7° dan digunakan untuk menentukan besarnya koreksi valgus distal femoral cut.",
  },
];

// ── Hip Planning Wizard Steps ─────────────────────────────────────────────────
const HIP_WIZARD_STEPS = [
  {
    key: "interteardrop",
    shortLabel: "ITD",
    label: "Interteardrop Line (ITD)",
    instruction: "Tarik garis dari titik 6 kiri ke 6 kanan.\nIkuti garis I di gambar — baseline semua pengukuran.",
    tip: "I = garis ITD · 6 = teardrop (titik awal & akhir)",
    image: "/images/jurnal-scheerlinck/fig1-anatomical-landmarks.jpeg",
    caption: "Fig. 1 — I: Garis horizontal melewati titik 6 (teardrop) kiri & kanan",
    color: "#0d9488",
    needCount: 1,
    countType: "interteardrop",
  },
  {
    key: "hipLength",
    shortLabel: "H-Len",
    label: "Hip Length — 2 Sisi (H-Len)",
    instruction: "Tarik 2 garis vertikal mengikuti panah 5:\n① Dari garis ITD → ke titik 1 kanan\n② Dari garis ITD → ke titik 1 kiri\nSelisih = LLD (6R − 6L)",
    tip: "1 = pusat caput · 5 = Hip Length · 6R/6L = LLD",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    caption: "Fig. 3 — 5: Hip Length dari ITD ke 1 (pusat caput femur), kiri & kanan",
    color: "#0284c7",
    needCount: 2,
    countType: "hipLength",
  },
  {
    key: "headDiameter",
    shortLabel: "Head-D",
    label: "Diameter Kepala Femur (Head-D)",
    instruction: "Tarik garis dari tepi kiri ke tepi kanan kepala femur.\nMidpoint otomatis = HRC (Hip Rotation Centre).\nGambar di kedua sisi untuk perbandingan.",
    tip: "FRC = titik tengah garis ini · panjang = diameter kepala",
    image: "/images/jurnal-scheerlinck/fig5-templating-rotation-centre.jpeg",
    caption: "Fig. 5 — FRC: pusat kepala femur, otomatis terdeteksi dari midpoint garis Head-D",
    color: "#ec4899",
    needCount: 1,
    countType: "headDiameter",
  },
  {
    key: "femurAxis",
    shortLabel: "Fem-Axis",
    label: "Longitudinal Axis Femur (Fem-Axis)",
    instruction: "Tarik garis sepanjang sumbu shaft femur.\nIkuti garis 2 di gambar — dari proksimal ke distal.\nF-Off = jarak tegak lurus HRC ke axis ini (otomatis).",
    tip: "2 = sumbu shaft · F-Off dihitung otomatis dari HRC ke axis",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    caption: "Fig. 3 — 2: Longitudinal axis femur proksimal, referensi femoral offset presisi",
    color: "#6366f1",
    needCount: 1,
    countType: "femurAxis",
  },
  {
    key: "acetabularOffset",
    shortLabel: "A-Off",
    label: "Acetabular Offset (A-Off)",
    instruction: "Tarik garis horizontal mengikuti panah 4:\nDari midline pelvis → ke titik 1 (pusat acetabulum).\nG-Off = F-Off (otomatis) + A-Off.",
    tip: "4 = Acetabular Offset · dari midline ke 1 pusat acetabulum",
    image: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
    caption: "Fig. 3 — 4: Acetabular Offset dari midline ke 1 (pusat acetabulum)",
    color: "#d97706",
    needCount: 1,
    countType: "acetabularOffset",
  },
  {
    key: "done",
    shortLabel: "✓",
    label: "Planning Selesai!",
    instruction: "Semua line selesai!\nF-Off dihitung otomatis dari HRC → Fem-Axis.\nLLD, G-Off, & Head size tampil di panel.",
    tip: "Geser ujung line → nilai kalkulasi update real-time",
    image: "/images/jurnal-scheerlinck/fig5-templating-rotation-centre.jpeg",
    caption: "Fig. 5 — FRC & ARC: acuan templating posisi implan",
    color: "#8b5cf6",
    needCount: 0,
    countType: null,
    isDone: true,
  },
];

export function HipPlanningWizard({ lines, onSelectPreset, onClose, mmPerPixel, measurementUnit }) {
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // ── helpers ────────────────────────────────────────────────────────────────
  const getCount = (type) =>
    type ? lines.filter((l) => l.type === type).length : 0;
  const isStepComplete = (s) =>
    s.isDone ? true : getCount(s.countType) >= s.needCount;

  const fmtPx = (px) => {
    if (px === null || px === undefined) return "—";
    if (mmPerPixel) {
      const mm = px * mmPerPixel;
      return measurementUnit === "cm"
        ? `${(mm / 10).toFixed(2)} cm`
        : `${mm.toFixed(1)} mm`;
    }
    return `${Math.round(px)} px`;
  };

  // ── auto group center: pisah L/R berdasarkan x-midpoint ITD atau canvas ──
  const byType = (type) => lines.filter((l) => l.type === type);
  const itdLine = byType("interteardrop")[0];
  const centerX = itdLine
    ? (itdLine.x1 + itdLine.x2) / 2
    : null;

  const groupLR = (arr) => {
    if (arr.length === 0) return { L: null, R: null, all: [] };
    const sorted = [...arr].sort((a, b) => (a.x1 + a.x2) / 2 - (b.x1 + b.x2) / 2);
    if (sorted.length === 1) {
      const midX = (sorted[0].x1 + sorted[0].x2) / 2;
      const side = centerX !== null
        ? midX < centerX ? "L" : "R"
        : "L";
      return { L: side === "L" ? sorted[0] : null, R: side === "R" ? sorted[0] : null, all: sorted };
    }
    return { L: sorted[0], R: sorted[sorted.length - 1], all: sorted };
  };

  const hLen  = groupLR(byType("hipLength"));
  const fOff  = groupLR(byType("femoralOffset"));
  const aOff  = groupLR(byType("acetabularOffset"));
  const gOff  = groupLR(byType("globalOffset"));

  const hLenLpx = hLen.L ? getLineLength(hLen.L) : null;
  const hLenRpx = hLen.R ? getLineLength(hLen.R) : null;
  const lldPx   = hLenLpx !== null && hLenRpx !== null ? Math.abs(hLenRpx - hLenLpx) : null;
  const lldSide  = hLenLpx !== null && hLenRpx !== null
    ? hLenRpx > hLenLpx ? "R > L" : hLenRpx < hLenLpx ? "L > R" : "="
    : null;

  const gOffLpx = gOff.L ? getLineLength(gOff.L)
    : (fOff.L && aOff.L ? getLineLength(fOff.L) + getLineLength(aOff.L) : null);
  const gOffRpx = gOff.R ? getLineLength(gOff.R)
    : (fOff.R && aOff.R ? getLineLength(fOff.R) + getLineLength(aOff.R) : null);
  const deltaGOff = gOffLpx !== null && gOffRpx !== null ? Math.abs(gOffRpx - gOffLpx) : null;

  const hasAnyLine = byType("interteardrop").length + byType("hipLength").length +
    byType("femoralOffset").length + byType("acetabularOffset").length +
    byType("globalOffset").length > 0;

  // ── wizard state ──────────────────────────────────────────────────────────
  const current = HIP_WIZARD_STEPS[step];
  const currentDone = isStepComplete(current);
  const allMeasurementsDone = HIP_WIZARD_STEPS.filter((s) => !s.isDone).every(isStepComplete);

  useEffect(() => {
    if (currentDone && !current.isDone && step < HIP_WIZARD_STEPS.length - 1) {
      const t = setTimeout(() => setStep((s) => s + 1), 700);
      return () => clearTimeout(t);
    }
  }, [currentDone, current.isDone, step]);

  useEffect(() => {
    const firstIncomplete = HIP_WIZARD_STEPS.findIndex(
      (s) => !s.isDone && getCount(s.countType) < s.needCount,
    );
    if (firstIncomplete !== -1 && firstIncomplete < step) {
      setStep(firstIncomplete);
    }
  }, [lines]);

  // ── render ────────────────────────────────────────────────────────────────
  const C = { itd:"#0d9488", hLen:"#0284c7", lld:"#ef4444", fOff:"#10b981", aOff:"#d97706", gOff:"#8b5cf6" };

  const ResultRow = ({ label, color, value, note, highlight }) => (
    <div className={`flex items-center justify-between gap-1 py-[2px] text-[9px] ${highlight ? "font-bold" : ""}`}>
      <span className="flex items-center gap-1 text-slate-500">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        {label}
        {note && <span className="text-[8px] text-slate-400">({note})</span>}
      </span>
      <span className="font-mono font-bold" style={{ color: highlight ? "#ef4444" : color }}>{value}</span>
    </div>
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.16)]">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-white uppercase">
          <Icon name="target" className="h-3.5 w-3.5 text-rose-400" />
          Panduan Hip Planning
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-slate-400 transition hover:text-white">
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-3 pt-2.5 pb-1">
        {HIP_WIZARD_STEPS.map((s, i) => (
          <button
            key={s.key}
            title={s.label}
            onClick={() => setStep(i)}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i === step ? current.color : isStepComplete(s) ? "#34d399" : "#e2e8f0",
              transform: i === step ? "scaleY(1.5)" : "scaleY(1)",
            }}
          />
        ))}
      </div>

      {/* Gambar jurnal */}
      <div className="mx-3 mt-2 overflow-hidden rounded-xl border border-slate-100">
        <img src={current.image} alt={current.caption} className="max-h-[22rem] w-full object-contain" />
        <p className="bg-slate-50/80 px-2 py-1 text-[8px] italic leading-snug text-slate-400">
          {current.caption}
        </p>
      </div>

      {/* Konten step */}
      <div className="px-3 pt-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: current.color }}>
            {step + 1}/{HIP_WIZARD_STEPS.length}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold leading-tight" style={{ color: current.color }}>
              {current.label}
            </div>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-slate-600">
              {current.instruction}
            </p>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[9px] leading-snug text-slate-500">
          💡 {current.tip}
        </div>

        {/* Status line */}
        {!current.isDone && (
          <div className={`mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors duration-300 ${currentDone ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
            <span>{currentDone ? "✅" : "⬜"}</span>
            <span>
              {currentDone
                ? `${getCount(current.countType)} line ${current.shortLabel} sudah tergambar`
                : `Butuh ${current.needCount} line ${current.shortLabel} — sekarang: ${getCount(current.countType)}`}
            </span>
          </div>
        )}

        {/* Ringkasan akhir */}
        {current.isDone && (
          <div className={`mt-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${allMeasurementsDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {allMeasurementsDone
              ? "✅ Semua pengukuran lengkap!"
              : "⚠️ Ada langkah yang belum selesai."}
          </div>
        )}

        {/* ── Hasil Panel (collapsible) ─────────────────────────────────── */}
        {hasAnyLine && (
          <div className="mt-2">
            <button
              onClick={() => setShowResults((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-bold text-slate-600 transition hover:bg-slate-200"
            >
              <span className="flex items-center gap-1.5">
                <span>📊</span>
                <span>Lihat Hasil</span>
                {!mmPerPixel && <span className="rounded bg-amber-100 px-1 text-[7px] text-amber-600">px</span>}
              </span>
              <span>{showResults ? "▲" : "▼"}</span>
            </button>

            {showResults && (
              <div className="mt-1.5 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/60 px-2.5 py-2">
                {/* Auto group center — center dari ITD */}
                {itdLine && (
                  <div className="mb-1 rounded bg-teal-50 px-2 py-1 text-[8px] text-teal-700">
                    ⊕ Center X dari ITD: {Math.round((itdLine.x1 + itdLine.x2) / 2)} px
                    {" — "}kiri/kanan ditentukan otomatis
                  </div>
                )}

                {/* ITD */}
                {byType("interteardrop").map((l) => (
                  <ResultRow key={l.id} label="ITD" color={C.itd} value={fmtPx(getLineLength(l))} />
                ))}

                {/* H-Len L / R + LLD */}
                {(hLen.L || hLen.R) && (
                  <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-2 py-1.5">
                    <div className="mb-1 text-[8px] font-extrabold text-sky-700 uppercase">Hip Length</div>
                    {hLen.L && <ResultRow label="H-Len L" color={C.hLen} value={fmtPx(hLenLpx)} />}
                    {hLen.R && <ResultRow label="H-Len R" color={C.hLen} value={fmtPx(hLenRpx)} />}
                    {lldPx !== null && (
                      <>
                        <div className="my-1 border-t border-sky-200/60" />
                        <ResultRow
                          label="LLD"
                          color={C.lld}
                          value={fmtPx(lldPx)}
                          note={lldSide}
                          highlight={mmPerPixel ? lldPx * mmPerPixel > 10 : false}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* F-Off / A-Off / G-Off */}
                {(fOff.L || fOff.R || aOff.L || aOff.R || gOff.L || gOff.R) && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1.5">
                    <div className="mb-1 text-[8px] font-extrabold text-emerald-700 uppercase">Offset</div>
                    {fOff.L && <ResultRow label="F-Off L" color={C.fOff} value={fmtPx(getLineLength(fOff.L))} />}
                    {fOff.R && <ResultRow label="F-Off R" color={C.fOff} value={fmtPx(getLineLength(fOff.R))} />}
                    {aOff.L && <ResultRow label="A-Off L" color={C.aOff} value={fmtPx(getLineLength(aOff.L))} />}
                    {aOff.R && <ResultRow label="A-Off R" color={C.aOff} value={fmtPx(getLineLength(aOff.R))} />}
                    {(gOffLpx !== null || gOffRpx !== null) && (
                      <>
                        <div className="my-1 border-t border-emerald-200/60" />
                        {gOffLpx !== null && <ResultRow label="G-Off L" color={C.gOff} value={fmtPx(gOffLpx)} note={!gOff.L ? "F+A" : undefined} />}
                        {gOffRpx !== null && <ResultRow label="G-Off R" color={C.gOff} value={fmtPx(gOffRpx)} note={!gOff.R ? "F+A" : undefined} />}
                        {deltaGOff !== null && (
                          <ResultRow label="ΔG-Off" color={C.gOff} value={fmtPx(deltaGOff)} highlight={mmPerPixel ? deltaGOff * mmPerPixel > 5 : false} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tombol aksi */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-2.5">
        {!current.isDone && (
          <button
            onClick={() => onSelectPreset(current.key)}
            className="flex-1 rounded-xl py-2 text-[10px] font-black text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: current.color }}
          >
            Gambar {current.shortLabel}
          </button>
        )}
        {current.isDone && (
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-violet-600 py-2 text-[10px] font-black text-white shadow-sm transition hover:bg-violet-700"
          >
            Tutup Panduan ✓
          </button>
        )}
        <div className="flex shrink-0 gap-1">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              ◀
            </button>
          )}
          {step < HIP_WIZARD_STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => Math.min(s + 1, HIP_WIZARD_STEPS.length - 1))}
              className="rounded-xl px-3 py-2 text-[10px] font-bold text-white transition"
              style={{ background: currentDone ? "#334155" : "#cbd5e1", cursor: currentDone ? "pointer" : "default" }}
            >
              {currentDone ? "Lanjut ▶" : "Lewati ▶"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HipPlanningWizardButton({ lines, onSelectPreset, mmPerPixel, measurementUnit }) {
  const [open, setOpen] = useState(false);

  const doneCount = HIP_WIZARD_STEPS.filter(
    (s) => !s.isDone && s.countType && lines.filter((l) => l.type === s.countType).length >= s.needCount,
  ).length;
  const totalSteps = HIP_WIZARD_STEPS.filter((s) => !s.isDone).length;

  if (open) {
    return (
      <div className="mt-2">
        <HipPlanningWizard
          lines={lines}
          onSelectPreset={onSelectPreset}
          onClose={() => setOpen(false)}
          mmPerPixel={mmPerPixel}
          measurementUnit={measurementUnit}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border-2 border-dashed border-rose-300/70 bg-rose-50/60 px-3 py-2.5 text-left transition hover:border-rose-400 hover:bg-rose-50 active:scale-[0.99]"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">📋</span>
        <div>
          <div className="text-[10px] font-black text-rose-800">
            Panduan Step-by-Step
          </div>
          <div className="text-[9px] text-rose-500">
            Ikuti langkah berdasarkan jurnal Scheerlinck 2010
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className={`rounded-full px-1.5 py-0.5 text-[8px] font-black text-white ${
            doneCount === totalSteps ? "bg-emerald-500" : "bg-rose-500"
          }`}
        >
          {doneCount}/{totalSteps}
        </div>
      </div>
    </button>
  );
}

export function HipFunctionSummaryPanel({
  className = "",
  compact = false,
  defaultExpanded = false,
  title = "Ringkasan Fungsi HIP",
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [openItemKey, setOpenItemKey] = useState(null);

  return (
    <details
      className={`${SOFT_INSET_CLASS} px-3 py-2 text-slate-700 ${className}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-extrabold tracking-wide text-slate-700 uppercase [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name="target" className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
          <span className="truncate">{title}</span>
        </span>
        <span className={`${SOFT_RAISED_CLASS} shrink-0 px-2 py-1 text-[9px] font-bold text-cyan-700`}>
          Info
        </span>
      </summary>
      <div
        className={`mt-2 grid gap-1.5 ${
          compact ? "grid-cols-1" : "sm:grid-cols-2"
        }`}
      >
        {HIP_FUNCTION_SUMMARY_ITEMS.map((item) => {
          const itemOpen = openItemKey === item.key;
          return (
            <div
              key={`hip-summary-${item.key}`}
              className={`${SOFT_SURFACE_CLASS} overflow-hidden px-2.5 py-2`}
            >
              <button
                type="button"
                onClick={() => setOpenItemKey(itemOpen ? null : item.key)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className={`text-[10px] font-extrabold ${item.activeClass}`}>
                  {item.label}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[9px] font-bold text-slate-500">
                    {item.shortLabel}
                  </span>
                  <span className={`shrink-0 text-[8px] font-black transition-transform duration-200 ${itemOpen ? "rotate-180" : ""} text-slate-400`}>
                    ▾
                  </span>
                </span>
              </button>
              {itemOpen && (
                <div className="mt-1.5 border-t border-slate-200/60 pt-1.5 space-y-2">
                  <p className="text-[10px] leading-4 text-slate-600">
                    {item.detail}
                  </p>
                  {item.image && (
                    <div className="overflow-hidden rounded-lg border border-slate-200/70">
                      <img
                        src={item.image}
                        alt={item.imageCaption || item.shortLabel}
                        className="w-full object-contain"
                        loading="lazy"
                      />
                      {item.imageCaption && (
                        <p className="bg-slate-50 px-2 py-1 text-[9px] leading-3.5 text-slate-500 italic">
                          {item.imageCaption}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[9px] font-semibold text-slate-400 italic">
                    💡 {item.notice}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function TkaSummaryPanel({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openItemKey, setOpenItemKey] = useState(null);
  return (
    <details
      className={`${SOFT_INSET_CLASS} px-3 py-2 text-slate-700 ${className}`}
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-extrabold tracking-wide text-slate-700 uppercase [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name="activity" className="h-3.5 w-3.5 shrink-0 text-violet-700" />
          <span className="truncate">Referensi TKA Planning</span>
        </span>
        <span className={`${SOFT_RAISED_CLASS} shrink-0 px-2 py-1 text-[9px] font-bold text-violet-700`}>Info</span>
      </summary>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {TKA_PLANNING_ITEMS.map((item) => {
          const itemOpen = openItemKey === item.key;
          return (
            <div key={`tka-summary-${item.key}`} className={`${SOFT_SURFACE_CLASS} overflow-hidden px-2.5 py-2`}>
              <button type="button" onClick={() => setOpenItemKey(itemOpen ? null : item.key)} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="text-[10px] font-extrabold" style={{ color: item.color }}>{item.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[9px] font-bold text-slate-500">{item.shortLabel}</span>
                  <span className={`shrink-0 text-[8px] font-black transition-transform duration-200 ${itemOpen ? "rotate-180" : ""} text-slate-400`}>▾</span>
                </span>
              </button>
              {itemOpen && (
                <div className="mt-1.5 border-t border-slate-200/60 pt-1.5">
                  <p className="text-[10px] leading-4 text-slate-600">{item.detail}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
