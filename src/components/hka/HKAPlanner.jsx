"use client";

import { useMemo, useState } from "react";
import { calculateFullLengthHKA } from "@/lib/hka/hkaCalculator";
import { calculateFTA, predictHKAAFromFTA } from "@/lib/hka/ftaCalculator";
import { computeJLA } from "@/lib/hka/jlaCalculator";
import { ControlPanel } from "./ControlPanel";
import { ResultCard } from "./ResultCard";
import { JLAResultPanel } from "./JLAResultPanel";
import { XrayCanvas } from "./XrayCanvas";

const initialPoints = {
  // Full HKA / JLA shared
  femoralHead: null,
  kneeCenter: null,
  ankleCenter: null,
  // FTA
  femurMidshaft10cm: null,
  femoralNotch: null,
  tibiaMidshaft4cm: null,
  tibiaMidshaft10cm: null,
  // JLA — condyle & plateau
  femCondyleMedial:  null,
  femCondyleLateral: null,
  tibPlateauMedial:  null,
  tibPlateauLateral: null,
};

export default function HKAPlanner() {
  const [imageFile, setImageFile]   = useState(null);
  const [mode, setMode]             = useState("full");
  const [direction, setDirection]   = useState("varus");
  const [activePoint, setActivePoint] = useState("femoralHead");
  const [points, setPoints]         = useState(initialPoints);

  // ── Full HKA ──────────────────────────────────────────────────────────────
  const fullHka = useMemo(() => {
    const result = calculateFullLengthHKA({
      femoralHead: points.femoralHead,
      kneeCenter:  points.kneeCenter,
      ankleCenter: points.ankleCenter,
    });
    return result?.absoluteDeviation ?? null;
  }, [points.ankleCenter, points.femoralHead, points.kneeCenter]);

  // ── FTA ───────────────────────────────────────────────────────────────────
  const fta = useMemo(
    () => calculateFTA({
      femurMidshaft10cm: points.femurMidshaft10cm,
      femoralNotch:      points.femoralNotch,
      tibiaMidshaft4cm:  points.tibiaMidshaft4cm,
      tibiaMidshaft10cm: points.tibiaMidshaft10cm,
    }),
    [points.femoralNotch, points.femurMidshaft10cm, points.tibiaMidshaft10cm, points.tibiaMidshaft4cm],
  );
  const predictedHka = useMemo(() => predictHKAAFromFTA(fta), [fta]);

  // ── JLA ───────────────────────────────────────────────────────────────────
  const jla = useMemo(
    () => computeJLA({
      femoralHead:       points.femoralHead,
      kneeCenter:        points.kneeCenter,
      ankleCenter:       points.ankleCenter,
      femCondyleMedial:  points.femCondyleMedial,
      femCondyleLateral: points.femCondyleLateral,
      tibPlateauMedial:  points.tibPlateauMedial,
      tibPlateauLateral: points.tibPlateauLateral,
    }),
    [
      points.femoralHead,   points.kneeCenter,       points.ankleCenter,
      points.femCondyleMedial, points.femCondyleLateral,
      points.tibPlateauMedial, points.tibPlateauLateral,
    ],
  );

  function resetPoints() { setPoints(initialPoints); }

  // When mode changes, set the first active landmark for that mode
  function handleModeChange(m) {
    setMode(m);
    if (m === "full") setActivePoint("femoralHead");
    if (m === "fta")  setActivePoint("femurMidshaft10cm");
    if (m === "jla")  setActivePoint("femoralHead");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <h1 className="text-2xl font-bold md:text-3xl">HKA Planner</h1>
          <p className="mt-2 max-w-3xl text-[9px] text-slate-300">
            Pengukuran mechanical Hip-Knee-Ankle · estimasi HKA dari FTA · dan analisis joint line
            (LDFA, MPTA, JLCA, JLO, fenotipe CPAK) untuk perencanaan osteotomi lutut.
          </p>
        </div>

        {/* Upload */}
        <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">Upload X-ray</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Canvas */}
          <XrayCanvas
            imageFile={imageFile}
            mode={mode}
            activePoint={activePoint}
            points={points}
            setPoints={setPoints}
            hkaDeviation={fullHka}
            direction={direction}
          />

          {/* Right panel */}
          <div className="space-y-4">
            <ControlPanel
              mode={mode}
              setMode={handleModeChange}
              activePoint={activePoint}
              setActivePoint={setActivePoint}
              direction={direction}
              setDirection={setDirection}
              resetPoints={resetPoints}
            />

            {mode === "jla" ? (
              <JLAResultPanel jla={jla} />
            ) : (
              <ResultCard
                mode={mode}
                hka={fullHka}
                direction={direction}
                fta={fta}
                predictedHka={predictedHka}
              />
            )}

            {/* Landmark guide */}
            <div className="rounded-2xl border bg-white p-4 text-[10px] text-slate-700 shadow-sm">
              <h2 className="font-semibold text-slate-900 text-xs">Panduan Landmark</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Full HKA: center femoral head, center knee/notch, center ankle/talar dome.</li>
                <li>FTA: Fem2 mid-shaft ±10 cm, femoral notch, Tib1 ±4 cm dan ±10 cm.</li>
                <li>
                  <span className="font-semibold text-indigo-700">JLA</span>: tambah titik terendah kondilus
                  femur medial (MFC) dan lateral (LFC), serta titik tertinggi plateau tibia
                  medial (MTP) dan lateral (LTP). Axis mekanis sama seperti Full HKA.
                </li>
                <li>Scroll/pinch untuk zoom. Klik canvas untuk pasang landmark aktif.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
