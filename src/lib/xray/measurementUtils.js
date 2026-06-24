import { clamp, getLineLength, getDistance, getAngleDegrees, getAngleArcGeometry, degToRad } from "./geometryUtils";
import { signedCoronalAngle as getHkaSignedCoronalAngle } from "../hka/geometry";
import { calculateFullLengthHKA, classifyAlignment } from "../hka/hkaCalculator";
import { calculateFTA, predictHKAAFromFTA } from "../hka/ftaCalculator";
import { computeJLA } from "../hka/jlaCalculator";

const DEFAULT_LABEL_OPACITY = 0.56;
const DEFAULT_HKA_LINE_COLOR = "#14b8a6";
const DEFAULT_HKA_LABEL_OFFSET_X = 0;
const DEFAULT_HKA_LABEL_OFFSET_Y = -16;

export const HKA_MODE_DEFINITIONS = {
  full: {
    key: "full",
    label: "HKA",
    modeLabel: "Full Length Standing HKA",
    points: [
      { key: "hip", shortLabel: "CFH", promptLabel: "center femoral head" },
      { key: "knee", shortLabel: "CK", promptLabel: "center knee / notch" },
      { key: "ankle", shortLabel: "CA", promptLabel: "center ankle" },
    ],
  },
  fta: {
    key: "fta",
    label: "FTA",
    modeLabel: "FTA (Fem2 + Tib1)",
    points: [
      { key: "femurMidshaft10cm", shortLabel: "Fem2", promptLabel: "Fem2 mid-shaft ±10 cm proximal" },
      { key: "femoralNotch", shortLabel: "Notch", promptLabel: "femoral notch" },
      { key: "tibiaMidshaft4cm", shortLabel: "Tib1 4", promptLabel: "Tib1 ±4 cm distal" },
      { key: "tibiaMidshaft10cm", shortLabel: "Tib1 10", promptLabel: "Tib1 ±10 cm distal" },
    ],
  },
  jla: {
    key: "jla",
    label: "JLA",
    modeLabel: "Joint Line Analysis (LDFA · MPTA · JLCA)",
    points: [
      { key: "hip",               shortLabel: "CFH",  promptLabel: "center femoral head" },
      { key: "knee",              shortLabel: "CK",   promptLabel: "center knee / notch" },
      { key: "ankle",             shortLabel: "CA",   promptLabel: "center ankle" },
      { key: "femCondyleMedial",  shortLabel: "MFC",  promptLabel: "kondilus femur medial (titik terendah)" },
      { key: "femCondyleLateral", shortLabel: "LFC",  promptLabel: "kondilus femur lateral (titik terendah)" },
      { key: "tibPlateauMedial",  shortLabel: "MTP",  promptLabel: "plateau tibia medial (titik tertinggi)" },
      { key: "tibPlateauLateral", shortLabel: "LTP",  promptLabel: "plateau tibia lateral (titik tertinggi)" },
    ],
  },
};

export function getAngleResultOpacity(angle) {
  const rawValue = Number.isFinite(angle?.resultOpacity)
    ? angle.resultOpacity
    : Number.isFinite(angle?.labelOpacity)
      ? angle.labelOpacity
      : DEFAULT_LABEL_OPACITY;
  return clamp(rawValue, 0.08, 1);
}

export function getHkaLineColor(hka) {
  return hka?.lineColor || DEFAULT_HKA_LINE_COLOR;
}

export function getHkaModeDefinition(mode = "full") {
  return HKA_MODE_DEFINITIONS[mode] || HKA_MODE_DEFINITIONS.full;
}

export function cloneOptionalPoint(point) {
  return point ? { ...point } : null;
}

export function getHkaPointEntries(hka) {
  const definition = getHkaModeDefinition(hka?.mode);
  return definition.points
    .map((pointDef) =>
      hka?.[pointDef.key]
        ? {
            ...pointDef,
            point: hka[pointDef.key],
          }
        : null,
    )
    .filter(Boolean);
}

export function getAnglePointEntries(angle) {
  if (!angle) return [];
  return [
    { key: "p1", point: angle.p1 },
    { key: "p2", point: angle.p2 },
    { key: "p3", point: angle.p3 },
  ].filter((entry) => entry.point);
}

export function cloneHkaItem(item) {
  const definition = getHkaModeDefinition(item?.mode);
  const cloned = {
    ...item,
    mode: definition.key,
    direction: item?.direction || "varus",
    side: item?.side || "right",
    showArc: definition.key === "full" ? item?.showArc !== false : false,
    lineColor: item?.lineColor || DEFAULT_HKA_LINE_COLOR,
    labelOffsetX: Number.isFinite(item?.labelOffsetX)
      ? item.labelOffsetX
      : DEFAULT_HKA_LABEL_OFFSET_X,
    labelOffsetY: Number.isFinite(item?.labelOffsetY)
      ? item.labelOffsetY
      : DEFAULT_HKA_LABEL_OFFSET_Y,
  };

  for (const pointDef of definition.points) {
    cloned[pointDef.key] = cloneOptionalPoint(item?.[pointDef.key]);
  }

  return cloned;
}

