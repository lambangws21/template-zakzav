import { TRAUMA_IMPLANTS } from "../../data/traumaImplants.js";

/**
 * @typedef {"stem" | "cup" | "knee" | "trauma"} ImplantLibraryType
 */

/**
 * @typedef {Object} ImplantLibraryItem
 * @property {string} id
 * @property {string} brand
 * @property {string} system
 * @property {ImplantLibraryType} type
 * @property {number|string} size
 * @property {string} label
 * @property {string} imageSrc
 * @property {"A5"|string} [physicalSize]
 * @property {number} [physicalWidthMm]
 * @property {number} [physicalHeightMm]
 * @property {boolean} [transparentWhiteBackground]
 * @property {"ap"|"lateral"|string} [implantViewMode]
 * @property {"svg"|"ruler"} [templateSource]
 */

export const IMPLANT_LIBRARY_TYPE_LABELS = {
  stem: "Stem",
  cup: "Cup",
  knee: "Knee",
  trauma: "Trauma",
};

export const NORMMED_FEMORAL_SIZES = [
  { size: 1, width: 56, length: 45.3, height: 51.8 },
  { size: 2, width: 60.5, length: 49.25, height: 56.65 },
  { size: 3, width: 64.15, length: 52.3, height: 61 },
  { size: 4, width: 68, length: 54.4, height: 64.9 },
  { size: 5, width: 72.6, length: 57.1, height: 68.7 },
  { size: 6, width: 77, length: 59.65, height: 72.7 },
];

export const NORMMED_TIBIAL_SIZES = [
  { size: 1, width: 56, length: 45.3, height: 40.8 },
  { size: 2, width: 60.5, length: 49.25, height: 41.8 },
  { size: 3, width: 64.15, length: 52.3, height: 42.8 },
  { size: 4, width: 68, length: 54.4, height: 43.8 },
  { size: 5, width: 72.6, length: 57.1, height: 44.8 },
  { size: 6, width: 77, length: 59.65, height: 45.8 },
];

const AVENIR_STANDARD_SVG_SIZES = [
  { size: 1, ap: [54.79661, 152.36107], lateral: [16.66102, 153.47868] },
  { size: 2, ap: [55.51397, 159.03474], lateral: [16.81795, 159.98074] },
  { size: 3, ap: [56.62256, 164.36892], lateral: [16.92791, 166.17397] },
  { size: 4, ap: [57.67797, 170.69223], lateral: [17, 171.71927] },
  { size: 5, ap: [58.46259, 177.39492], lateral: [17.98639, 178.33929] },
  { size: 6, ap: [59.84148, 183.50567], lateral: [18.27319, 184.53695] },
  { size: 7, ap: [61.64467, 189.03863], lateral: [18.83587, 190.24034] },
  { size: 8, ap: [64.29924, 194.67079], lateral: [19.32883, 196.21559] },
  { size: 9, ap: [66.3824, 201.15836], lateral: [19.6819, 202.3607] },
];

const AVENIR_STANDARD_SVG_LIBRARY = AVENIR_STANDARD_SVG_SIZES.flatMap(
  (dimensions) =>
    [
      { view: "AP", viewKey: "ap", canvas: dimensions.ap },
      {
        view: "Lateral",
        viewKey: "lateral",
        canvas: dimensions.lateral,
      },
    ].map((view) => ({
      id: `avenir-standard-right-${view.viewKey}-${dimensions.size}-svg`,
      brand: "Zimmer",
      system: `Avenir Standard Right ${view.view} (SVG)`,
      type: "stem",
      size: dimensions.size,
      label: `Avenir Standard Right ${view.view} Size ${dimensions.size}`,
      imageSrc: `/Avenir_Stem_Only_SVG/${view.view === "AP" ? "AP" : "Lateral"}/Avenir_Standard_Right_Size_0${dimensions.size}_${view.view}.svg`,
      physicalSize: null,
      physicalWidthMm: view.canvas[0],
      physicalHeightMm: view.canvas[1],
      transparentWhiteBackground: false,
      implantViewMode: view.viewKey,
      templateSource: "svg",
    })),
);

