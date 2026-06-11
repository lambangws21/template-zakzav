"use client";

const FULL_POINTS = [
  { key: "femoralHead",  label: "Center Femoral Head" },
  { key: "kneeCenter",   label: "Center Knee / Femoral Notch" },
  { key: "ankleCenter",  label: "Center Ankle / Talar Dome" },
];

const FTA_POINTS = [
  { key: "femurMidshaft10cm", label: "Fem2: Femur mid-shaft ±10 cm proximal" },
  { key: "femoralNotch",      label: "Femoral Notch" },
  { key: "tibiaMidshaft4cm",  label: "Tib1: Tibia mid-shaft ±4 cm distal" },
  { key: "tibiaMidshaft10cm", label: "Tib1: Tibia mid-shaft ±10 cm distal" },
];

const JLA_POINTS = [
  { key: "femoralHead",       label: "CFH — Center of Femoral Head",              color: "#facc15" },
  { key: "kneeCenter",        label: "CK  — Center of Knee Joint",                color: "#f97316" },
  { key: "ankleCenter",       label: "CA  — Center of Ankle / Talar Dome",        color: "#22c55e" },
  { key: "femCondyleMedial",  label: "MFC — Medial Femoral Condyle (lowest pt)",  color: "#38bdf8" },
  { key: "femCondyleLateral", label: "LFC — Lateral Femoral Condyle (lowest pt)", color: "#38bdf8" },
  { key: "tibPlateauMedial",  label: "MTP — Medial Tibial Plateau (highest pt)",  color: "#14b8a6" },
  { key: "tibPlateauLateral", label: "LTP — Lateral Tibial Plateau (highest pt)", color: "#14b8a6" },
];

export function ControlPanel({
  mode,
  setMode,
  activePoint,
  setActivePoint,
  direction,
  setDirection,
  resetPoints,
}) {
  const points =
    mode === "full" ? FULL_POINTS :
    mode === "fta"  ? FTA_POINTS  :
    JLA_POINTS;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Kontrol Landmark</h2>

      {/* Mode selector — 3 buttons */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { id: "full", label: "Full HKA" },
          { id: "fta",  label: "FTA" },
          { id: "jla",  label: "JLA" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
              mode === id
                ? id === "jla"
                  ? "bg-indigo-700 text-white"
                  : "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* JLA: side note */}
      {mode === "jla" && (
        <p className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] text-indigo-700 border border-indigo-100">
          Joint Line Analysis — LDFA, MPTA, JLCA, JLO, dan fenotipe CPAK dari AP long-leg.
        </p>
      )}

      {/* Varus/Valgus direction selector (full mode only) */}
      {mode === "full" && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Arah deformitas</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("varus")}
              className={`rounded-xl px-3 py-2 text-sm ${
                direction === "varus" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"
              }`}
            >
              Varus
            </button>
            <button
              onClick={() => setDirection("valgus")}
              className={`rounded-xl px-3 py-2 text-sm ${
                direction === "valgus" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
              }`}
            >
              Valgus
            </button>
          </div>
        </div>
      )}

      {/* Landmark buttons */}
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-slate-700">Klik landmark yang ingin dipasang:</p>
        {points.map((point, index) => (
          <button
            key={point.key}
            onClick={() => setActivePoint(point.key)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              activePoint === point.key
                ? mode === "jla"
                  ? "border-indigo-700 bg-indigo-700 text-white"
                  : "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="text-xs opacity-60 mr-1">{index + 1}.</span>
            {point.label}
          </button>
        ))}
      </div>

      <button
        onClick={resetPoints}
        className="mt-4 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
      >
        Reset Landmark
      </button>
    </div>
  );
}
