"use client";
import { useRef } from "react";

/**
 * SVG overlay untuk Free Warp mode.
 *
 * Strategi pointer capture:
 * - setPointerCapture dipasang di SVG root (elemen stabil, tidak pernah di-replace React)
 * - onPointerMove & onPointerUp ada di SVG root → selalu menerima event meski pointer keluar lingkaran
 * - Saat drag aktif, pointer-events SVG root di-set "all" via DOM langsung (tanpa re-render)
 *   sehingga canvas di bawah tidak menerima event yang mengganggu
 */
export default function FreeWarpOverlay({
  vertexPoints = [],
  curveHandles = [],
  selectedPointIndex = null,
  addPointMode = false,
  viewport = { width: 800, height: 600 },
  containerRef = null,
  screenToImagePoint = null,
  onSelectPoint,
  onDragStart,
  onMoveAnchor,
  onMoveHandle,
  onAddPoint,
  onDragEnd,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  function getImagePt(clientX, clientY) {
    const rect = containerRef?.current?.getBoundingClientRect();
    if (!rect || !screenToImagePoint) return null;
    return screenToImagePoint(clientX - rect.left, clientY - rect.top);
  }

  /* ── Drag helpers ────────────────────────────────────────────────────── */

  function enableSvgCapture(pointerId) {
    if (!svgRef.current) return;
    svgRef.current.style.pointerEvents = "all";
    svgRef.current.style.cursor = "grabbing";
    svgRef.current.setPointerCapture(pointerId);
  }

  function disableSvgCapture() {
    if (!svgRef.current) return;
    svgRef.current.style.pointerEvents = addPointMode ? "all" : "none";
    svgRef.current.style.cursor = addPointMode ? "crosshair" : "default";
  }

  /* ── Pointer handlers ────────────────────────────────────────────────── */

  function handleAnchorDown(e, pointIndex) {
    e.stopPropagation();
    enableSvgCapture(e.pointerId);
    dragRef.current = { type: "anchor", pointIndex };
    onDragStart?.(pointIndex);   // setHistoryPaused(true) + setSelectedFreeLinePointIndex — sekali saja
    onSelectPoint?.(pointIndex); // pastikan highlight kuning muncul segera
  }

  function handleHandleDown(e, pointIndex, handleKey) {
    e.stopPropagation();
    enableSvgCapture(e.pointerId);
    dragRef.current = { type: "handle", pointIndex, handleKey };
    onDragStart?.(undefined);    // setHistoryPaused(true) — sekali saja
  }

  function handleSvgMove(e) {
    if (!dragRef.current) return;
    const img = getImagePt(e.clientX, e.clientY);
    if (!img) return;
    if (dragRef.current.type === "anchor") {
      onMoveAnchor?.(dragRef.current.pointIndex, img.x, img.y);
    } else {
      onMoveHandle?.(dragRef.current.pointIndex, dragRef.current.handleKey, img.x, img.y);
    }
  }

  function handleSvgUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    disableSvgCapture();
    onDragEnd?.();
  }

  function handleAddPointerDown(e) {
    if (!addPointMode) return;
    // abaikan klik pada circles/handles (bukan latar SVG)
    if (e.target !== e.currentTarget) return;
    const img = getImagePt(e.clientX, e.clientY);
    if (!img) return;
    onAddPoint?.(img.x, img.y);
  }

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        zIndex: 22,
        pointerEvents: addPointMode ? "all" : "none",
        cursor: addPointMode ? "crosshair" : "default",
      }}
      width={viewport.width}
      height={viewport.height}
      onPointerMove={handleSvgMove}
      onPointerUp={handleSvgUp}
      onPointerCancel={handleSvgUp}
      onPointerDown={addPointMode ? handleAddPointerDown : undefined}
    >
      {vertexPoints.length > 0 && (
        <>
          {/* ── Handle arms ───────────────────────────────────────── */}
          {curveHandles.map((h, i) => (
            <line
              key={`arm-${i}`}
              x1={h.anchorScreenX} y1={h.anchorScreenY}
              x2={h.screenX} y2={h.screenY}
              stroke="rgba(251,146,60,0.85)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              pointerEvents="none"
            />
          ))}

          {/* ── Anchor points ─────────────────────────────────────── */}
          {vertexPoints.map((pt) => {
            const active = pt.pointIndex === selectedPointIndex;
            return (
              <g key={`anchor-${pt.pointIndex}`}>
                {/* glow ring saat aktif */}
                {active && (
                  <circle
                    cx={pt.screenX} cy={pt.screenY} r={15}
                    fill="rgba(251,191,36,0.15)"
                    stroke="rgba(217,119,6,0.3)"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                )}

                {/* lingkaran utama — hanya butuh onPointerDown, move/up di SVG root */}
                <circle
                  cx={pt.screenX} cy={pt.screenY}
                  r={active ? 9 : 7}
                  fill={active ? "#fef3c7" : "#ffffff"}
                  stroke={active ? "#d97706" : "#a855f7"}
                  strokeWidth={active ? 3 : 2}
                  style={{ cursor: "grab", pointerEvents: "all" }}
                  onPointerDown={(e) => handleAnchorDown(e, pt.pointIndex)}
                />

                {/* titik tengah amber saat aktif */}
                {active && (
                  <circle cx={pt.screenX} cy={pt.screenY} r={3}
                    fill="#d97706" pointerEvents="none" />
                )}

                {/* label nomor */}
                <text
                  x={pt.screenX + 11} y={pt.screenY - 9}
                  fontSize={9} fontWeight="bold"
                  fill={active ? "#b45309" : "#7c3aed"}
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {pt.pointIndex + 1}
                </text>
              </g>
            );
          })}

          {/* ── Bezier handle circles ──────────────────────────────── */}
          {curveHandles.map((h, i) => (
            <circle
              key={`hc-${i}`}
              cx={h.screenX} cy={h.screenY}
              r={6}
              fill={h.handleKey === "in" ? "#fde68a" : "#fdba74"}
              stroke="#c2410c"
              strokeWidth={2}
              style={{ cursor: "crosshair", pointerEvents: "all" }}
              onPointerDown={(e) => handleHandleDown(e, h.pointIndex, h.handleKey)}
            />
          ))}
        </>
      )}

      {/* ── Add mode hint ─────────────────────────────────────────── */}
      {addPointMode && (
        <text
          x={viewport.width / 2} y={22}
          textAnchor="middle"
          fontSize={11} fontWeight="bold"
          fill="rgba(59,130,246,0.95)"
          pointerEvents="none"
          style={{ userSelect: "none" }}
        >
          Klik canvas untuk sisipkan anchor point baru
        </text>
      )}
    </svg>
  );
}
