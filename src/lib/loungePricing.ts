// Per-event lounge price overrides (event_lounges.*_override)
export interface LoungeOverrideRow {
  lounge_id: string;
  min_spend_override?: number | null;
  price_per_person_override?: number | null;
  price_note?: string | null;
}

export interface PricedLounge {
  id: string;
  min_spend: number;
  price_per_person: number;
  price_note?: string | null;
}

/** Applies event-specific price overrides onto a list of lounges. */
export const applyLoungeOverrides = <T extends PricedLounge>(
  lounges: T[],
  overrides: LoungeOverrideRow[] | null | undefined
): T[] => {
  if (!overrides || overrides.length === 0) return lounges;
  const map = new Map(overrides.map((o) => [o.lounge_id, o]));
  return lounges.map((lounge) => {
    const o = map.get(lounge.id);
    if (!o) return lounge;
    return {
      ...lounge,
      min_spend: o.min_spend_override ?? lounge.min_spend,
      price_per_person: o.price_per_person_override ?? lounge.price_per_person,
      price_note: o.price_note ?? null,
    };
  });
};
