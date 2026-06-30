"use client";
import { SOFT_SURFACE_CLASS, SOFT_RAISED_CLASS, SOFT_INSET_CLASS } from "@/lib/uiTokens";

function getLineLength(line) {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

export function HipCalcRow({ label, color, value, badge, highlight, note }) {
  return (
    <div className={`flex items-center justify-between gap-2 py-[3px] text-[10px] ${highlight ? "font-bold" : ""}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate text-slate-600">{label}</span>
        {note && <span className="shrink-0 text-[8px] text-slate-400">{note}</span>}
        {badge && (
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold text-white"
            style={{ background: color }}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        className="shrink-0 font-mono font-bold"
        style={{ color: highlight ? "#ef4444" : color }}
      >
        {value}
      </span>
    </div>
  );
}

export function HipPlanningCalculator({ lines, mmPerPixel, measurementUnit, cupAssessment }) {
  const fmt = (mm) => {
    if (mm === null || mm === undefined) return "—";
    if (measurementUnit === "cm") return `${(mm / 10).toFixed(2)} cm`;
    return `${mm.toFixed(1)} mm`;
  };
  const pxToMm = (px) => (mmPerPixel !== null ? px * mmPerPixel : px);
  const fmtPx = (px) =>
    mmPerPixel !== null ? fmt(pxToMm(px)) : `${Math.round(px)} px`;
  const toMm = (px) => (mmPerPixel !== null && px !== null && px !== undefined ? px * mmPerPixel : null);

  const byType = (type) => lines.filter((l) => l.type === type);
  const sortByX = (arr) =>
    [...arr].sort((a, b) => (a.x1 + a.x2) / 2 - (b.x1 + b.x2) / 2);

  const itdLines      = byType("interteardrop");
  const hLenLines     = sortByX(byType("hipLength"));
  const fOffLines     = sortByX(byType("femoralOffset"));
  const aOffLines     = sortByX(byType("acetabularOffset"));
  const gOffLines     = sortByX(byType("globalOffset"));
  const lldLines      = byType("lld");
  const offsetLines   = sortByX(byType("offset"));
  const headDiamLines = sortByX(byType("headDiameter"));
  const femurAxisLines = sortByX(byType("femurAxis"));

  // Precision: HRC dari midpoint headDiameter, femoral offset = jarak tegak lurus HRC ke femurAxis
  const pointToLinePx = (px, py, lx1, ly1, lx2, ly2) => {
    const num = Math.abs((ly2 - ly1) * px - (lx2 - lx1) * py + lx2 * ly1 - ly2 * lx1);
    const den = Math.hypot(ly2 - ly1, lx2 - lx1);
    return den > 0 ? num / den : 0;
  };
  const precisionFOffResults = headDiamLines.map((hd) => {
    const hrcX = (hd.x1 + hd.x2) / 2;
    const hrcY = (hd.y1 + hd.y2) / 2;
    const axis = femurAxisLines.find((a) => {
      const midAX = (a.x1 + a.x2) / 2;
      const midHX = hrcX;
      return Math.abs(midAX - midHX) < Math.abs((hd.x2 - hd.x1) * 2);
    }) || femurAxisLines[0];
    if (!axis) return null;
    return {
      headDPx: getLineLength(hd),
      hrcX, hrcY,
      fOffPx: pointToLinePx(hrcX, hrcY, axis.x1, axis.y1, axis.x2, axis.y2),
      side: (hrcX < (axis.x1 + axis.x2) / 2) ? "L" : "R",
    };
  }).filter(Boolean);
  const corCenters = headDiamLines.map((hd) => ({
    x: (hd.x1 + hd.x2) / 2,
    y: (hd.y1 + hd.y2) / 2,
  }));
  const corDeltaPx = corCenters.length >= 2
    ? {
        x: Math.abs(corCenters[1].x - corCenters[0].x),
        y: Math.abs(corCenters[1].y - corCenters[0].y),
      }
    : null;

  const hasCupAssessment = Number.isFinite(Number(cupAssessment?.inclination)) && Number.isFinite(Number(cupAssessment?.anteversion));
  const hasAny = [itdLines, hLenLines, fOffLines, aOffLines, gOffLines, lldLines, offsetLines, headDiamLines, femurAxisLines]
    .some((arr) => arr.length > 0);

  if (!hasAny && !hasCupAssessment) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-slate-300/80 px-3 py-3 text-center text-[9px] leading-relaxed text-slate-400">
        Gambar line <span className="font-bold text-teal-600">ITD</span>,{" "}
        <span className="font-bold text-sky-600">H-Len</span>,{" "}
        <span className="font-bold text-emerald-600">F-Off</span>, atau{" "}
        <span className="font-bold text-amber-600">A-Off</span> untuk kalkulasi otomatis
      </div>
    );
  }

  // Derived: LLD from H-Len lines
  const hLenPx = hLenLines.map((l) => getLineLength(l));
  const lldFromHLen =
    hLenPx.length >= 2 ? Math.abs(hLenPx[1] - hLenPx[0]) : null;
  const lldSign =
    hLenPx.length >= 2
      ? hLenPx[1] - hLenPx[0] > 0
        ? "R > L"
        : hLenPx[1] - hLenPx[0] < 0
          ? "L > R"
          : "Sama"
      : null;

  // Derived: Global Offset = F-Off + A-Off per sisi (jika tidak ada garis globalOffset)
  const derivedGOff = [0, 1].map((i) => {
    const fo = fOffLines[i] ? getLineLength(fOffLines[i]) : null;
    const ao = aOffLines[i] ? getLineLength(aOffLines[i]) : null;
    return fo !== null && ao !== null ? fo + ao : null;
  });

  const COLORS = {
    itd: "#0d9488",
    hLen: "#0284c7",
    lld: "#ef4444",
    fOff: "#10b981",
    aOff: "#d97706",
    gOff: "#8b5cf6",
    offset: "#f43f5e",
  };

  const sideLabel = (i, arr) => (arr.length > 1 ? (i === 0 ? " L" : " R") : "");
  const lldMm = toMm(lldFromHLen);
  const lldStatus =
    lldMm === null ? null :
    lldMm > 10 ? "high" :
    lldMm >= 6 ? "watch" :
    "normal";
  const cupInclination = Number(cupAssessment?.inclination);
  const cupAnteversion = Number(cupAssessment?.anteversion);
  const incStatus =
    hasCupAssessment
      ? cupInclination < 35 ? "low" : cupInclination > 50 ? "high" : cupInclination > 45 ? "watch" : "normal"
      : null;
  const avStatus =
    hasCupAssessment
      ? cupAnteversion < 5 ? "low" : cupAnteversion > 25 ? "high" : "normal"
      : null;
  const statusColor = (status) =>
    status === "normal" ? "#16a34a" : status === "watch" ? "#d97706" : "#dc2626";
  const statusLabel = (status) =>
    status === "normal" ? "Normal" : status === "watch" ? "Monitor" : status === "low" ? "Rendah" : "Tinggi";

  return (
    <div className="mt-2 space-y-1.5">
      {!mmPerPixel && (
        <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-[9px] text-amber-700">
          ⚠️ Kalibrasi belum aktif — nilai dalam piksel
        </div>
      )}

      {/* ITD */}
      {itdLines.map((l, i) => (
        <HipCalcRow
          key={l.id}
          label={`ITD${sideLabel(i, itdLines)}`}
          color={COLORS.itd}
          value={fmtPx(getLineLength(l))}
        />
      ))}

      {/* Hip Length + LLD */}
      {hLenLines.length > 0 && (
        <div className="rounded-xl border border-sky-200/60 bg-sky-50/50 px-2.5 py-2">
          <div className="mb-1 text-[9px] font-extrabold tracking-wide text-sky-700 uppercase">
            Hip Length
          </div>
          {hLenLines.map((l, i) => (
            <HipCalcRow
              key={l.id}
              label={`H-Len${sideLabel(i, hLenLines)}`}
              color={COLORS.hLen}
              value={fmtPx(getLineLength(l))}
            />
          ))}
          {lldFromHLen !== null && (
            <>
              <div className="my-1 border-t border-sky-200/80" />
              <HipCalcRow
                label="LLD"
                color={lldStatus ? statusColor(lldStatus) : COLORS.lld}
                value={fmtPx(lldFromHLen)}
                badge={lldSign}
                highlight={lldStatus === "high" || lldStatus === "watch"}
                note={lldStatus ? `${statusLabel(lldStatus)} · Budzinska: >6 mm terasa, >10 mm bermasalah` : "= |H-Len R − H-Len L|"}
              />
            </>
          )}
        </div>
      )}

      {/* Offset section */}
      {(fOffLines.length > 0 || aOffLines.length > 0 || gOffLines.length > 0) && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-2.5 py-2">
          <div className="mb-1 text-[9px] font-extrabold tracking-wide text-emerald-700 uppercase">
            Offset
          </div>
          {fOffLines.map((l, i) => (
            <HipCalcRow
              key={l.id}
              label={`F-Off${sideLabel(i, fOffLines)}`}
              color={COLORS.fOff}
              value={fmtPx(getLineLength(l))}
            />
          ))}
          {aOffLines.map((l, i) => (
            <HipCalcRow
              key={l.id}
              label={`A-Off${sideLabel(i, aOffLines)}`}
              color={COLORS.aOff}
              value={fmtPx(getLineLength(l))}
            />
          ))}

          {/* Global Offset: pakai garis eksplisit, atau hitung F-Off + A-Off */}
          {gOffLines.length > 0
            ? gOffLines.map((l, i) => (
                <HipCalcRow
                  key={l.id}
                  label={`G-Off${sideLabel(i, gOffLines)}`}
                  color={COLORS.gOff}
                  value={fmtPx(getLineLength(l))}
                />
              ))
            : derivedGOff.map(
                (px, i) =>
                  px !== null && (
                    <HipCalcRow
                      key={i}
                      label={`G-Off${fOffLines.length > 1 || aOffLines.length > 1 ? (i === 0 ? " L" : " R") : ""}`}
                      color={COLORS.gOff}
                      value={fmtPx(px)}
                      note="= F-Off + A-Off"
                    />
                  ),
              )}

          {/* Perbedaan G-Off antar sisi */}
          {(gOffLines.length >= 2 || derivedGOff.filter(Boolean).length >= 2) && (() => {
            const leftPx = gOffLines.length >= 2
              ? getLineLength(gOffLines[0])
              : derivedGOff[0];
            const rightPx = gOffLines.length >= 2
              ? getLineLength(gOffLines[1])
              : derivedGOff[1];
            if (leftPx === null || rightPx === null) return null;
            const diff = Math.abs(rightPx - leftPx);
            return (
              <>
                <div className="my-1 border-t border-emerald-200/80" />
                <HipCalcRow
                  label="ΔG-Off"
                  color={mmPerPixel && diff * mmPerPixel > 5 ? "#dc2626" : COLORS.gOff}
                  value={fmtPx(diff)}
                  highlight={mmPerPixel ? diff * mmPerPixel > 5 : false}
                  note="bandingkan sisi normal"
                />
              </>
            );
          })()}
        </div>
      )}

      {/* Offset umum */}
      {offsetLines.map((l, i) => (
        <HipCalcRow
          key={l.id}
          label={`Offset${sideLabel(i, offsetLines)}`}
          color={COLORS.offset}
          value={fmtPx(getLineLength(l))}
        />
      ))}

      {/* Explicit LLD line */}
      {lldLines.map((l, i) => (
        <HipCalcRow
          key={l.id}
          label={`LLD${sideLabel(i, lldLines)}`}
          color={COLORS.lld}
          value={fmtPx(getLineLength(l))}
        />
      ))}

      {/* Cup orientation saved from Cup Assess */}
      {hasCupAssessment && (
        <div className="rounded-xl border border-fuchsia-200/60 bg-fuchsia-50/50 px-2.5 py-2">
          <div className="mb-1 text-[9px] font-extrabold tracking-wide text-fuchsia-700 uppercase">
            PostTHA Cup Orientation
          </div>
          <HipCalcRow
            label="Acetabular Inclination"
            color={statusColor(incStatus)}
            value={`${cupInclination.toFixed(1)}°`}
            badge={statusLabel(incStatus)}
            highlight={incStatus !== "normal"}
            note="AI; target sekitar 45°"
          />
          <HipCalcRow
            label="Acetabular Anteversion"
            color={statusColor(avStatus)}
            value={`${cupAnteversion.toFixed(1)}°`}
            badge={statusLabel(avStatus)}
            highlight={avStatus !== "normal"}
            note="Lewinnek 5-25°"
          />
          {cupAssessment?.savedAt && (
            <div className="mt-1 text-[8px] font-semibold text-fuchsia-500">
              Disimpan {cupAssessment.savedAt} · {cupAssessment.side === "left" ? "Kiri" : "Kanan"} · {cupAssessment.zone}
            </div>
          )}
        </div>
      )}

      {/* ── Precision: Head Diameter + Femoral Axis ───────────────────── */}
      {(headDiamLines.length > 0 || femurAxisLines.length > 0) && (
        <div className="rounded-xl border border-pink-200/60 bg-pink-50/50 px-2.5 py-2">
          <div className="mb-1 text-[9px] font-extrabold tracking-wide text-pink-700 uppercase">
            Presisi — Head & Axis
          </div>
          {headDiamLines.map((l, i) => (
            <HipCalcRow
              key={l.id}
              label={`Head-D ${i === 0 && headDiamLines.length > 1 ? "L" : headDiamLines.length > 1 ? "R" : ""}`}
              color="#ec4899"
              value={fmtPx(getLineLength(l))}
              note="diameter"
            />
          ))}
          {corDeltaPx && (
            <>
              <div className="my-1 border-t border-pink-200/60" />
              <HipCalcRow
                label="ΔCOR horizontal"
                color={mmPerPixel && corDeltaPx.x * mmPerPixel > 5 ? "#dc2626" : "#16a34a"}
                value={fmtPx(corDeltaPx.x)}
                highlight={mmPerPixel ? corDeltaPx.x * mmPerPixel > 5 : false}
                note="target ≤5 mm"
              />
              <HipCalcRow
                label="ΔCOR vertical"
                color={mmPerPixel && corDeltaPx.y * mmPerPixel > 3 ? "#dc2626" : "#16a34a"}
                value={fmtPx(corDeltaPx.y)}
                highlight={mmPerPixel ? corDeltaPx.y * mmPerPixel > 3 : false}
                note="target ≤3 mm superior"
              />
            </>
          )}
          {femurAxisLines.map((l, i) => (
            <HipCalcRow
              key={l.id}
              label={`Fem-Axis ${femurAxisLines.length > 1 ? (i === 0 ? "L" : "R") : ""}`}
              color="#6366f1"
              value={fmtPx(getLineLength(l))}
              note="axis"
            />
          ))}
          {precisionFOffResults.length > 0 && (
            <>
              <div className="my-1 border-t border-pink-200/60" />
              {precisionFOffResults.map((r, i) => (
                <HipCalcRow
                  key={i}
                  label={`F-Off ${r.side} (HRC→Axis)`}
                  color="#ec4899"
                  value={fmtPx(r.fOffPx)}
                  note="presisi"
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
