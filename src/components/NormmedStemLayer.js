"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, Layers, Info, X } from "lucide-react";

// ── Stem data from Normmed catalog ─────────────────────────────────────────────
// All measurements in mm
// stemI  = Stem Length I (overall)
// stemII = Stem Length II (intramedullary)
// apW    = A/P Width (anterior-posterior diameter)
// mlW    = M/L Width (medial-lateral at collar)

const NORMMED_CEMENTLESS = [
  { id: "S1-L1",   label: "S1 / L1",   stemI: 132.70, stemII: 115.45, apW: 5.75,  mlW: 29.1 },
  { id: "S2-L2",   label: "S2 / L2",   stemI: 136.80, stemII: 119.55, apW: 6.75,  mlW: 30.6 },
  { id: "S3-L3",   label: "S3 / L3",   stemI: 140.90, stemII: 123.65, apW: 7.75,  mlW: 32.1 },
  { id: "S4-L4",   label: "S4 / L4",   stemI: 144.90, stemII: 127.65, apW: 8.75,  mlW: 33.6 },
  { id: "S5-L5",   label: "S5 / L5",   stemI: 148.90, stemII: 131.65, apW: 9.35,  mlW: 35.1 },
  { id: "S6-L6",   label: "S6 / L6",   stemI: 152.90, stemII: 135.65, apW: 10.00, mlW: 36.5 },
  { id: "S7-L7",   label: "S7 / L7",   stemI: 156.90, stemII: 139.65, apW: 10.55, mlW: 37.9 },
  { id: "S8-L8",   label: "S8 / L8",   stemI: 160.70, stemII: 143.75, apW: 11.10, mlW: 38.9 },
  { id: "S9-L9",   label: "S9 / L9",   stemI: 164.70, stemII: 148.25, apW: 11.70, mlW: 39.4 },
  { id: "S10-L10", label: "S10 / L10", stemI: 168.70, stemII: 153.25, apW: 12.40, mlW: 39.9 },
];

const NORMMED_CEMENTED = [
  { id: "S23-L23", label: "S23 / L23", stemI: 132.35, stemII: 115.05, apW: 6.90,  mlW: 32.0 },
  { id: "S24-L24", label: "S24 / L24", stemI: 137.35, stemII: 120.00, apW: 7.90,  mlW: 33.6 },
  { id: "S25-L25", label: "S25 / L25", stemI: 142.35, stemII: 125.00, apW: 8.90,  mlW: 35.1 },
  { id: "S26-L26", label: "S26 / L26", stemI: 144.45, stemII: 127.15, apW: 9.35,  mlW: 36.5 },
  { id: "S27-L27", label: "S27 / L27", stemI: 147.35, stemII: 130.00, apW: 9.90,  mlW: 37.9 },
  { id: "S28-L28", label: "S28 / L28", stemI: 150.30, stemII: 132.70, apW: 10.40, mlW: 38.9 },
  { id: "S29-L29", label: "S29 / L29", stemI: 154.35, stemII: 136.75, apW: 10.95, mlW: 39.5 },
  { id: "S30-L30", label: "S30 / L30", stemI: 160.30, stemII: 142.75, apW: 11.70, mlW: 39.2 },
];

const TYPES = [
  { key: "cementless", label: "Cementless", short: "CL" },
  { key: "cemented",   label: "Cemented",   short: "CM" },
];

