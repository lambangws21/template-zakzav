"use client";

import { useMemo, useState } from "react";
import { calculateFullLengthHKA } from "@/lib/hka/hkaCalculator";
import { calculateFTA, predictHKAAFromFTA } from "@/lib/hka/ftaCalculator";
import { ControlPanel } from "./ControlPanel";
import { ResultCard } from "./ResultCard";
import { XrayCanvas } from "./XrayCanvas";

const initialPoints = {
  femoralHead: null,
  kneeCenter: null,
  ankleCenter: null,
  femurMidshaft10cm: null,
  femoralNotch: null,
  tibiaMidshaft4cm: null,
  tibiaMidshaft10cm: null,
};

export default function HKAPlanner() {
  const [imageFile, setImageFile] = useState(null);
  const [mode, setMode] = useState("full");
  const [direction, setDirection] = useState("varus");
  const [activePoint, setActivePoint] = useState("femoralHead");
  const [points, setPoints] = useState(initialPoints);

  const fullHka = useMemo(() => {
    const result = calculateFullLengthHKA({
      femoralHead: points.femoralHead,
      kneeCenter: points.kneeCenter,
      ankleCenter: points.ankleCenter,
    });
    return result?.absoluteDeviation ?? null;
  }, [points.ankleCenter, points.femoralHead, points.kneeCenter]);

  const fta = useMemo(
    () =>
      calculateFTA({
        femurMidshaft10cm: points.femurMidshaft10cm,
        femoralNotch: points.femoralNotch,
        tibiaMidshaft4cm: points.tibiaMidshaft4cm,
        tibiaMidshaft10cm: points.tibiaMidshaft10cm,
      }),
    [
      points.femoralNotch,
      points.femurMidshaft10cm,
      points.tibiaMidshaft10cm,
      points.tibiaMidshaft4cm,
    ],
  );

  const predictedHka = useMemo(() => predictHKAAFromFTA(fta), [fta]);

  function resetPoints() {
    setPoints(initialPoints);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <h1 className="text-2xl font-bold md:text-3xl">HKA Planner</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 text-[9px]">
            Pengukuran mechanical Hip-Knee-Ankle dari full-length X-ray dan
            estimasi HKA dari FTA sesuai metode Fem2 + Tib1.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Upload X-ray
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <XrayCanvas
            imageFile={imageFile}
            mode={mode}
            activePoint={activePoint}
            points={points}
            setPoints={setPoints}
          />

          <div className="space-y-4">
            <ControlPanel
              mode={mode}
              setMode={setMode}
              activePoint={activePoint}
              setActivePoint={setActivePoint}
              direction={direction}
              setDirection={setDirection}
              resetPoints={resetPoints}
            />

            <ResultCard
              mode={mode}
              hka={fullHka}
              direction={direction}
              fta={fta}
              predictedHka={predictedHka}
            />

            <div className="rounded-2xl border bg-white p-4 text-xs text-slate-700 shadow-sm text-[10px]">
              <h2 className="font-semibold text-slate-900">Panduan Landmark</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Full HKA: klik center femoral head, center knee/notch, center
                  ankle/talar dome.
                </li>
                <li>
                  FTA jurnal: klik Fem2 mid-shaft femur ±10 cm proximal, femoral
                  notch, Tib1 shaft ±4 cm dan ±10 cm distal.
                </li>
                <li>Gunakan zoom untuk meningkatkan akurasi titik.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
