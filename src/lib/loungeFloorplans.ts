// Schematic (not to scale) floorplans. Geometry is mapped to stable lounge IDs.
export type RoomId = "agostea" | "lavie" | "mausefalle";

export interface FloorNode {
  loungeId: string;
  short: string; // label rendered on the map
  name: string; // fallback full name
  x: number; y: number; w: number; h: number;
}

export interface FloorLandmark {
  label: { de: string; en: string };
  kind: "dj" | "dance" | "bar" | "stairs" | "outside";
  x: number; y: number; w: number; h: number;
}

export interface FloorRoom {
  id: RoomId;
  name: string;
  nodes: FloorNode[];
  landmarks: FloorLandmark[];
}

export const FLOOR_VIEWBOX = { w: 400, h: 320 };

export const FLOORPLANS: FloorRoom[] = [
  {
    id: "agostea",
    name: "AGOSTEA",
    landmarks: [
      { kind: "dj", label: { de: "DJ", en: "DJ" }, x: 165, y: 22, w: 70, h: 40 },
      { kind: "dance", label: { de: "TANZFLÄCHE", en: "DANCEFLOOR" }, x: 80, y: 100, w: 240, h: 115 },
    ],
    nodes: [
      { loungeId: "d36c1786-9dc2-4fa1-bd6d-6f4c96602ded", short: "B1", name: "Bungalow 1", x: 30, y: 22, w: 115, h: 60 },
      { loungeId: "497704e5-9629-4541-b6f4-9a9db5ec77d4", short: "B2", name: "Bungalow 2", x: 255, y: 22, w: 115, h: 60 },
      { loungeId: "6ebed4dd-f2c9-4534-9ffd-cef4a375bb5e", short: "L1", name: "Lounge 1", x: 30, y: 238, w: 100, h: 60 },
      { loungeId: "fc3cc5d3-f006-488f-9b81-3cec6368e00d", short: "L2", name: "Lounge 2", x: 150, y: 238, w: 100, h: 60 },
      { loungeId: "a4de67ea-d033-474b-a390-d8909dfbcf45", short: "L3", name: "Lounge 3", x: 270, y: 238, w: 100, h: 60 },
    ],
  },
  {
    id: "lavie",
    name: "LA VIE",
    landmarks: [
      { kind: "dj", label: { de: "DJ", en: "DJ" }, x: 175, y: 22, w: 70, h: 40 },
      { kind: "bar", label: { de: "BAR", en: "BAR" }, x: 185, y: 110, w: 50, h: 170 },
      { kind: "stairs", label: { de: "TREPPE", en: "STAIRS" }, x: 300, y: 22, w: 75, h: 50 },
    ],
    nodes: [
      { loungeId: "29036735-9bef-42b7-bb5e-28ce4ae34141", short: "B4", name: "Bungalow 4", x: 95, y: 22, w: 70, h: 55 },
      { loungeId: "4663d055-4fb8-4342-bb7f-811b53cc8dfa", short: "B3", name: "Bungalow 3", x: 22, y: 92, w: 75, h: 58 },
      { loungeId: "f20709ab-b15e-42c6-b5b2-54fd70de39d6", short: "B2", name: "Bungalow 2", x: 22, y: 163, w: 75, h: 58 },
      { loungeId: "df9728ed-7ea1-4f7d-b60b-78245a05662d", short: "B1", name: "Bungalow 1", x: 22, y: 234, w: 75, h: 58 },
    ],
  },
  {
    id: "mausefalle",
    name: "MAUSEFALLE",
    landmarks: [
      { kind: "dance", label: { de: "TANZFLÄCHE", en: "DANCEFLOOR" }, x: 80, y: 40, w: 240, h: 170 },
      { kind: "dj", label: { de: "DJ", en: "DJ" }, x: 165, y: 240, w: 70, h: 45 },
    ],
    nodes: [
      { loungeId: "94f87bc8-3c14-4259-bdaf-cc8423b29902", short: "L2", name: "Lounge 2", x: 30, y: 235, w: 115, h: 60 },
      { loungeId: "a34d2810-6365-43ad-b0a0-716c7bb03dec", short: "L1", name: "Lounge 1", x: 255, y: 235, w: 115, h: 60 },
    ],
  },
];
