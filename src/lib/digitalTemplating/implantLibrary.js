/**
 * @typedef {"stem" | "cup" | "knee"} ImplantLibraryType
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
 */

export const IMPLANT_LIBRARY_TYPE_LABELS = {
  stem: "Stem",
  cup: "Cup",
  knee: "Knee",
};

/**
 * Port tahap 1:
 * - katalog implant lokal dipindahkan dari project `bukubelajar`
 * - dipilih subset yang paling relevan untuk workflow templating saat ini
 *
 * @type {ImplantLibraryItem[]}
 */
export const LOCAL_IMPLANT_LIBRARY = [
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
  physicalSize: item.physicalSize || "A5",
  transparentWhiteBackground: item.transparentWhiteBackground ?? true,
}));

export const LOCAL_IMPLANT_LIBRARY_TYPES = ["stem", "cup", "knee"];

export function getImplantLibraryItemById(itemId, items = LOCAL_IMPLANT_LIBRARY) {
  return items.find((item) => String(item.id) === String(itemId)) || null;
}

export function getImplantLibraryItemsByType(type, items = LOCAL_IMPLANT_LIBRARY) {
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