// ── SVG generator ──────────────────────────────────────────────────────────────
// Generates a parametric hip stem silhouette in AP view.
// ViewBox uses mm units (1 unit = 1 mm). Output width/height for bitmap rasterisation.
function generateStemSvgDataUri(stem, type) {
  const W  = stem.mlW;
  const H  = stem.stemI;
  const cX = W / 2;

  // Collar is the extra-medullary portion
  const collarH = stem.stemI - stem.stemII;

  // Shaft widths in mm
  const shaftTopW = W * 0.44;   // at metaphyseal-diaphyseal junction
  const tipW      = Math.max(stem.apW * 1.3, W * 0.09);

  // Collar bottom Y (80% of collarH for a moderate collar depth)
  const collarBottomY = collarH * 0.8;
  // Flare transition Y (slightly below collar bottom)
  const flareY = collarH + collarH * 0.25;
  const ctrlPush = W * 0.12;  // bezier control-point lateral push

  let pathD = "";

  if (type === "cementless") {
    // Collar top → right side → smooth metaphyseal flare → tapered shaft → rounded tip → mirror left
    pathD = [
      `M 0,0`,
      `L ${W},0`,
      `L ${W},${collarBottomY}`,
      // Right metaphyseal flare (cubic bezier)
      `C ${W + ctrlPush * 0.3},${flareY} ${cX + shaftTopW / 2 + ctrlPush * 0.5},${flareY} ${cX + shaftTopW / 2},${flareY}`,
      // Right diaphyseal shaft (straight)
      `L ${cX + tipW / 2},${H - tipW * 0.25}`,
      // Rounded tip (quadratic bezier)
      `Q ${cX},${H + tipW * 0.15} ${cX - tipW / 2},${H - tipW * 0.25}`,
      // Left diaphyseal shaft
      `L ${cX - shaftTopW / 2},${flareY}`,
      // Left metaphyseal flare (cubic bezier)
      `C ${cX - shaftTopW / 2 - ctrlPush * 0.5},${flareY} ${-ctrlPush * 0.3},${flareY} 0,${collarBottomY}`,
      `Z`,
    ].join(" ");
  } else {
    // Cemented: smooth polished taper — no distinct collar, gentle proximal flare
    const proxW    = W * 0.82;   // proximal width (slightly less than mlW — no collar lip)
    const midFlareY = H * 0.22;  // transition zone Y

    pathD = [
      `M ${cX - proxW / 2},0`,
      `L ${cX + proxW / 2},0`,
      // Right smooth taper (cubic bezier from proximal to mid-shaft)
      `C ${cX + proxW / 2 + ctrlPush},${midFlareY} ${cX + shaftTopW / 2 + ctrlPush * 0.4},${midFlareY} ${cX + shaftTopW / 2},${H * 0.3}`,
      // Right diaphyseal (straight)
      `L ${cX + tipW / 2},${H - tipW * 0.25}`,
      // Rounded tip
      `Q ${cX},${H + tipW * 0.15} ${cX - tipW / 2},${H - tipW * 0.25}`,
      // Left diaphyseal
      `L ${cX - shaftTopW / 2},${H * 0.3}`,
      // Left smooth taper
      `C ${cX - shaftTopW / 2 - ctrlPush * 0.4},${midFlareY} ${cX - proxW / 2 - ctrlPush},${midFlareY} ${cX - proxW / 2},0`,
      `Z`,
    ].join(" ");
  }

  // Stroke width ~1.8% of mlW (scales nicely across sizes)
  const sw = (W * 0.018).toFixed(2);

  // Crosshatch / surface texture lines (subtle vertical lines along the shaft)
  const textureLines = (() => {
    const lines = [];
    const yStart = type === "cementless" ? flareY + 1 : H * 0.31;
    const yEnd   = H - tipW * 0.3 - 1;
    const nLines = 5;
    for (let i = 1; i <= nLines; i++) {
      const tx = cX - shaftTopW / 2 + (shaftTopW / (nLines + 1)) * i;
      const ratio = i / (nLines + 1);
      const xBot  = cX + (tx - cX) * (tipW / shaftTopW);
      const opacity = 0.12 + ratio * 0.08 * (ratio < 0.5 ? 1 : 2 - ratio * 2);
      lines.push(
        `<line x1="${tx.toFixed(2)}" y1="${yStart.toFixed(2)}" x2="${xBot.toFixed(2)}" y2="${yEnd.toFixed(2)}" stroke="#aaa" stroke-width="${(sw * 0.6).toFixed(2)}" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round"/>`
      );
    }
    return lines.join("\n  ");
  })();

  // Collar step line (cementless only)
  const collarLine = type === "cementless"
    ? `<line x1="0" y1="${collarBottomY.toFixed(2)}" x2="${W}" y2="${collarBottomY.toFixed(2)}" stroke="#666" stroke-width="${(sw * 0.8).toFixed(2)}" stroke-dasharray="${(W * 0.05).toFixed(2)} ${(W * 0.025).toFixed(2)}" stroke-opacity="0.6"/>`
    : "";

  // Render at a fixed pixel size; the workspace calibration will scale it to physical mm
  const RENDER_W = 480;
  const RENDER_H = Math.round(RENDER_W * H / W);

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" width="${RENDER_W}" height="${RENDER_H}">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#b0b8c4"/>
      <stop offset="30%"  stop-color="#d8dde5"/>
      <stop offset="55%"  stop-color="#eef0f3"/>
      <stop offset="75%"  stop-color="#d8dde5"/>
      <stop offset="100%" stop-color="#a8b0bc"/>
    </linearGradient>
  </defs>
  <path d="${pathD}" fill="url(#sg)" stroke="#4a5568" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>
  ${textureLines}
  ${collarLine}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const STYLES = `
  .ns-card {
    background: #eef2f7;
    box-shadow: 5px 5px 14px rgba(148,163,184,0.28), -5px -5px 14px rgba(255,255,255,0.78);
    border: 1px solid rgba(255,255,255,0.78);
    color: #1e293b;
  }
  .ns-soft {
    background: #eef2f7;
    box-shadow: 3px 3px 8px rgba(148,163,184,0.25), -3px -3px 8px rgba(255,255,255,0.78);
    border: 1px solid rgba(255,255,255,0.72);
  }
  .ns-inset {
    background: #edf1f6;
    box-shadow: inset 2.5px 2.5px 6px rgba(148,163,184,0.28), inset -2.5px -2.5px 6px rgba(255,255,255,0.86);
    border: 1px solid rgba(255,255,255,0.82);
  }
  .ns-active {
    background: #1f2937;
    color: #ffffff;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.28), 2px 2px 7px rgba(30,41,59,0.16);
    border-color: rgba(15,23,42,0.6);
  }
  .ns-hi { color: #0f172a; }
  .ns-md { color: #475569; }
  .ns-lo { color: #94a3b8; }
  .ns-divider { border-color: rgba(203,213,225,0.35); }
  .ns-metric {
    background: rgba(255,255,255,0.42);
    border: 1px solid rgba(255,255,255,0.65);
    box-shadow: inset 1.5px 1.5px 3px rgba(148,163,184,0.16), inset -1.5px -1.5px 3px rgba(255,255,255,0.76);
  }
  .ns-btn-use {
    border: 1px solid #6ee7b7;
    background: rgba(209,250,229,0.80);
    color: #065f46;
    box-shadow: 3px 3px 8px rgba(16,185,129,0.14), -3px -3px 8px rgba(255,255,255,0.78);
  }
  .ns-btn-use:hover:not(:disabled) { background: rgba(187,247,208,0.9); }
  .ns-btn-use:disabled { opacity: 0.45; cursor: not-allowed; }

  [data-theme="dark"] .ns-card {
    background: rgba(15,23,42,0.92);
    box-shadow: 4px 4px 18px rgba(0,0,0,0.55), -2px -2px 8px rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    color: #e2e8f0;
  }
  [data-theme="dark"] .ns-soft {
    background: rgba(30,41,59,0.80);
    box-shadow: 3px 3px 8px rgba(0,0,0,0.40), -2px -2px 6px rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.09);
  }
  [data-theme="dark"] .ns-inset {
    background: rgba(8,14,28,0.70);
    box-shadow: inset 2px 2px 6px rgba(0,0,0,0.50), inset -1px -1px 4px rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
  }
  [data-theme="dark"] .ns-active {
    background: rgba(14,165,233,0.18);
    color: #38bdf8;
    box-shadow: inset 1px 1px 4px rgba(0,0,0,0.35);
    border-color: rgba(14,165,233,0.35);
  }
  [data-theme="dark"] .ns-hi { color: #f1f5f9; }
  [data-theme="dark"] .ns-md { color: #94a3b8; }
  [data-theme="dark"] .ns-lo { color: #475569; }
  [data-theme="dark"] .ns-divider { border-color: rgba(255,255,255,0.08); }
  [data-theme="dark"] .ns-metric {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: none;
  }
  [data-theme="dark"] .ns-btn-use {
    border: 1px solid rgba(52,211,153,0.30);
    background: rgba(6,78,59,0.55);
    color: #6ee7b7;
    box-shadow: 0 2px 10px rgba(16,185,129,0.18);
  }
  [data-theme="dark"] .ns-btn-use:hover:not(:disabled) { background: rgba(6,78,59,0.75); }
`;

// ── Sub-components ─────────────────────────────────────────────────────────────
function Pill({ label, value, unit = "mm" }) {
  const display = value !== null && value !== undefined ? `${value}${unit}` : "—";
  return (
    <div className="ns-metric min-w-0 rounded-2xl px-3 py-2">
      <div className="ns-lo text-[9px] font-black tracking-widest uppercase">{label}</div>
      <div className="ns-hi truncate text-[11px] font-extrabold">{display}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NormmedStemLayer({
  onUseSelected,
  calibrated = false,
  disabled  = false,
  compact   = false,
  showClose = false,
  onClose,
  className = "",
}) {
  const [stemType, setStemType] = useState("cementless");
  const [stemId,   setStemId]   = useState(NORMMED_CEMENTLESS[0].id);

  const stemList = stemType === "cementless" ? NORMMED_CEMENTLESS : NORMMED_CEMENTED;

  const selectedStem = useMemo(
    () => stemList.find((s) => s.id === stemId) || stemList[0],
    [stemList, stemId],
  );

  const handleTypeChange = useCallback((type) => {
    setStemType(type);
    const list = type === "cementless" ? NORMMED_CEMENTLESS : NORMMED_CEMENTED;
    setStemId(list[0].id);
  }, []);

  const handleUse = useCallback(() => {
    if (!selectedStem || disabled) return;
    const svgSrc = generateStemSvgDataUri(selectedStem, stemType);
    onUseSelected?.({
      imageSrc:        svgSrc,
      physicalWidthMm: selectedStem.mlW,
      physicalHeightMm: selectedStem.stemI,
      label: `Normmed ${stemType === "cementless" ? "Cementless" : "Cemented"} ${selectedStem.label}`,
      stemData: { ...selectedStem, type: stemType },
    });
  }, [disabled, onUseSelected, selectedStem, stemType]);

  const collarH = selectedStem ? (selectedStem.stemI - selectedStem.stemII).toFixed(2) : "—";

  return (
    <section className={`ns-card w-full rounded-[30px] p-4 ${compact ? "space-y-3" : "space-y-4"} ${className}`}>
      <style>{STYLES}</style>

      {/* Header */}
      <div className="ns-divider flex items-start justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="ns-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-cyan-500">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="ns-hi truncate text-xs font-black tracking-wider uppercase">
              {compact ? "Normmed" : "Normmed Stem"}
            </h2>
            <p className="ns-lo mt-0.5 truncate text-[9px] font-extrabold tracking-wider uppercase">
              Digital Template
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!calibrated && (
            <span className="ns-soft flex h-9 w-9 items-center justify-center rounded-full text-amber-500" title="Kalibrasi belum dilakukan — ukuran layer mungkin tidak akurat">
              <Info className="h-4 w-4" />
            </span>
          )}
          {showClose && (
            <button type="button" onClick={onClose} className="ns-soft flex h-9 w-9 items-center justify-center rounded-full" aria-label="Tutup">
              <X className="ns-md h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Type selector */}
      <div className="ns-inset grid grid-cols-2 gap-1.5 rounded-2xl p-1.5">
        {TYPES.map(({ key, label, short }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTypeChange(key)}
            className={`min-h-10 rounded-xl px-2 text-[10px] font-black uppercase transition-all ${
              stemType === key ? "ns-active" : "ns-soft ns-md"
            }`}
          >
            {compact ? short : label}
          </button>
        ))}
      </div>

      {/* Size selector */}
      <label className="block space-y-1.5">
        <span className="ns-lo px-1 text-[10px] font-black tracking-widest uppercase">Ukuran Stem</span>
        <div className="relative">
          <select
            value={selectedStem?.id || ""}
            onChange={(e) => setStemId(e.target.value)}
            className="ns-inset ns-hi w-full cursor-pointer appearance-none rounded-2xl px-3 py-3 pr-9 text-xs font-bold outline-none"
            style={{ colorScheme: "auto" }}
          >
            {stemList.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="ns-md pointer-events-none absolute top-3.5 right-3.5 h-4 w-4" />
        </div>
      </label>

      {/* Measurements */}
      {selectedStem && (
        <div className="grid grid-cols-2 gap-2">
          <Pill label="Stem I"    value={selectedStem.stemI}  />
          <Pill label="Stem II"   value={selectedStem.stemII} />
          <Pill label="A/P Width" value={selectedStem.apW}    />
          <Pill label="M/L Width" value={selectedStem.mlW}    />
        </div>
      )}

      {/* Collar derived info */}
      {!compact && selectedStem && (
        <div className="ns-inset rounded-2xl px-3 py-2.5">
          <p className="ns-lo text-[9px] font-black tracking-widest uppercase">Extra-Med (Collar)</p>
          <p className="ns-hi text-[11px] font-extrabold">{collarH} mm</p>
          <p className="ns-md mt-1 text-[9px]">
            {stemType === "cementless" ? "Collar + metaphyseal flare" : "Proximal polished taper"}
          </p>
        </div>
      )}

      {/* SVG preview */}
      {!compact && selectedStem && (
        <div className="ns-inset flex items-center justify-center rounded-2xl p-3" style={{ minHeight: 80 }}>
          <img
            src={generateStemSvgDataUri(selectedStem, stemType)}
            alt={`Normmed ${stemType} ${selectedStem.label}`}
            style={{ maxHeight: 100, maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {/* Use button */}
      <button
        type="button"
        onClick={handleUse}
        disabled={disabled || !selectedStem}
        className="ns-btn-use w-full rounded-2xl py-3 text-[11px] font-black uppercase tracking-wider transition-all"
      >
        Gunakan Stem
      </button>

      {!calibrated && !compact && (
        <p className="ns-lo text-center text-[9px] leading-tight">
          Kalibrasi X-ray terlebih dahulu agar ukuran layer sesuai fisik
        </p>
      )}
    </section>
  );
}
