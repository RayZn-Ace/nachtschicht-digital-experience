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

export type WizardInvalidation = "ineligible" | "booked" | "availability_failed";

/** Decides whether an open reservation wizard must be closed for the current event/data. */
export const getWizardInvalidation = (opts: {
  selectedLoungeId: string | null | undefined;
  eligibleIds: string[];
  loadState: AvailabilityLoadState;
  bookings: LoungeAvailabilityRow[];
  eventId: string | null | undefined;
}): WizardInvalidation | null => {
  if (!opts.selectedLoungeId) return null;
  if (!opts.eventId || !opts.eligibleIds.includes(opts.selectedLoungeId)) return "ineligible";
  if (opts.loadState === "error") return "availability_failed";
  if (opts.loadState === "ready" && getBookingStatus(opts.bookings, opts.selectedLoungeId, opts.eventId) === "booked") return "booked";
  return null;
};

export const wizardInvalidationText = (r: WizardInvalidation, de: boolean) =>
  ({
    ineligible: de ? "Diese Lounge ist für das gewählte Event nicht mehr buchbar." : "This lounge is no longer bookable for the selected event.",
    booked: de ? "Diese Lounge wurde gerade verbindlich reserviert." : "This lounge has just been booked.",
    availability_failed: de ? "Verfügbarkeit konnte nicht geprüft werden – Reservierung abgebrochen. Bitte erneut versuchen." : "Availability could not be verified – reservation cancelled. Please retry.",
  })[r];
