"use client";

import { useMemo, useState } from "react";
import { analyzeSpinopelvicMobility } from "@/lib/xray/spinopelvicAnalysis";
import { SpinopelvicCanvas } from "./SpinopelvicCanvas";
import { SpinopelvicResultPanel } from "./SpinopelvicResultPanel";

const emptyPoints = { bicoxofemoralCenter: null, sacralEndplateMidpoint: null };

export default function SpinopelvicPlanner() {
  const [standingFile, setStandingFile] = useState(null);
  const [sittingFile, setSittingFile] = useState(null);
  const [standingPoints, setStandingPoints] = useState(emptyPoints);
  const [sittingPoints, setSittingPoints] = useState(emptyPoints);
  const [activePoint, setActivePoint] = useState("bicoxofemoralCenter");

  const result = useMemo(
    () => analyzeSpinopelvicMobility({ standing: standingPoints, sitting: sittingPoints }),
    [standingPoints, sittingPoints],
  );

  function resetAll() {
    setStandingPoints(emptyPoints);
    setSittingPoints(emptyPoints);
    setActivePoint("bicoxofemoralCenter");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <h1 className="text-2xl font-bold md:text-3xl">Spinopelvic Mobility</h1>
          <p className="mt-2 max-w-3xl text-[9px] text-slate-300">
            Pelvic tilt dari foto lateral berdiri vs. duduk — klasifikasi mobilitas spinopelvis
            untuk perencanaan posisi cup pada THA, mengikuti ambang Stefl et al. 2017.
          </p>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">Upload lateral — Standing</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setStandingFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
            />
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">Upload lateral — Sitting</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSittingFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm">
          <span className="text-xs font-medium text-slate-600">Landmark aktif:</span>
          {[
            { key: "bicoxofemoralCenter", label: "① Pusat bikoksofemoral (BFC)" },
            { key: "sacralEndplateMidpoint", label: "② Titik tengah endplate S1 (S1-MP)" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActivePoint(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activePoint === opt.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Reset semua titik
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_340px]">
          <SpinopelvicCanvas
            title="Standing lateral"
            imageFile={standingFile}
            activePoint={activePoint}
            points={standingPoints}
            setPoints={setStandingPoints}
          />
          <SpinopelvicCanvas
            title="Sitting lateral"
            imageFile={sittingFile}
            activePoint={activePoint}
            points={sittingPoints}
            setPoints={setSittingPoints}
          />
          <div className="space-y-4">
            <SpinopelvicResultPanel result={result} />
            <div className="rounded-2xl border bg-white p-4 text-[10px] text-slate-700 shadow-sm">
              <h2 className="text-xs font-semibold text-slate-900">Panduan Landmark</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>BFC: pusat kedua caput femur yang superimposed pada true lateral.</li>
                <li>S1-MP: titik tengah endplate superior sacrum (promontorium).</li>
                <li>Tandai kedua titik pada masing-masing foto (berdiri &amp; duduk).</li>
                <li>Pastikan kedua foto diambil dengan orientasi pasien yang sama.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