export function getHkaDraftNotice(mode, pointsPlaced) {
  const definition = getHkaModeDefinition(mode);
  const remaining = definition.points.length - pointsPlaced;
  if (remaining <= 0) return `${definition.label} siap dibuat.`;
  return `${definition.label}: pilih ${remaining} titik lagi (${definition.points
    .slice(pointsPlaced)
    .map((item) => item.promptLabel)
    .join(" -> ")}).`;
}

export function isMobilePrecisionInteractionMode(mode) {
  return [
    "move-handle",
    "move-angle-handle",
    "move-circle-center",
    "move-circle-radius",
    "move-circle-diameter",
    "move-circle-label",
    "move-hka-handle",
    "move-planning-guide-handle",
    "move-free-line-point",
    "move-free-line-curve-handle",
    "move-annotation",
    "move-annotation-pointer",
  ].includes(mode);
}

export function shouldAutoZoomMobilePrecisionInteractionMode(mode) {
  return [
    "move-handle",
    "move-angle-handle",
    "move-circle-center",
    "move-circle-radius",
    "move-circle-diameter",
    "move-circle-label",
    "move-hka-handle",
    "move-planning-guide-handle",
    "move-free-line-point",
    "move-free-line-curve-handle",
  ].includes(mode);
}

export function getMobileInteractionLabel(mode) {
  if (!mode) return "Edit";
  if (mode.includes("hka")) return "HKA";
  if (mode.includes("angle")) return "Angle";
  if (mode.includes("circle")) return "Circle";
  if (mode.includes("planning-guide")) return "Guide";
  if (mode.includes("cut-layer") || mode.includes("free-line")) return "Layer";
  if (mode.includes("annotation")) return "Note";
  if (mode.includes("line")) return "Line";
  return "Edit";
}

export function getHkaMeasurementResult(hka) {
  const mode = hka?.mode || "full";
  const definition = getHkaModeDefinition(mode);
  const isComplete = definition.points.every((pointDef) => hka?.[pointDef.key]);

  if (!isComplete) {
    return {
      mode,
      absoluteDeviation: null,
      signedDeviation: null,
      direction: hka?.direction || "varus",
      side: hka?.side || "right",
      label: mode === "fta" ? "FTA belum lengkap" : mode === "jla" ? "JLA belum lengkap" : "Belum lengkap",
      modeLabel: definition.modeLabel,
      fta: null,
      predictedHka: null,
      jla: null,
    };
  }

  if (mode === "fta") {
    const fta = calculateFTA({
      femurMidshaft10cm: hka.femurMidshaft10cm,
      femoralNotch: hka.femoralNotch,
      tibiaMidshaft4cm: hka.tibiaMidshaft4cm,
      tibiaMidshaft10cm: hka.tibiaMidshaft10cm,
    });
    const predictedHka = predictHKAAFromFTA(fta);

    return {
      mode,
      absoluteDeviation: predictedHka,
      signedDeviation: null,
      direction: hka.direction || "varus",
      side: hka.side || "right",
      label:
        fta !== null && predictedHka !== null
          ? `FTA ${fta.toFixed(1)}° -> HKAA ${predictedHka.toFixed(1)}°`
          : "FTA belum lengkap",
      modeLabel: definition.modeLabel,
      fta,
      predictedHka,
      jla: null,
    };
  }

  if (mode === "jla") {
    const jla = computeJLA({
      femoralHead:       hka.hip,
      kneeCenter:        hka.knee,
      ankleCenter:       hka.ankle,
      femCondyleMedial:  hka.femCondyleMedial,
      femCondyleLateral: hka.femCondyleLateral,
      tibPlateauMedial:  hka.tibPlateauMedial,
      tibPlateauLateral: hka.tibPlateauLateral,
    });
    return {
      mode,
      absoluteDeviation: jla?.JLCA ?? null,
      signedDeviation: null,
      direction: hka?.direction || "varus",
      side: hka?.side || "right",
      label: jla ? `LDFA ${jla.LDFA}° · MPTA ${jla.MPTA}°` : "JLA belum lengkap",
      modeLabel: definition.modeLabel,
      fta: null,
      predictedHka: null,
      jla,
    };
  }

  const direction = hka.direction || "varus";
  const side = hka.side || "right";
  const result = calculateFullLengthHKA({
    femoralHead: hka.hip,
    kneeCenter: hka.knee,
    ankleCenter: hka.ankle,
    side,
  });
  const absoluteDeviation = result?.absoluteDeviation ?? null;
  const signedDeviation = normalizeHkaSignedDeviation(
    getHkaSignedCoronalAngle(hka.hip, hka.knee, hka.ankle),
  );

  return {
    mode,
    absoluteDeviation,
    signedDeviation,
    direction,
    side,
    label: classifyAlignment(absoluteDeviation, direction),
    modeLabel: definition.modeLabel,
    fta: null,
    predictedHka: null,
    jla: null,
  };
}

