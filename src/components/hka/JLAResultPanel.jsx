"use client";

const FLAG_COLORS = {
  normal:     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  low:        { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  high:       { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
  borderline: { bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-700',  dot: 'bg-yellow-500' },
};

const DLO_COLORS = {
  low:      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  moderate: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800' },
  high:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800' },
};

// CPAK type descriptions
const CPAK_DESC = {
  'CPAK I':   'Apex Distal · Varus — paling umum, ~25-30% populasi',
  'CPAK II':  'Apex Distal · Neutral — umum, ~20% populasi',
  'CPAK III': 'Apex Distal · Valgus',
  'CPAK IV':  'Neutral JLO · Varus',
  'CPAK V':   'Neutral JLO · Neutral',
  'CPAK VI':  'Neutral JLO · Valgus',
  'CPAK VII': 'Apex Proximal · Varus',
  'CPAK VIII':'Apex Proximal · Neutral',
  'CPAK IX':  'Apex Proximal · Valgus',
};

function AngleRow({ label, value, unit = '°', normalRange, flag, sublabel }) {
  const c = FLAG_COLORS[flag] ?? FLAG_COLORS.normal;
  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${c.bg} ${c.border}`}>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>{label}</p>
        {sublabel && <p className="text-[9px] text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
      <div className="text-right">
        <p className={`text-lg font-black ${c.text}`}>{value !== null ? `${value}${unit}` : '–'}</p>
        <p className="text-[9px] text-slate-400">{normalRange}</p>
      </div>
    </div>
  );
}

export function JLAResultPanel({ jla }) {
  if (!jla) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">JLA — Joint Line Analysis</h2>
        <p className="mt-2 text-xs text-slate-400">
          Pasang semua 7 landmark (CFH, CK, CA, MFC, LFC, MTP, LTP) untuk melihat analisis.
        </p>
        <div className="mt-3 space-y-1.5 text-[10px] text-slate-500">
          <p>• <strong>MFC / LFC</strong> — titik terendah kondilus femur medial & lateral</p>
          <p>• <strong>MTP / LTP</strong> — titik tertinggi plateau tibia medial & lateral</p>
          <p>• <strong>CFH / CK / CA</strong> — axis mekanis (sama seperti Full HKA)</p>
        </div>
      </div>
    );
  }

  const dloC = DLO_COLORS[jla.dloRisk];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <h2 className="text-base font-semibold text-slate-900">JLA — Joint Line Analysis</h2>

      {/* ── Axis angles ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sudut Mekanis</p>
        <AngleRow label="LDFA" value={jla.LDFA} normalRange="Normal 87° ±3°"
          flag={jla.ldfaFlag}
          sublabel="Lateral Distal Femoral Angle" />
        <AngleRow label="MPTA" value={jla.MPTA} normalRange="Normal 87° ±3°"
          flag={jla.mptaFlag}
          sublabel="Medial Proximal Tibial Angle" />
        <AngleRow label="JLCA" value={jla.JLCA} normalRange="Normal 0° ±2°"
          flag={jla.jlcaFlag}
          sublabel="Joint Line Convergence Angle" />
      </div>

      {/* ── JLO ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Joint Line Obliquity</p>
        <AngleRow label="JLO (Hsu)" value={jla.JLO_hsu} normalRange="Normal ≤3°"
          flag={jla.jloFlag}
          sublabel="= 90° − (LDFA+MPTA)/2 · tilt terhadap tanah" />
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-[9px] font-black uppercase text-slate-400">CPAK HKA</p>
            <p className="text-sm font-black text-slate-800">{jla.cpakHKA}°</p>
            <p className="text-[9px] text-slate-500">MPTA − LDFA</p>
          </div>
          <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <p className="text-[9px] font-black uppercase text-slate-400">CPAK JLO</p>
            <p className="text-sm font-black text-slate-800">{jla.cpakJLO}°</p>
            <p className="text-[9px] text-slate-500">MPTA + LDFA</p>
          </div>
        </div>
      </div>

      {/* ── CPAK Phenotype ── */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
          Fenotipe CPAK (MacDessi et al. 2021)
        </p>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-indigo-700">{jla.cpakType}</p>
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-600">{jla.cpakHKACategory}</p>
              <p className="text-[9px] text-indigo-500">{jla.cpakJLOCategory}</p>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-indigo-600">
            {CPAK_DESC[jla.cpakType] ?? ''}
          </p>
        </div>
      </div>

      {/* ── Micicoi overcorrection ── */}
      {jla.micicoiReduction > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-black text-amber-800">
            Koreksi Micicoi (JLCA = {jla.JLCA}°)
          </p>
          <p className="mt-0.5 text-base font-black text-amber-900">
            Kurangi sudut koreksi sebesar {jla.micicoiReduction}°
          </p>
          <p className="text-[9px] text-amber-700 mt-0.5">
            Formula: (JLCA − 2) / 2 = ({jla.JLCA} − 2) / 2 = {jla.micicoiReduction}°
          </p>
        </div>
      )}

      {/* ── DLO indication ── */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
          Indikasi Double-Level Osteotomy
        </p>
        <div className={`rounded-xl border p-3 ${dloC.bg} ${dloC.border}`}>
          <p className={`text-[11px] font-bold ${dloC.text}`}>{jla.dloText}</p>
        </div>
      </div>

      {/* ── Reference ── */}
      <p className="text-[9px] text-slate-400 leading-relaxed">
        Ref: Pratobevera et al., EFORT Open Reviews 2024 · Hsu et al. 1990 · MacDessi et al. 2021 · Micicoi et al. 2020.
        Hasil ini bersifat edukasi; keputusan klinis memerlukan PACS dan dokter ortopedi.
      </p>
    </div>
  );
}
