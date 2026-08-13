"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawLine, drawPoint, screenToImagePoint } from "@/lib/hka/geometry";

// ─── JLA drawing helpers ─────────────────────────────────────────────────────

function extendLine(a, b, extendPx = 80) {
  if (!a || !b) return { a, b };
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  return {
    a: { x: a.x - ux * extendPx, y: a.y - uy * extendPx },
    b: { x: b.x + ux * extendPx, y: b.y + uy * extendPx },
  };
}

function lineIntersect(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null;
  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y };
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-8) return null;
  const diff = { x: p3.x - p1.x, y: p3.y - p1.y };
  const t = (diff.x * d2.y - diff.y * d2.x) / cross;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

function drawAngleArc(ctx, vertex, vA, vB, radius, label, color) {
  if (!vertex || !vA || !vB) return;
  const angleA = Math.atan2(vA.y - vertex.y, vA.x - vertex.x);
  const angleB = Math.atan2(vB.y - vertex.y, vB.x - vertex.x);
  let diff = angleB - angleA;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const ccw = diff < 0;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(vertex.x, vertex.y, radius, angleA, angleB, ccw);
  ctx.stroke();
  // label at mid-arc
  const midAngle = angleA + diff / 2;
  const lx = vertex.x + (radius + 14) * Math.cos(midAngle);
  const ly = vertex.y + (radius + 14) * Math.sin(midAngle);
  ctx.globalAlpha = 1;
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3.5;
  ctx.strokeText(label, lx, ly);
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

function drawJLAMode(ctx, points) {
  const {
    femoralHead, kneeCenter, ankleCenter,
    femCondyleMedial, femCondyleLateral,
    tibPlateauMedial, tibPlateauLateral,
  } = points;

  // ── Mechanical axes ──────────────────────────────────────────────────────
  drawLine(ctx, femoralHead, kneeCenter, "#facc15", 3);
  drawLine(ctx, kneeCenter, ankleCenter, "#22c55e", 3);

  // ── Condyle line (extended) ───────────────────────────────────────────────
  if (femCondyleMedial && femCondyleLateral) {
    const ext = extendLine(femCondyleMedial, femCondyleLateral, 100);
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ext.a.x, ext.a.y);
    ctx.lineTo(ext.b.x, ext.b.y);
    ctx.stroke();
    ctx.restore();
  }

  // ── Plateau line (extended) ───────────────────────────────────────────────
  if (tibPlateauMedial && tibPlateauLateral) {
    const ext = extendLine(tibPlateauMedial, tibPlateauLateral, 100);
    ctx.save();
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ext.a.x, ext.a.y);
    ctx.lineTo(ext.b.x, ext.b.y);
    ctx.stroke();
    ctx.restore();
  }

  // ── LDFA arc ─────────────────────────────────────────────────────────────
  // Intersection of femoral mechanical axis and condyle line
  if (femoralHead && kneeCenter && femCondyleMedial && femCondyleLateral) {
    const exCond = extendLine(femCondyleMedial, femCondyleLateral, 300);
    const vertex = lineIntersect(femoralHead, kneeCenter, exCond.a, exCond.b);
    if (vertex) {
      // Arc from condyle direction to femoral axis direction — lateral side
      const condLateralPt = { x: vertex.x + (femCondyleLateral.x - femCondyleMedial.x) * 0.5,
                               y: vertex.y + (femCondyleLateral.y - femCondyleMedial.y) * 0.5 };
      const femHeadPt     = { x: vertex.x + (femoralHead.x - kneeCenter.x) * 0.5,
                               y: vertex.y + (femoralHead.y - kneeCenter.y) * 0.5 };
      drawAngleArc(ctx, vertex, condLateralPt, femHeadPt, 38, "LDFA", "#38bdf8");
    }
  }

  // ── MPTA arc ─────────────────────────────────────────────────────────────
  if (kneeCenter && ankleCenter && tibPlateauMedial && tibPlateauLateral) {
    const exPlat = extendLine(tibPlateauMedial, tibPlateauLateral, 300);
    const vertex = lineIntersect(kneeCenter, ankleCenter, exPlat.a, exPlat.b);
    if (vertex) {
      const platMedialPt = { x: vertex.x + (tibPlateauMedial.x - tibPlateauLateral.x) * 0.5,
                              y: vertex.y + (tibPlateauMedial.y - tibPlateauLateral.y) * 0.5 };
      const tibAnklePt   = { x: vertex.x + (ankleCenter.x - kneeCenter.x) * 0.5,
                              y: vertex.y + (ankleCenter.y - kneeCenter.y) * 0.5 };
      drawAngleArc(ctx, vertex, platMedialPt, tibAnklePt, 38, "MPTA", "#14b8a6");
    }
  }

  // ── JLCA arc ─────────────────────────────────────────────────────────────
  if (femCondyleMedial && femCondyleLateral && tibPlateauMedial && tibPlateauLateral) {
    const jlcaVertex = lineIntersect(
      femCondyleMedial, femCondyleLateral,
      tibPlateauMedial, tibPlateauLateral,
    );
    if (jlcaVertex) {
      const cA = { x: jlcaVertex.x + (femCondyleLateral.x - femCondyleMedial.x) * 0.3,
                   y: jlcaVertex.y + (femCondyleLateral.y - femCondyleMedial.y) * 0.3 };
      const pA = { x: jlcaVertex.x + (tibPlateauLateral.x - tibPlateauMedial.x) * 0.3,
                   y: jlcaVertex.y + (tibPlateauLateral.y - tibPlateauMedial.y) * 0.3 };
      drawAngleArc(ctx, jlcaVertex, cA, pA, 26, "JLCA", "#e879f9");
    }
  }

  // ── Point labels ─────────────────────────────────────────────────────────
  drawPoint(ctx, femoralHead,       "CFH",  "#facc15");
  drawPoint(ctx, kneeCenter,        "CK",   "#f97316");
  drawPoint(ctx, ankleCenter,       "CA",   "#22c55e");
  drawPoint(ctx, femCondyleMedial,  "MFC",  "#38bdf8");
  drawPoint(ctx, femCondyleLateral, "LFC",  "#38bdf8");
  drawPoint(ctx, tibPlateauMedial,  "MTP",  "#14b8a6");
  drawPoint(ctx, tibPlateauLateral, "LTP",  "#14b8a6");
}

