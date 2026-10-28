import { describe, it, expect } from "vitest";
import { FLOORPLANS } from "@/lib/loungeFloorplans";
import { getBookingStatus, resolveLoungeStatus, isBookable } from "@/lib/loungeAvailability";
import { applyLoungeOverrides } from "@/lib/loungePricing";

const EV = "ev1";
describe("floorplan geometry", () => {
  it("maps 5/4/2 unique lounge ids", () => {
    const c = Object.fromEntries(FLOORPLANS.map((r) => [r.id, r.nodes.length]));
    expect(c).toEqual({ agostea: 5, lavie: 4, mausefalle: 2 });
    const ids = FLOORPLANS.flatMap((r) => r.nodes.map((n) => n.loungeId));
    expect(new Set(ids).size).toBe(11);
  });
  it("a lounge not in the eligible list is unavailable", () => {
    expect(resolveLoungeStatus({ eligible: false, loadState: "ready", bookings: [], loungeId: "29036735-9bef-42b7-bb5e-28ce4ae34141", eventId: EV })).toBe("unavailable");
  });
});

describe("availability", () => {
  it("confirmed guaranteed blocks even after a non_binding row", () => {
    const rows = [
      { lounge_id: "a", event_id: EV, booking_type: "non_binding", status: "pending" },
      { lounge_id: "a", event_id: EV, booking_type: "guaranteed", status: "confirmed" },
    ];
    expect(getBookingStatus(rows, "a", EV)).toBe("booked");
  });
  it("pending guaranteed does not block; other events ignored", () => {
    const rows = [
      { lounge_id: "a", event_id: EV, booking_type: "guaranteed", status: "pending" },
      { lounge_id: "a", event_id: "other", booking_type: "guaranteed", status: "confirmed" },
    ];
    expect(getBookingStatus(rows, "a", EV)).toBe("available");
  });
  it("loading/error/no event are never bookable (never green)", () => {
    for (const loadState of ["loading", "error", "idle"] as const) {
      const s = resolveLoungeStatus({ eligible: true, loadState, bookings: [], loungeId: "a", eventId: EV });
      expect(s).toBe("unknown");
      expect(isBookable(s)).toBe(false);
    }
    expect(resolveLoungeStatus({ eligible: true, loadState: "ready", bookings: [], loungeId: "a", eventId: null })).toBe("unknown");
  });
  it("applies event price overrides", () => {
    const [l] = applyLoungeOverrides([{ id: "a", min_spend: 200, price_per_person: 20 }], [{ lounge_id: "a", min_spend_override: 250, price_note: "x" }]);
    expect(l.min_spend).toBe(250);
    expect(l.price_per_person).toBe(20);
  });
});

describe("Silvester room-specific price overrides", () => {
  it("AGOSTEA bungalows cost 500 euros including one bottle of Moët", () => {
    const lounges = applyLoungeOverrides(
      [{ id: "d36c1786-9dc2-4fa1-bd6d-6f4c96602ded", min_spend: 250, price_per_person: 25, price_note: null as string | null }],
      [{ lounge_id: "d36c1786-9dc2-4fa1-bd6d-6f4c96602ded", min_spend_override: 500, price_per_person_override: 50, price_note: "inkl. 1 Flasche Moët" }],
    );
    expect(lounges[0].min_spend).toBe(500);
    expect(lounges[0].price_per_person).toBe(50);
    expect(lounges[0].price_note).toBe("inkl. 1 Flasche Moët");
  });
  it("LA VIE bungalows receive only 50 euros uplift to 250 euros, without Moët", () => {
    const lounges = applyLoungeOverrides(
      [{ id: "df9728ed-7ea1-4f7d-b60b-78245a05662d", min_spend: 200, price_per_person: 20, price_note: null as string | null }],
      [{ lounge_id: "df9728ed-7ea1-4f7d-b60b-78245a05662d", min_spend_override: 250, price_per_person_override: 25, price_note: null }],
    );
    expect(lounges[0].min_spend).toBe(250);
    expect(lounges[0].price_per_person).toBe(25);
    expect(lounges[0].price_note).toBeNull();
  });
});

import { getWizardInvalidation } from "@/lib/loungeAvailability";
describe("wizard invalidation", () => {
  const base = { selectedLoungeId: "a", eligibleIds: ["a"], loadState: "ready" as const, bookings: [], eventId: EV };
  it("keeps valid selection", () => expect(getWizardInvalidation(base)).toBeNull());
  it("closes when not eligible for current event", () => expect(getWizardInvalidation({ ...base, eligibleIds: ["b"] })).toBe("ineligible"));
  it("closes on availability failure", () => expect(getWizardInvalidation({ ...base, loadState: "error" })).toBe("availability_failed"));
  it("closes when booked", () => expect(getWizardInvalidation({ ...base, bookings: [{ lounge_id: "a", event_id: EV, booking_type: "guaranteed", status: "confirmed" }] })).toBe("booked"));
  it("does not close during non-silent loading", () => expect(getWizardInvalidation({ ...base, loadState: "loading" })).toBeNull());
});