const ML_TAPER_SVG_SIZES = [
  {
    size: 4,
    fileSize: "4",
    ap: [77.8313253, 173.85352194],
    lateral: [16.86746988, 172.88766904],
  },
  {
    size: 5,
    fileSize: "5",
    ap: [76.9047619, 177.82634304],
    lateral: [16.66666667, 176.87157072],
  },
  {
    size: 6,
    fileSize: "6",
    ap: [76.9047619, 177.88189393],
    lateral: [16.66666667, 176.92682336],
  },
  {
    size: 7.5,
    fileSize: "7_5",
    ap: [76.9047619, 177.66662537],
    lateral: [16.66666667, 176.7127106],
  },
  {
    size: 9,
    fileSize: "9",
    ap: [75.11627907, 174.40459314],
    lateral: [16.27906977, 173.46186561],
  },
  {
    size: 10,
    fileSize: "10",
    ap: [77.8313253, 178.30002196],
    lateral: [16.86746988, 177.33362618],
  },
  {
    size: 11,
    fileSize: "11",
    ap: [77.8313253, 178.27764706],
    lateral: [16.86746988, 177.31137255],
  },
  {
    size: 12.5,
    fileSize: "12_5",
    ap: [78.7804878, 181.76605286],
    lateral: [17.07317073, 180.80049614],
  },
];

const ML_TAPER_SVG_LIBRARY = ML_TAPER_SVG_SIZES.flatMap((dimensions) =>
  [
    { view: "AP", viewKey: "ap", canvas: dimensions.ap },
    {
      view: "Lateral",
      viewKey: "lateral",
      canvas: dimensions.lateral,
    },
  ].map((view) => ({
    id: `ml-taper-svg-${view.viewKey}-${String(dimensions.size).replace(".", "-")}`,
    brand: "Zimmer",
    system: `M/L Taper ${view.view} (SVG)`,
    type: "stem",
    size: dimensions.size,
    label: `M/L Taper ${view.view} Size ${dimensions.size} (SVG)`,
    imageSrc: `/ML_Taper_SVG/ML_Taper_Size_${dimensions.fileSize}_${view.view}_Reference.svg`,
    physicalSize: null,
    physicalWidthMm: view.canvas[0],
    physicalHeightMm: view.canvas[1],
    transparentWhiteBackground: false,
    implantViewMode: view.viewKey,
    templateSource: "svg",
  })),
);

const NORMMED_FEMORAL_LIBRARY = NORMMED_FEMORAL_SIZES.flatMap((dimensions) =>
  [
    {
      view: "AP",
      viewKey: "ap",
      physicalWidthMm: dimensions.width + 1,
      physicalHeightMm: dimensions.length + 1,
    },
    {
      view: "Lateral",
      viewKey: "lateral",
      physicalWidthMm: dimensions.length + 1,
      physicalHeightMm: dimensions.height + 1,
    },
  ].map((view) => ({
    id: `normmed-femoral-${view.viewKey}-${dimensions.size}`,
    brand: "Normmed",
    system: `Normmed Femoral ${view.view}`,
    type: "knee",
    size: dimensions.size,
    label: `Normmed Femoral ${view.view} Size ${dimensions.size}`,
    imageSrc: `/Femoral_AP_Lateral_Size_1-6_Normmed/Femoral_${view.view}_Size_${dimensions.size}.svg`,
    physicalSize: null,
    physicalWidthMm: view.physicalWidthMm,
    physicalHeightMm: view.physicalHeightMm,
    transparentWhiteBackground: false,
    implantViewMode: view.viewKey,
  })),
);

