"use client";

export function ResultCard({ mode, hka, direction, fta, predictedHka }) {
  const label =
    hka === null
      ? "Belum lengkap"
      : direction === "varus"
        ? `Varus ±${hka}°`
        : direction === "valgus"
          ? `Valgus ±${hka}°`
          : `Deviasi ±${hka}°`;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Hasil Pengukuran</h2>

      {mode === "full" ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-500">
            Mode: Full Length Standing HKA
          </p>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-3xl font-bold text-slate-900">{hka ?? "-"}°</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-500">
            Mode: Estimasi HKAA dari FTA — Fem2 + Tib1
          </p>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">FTA</p>
            <p className="text-2xl font-bold text-slate-900">{fta ?? "-"}°</p>
            <p className="mt-3 text-sm text-slate-500">Prediksi HKAA</p>
            <p className="text-3xl font-bold text-slate-900">
              {predictedHka ?? "-"}°
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Catatan: hasil aplikasi ini bersifat edukasi dan planning awal. Untuk
        keputusan klinis TKA, gunakan PACS resmi dan validasi dokter
        ortopedi/radiologi.
      </div>
    </div>
  );
}
