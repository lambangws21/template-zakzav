"use client";

const BADGE_STYLE = {
  stiff: "bg-amber-50 text-amber-800 border-amber-200",
  normal: "bg-emerald-50 text-emerald-800 border-emerald-200",
  hypermobile: "bg-rose-50 text-rose-800 border-rose-200",
};

const BADGE_TEXT = {
  stiff: "Stiff",
  normal: "Normal",
  hypermobile: "Hypermobile",
};

export function SpinopelvicResultPanel({ result }) {
  const hasResult = Boolean(result?.classification);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Spinopelvic Mobility</h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Standing PT</p>
          <p className="text-xl font-bold text-slate-900">
            {Number.isFinite(result?.standingPT) ? `${result.standingPT.toFixed(1)}°` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Sitting PT</p>
          <p className="text-xl font-bold text-slate-900">
            {Number.isFinite(result?.sittingPT) ? `${result.sittingPT.toFixed(1)}°` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs text-slate-500">ΔPT (standing − sitting)</p>
        <p className="text-2xl font-bold text-slate-900">
          {Number.isFinite(result?.deltaPT) ? `${result.deltaPT.toFixed(1)}°` : "—"}
        </p>
      </div>

      <div className="mt-3">
        {hasResult ? (
          <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${BADGE_STYLE[result.classification]}`}>
            {BADGE_TEXT[result.classification]}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
            Lengkapi 4 landmark (2 per film) untuk hasil
          </span>
        )}
        {hasResult && <p className="mt-2 text-xs text-slate-600">{result.label}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Klasifikasi mengikuti ambang ΔPT 10°/30° (Stefl et al. 2017). Modul ini tidak
        mensubstratifikasi &quot;stuck standing&quot; vs &quot;stuck sitting&quot; — interpretasikan
        bersama sacral slope dan riwayat tulang belakang pasien. Bukan pengganti penilaian
        klinis.
      </div>
    </div>
  );
}
