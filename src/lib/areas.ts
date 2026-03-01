export const CLUB_AREAS = [
  { id: "agostea", name: "AGOSTEA", genre: "Charts & EDM", color: "bg-red-500/20 text-red-400" },
  { id: "lavie", name: "LA VIE", genre: "Black, RnB & Dancehall", color: "bg-purple-500/20 text-purple-400" },
  { id: "mausefalle", name: "MAUSEFALLE", genre: "Schlager, Ballermann & 90er-2010er", color: "bg-amber-500/20 text-amber-400" },
  { id: "openair", name: "OPEN AIR", genre: "", color: "bg-green-500/20 text-green-400" },
  { id: "bistro", name: "BISTRO", genre: "", color: "bg-blue-500/20 text-blue-400" },
] as const;

export type AreaId = typeof CLUB_AREAS[number]["id"];

export const getAreaById = (id: string) => CLUB_AREAS.find((a) => a.id === id);

export const parseAreas = (areas: string | null): string[] => {
  if (!areas) return [];
  return areas.split(",").map((a) => a.trim()).filter(Boolean);
};

export const formatAreas = (areaIds: string[]): string => areaIds.join(",");