const NORMMED_TIBIAL_LIBRARY = NORMMED_TIBIAL_SIZES.flatMap((dimensions) =>
  [
    {
      view: "AP",
      viewKey: "ap",
      physicalWidthMm: dimensions.width + 1,
      physicalHeightMm: dimensions.height + 1,
    },
    {
      view: "Lateral",
      viewKey: "lateral",
      physicalWidthMm: dimensions.length + 1,
      physicalHeightMm: dimensions.height + 1,
    },
  ].map((view) => ({
    id: `normmed-tibial-${view.viewKey}-${dimensions.size}`,
    brand: "Normmed",
    system: `Normmed Tibial ${view.view} (DRAFT)`,
    type: "knee",
    size: dimensions.size,
    label: `Normmed Tibial ${view.view} Size ${dimensions.size} (DRAFT)`,
    imageSrc: `/Tibial_AP_Lateral_Size_1-6_DRAFT/Tibial_${view.view}_Size_0${dimensions.size}_DRAFT.svg`,
    physicalSize: null,
    physicalWidthMm: view.physicalWidthMm,
    physicalHeightMm: view.physicalHeightMm,
    transparentWhiteBackground: false,
    implantViewMode: view.viewKey,
  })),
);

const ZIMMER_KNEE_SVG_LIBRARY = [
  {
    id: "zimmer-nexgen-svg-femoral-a-ap",
    system: "NexGen Femoral SVG (Provisional)",
    size: "A",
    label: "NexGen Femoral A AP (SVG, Provisional)",
    imageSrc: "/Knee_Femoral_Tibia_Zimmer_SVG/Femoral_A_AP.svg",
    physicalWidthMm: 55.732064,
    physicalHeightMm: 43.256018,
    implantViewMode: "ap",
  },
  {
    id: "zimmer-nexgen-svg-femoral-a-lateral",
    system: "NexGen Femoral SVG (Provisional)",
    size: "A",
    label: "NexGen Femoral A Lateral (SVG, Provisional)",
    imageSrc: "/Knee_Femoral_Tibia_Zimmer_SVG/Femoral_A_Lateral.svg",
    physicalWidthMm: 48.218082,
    physicalHeightMm: 44.67375,
    implantViewMode: "lateral",
  },
  {
    id: "zimmer-nexgen-svg-tibial-1-ap",
    system: "NexGen Tibial SVG (Provisional)",
    size: 1,
    label: "NexGen Tibia Size 1 AP (SVG, Provisional)",
    imageSrc: "/Knee_Femoral_Tibia_Zimmer_SVG/Tibia_Size_1_AP.svg",
    physicalWidthMm: 52.476313,
    physicalHeightMm: 45.48381,
    implantViewMode: "ap",
  },
  {
    id: "zimmer-nexgen-svg-tibial-1-lateral",
    system: "NexGen Tibial SVG (Provisional)",
    size: 1,
    label: "NexGen Tibia Size 1 Lateral (SVG, Provisional)",
    imageSrc: "/Knee_Femoral_Tibia_Zimmer_SVG/Tibia_Size_1_Lateral.svg",
    physicalWidthMm: 44.20775,
    physicalHeightMm: 44.810686,
    implantViewMode: "lateral",
  },
].map((item) => ({
  ...item,
  brand: "Zimmer",
  type: "knee",
  physicalSize: null,
  transparentWhiteBackground: false,
  templateSource: "svg",
}));

/**
 * Port tahap 1:
 * - katalog implant lokal dipindahkan dari project `bukubelajar`
 * - dipilih subset yang paling relevan untuk workflow templating saat ini
 *
 * @type {ImplantLibraryItem[]}
 */