// ─── HKA axis shadow overlay ─────────────────────────────────────────────────
// All coords are in IMAGE space (called inside ctx.translate/scale block).
// `scale` is needed to keep pixel sizes consistent across zoom levels.

function drawHKAShadow(ctx, fh, kc, ac, deviation, direction, scale) {
  if (!fh || !kc || !ac) return;

  const hkaColor = deviation === null ? "#94a3b8"
    : deviation < 3  ? "#22d3ee"
    : deviation < 10 ? "#fbbf24"
    : "#f87171";

  const femDx = kc.x - fh.x, femDy = kc.y - fh.y;
  const femLen = Math.hypot(femDx, femDy) || 1;
  const femUx = femDx / femLen, femUy = femDy / femLen;

  const tibDx = kc.x - ac.x, tibDy = kc.y - ac.y;
  const tibLen = Math.hypot(tibDx, tibDy) || 1;
  const tibUx = tibDx / tibLen, tibUy = tibDy / tibLen;

  const extPast = Math.min(femLen, tibLen) * 0.28;
  const lw = 3.5 / scale;

  ctx.save();

  // Femoral shadow: femHead → knee → slight extension into tibial zone
  ctx.strokeStyle = "#facc1544";
  ctx.lineWidth = lw;
  ctx.setLineDash([]);
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 8 / scale;
  ctx.beginPath();
  ctx.moveTo(fh.x, fh.y);
  ctx.lineTo(kc.x + femUx * extPast, kc.y + femUy * extPast);
  ctx.stroke();

  // Tibial shadow: ankle → knee → slight extension into femoral zone
  ctx.strokeStyle = "#22c55e44";
  ctx.shadowColor = "#22c55e";
  ctx.beginPath();
  ctx.moveTo(ac.x, ac.y);
  ctx.lineTo(kc.x + tibUx * extPast, kc.y + tibUy * extPast);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  if (deviation !== null) {
    const arcR = Math.max(28 / scale, Math.min(56 / scale, Math.min(femLen, tibLen) * 0.20));

    const angFemPast = Math.atan2(femUy, femUx);
    const angTibPast = Math.atan2(tibUy, tibUx);
    let diff = angTibPast - angFemPast;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    if (Math.abs(diff) > 0.005) {
      ctx.strokeStyle = hkaColor + "dd";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(kc.x, kc.y, arcR, angFemPast, angTibPast, diff < 0);
      ctx.stroke();
    }

    // Label ON the femoral axis, offset perpendicular
    const labelDist = Math.min(femLen * 0.42, 90 / scale);
    const lx = kc.x - femUx * labelDist;
    const ly = kc.y - femUy * labelDist;
    const px = -femUy, py = femUx;
    const tx = lx + px * (14 / scale);
    const ty = ly + py * (14 / scale);

    const label = deviation < 3
      ? `HKA ${(180 - deviation).toFixed(1)}°`
      : `${deviation.toFixed(1)}° ${direction === "varus" ? "Varus" : "Valgus"}`;
    ctx.font = `bold ${12 / scale}px Arial`;
    ctx.strokeStyle = "rgba(0,0,0,0.82)";
    ctx.lineWidth = 3 / scale;
    ctx.setLineDash([]);
    ctx.strokeText(label, tx, ty);
    ctx.fillStyle = hkaColor;
    ctx.fillText(label, tx, ty);
  }

  ctx.restore();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function XrayCanvas({ imageFile, mode, activePoint, points, setPoints, hkaDeviation = null, direction = "varus" }) {
  const canvasRef  = useRef(null);
  const imageRef   = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [transform, setTransform]   = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  const imageUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!imageUrl) { imageRef.current = null; setImageReady(false); return; }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
        setTransform({
          scale,
          offsetX: (canvas.width  - img.width  * scale) / 2,
          offsetY: (canvas.height - img.height * scale) / 2,
        });
      }
    };
    img.src = imageUrl;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img    = imageRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img && imageReady) {
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);
      ctx.drawImage(img, 0, 0);

      if (mode === "full") {
        drawHKAShadow(ctx, points.femoralHead, points.kneeCenter, points.ankleCenter, hkaDeviation, direction, transform.scale);
        drawLine(ctx, points.femoralHead, points.kneeCenter, "#facc15", 4);
        drawLine(ctx, points.kneeCenter,  points.ankleCenter, "#22c55e", 4);
        drawPoint(ctx, points.femoralHead,  "CFH", "#facc15");
        drawPoint(ctx, points.kneeCenter,   "CK",  "#f97316");
        drawPoint(ctx, points.ankleCenter,  "CA",  "#22c55e");
      }

      if (mode === "fta") {
        drawLine(ctx, points.femurMidshaft10cm, points.femoralNotch,     "#facc15", 4);
        drawLine(ctx, points.tibiaMidshaft4cm,  points.tibiaMidshaft10cm, "#22c55e", 4);
        drawPoint(ctx, points.femurMidshaft10cm, "Fem2 shaft", "#facc15");
        drawPoint(ctx, points.femoralNotch,      "Notch",      "#f97316");
        drawPoint(ctx, points.tibiaMidshaft4cm,  "Tib1 4cm",  "#22c55e");
        drawPoint(ctx, points.tibiaMidshaft10cm, "Tib1 10cm", "#38bdf8");
      }

      if (mode === "jla") {
        drawJLAMode(ctx, points);
      }
    } else {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "18px Arial";
      ctx.fillText("Upload full-length X-ray / AP knee terlebih dahulu", 40, 60);
    }

    ctx.restore();
  }, [imageReady, mode, points, transform]);

  function handleClick(event) {
    const canvas = canvasRef.current;
    if (!canvas || !activePoint || !imageReady) return;
    const point = screenToImagePoint(event, canvas, transform);
    setPoints((prev) => ({ ...prev, [activePoint]: point }));
  }

  function handleWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(6, prev.scale * factor)),
    }));
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <canvas
        ref={canvasRef}
        width={900}
        height={1100}
        onClick={handleClick}
        onWheel={handleWheel}
        className="h-[72vh] w-full cursor-crosshair rounded-xl bg-slate-900 object-contain"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Scroll untuk zoom. Klik canvas untuk memasang landmark aktif.</span>
        {mode === "jla" && (
          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-600 text-[10px] font-medium">
            JLA Mode — 7 landmark
          </span>
        )}
      </div>

      {/* JLA color legend */}
      {mode === "jla" && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
          <span><span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1 align-middle" />Axis Fem (CFH→CK)</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />Axis Tib (CK→CA)</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-sky-400 mr-1 align-middle" />Kondilus Fem (MFC–LFC)</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-teal-500 mr-1 align-middle" />Plateau Tib (MTP–LTP)</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-fuchsia-400 mr-1 align-middle" />JLCA</span>
        </div>
      )}
    </div>
  );
}
