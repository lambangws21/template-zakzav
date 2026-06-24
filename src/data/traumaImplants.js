/**
 * Katalog implant trauma untuk Trauma Planning.
 * Tambahkan SVG ke /public/implants/trauma/ dan entry baru di sini.
 */

export const TRAUMA_CATEGORIES = [
  { id: "plate", label: "Plate", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  { id: "nail",  label: "IM Nail", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { id: "screw", label: "Screw / Wire", color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
];

/**
 * @typedef {Object} TraumaSize
 * @property {number} holes
 * @property {number} lengthMm
 */

/**
 * @typedef {Object} TraumaImplant
 * @property {string} id
 * @property {"plate"|"nail"|"screw"} category
 * @property {string} system
 * @property {string} manufacturer
 * @property {string} name
 * @property {string} svgPath
 * @property {{key:string,label:string,svgPath?:string,physicalWidthMm?:number}[]} [views]
 * @property {string} [description]
 * @property {number} [screwDiameterMm]
 * @property {number} [plateWidthMm]
 * @property {TraumaSize[]} [sizeTable]
 */

/** @type {TraumaImplant[]} */
export const TRAUMA_IMPLANTS = [
  // ── PLATES ────────────────────────────────────────────────────────────────────
  {
    id: "lcp-narrow-35mm",
    category: "plate",
    system: "LCP",
    manufacturer: "Synthes",
    name: "LCP Straight Narrow 3.5mm",
    svgPath: "/implants/trauma/lcp-straight-narrow-35mm.svg",
    views: [
      { key: "ap", label: "AP", svgPath: "/implants/trauma/lcp-straight-narrow-35mm.svg", physicalWidthMm: 11 },
      { key: "lateral", label: "Lateral", svgPath: "/implants/trauma/lcp-straight-narrow-35mm-lateral.svg", physicalWidthMm: 8 },
    ],
    description: "Locking Compression Plate sempit lurus untuk diafisis",
    screwDiameterMm: 3.5,
    plateWidthMm: 11,
    sizeTable: [
      { holes: 7,  lengthMm: 101 },
      { holes: 8,  lengthMm: 117 },
    ],
  },
  {
    id: "lcp-condylar-distal-femur-plate-5.0mm",
    category: "plate",
    system: "LCP",
    manufacturer: "Synthes",
    name: "LCP Condylar Distal Femur Plate 5.0mm",
    svgPath: "/implants/trauma/LCPCondylarDistalFemurPlate5.0mm_side_view.svg",
    views: [
      { key: "lateral", label: "Lateral", svgPath: "/implants/trauma/LCPCondylarDistalFemurPlate5.0mm_side_view.svg", physicalWidthMm: 8 },
    ],
    description: "Locking Compression Plate sempit lurus untuk diafisis",
    screwDiameterMm: 5.0,
    plateWidthMm: 11,
    sizeTable: [
      { holes: 11,  lengthMm: 153  },
    ],
  },
];

export function getTraumaByCategory(categoryId) {
  return TRAUMA_IMPLANTS.filter((item) => item.category === categoryId);
}