const BASE_LIBRARY = [
  {
    id: "cup-trilogy",
    brand: "Zimmer",
    system: "Trilogy",
    type: "cup",
    size: "48-58",
    label: "Trilogy Cup (48-58)",
    imageSrc: "/images/cup/acetabulum/trilogy.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "cup-trilogy-36-56",
    brand: "Zimmer",
    system: "Trilogy",
    type: "cup",
    size: "36-56",
    label: "Trilogy Cup (36-56)",
    imageSrc: "/images/cup/acetabulum/Trilogy36-56.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "cup-trilogy-58-70",
    brand: "Zimmer",
    system: "Trilogy",
    type: "cup",
    size: "58-70",
    label: "Trilogy Cup (58-70)",
    imageSrc: "/images/cup/acetabulum/Trilogy58-70.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "bipolar-38-39",
    brand: "Zimmer",
    system: "Bipolar",
    type: "cup",
    size: "38-39",
    label: "Bipolar OD 38-39",
    imageSrc: "/images/cup/bipolar/Ringloc_OD_38mm_39mm_with_ruler.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "bipolar-40-43",
    brand: "Zimmer",
    system: "Bipolar",
    type: "cup",
    size: "40-43",
    label: "Bipolar OD 40-43",
    imageSrc: "/images/cup/bipolar/Ringloc_OD_40mm_43mm_with_ruler.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "bipolar-44-49",
    brand: "Zimmer",
    system: "Bipolar",
    type: "cup",
    size: "44-49",
    label: "Bipolar OD 44-49",
    imageSrc: "/images/cup/bipolar/Ringloc_OD_44mm_49mm_with_ruler.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },

  {
    id: "bipolar-50-54",
    brand: "Zimmer",
    system: "Bipolar",
    type: "cup",
    size: "50-54",
    label: "Bipolar OD 50-54",
    imageSrc: "/images/cup/bipolar/Ringloc_OD_50mm_54mm_with_ruler.png",
    physicalSize: "A5",
    transparentWhiteBackground: true,
  },
  {
    id: "mlt-4",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 4,
    label: "ML Taper Size 4",
    imageSrc: "/images/implant/ml-tapper/size4.png",
  },
  {
    id: "mlt-5",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 5,
    label: "ML Taper Size 5",
    imageSrc: "/images/implant/ml-tapper/size5.png",
  },
  {
    id: "mlt-6",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 6,
    label: "ML Taper Size 6",
    imageSrc: "/images/implant/ml-tapper/size6.png",
  },
  {
    id: "mlt-7-5",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 7.5,
    label: "ML Taper Size 7.5",
    imageSrc: "/images/implant/ml-tapper/size7-5.png",
  },
  {
    id: "mlt-9",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 9,
    label: "ML Taper Size 9",
    imageSrc: "/images/implant/ml-tapper/size9.png",
  },
  {
    id: "mlt-10",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 10,
    label: "ML Taper Size 10",
    imageSrc: "/images/implant/ml-tapper/size10.png",
  },
  {
    id: "mlt-11",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 11,
    label: "ML Taper Size 11",
    imageSrc: "/images/implant/ml-tapper/size11.png",
  },
  {
    id: "mlt-12-5",
    brand: "Zimmer",
    system: "ML Taper",
    type: "stem",
    size: 12.5,
    label: "ML Taper Size 12.5",
    imageSrc: "/images/implant/ml-tapper/size12-5.png",
  },
  {
    id: "cptxs-1",
    brand: "Zimmer",
    system: "CPT Cemented",
    type: "stem",
    size: "XS",
    label: "CPT Cemented Size XS",
    imageSrc: "/images/implant/CPT/CPTXS.png",
  },
  {
    id: "cptxs-0",
    brand: "Zimmer",
    system: "CPT Cemented",
    type: "stem",
    size: 0,
    label: "CPT Cemented Size 0",
    imageSrc: "/images/implant/CPT/CPT0.png",
  },
  {
    id: "cpt-1",
    brand: "Zimmer",
    system: "CPT Cemented",
    type: "stem",
    size: 1,
    label: "CPT Cemented Size 1",
    imageSrc: "/images/implant/CPT/CPT1.png",
  },
  {
    id: "cpt-2",
    brand: "Zimmer",
    system: "CPT Cemented",
    type: "stem",
    size: 2,
    label: "CPT Cemented Size 2",
    imageSrc: "/images/implant/CPT/CPT2.png",
  },
  {
    id: "cpt-3",
    brand: "Zimmer",
    system: "CPT Cemented",
    type: "stem",
    size: 3,
    label: "CPT Cemented Size 3",
    imageSrc: "/images/implant/CPT/CPT3.png",
  },
  {
    id: "wagner-1415",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "14-15",
    label: "Wagner SL Size 14-15",
    imageSrc: "/images/implant/wagner/wagner14-15.png",
  },
  {
    id: "wagner-1617",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "16-17",
    label: "Wagner SL Size 16-17",
    imageSrc: "/images/implant/wagner/wagner16-17.png",
  },
  {
    id: "wagner-1819",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "18-19",
    label: "Wagner SL Size 18-19",
    imageSrc: "/images/implant/wagner/wagner18-19.png",
  },
  {
    id: "wagner-2021",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "20-21",
    label: "Wagner SL Size 20-21",
    imageSrc: "/images/implant/wagner/wagner20-21.png",
  },
  {
    id: "wagner-2223",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "22-23",
    label: "Wagner SL Size 22-23",
    imageSrc: "/images/implant/wagner/wagner22-23.png",
  },
  {
    id: "wagner-2425",
    brand: "Zimmer",
    system: "Wagner SL",
    type: "stem",
    size: "24-25",
    label: "Wagner SL Size 24-25",
    imageSrc: "/images/implant/wagner/wagner24-25.png",
  },
  ...[1, 2, 3, 4, 5, 6, 7].map((size) => ({
    id: `normmed-nm-${size}`,
    brand: "Normmed",
    system: "Normmed NM",
    type: "stem",
    size,
    label: `Normmed NM Stem Size ${size}`,
    imageSrc: `/Zakzav_NM_Green_Layers/NM_Size_0${size}_Green_Transparent.png`,
    physicalSize: null,
    transparentWhiteBackground: false,
    implantViewMode: "ap",
  })),
  ...AVENIR_STANDARD_SVG_LIBRARY,
  ...ML_TAPER_SVG_LIBRARY,
  ...NORMMED_FEMORAL_LIBRARY,
  ...NORMMED_TIBIAL_LIBRARY,
  ...ZIMMER_KNEE_SVG_LIBRARY,
  {
    id: "nexgen-ruler",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: "ruler",
    label: "NexGen Ruler",
    imageSrc: "/images/implant/nexgen/Ruler.png",
  },
  {
    id: "nexgen-fem-ab",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: "1-2",
    label: "NexGen Femoral (A-B) (1-2)",
    imageSrc: "/images/implant/nexgen/Fem-AB.png",
  },
  {
    id: "nexgen-fem-cd",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: "3-4",
    label: "NexGen Femoral (C-D) (3-4)",
    imageSrc: "/images/implant/nexgen/Fem-CD.png",
  },
  {
    id: "nexgen-fem-ef",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: "5-6",
    label: "NexGen Femoral (E-F) (5-6)",
    imageSrc: "/images/implant/nexgen/Fem-EF.png",
  },
  {
    id: "nexgen-fem-g",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 7,
    label: "NexGen Femoral (G) (7)",
    imageSrc: "/images/implant/nexgen/Fem-G.png",
  },
  {
    id: "nexgen-tib-1",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 1,
    label: "NexGen Tibial (1)",
    imageSrc: "/images/implant/nexgen/Tib-1.png",
  },
  {
    id: "nexgen-tib-2",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 2,
    label: "NexGen Tibial (2)",
    imageSrc: "/images/implant/nexgen/Tib-2.png",
  },
  {
    id: "nexgen-tib-3",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 3,
    label: "NexGen Tibial (3)",
    imageSrc: "/images/implant/nexgen/Tib-3.png",
  },
  {
    id: "nexgen-tib-4",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 4,
    label: "NexGen Tibial (4)",
    imageSrc: "/images/implant/nexgen/Tib-4.png",
  },
  {
    id: "nexgen-tib-5",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 5,
    label: "NexGen Tibial (5)",
    imageSrc: "/images/implant/nexgen/Tib-5.png",
  },
  {
    id: "nexgen-tib-6",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 6,
    label: "NexGen Tibial (6)",
    imageSrc: "/images/implant/nexgen/Tib-6.png",
  },
  {
    id: "nexgen-tib-7",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: 7,
    label: "NexGen Tibial (7)",
    imageSrc: "/images/implant/nexgen/Tib-7.png",
  },
  {
    id: "nexgen-c",
    brand: "Zimmer",
    system: "NexGen",
    type: "knee",
    size: "C",
    label: "NexGen C",
    imageSrc: "/images/implant/nexgen/C-1.png",
  },
].map((item) => ({
  ...item,
  physicalSize: item.physicalSize === undefined ? "A5" : item.physicalSize,
  transparentWhiteBackground: item.transparentWhiteBackground ?? true,
}));

// ── Trauma implants ────────────────────────────────────────────────────────────
// Tab TRAU memakai katalog yang sama dengan Trauma Planning agar Simple UI tidak
// tertinggal saat src/data/traumaImplants.js diperbarui.
const TRAUMA_LIBRARY = TRAUMA_IMPLANTS.flatMap((implant) => {
  const preferredView =
    implant.views?.find((view) => view.key === "lateral") ||
    implant.views?.[0] ||
    null;
  const imageSrc = preferredView?.svgPath || implant.svgPath;
  const physicalWidthMm =
    preferredView?.physicalWidthMm ?? implant.plateWidthMm ?? null;
  const sizes = implant.sizeTable?.length
    ? implant.sizeTable
    : [{ holes: null, lengthMm: implant.physicalHeightMm ?? null }];

  return sizes.map((sizeRow, index) => {
    const sizeLabel = sizeRow.holes ? `${sizeRow.holes} lubang` : "custom";
    const lengthLabel = sizeRow.lengthMm ? ` (${sizeRow.lengthMm}mm)` : "";
    return {
      id: `${implant.id}-${preferredView?.key || "view"}-${sizeRow.holes || index}`,
      brand: implant.manufacturer || "Trauma",
      system: implant.name,
      type: "trauma",
      size: sizeLabel,
      label: `${implant.name} — ${preferredView?.label || "View"} — ${sizeLabel}${lengthLabel}`,
      imageSrc,
      physicalWidthMm,
      physicalHeightMm: sizeRow.lengthMm ?? null,
      physicalSize: null,
      transparentWhiteBackground: false,
      implantViewMode: preferredView?.key || null,
    };
  });
});

export const LOCAL_IMPLANT_LIBRARY = [...BASE_LIBRARY, ...TRAUMA_LIBRARY];

export const LOCAL_IMPLANT_LIBRARY_TYPES = ["stem", "cup", "knee", "trauma"];

export function getImplantLibraryItemById(
  itemId,
  items = LOCAL_IMPLANT_LIBRARY,
) {
  return items.find((item) => String(item.id) === String(itemId)) || null;
}

export function getImplantLibraryItemsByType(
  type,
  items = LOCAL_IMPLANT_LIBRARY,
) {
  return items.filter((item) => item.type === type);
}

export function groupImplantLibraryBySystem(items = LOCAL_IMPLANT_LIBRARY) {
  return items.reduce((acc, item) => {
    const key = item.system || "Lainnya";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function countImplantLibraryByType(items = LOCAL_IMPLANT_LIBRARY) {
  return LOCAL_IMPLANT_LIBRARY_TYPES.reduce((acc, type) => {
    acc[type] = items.filter((item) => item.type === type).length;
    return acc;
  }, {});
}
