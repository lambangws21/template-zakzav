export const PELVIC_LANDMARK_IMAGE = {
  src: "/guides/pelvic-landmarks.svg",
  width: 379,
  height: 335,
  view: "AP pelvis",
  anonymized: true,
};

const LANDMARK_DEFINITIONS = [
  { key: "femoral_head_center", label: "Pusat femoral head", group: "femoral-head", right: [90.5, 194.5], left: [300.5, 189.5] },
  { key: "femoral_cortex_lateral", label: "Korteks femur lateral", group: "femoral-shaft", right: [30.5, 272.5], left: [360.5, 267.5] },
  { key: "teardrop", label: "Teardrop pelvis", group: "pelvic-reference", right: [103.5, 218.5], left: [287.5, 213.5] },
  { key: "femoral_head_lateral_edge", label: "Tepi lateral femoral head", group: "femoral-head", right: [70.5, 178.5], left: [320.5, 173.5] },
  { key: "femoral_head_medial_edge", label: "Tepi medial femoral head", group: "femoral-head", right: [108.5, 180.5], left: [282.5, 175.5] },
  { key: "femoral_head_superior_edge", label: "Tepi superior femoral head", group: "femoral-head", right: [72.5, 170.5], left: [318.5, 165.5] },
  { key: "acetabular_inferomedial_rim", label: "Rim acetabulum inferomedial", group: "acetabulum", right: [117.5, 213.5], left: [273.5, 208.5] },
  { key: "lesser_trochanter", label: "Lesser trochanter", group: "femoral-reference", right: [70.5, 242.5], left: [320.5, 237.5] },
  { key: "greater_trochanter_inferior", label: "Greater trochanter inferior", group: "femoral-reference", right: [35.5, 204.5], left: [355.5, 199.5] },
  { key: "greater_trochanter_lateral_tip", label: "Ujung lateral greater trochanter", group: "femoral-reference", right: [27.5, 192.5], left: [365.5, 188.5] },
  { key: "femoral_shaft_distal_center", label: "Pusat shaft femur distal", group: "femoral-shaft", right: [53.5, 323.5], left: [337.5, 318.5] },
  { key: "femoral_cortex_medial", label: "Korteks femur medial", group: "femoral-shaft", right: [70.5, 269.5], left: [320.5, 264.5] },
];

const normalize = ([x, y]) => ({
  x,
  y,
  nx: Number((x / PELVIC_LANDMARK_IMAGE.width).toFixed(6)),
  ny: Number((y / PELVIC_LANDMARK_IMAGE.height).toFixed(6)),
});

export const PELVIC_LANDMARKS = LANDMARK_DEFINITIONS.flatMap((definition) =>
  ["right", "left"].map((side) => ({
    id: `${definition.key}_${side}`,
    key: definition.key,
    label: definition.label,
    side,
    group: definition.group,
    markerColor: side === "right" ? "#ff1414" : "#0c41ff",
    ...normalize(definition[side]),
    validationStatus: "needs-clinical-review",
  })),
);

export const PELVIC_LANDMARK_BY_ID = Object.fromEntries(
  PELVIC_LANDMARKS.map((landmark) => [landmark.id, landmark]),
);

export function pelvicLandmarkId(key, side) {
  return `${key}_${side === "left" ? "left" : "right"}`;
}

export function getPelvicLandmarkDataset() {
  return {
    image: PELVIC_LANDMARK_IMAGE,
    coordinateSystem: "image-pixel-top-left",
    landmarks: PELVIC_LANDMARKS.map((landmark) => ({ ...landmark })),
  };
}
