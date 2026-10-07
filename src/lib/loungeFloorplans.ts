// Bird's-eye room visualisations (approximate, not to scale). Geometry is in the
// NATIVE pixel space of each background image and mapped to stable lounge IDs.
export type RoomId = "agostea" | "lavie" | "mausefalle";

export interface FloorNode {
  loungeId: string;
  short: string; // badge label on the map
  name: string; // fallback full name
  x: number; y: number; w: number; h: number; // seating outline / hit region
  bx: number; by: number; // badge center
}

export interface FloorLabel {
  label: { de: string; en: string };
  x: number; y: number; // center
}

export interface FloorRoom {
  id: RoomId;
  name: string;
  image: string;
  nodes: FloorNode[];
  labels: FloorLabel[];
}

/** All room images share this native size (portrait 2:3). */
export const FLOOR_VIEWBOX = { w: 1024, h: 1536 };

export const FLOORPLANS: FloorRoom[] = [
  {
    id: "agostea",
    name: "AGOSTEA",
    image: "/images/floorplans/agostea-birdseye-v2.webp",
    labels: [
      { label: { de: "DJ", en: "DJ" }, x: 511, y: 273 },
      { label: { de: "TANZFLÄCHE", en: "DANCEFLOOR" }, x: 512, y: 590 },
      { label: { de: "BAR", en: "BAR" }, x: 512, y: 1250 },
    ],
    nodes: [
      { loungeId: "d36c1786-9dc2-4fa1-bd6d-6f4c96602ded", short: "B1", name: "Bungalow 1", x: 135, y: 122, w: 234, h: 238, bx: 250, by: 242 },
      { loungeId: "497704e5-9629-4541-b6f4-9a9db5ec77d4", short: "B2", name: "Bungalow 2", x: 656, y: 123, w: 233, h: 242, bx: 770, by: 242 },
      { loungeId: "6ebed4dd-f2c9-4534-9ffd-cef4a375bb5e", short: "L1", name: "Lounge 1", x: 111, y: 849, w: 250, h: 239, bx: 260, by: 971 },
      { loungeId: "fc3cc5d3-f006-488f-9b81-3cec6368e00d", short: "L2", name: "Lounge 2", x: 414, y: 849, w: 196, h: 228, bx: 512, by: 971 },
      { loungeId: "a4de67ea-d033-474b-a390-d8909dfbcf45", short: "L3", name: "Lounge 3", x: 670, y: 849, w: 246, h: 239, bx: 760, by: 971 },
    ],
  },
  {
    id: "lavie",
    name: "LA VIE",
    image: "/images/floorplans/lavie-birdseye-v2.webp",
    labels: [
      { label: { de: "DJ", en: "DJ" }, x: 521, y: 200 },
      { label: { de: "BAR", en: "BAR" }, x: 573, y: 824 },
      { label: { de: "TREPPE", en: "STAIRS" }, x: 859, y: 170 },
    ],
    nodes: [
      { loungeId: "29036735-9bef-42b7-bb5e-28ce4ae34141", short: "B4", name: "Bungalow 4", x: 90, y: 121, w: 285, h: 250, bx: 236, by: 246 },
      { loungeId: "4663d055-4fb8-4342-bb7f-811b53cc8dfa", short: "B3", name: "Bungalow 3", x: 95, y: 437, w: 264, h: 319, bx: 225, by: 594 },
      { loungeId: "f20709ab-b15e-42c6-b5b2-54fd70de39d6", short: "B2", name: "Bungalow 2", x: 94, y: 768, w: 265, h: 308, bx: 225, by: 918 },
      { loungeId: "df9728ed-7ea1-4f7d-b60b-78245a05662d", short: "B1", name: "Bungalow 1", x: 94, y: 1097, w: 265, h: 262, bx: 224, by: 1238 },
    ],
  },
  {
    id: "mausefalle",
    name: "MAUSEFALLE",
    image: "/images/floorplans/mausefalle-birdseye-v3.webp",
    labels: [
      { label: { de: "DJ", en: "DJ" }, x: 512, y: 500 },
      { label: { de: "TANZFLÄCHE", en: "DANCEFLOOR" }, x: 512, y: 720 },
      { label: { de: "BAR", en: "BAR" }, x: 125, y: 300 },
      { label: { de: "BAR", en: "BAR" }, x: 900, y: 300 },
    ],
    nodes: [
      { loungeId: "94f87bc8-3c14-4259-bdaf-cc8423b29902", short: "L2", name: "Lounge 2", x: 195, y: 930, w: 315, h: 395, bx: 352, by: 1120 },
      { loungeId: "a34d2810-6365-43ad-b0a0-716c7bb03dec", short: "L1", name: "Lounge 1", x: 518, y: 930, w: 315, h: 395, bx: 676, by: 1120 },
    ],
  },
];
