import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wine, ShieldCheck, Shield } from "lucide-react";
import { parseAreas, CLUB_AREAS } from "@/lib/areas";
import ScrollReveal from "@/components/ScrollReveal";
import LoungeReservationWizard from "@/components/LoungeReservationWizard";
import type { Event } from "@/types/database";

interface Lounge {
  id: string;
  name: string;
  area_id: string;
  capacity: number;
  min_spend: number;
  price_per_person: number;
  image_url: string | null;
  description: string | null;
  sort_order: number;
}

interface Booking {
  lounge_id: string;
  event_id: string;
  booking_type: string;
  status: string;
}

interface Props {
  event: Event;
}

const EventLoungeSection = ({ event }: Props) => {
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);

  const eventAreas = parseAreas(event.areas);

  const fetchData = async () => {
    try {
      const [loungeRes, bookingRes] = await Promise.all([
        supabase.from("lounges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("lounge_bookings").select("lounge_id, event_id, booking_type, status").eq("event_id", event.id).neq("status", "cancelled").neq("status", "rejected"),
      ]);
      if (loungeRes.error) throw loungeRes.error;
      if (bookingRes.error) throw bookingRes.error;
      setLounges(loungeRes.data as any);
      setBookings(bookingRes.data as any);
    } catch (err) {
      console.error("Failed to load lounges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [event.id]);

  const availableLounges = lounges.filter((l) => eventAreas.includes(l.area_id));

  if (loading || availableLounges.length === 0) return null;

  const getStatus = (loungeId: string) => {
    const booking = bookings.find((b) => b.lounge_id === loungeId);
    if (!booking) return "free";
    if (booking.booking_type === "guaranteed" && (booking.status === "confirmed" || booking.status === "pending")) return "guaranteed";
    if (booking.booking_type === "non_binding") return "non_binding";
    return "free";
  };

  return (
    <div id="lounges">
    <ScrollReveal>
      <div className="glass-card p-5 mt-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-1 flex items-center gap-2">
          <Wine size={20} className="text-primary" /> LOUNGES AN DIESEM ABEND
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Sichere dir eine exklusive VIP Lounge – mit Fast Lane Einlass & Freiverzehr.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableLounges.map((lounge) => {
            const status = getStatus(lounge.id);
            const area = CLUB_AREAS.find((a) => a.id === lounge.area_id);
            const isGuaranteed = status === "guaranteed";
            const isNonBinding = status === "non_binding";
            const isFree = status === "free";

            return (
              <div
                key={lounge.id}
                className={`relative rounded-lg border overflow-hidden transition-all group ${
                  isGuaranteed
                    ? "border-destructive/30 opacity-60 cursor-not-allowed"
                    : "border-border hover:border-primary/50 cursor-pointer"
                }`}
                onClick={() => {
                  if (!isGuaranteed) setSelectedLounge(lounge);
                }}
                role="button"
                tabIndex={isGuaranteed ? -1 : 0}
                aria-label={`${lounge.name} ${isGuaranteed ? "- Bereits reserviert" : "- Jetzt reservieren"}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGuaranteed) setSelectedLounge(lounge);
                }}
              >
                {/* Image */}
                {lounge.image_url && (
                  <div className="h-28 overflow-hidden">
                    <img
                      src={lounge.image_url}
                      alt={lounge.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  </div>
                )}

                <div className="p-3 relative">
                  {/* Area badge */}
                  {area && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${area.color} absolute top-3 right-3`}>
                      {area.name}
                    </span>
                  )}

                  <h3 className="font-display text-sm tracking-wider text-foreground">{lounge.name}</h3>

                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><Users size={10} /> max. {lounge.capacity}</span>
                    <span className="flex items-center gap-1"><Wine size={10} /> {lounge.min_spend}€ Mindest.</span>
                  </div>

                  {/* Status indicator */}
                  <div className="mt-2">
                    {isGuaranteed && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                        <ShieldCheck size={10} /> Bereits reserviert
                      </span>
                    )}
                    {isNonBinding && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                        <Shield size={10} /> Unverbindlich vorgemerkt
                      </span>
                    )}
                    {isFree && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        Jetzt reservieren →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wizard modal */}
        {selectedLounge && (
          <LoungeReservationWizard
            lounge={selectedLounge}
            event={event}
            onClose={() => setSelectedLounge(null)}
            onSuccess={() => {
              setSelectedLounge(null);
              fetchData();
            }}
          />
        )}
      </div>
    </ScrollReveal>
    </div>
  );
};

export default EventLoungeSection;