export function normalizeHkaSide(side) {
  return String(side || "").toLowerCase() === "left" ? "left" : "right";
}

export function normalizeHkaSignedDeviation(rawAngle) {
  if (!Number.isFinite(rawAngle)) return null;
  let normalized = rawAngle;
  if (normalized > 90) normalized -= 180;
  if (normalized < -90) normalized += 180;
  return normalized;
}

export function inferHkaDirectionFromSignedDeviation(signedDeviation, side, fallback = "varus") {
  if (!Number.isFinite(signedDeviation) || Math.abs(signedDeviation) < 0.2) {
    return fallback === "valgus" ? "valgus" : "varus";
  }
  const normalizedSide = normalizeHkaSide(side);
  // Konvensi radiologis: kaki kanan tampil di KIRI gambar → medial ke KANAN layar
  // Varus kanan = lutut lateral = ke kiri → deviation < 0
  // Valgus kanan = lutut medial = ke kanan → deviation > 0
  const isVarus =
    normalizedSide === "right" ? signedDeviation < 0 : signedDeviation > 0;
  return isVarus ? "varus" : "valgus";
}

export function inferHkaDirectionFromPoints(hip, knee, ankle, side, fallback = "varus") {
  return inferHkaDirectionFromSignedDeviation(
    normalizeHkaSignedDeviation(getHkaSignedCoronalAngle(hip, knee, ankle)),
    side,
    fallback,
  );
}

export function getHkaSideLabel(side) {
  return normalizeHkaSide(side) === "left" ? "Kaki kiri" : "Kaki kanan";
}

export function getHkaCanvasLabelText(measurement, expanded = false) {
  if (!measurement) return "HKA";

  if (measurement.mode === "fta") {
    if (measurement.fta === null) return "FTA";
    if (expanded && measurement.predictedHka !== null) {
      return `FTA ${measurement.fta.toFixed(1)}° | HKAA ${measurement.predictedHka.toFixed(1)}°`;
    }
    return `FTA ${measurement.fta.toFixed(1)}°`;
  }

  if (measurement.mode === "jla") {
    const jla = measurement.jla;
    if (!jla) return "JLA";
    if (expanded) {
      return `LDFA ${jla.LDFA}° | MPTA ${jla.MPTA}° | JLCA ${jla.JLCA}°`;
    }
    return `${jla.cpakType} | LDFA ${jla.LDFA}°`;
  }

  if (measurement.absoluteDeviation === null) return "HKA";
  const sidePrefix = normalizeHkaSide(measurement.side) === "left" ? "L" : "R";
  if (expanded) {
    return `${sidePrefix} ${measurement.label} (${measurement.absoluteDeviation.toFixed(1)}°)`;
  }
  if (measurement.absoluteDeviation < 3) {
    return `${sidePrefix} Neutral ${measurement.absoluteDeviation.toFixed(1)}°`;
  }
  return `${sidePrefix} ${
    measurement.direction === "valgus" ? "Valgus" : "Varus"
  } ${measurement.absoluteDeviation.toFixed(1)}°`;
}

export function getAngleCanvasLabelText(angle, expanded = false) {
  if (!angle) return "ANGLE";
  const value = getAngleDegrees(angle.p1, angle.p2, angle.p3);
  if (!Number.isFinite(value)) return "ANGLE";
  if (expanded) {
    return `ANGLE: ${value.toFixed(1)}°`;
  }
  return `${value.toFixed(1)}°`;
}

export function getCircleDiameterText(
  circle,
  mmPerPixel,
  measurementUnit = "cm",
  decimals = 1,
) {
  if (!circle) return "-";
  if (mmPerPixel !== null) {
    const diameterMm = circle.radius * 2 * mmPerPixel;
    return measurementUnit === "cm"
      ? `${(diameterMm / 10).toFixed(decimals)} ${measurementUnit}`
      : `${diameterMm.toFixed(decimals)} ${measurementUnit}`;
  }
  return `${(circle.radius * 2).toFixed(decimals)} px`;
}

export function getCircleCanvasLabelText(
  circle,
  mmPerPixel,
  measurementUnit = "cm",
  expanded = false,
) {
  if (!circle) return "DIA";
  if (circle.source === "centerFinder") {
    return expanded
      ? `CTR | DIA: ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 2)}`
      : "CTR";
  }
  return expanded
    ? `DIA: ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 2)}`
    : `DIA ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 1)}`;
}

