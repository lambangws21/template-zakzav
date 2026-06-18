"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HEAD_NECK_OPTIONS,
  buildStemVisualMapping,
  getAvailableStemSizes,
  getNearestStemByCanalMm,
} from "../lib/zimmerStemMapping";

const OFFSET_OPTIONS = [
  { value: "standard", label: "Standard Offset" },
  { value: "extended", label: "Extended Offset" },
];

const NECK_VARIANT_OPTIONS = [
  { value: "normal", label: "Normal Neck" },
  { value: "reduced", label: "Reduced Neck Length" },
];

const STEM_SVG_URL = "/implants/stem-mltaper.svg";
const STEM_SVG_SIZES = [4, 5, 6, 7.5, 9, 10, 11, 12.5];

const ZIMMER_STEM_SILHOUETTE_PATH = `
M 269 132
L 223 177
L 226 187
L 295 251
L 333 304
L 339 351
L 394 479
L 420 589
L 441 962
L 449 985
L 478 1001
L 505 987
L 511 974
L 522 872
L 533 592
L 539 587
L 546 465
L 523 347
L 494 243
L 418 241
L 345 196
L 303 154
Z
`;

function getStemSvgSize(stemSizeMm) {
  const size = Number(stemSizeMm);
  if (!Number.isFinite(size)) return 10;
  let best = STEM_SVG_SIZES[0];
  for (const candidate of STEM_SVG_SIZES) {
    if (candidate <= size) best = candidate;
  }
  return best;
}

function getInkscapeLabel(node) {
  return node.getAttribute("inkscape:label") || node.getAttribute("label") || "";
}

function buildFilteredStemSvg(svgText, { stemSizeMm, offsetType }) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg || doc.querySelector("parsererror")) return "";

  const visualSize = getStemSvgSize(stemSizeMm);
  const visualSizeLabel = `sz${visualSize}`;
  const offsetLayer = offsetType === "extended" ? "exts" : "std";

  doc.querySelectorAll("script, foreignObject, sodipodi\\:namedview").forEach((node) => node.remove());

  doc.querySelectorAll("g").forEach((group) => {
    const groupLabel = getInkscapeLabel(group);
    if (groupLabel === "std" || groupLabel === "exts") {
      group.style.display = groupLabel === offsetLayer ? "inline" : "none";
    }

    if (["body-stem", "distal-stem", "std", "exts"].includes(groupLabel)) {
      group.querySelectorAll("path").forEach((path) => {
        const pathLabel = getInkscapeLabel(path);
        if (pathLabel && pathLabel !== visualSizeLabel) {
          path.style.display = "none";
        } else if (pathLabel === visualSizeLabel) {
          path.style.display = "inline";
          path.removeAttribute("sodipodi:insensitive");
        }
      });
    }
  });

  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Zimmer M/L Taper stem SVG size ${visualSize}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute(
    "style",
    "width:100%;height:auto;max-height:620px;display:block;margin:0 auto;overflow:visible;"
  );

  return new XMLSerializer().serializeToString(svg);
}

