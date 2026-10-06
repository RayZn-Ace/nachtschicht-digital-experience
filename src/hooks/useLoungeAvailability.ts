import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityLoadState, LoungeAvailabilityRow } from "@/lib/loungeAvailability";

interface Snapshot {
  eventId: string | null;
  state: AvailabilityLoadState;
  bookings: LoungeAvailabilityRow[];
}

/**
 * Event-specific lounge availability via the public-safe RPC.
 * Ignores stale responses, refreshes on focus + interval, never reports "ready" after a failure.
 */
export const useLoungeAvailability = (eventId: string | null | undefined, intervalMs = 45000) => {
  const [snap, setSnap] = useState<Snapshot>({ eventId: null, state: "idle", bookings: [] });
  const reqRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const reqId = ++reqRef.current;
      if (!eventId) {
        setSnap({ eventId: null, state: "idle", bookings: [] });
        return;
      }
      if (!silent) setSnap({ eventId, state: "loading", bookings: [] });
      try {
        const { data, error } = await supabase.rpc("get_lounge_availability", { p_event_id: eventId });
        if (reqId !== reqRef.current) return;
        if (error || !Array.isArray(data)) throw error || new Error("invalid availability");
        setSnap({
          eventId,
          state: "ready",
          bookings: (data as LoungeAvailabilityRow[]).filter((b) => b.event_id === eventId),
        });
      } catch (err) {
        if (reqId !== reqRef.current) return;
        console.error("Lounge availability failed:", err);
        setSnap({ eventId, state: "error", bookings: [] });
      }
    },
    [eventId]
  );

  useEffect(() => {
    load();
    if (!eventId) return;
    const onFocus = () => load(true);
    const onVis = () => document.visibilityState === "visible" && load(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const timer = window.setInterval(() => load(true), intervalMs);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(timer);
      reqRef.current++; // invalidate in-flight requests
    };
  }, [eventId, load, intervalMs]);

  // Snapshot for another event is never trusted (covers the render before the effect runs)
  const matches = snap.eventId === (eventId || null);
  return {
    state: (matches ? snap.state : eventId ? "loading" : "idle") as AvailabilityLoadState,
    bookings: matches ? snap.bookings : [],
    refresh: () => load(),
  };
};
