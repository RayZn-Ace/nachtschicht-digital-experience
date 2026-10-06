// Shared, event-specific lounge availability logic (cards, floorplan, event page).
export interface LoungeAvailabilityRow {
  lounge_id: string;
  event_id: string;
  booking_type: string;
  status: string;
}

export type AvailabilityLoadState = "idle" | "loading" | "ready" | "error";

/** Booking-derived status. Only confirmed guaranteed bookings block (some(), not find()). */
export type BookingStatus = "available" | "non_binding" | "booked";

/** Full display status for a lounge node/card. */
export type LoungeDisplayStatus = BookingStatus | "unknown" | "unavailable";

export const getBookingStatus = (
  bookings: LoungeAvailabilityRow[],
  loungeId: string,
  eventId: string
): BookingStatus => {
  const rel = bookings.filter((b) => b.lounge_id === loungeId && b.event_id === eventId);
  if (rel.some((b) => b.booking_type === "guaranteed" && b.status === "confirmed")) return "booked";
  if (rel.some((b) => b.booking_type === "non_binding")) return "non_binding";
  return "available";
};

export const resolveLoungeStatus = (opts: {
  eligible: boolean;
  loadState: AvailabilityLoadState;
  bookings: LoungeAvailabilityRow[];
  loungeId: string;
  eventId: string | null | undefined;
}): LoungeDisplayStatus => {
  if (!opts.eligible) return "unavailable";
  if (!opts.eventId || opts.loadState !== "ready") return "unknown";
  return getBookingStatus(opts.bookings, opts.loungeId, opts.eventId);
};

export const isBookable = (s: LoungeDisplayStatus) => s === "available" || s === "non_binding";