function formatMm(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${value} mm`;
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
      >
        {children}
      </select>
    </label>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function ZimmerStemAnimator() {
  const [offsetType, setOffsetType] = useState("standard");
  const [neckVariant, setNeckVariant] = useState("normal");
  const [stemSizeMm, setStemSizeMm] = useState(10);
  const [headNeck, setHeadNeck] = useState("+0");
  const [canalInput, setCanalInput] = useState("12.8");
  const [canalApInput, setCanalApInput] = useState("");
  const [stemSvgMarkup, setStemSvgMarkup] = useState("");

  const availableSizes = useMemo(
    () => getAvailableStemSizes(offsetType, neckVariant),
    [offsetType, neckVariant]
  );

  useEffect(() => {
    if (!availableSizes.includes(Number(stemSizeMm)) && availableSizes.length > 0) {
      setStemSizeMm(availableSizes[0]);
    }
  }, [availableSizes, stemSizeMm]);

  const mapping = useMemo(
    () =>
      buildStemVisualMapping({
        stemSizeMm: Number(stemSizeMm),
        offsetType,
        neckVariant,
        headNeck,
      }),
    [stemSizeMm, offsetType, neckVariant, headNeck]
  );

  const recommendation = useMemo(() => {
    const measured = Number(canalInput);
    if (!Number.isFinite(measured)) return null;
    return getNearestStemByCanalMm(measured, offsetType, neckVariant);
  }, [canalInput, offsetType, neckVariant]);

  const current = mapping?.current;
  const measuredMl = Number(canalInput);
  const measuredAp = Number(canalApInput);
  const mlLabel = Number.isFinite(measuredMl) ? `${measuredMl} mm` : "-";
  const apLabel = Number.isFinite(measuredAp) ? `${measuredAp} mm` : "-";
  const offsetLabel = current ? formatMm(current.stemOffsetMm) : "-";
  const visualStemSize = getStemSvgSize(stemSizeMm);

  useEffect(() => {
    let cancelled = false;

    async function loadStemSvg() {
      try {
        const response = await fetch(STEM_SVG_URL);
        const svgText = await response.text();
        if (cancelled) return;
        setStemSvgMarkup(buildFilteredStemSvg(svgText, { stemSizeMm, offsetType }));
      } catch {
        if (!cancelled) setStemSvgMarkup("");
      }
    }

    loadStemSvg();
    return () => {
      cancelled = true;
    };
  }, [stemSizeMm, offsetType]);

  return (
    <section className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-600">
              Zimmer M/L Taper Hip Prosthesis
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              Stem Animator
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Visualisasi parametric berdasarkan nilai A/B/C/D/E/F dari JSON:
              stem size, stem length, neck length, dan stem offset.
            </p>
          </div>

          <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            <span className="font-bold">Catatan:</span> visual education, bukan
            CAD/template resmi 1:1.
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <SelectField label="Offset type" value={offsetType} onChange={setOffsetType}>
              {OFFSET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Neck variant"
              value={neckVariant}
              onChange={setNeckVariant}
            >
              {NECK_VARIANT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Stem size A"
              value={String(stemSizeMm)}
              onChange={(value) => setStemSizeMm(Number(value))}
            >
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  Size {size}
                </option>
              ))}
            </SelectField>

            <SelectField label="Head / neck" value={headNeck} onChange={setHeadNeck}>
              {HEAD_NECK_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Canal ML measured
              </span>
              <div className="flex gap-2">
                <input
                  value={canalInput}
                  onChange={(event) => setCanalInput(event.target.value)}
                  inputMode="decimal"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="contoh: 12.8"
                />
                <span className="grid h-10 place-items-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600">
                  mm
                </span>
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Canal AP measured
              </span>
              <div className="flex gap-2">
                <input
                  value={canalApInput}
                  onChange={(event) => setCanalApInput(event.target.value)}
                  inputMode="decimal"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="opsional: A/P"
                />
                <span className="grid h-10 place-items-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600">
                  mm
                </span>
              </div>
            </label>

            {recommendation ? (
              <button
                type="button"
                onClick={() => setStemSizeMm(recommendation.stemSizeMm)}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Pakai rekomendasi: Size {recommendation.stemSizeMm}
                <span className="block text-xs font-normal text-slate-300">
                  Selisih ±{recommendation.differenceMm.toFixed(2)} mm dari canal
                </span>
              </button>
            ) : null}
          </div>

          {current ? (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                {current.productNo}
              </p>
              {current.haTcpProductNo ? (
                <p className="mt-1 text-xs text-slate-500">
                  HA/TCP: {current.haTcpProductNo}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">HA/TCP: -</p>
              )}
            </div>
          ) : null}
        </aside>

        <main className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Animated stem preview</h2>
              <p className="text-sm text-slate-500">
                Silhouette memakai outline SVG referensi; scale/offset tetap mengikuti data A/B/C/D/F.
              </p>
            </div>

            <div className="p-4 md:p-6">
              <div className="relative mx-auto min-h-[560px] max-w-[560px] overflow-hidden rounded-2xl bg-slate-950 p-4">
                <motion.div
                  key={`${visualStemSize}-${offsetType}`}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: (mapping?.visual.neckX || 0) * 0.08,
                    y: (mapping?.visual.neckY || 0) * 0.04,
                    rotate: mapping?.visual.neckRotate || 0,
                  }}
                  transition={{ type: "spring", stiffness: 150, damping: 24 }}
                  className="relative z-10 mx-auto flex min-h-[520px] items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: stemSvgMarkup }}
                />

                <svg
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <marker id="offsetArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M 0 0 L 6 3 L 0 6 Z" fill="#f0abfc" />
                    </marker>
                    <marker id="mlArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M 0 0 L 6 3 L 0 6 Z" fill="#67e8f9" />
                    </marker>
                    <marker id="apArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M 0 0 L 6 3 L 0 6 Z" fill="#facc15" />
                    </marker>
                  </defs>

                  <line x1="76" y1="9" x2="76" y2="86" stroke="#e2e8f0" strokeWidth="0.45" strokeDasharray="1.5 1.5" opacity="0.85" />
                  <line x1="24" y1="24" x2="24" y2="35" stroke="#f0abfc" strokeWidth="0.45" strokeDasharray="1.4 1.2" />
                  <line x1="24" y1="35" x2="76" y2="35" stroke="#f0abfc" strokeWidth="0.75" markerStart="url(#offsetArrow)" markerEnd="url(#offsetArrow)" />
                  <line x1="24" y1="31.5" x2="24" y2="38.5" stroke="#f0abfc" strokeWidth="0.65" />
                  <line x1="76" y1="31.5" x2="76" y2="38.5" stroke="#f0abfc" strokeWidth="0.65" />
                  <circle cx="24" cy="24" r="1.15" fill="#f0abfc" stroke="#020617" strokeWidth="0.45" />

                  <line x1="35" y1="49" x2="57" y2="49" stroke="#67e8f9" strokeWidth="0.7" markerStart="url(#mlArrow)" markerEnd="url(#mlArrow)" />
                  <line x1="35" y1="46.5" x2="35" y2="51.5" stroke="#67e8f9" strokeWidth="0.55" />
                  <line x1="57" y1="46.5" x2="57" y2="51.5" stroke="#67e8f9" strokeWidth="0.55" />

                  <line x1="83" y1="31" x2="83" y2="61" stroke="#facc15" strokeWidth="0.72" markerStart="url(#apArrow)" markerEnd="url(#apArrow)" />
                  <line x1="80.5" y1="31" x2="85.5" y2="31" stroke="#facc15" strokeWidth="0.55" />
                  <line x1="80.5" y1="61" x2="85.5" y2="61" stroke="#facc15" strokeWidth="0.55" />
                </svg>

                <div className="pointer-events-none absolute left-[23%] top-[14%] z-30 rounded-xl border border-fuchsia-300 bg-slate-950/95 px-3 py-2 text-sm font-black text-fuchsia-100 shadow-[0_0_20px_rgba(240,171,252,0.35)]">
                  D/F Stem offset: {offsetLabel}
                </div>
                <div className="pointer-events-none absolute left-[21%] top-[35.5%] z-30 text-[11px] font-black text-fuchsia-100 drop-shadow">Head center</div>
                <div className="pointer-events-none absolute right-[14%] top-[35.5%] z-30 text-[11px] font-black text-fuchsia-100 drop-shadow">Shaft axis</div>

                <div className="pointer-events-none absolute left-[39%] top-[46%] z-30 rounded-xl border border-cyan-300 bg-slate-950/95 px-3 py-2 text-xs font-black text-cyan-100 shadow-[0_0_20px_rgba(103,232,249,0.25)]">
                  <div>M/L: {mlLabel}</div>
                  <div className="text-[10px] font-bold text-slate-200">
                    Stem A: {current ? formatMm(current.stemSizeMm) : "-"}
                  </div>
                </div>

                <div className="pointer-events-none absolute right-[7%] top-[38%] z-30 rounded-xl border border-yellow-300 bg-slate-950/95 px-3 py-2 text-xs font-black text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
                  <div>A/P: {apLabel}</div>
                  <div className="text-[10px] font-bold text-slate-200">manual input</div>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] font-semibold text-slate-300">
                  SVG: stem-mltaper.svg · Visual size: {visualStemSize} · Data size: {current ? current.stemSizeMm : "-"} · Offset: {offsetLabel} · A/B/C/D/E/F tetap dari JSON.
                </div>
              </div>
            </div>
          </div>

          {current ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="A Stem size"
                value={formatMm(current.stemSizeMm)}
                sub={current.neckVariant === "reduced" ? "Reduced neck length" : "Normal neck"}
              />
              <MetricCard
                label="B Stem length"
                value={formatMm(current.stemLengthMm)}
                sub="Panjang stem"
              />
              <MetricCard
                label="C/E Neck length"
                value={formatMm(current.neckLengthMm)}
                sub={`Head/neck ${current.headNeck}`}
              />
              <MetricCard
                label="D/F Stem offset"
                value={formatMm(current.stemOffsetMm)}
                sub={current.offsetType === "extended" ? "Extended offset" : "Standard offset"}
              />
            </div>
          ) : null}

          {mapping ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-950">Debug mapping</h3>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-cyan-100">
                {JSON.stringify(
                  {
                    deltas: mapping.deltas,
                    visual: mapping.visual,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}
