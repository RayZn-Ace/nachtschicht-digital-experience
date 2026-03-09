import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wine, ShieldCheck, Shield, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { parseAreas, CLUB_AREAS } from "@/lib/areas";
import ScrollReveal from "@/components/ScrollReveal";
import LoungeReservationWizard from "@/components/LoungeReservationWizard";
import type { Event } from "@/types/database";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";

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
  const { lang } = useI18n();
  const tr = useTranslate(lang);
  const [lounges, setLounges] = useState<Lounge[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLounge, setSelectedLounge] = useState<Lounge | null>(null);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const eventAreas = parseAreas(event.areas);

  const fetchData = async () => {
    try {
      const [loungeRes, bookingRes, assignmentRes] = await Promise.all([
        supabase.from("lounges").select("*").eq("is_active", true).order("sort_order"),
        supabase.rpc("get_lounge_availability", { p_event_id: event.id }),
        supabase.from("event_lounges").select("lounge_id").eq("event_id", event.id),
      ]);
      if (loungeRes.error) throw loungeRes.error;
      if (bookingRes.error) throw bookingRes.error;
      
      const allLounges = loungeRes.data as any as Lounge[];
      const assignedIds = assignmentRes.data?.map((a: any) => a.lounge_id) || [];
      
      if (assignedIds.length > 0) {
        setLounges(allLounges.filter((l) => assignedIds.includes(l.id)));
      } else {
        setLounges(allLounges);
      }
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
    if (booking.booking_type === "guaranteed" && booking.status === "confirmed") return "guaranteed";
    if (booking.booking_type === "non_binding") return "non_binding";
    return "free";
  };

  // Group lounges by area
  const areaGroups = eventAreas
    .map((areaId) => {
      const area = CLUB_AREAS.find((a) => a.id === areaId);
      if (!area) return null;
      const areaLounges = availableLounges.filter((l) => l.area_id === areaId);
      if (areaLounges.length === 0) return null;

      const freeLounges = areaLounges.filter((l) => getStatus(l.id) !== "guaranteed");
      const soldOutLounges = areaLounges.filter((l) => getStatus(l.id) === "guaranteed");

      return {
        area,
        lounges: areaLounges,
        freeLounges,
        soldOutLounges,
        freeCount: freeLounges.length,
        totalCount: areaLounges.length,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[];

  return (
    <div id="lounges">
      <ScrollReveal>
        <div className="glass-card p-5 mt-6">
          <h2 className="font-display text-2xl tracking-wider text-foreground mb-1 flex items-center gap-2">
            <Wine size={20} className="text-primary" /> {lang === "de" ? "LOUNGES AN DIESEM ABEND" : "LOUNGES THIS EVENING"}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {lang === "de" ? "Sichere dir eine exklusive VIP Lounge – mit Fast Lane Einlass & Freiverzehr." : "Secure an exclusive VIP lounge – with fast lane entry & complimentary drinks."}
          </p>

          <div className="flex flex-col gap-3">
            {(areaGroups as any[]).map((group: any) => {
              const isExpanded = expandedArea === group.area.id;

              return (
                <div key={group.area.id} className="rounded-lg border border-border overflow-hidden">
                  {/* Area Header */}
                  <button
                    onClick={() => setExpandedArea(isExpanded ? null : group.area.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-primary" />
                      <div>
                        <h3 className="font-display text-sm tracking-wider text-foreground">
                          {group.area.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.freeCount > 0 ? (
                            <span className="text-green-400">
                            {group.freeCount} {lang === "de" ? "von" : "of"} {group.totalCount} {lang === "de" ? "verfügbar" : "available"}
                            </span>
                          ) : (
                            <span className="text-destructive">{lang === "de" ? "Ausgebucht" : "Sold out"}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${group.area.color}`}>
                        {group.totalCount} {group.totalCount === 1 ? "Lounge" : "Lounges"}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expandable Lounge List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border p-3 space-y-2">
                          {/* Free lounges */}
                          {group.freeLounges.length > 0 && (
                            <>
                              {group.freeLounges.map((lounge: Lounge) => {
                                const status = getStatus(lounge.id);
                                const isNonBinding = status === "non_binding";

                                return (
                                  <div
                                    key={lounge.id}
                                    className="relative rounded-lg border border-border hover:border-primary/50 overflow-hidden transition-all group cursor-pointer"
                                    onClick={() => setSelectedLounge(lounge)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${lounge.name} – Jetzt reservieren`}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") setSelectedLounge(lounge);
                                    }}
                                  >
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
                    <h4 className="font-display text-sm tracking-wider text-foreground">{tr(lounge.name)}</h4>
                                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-1.5">
                                        <span className="flex items-center gap-1"><Users size={10} /> max. {lounge.capacity}</span>
                                        <span className="flex items-center gap-1"><Wine size={10} /> {lounge.min_spend}€ {lang === "de" ? "Mindest." : "min."}</span>
                                      </div>

                                      <div className="mt-2">
                                        {isNonBinding ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                                            <Shield size={10} /> {lang === "de" ? "Unverbindlich vorgemerkt" : "Non-binding reservation"}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            {lang === "de" ? "Jetzt reservieren →" : "Reserve now →"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Sold-out lounges */}
                          {group.soldOutLounges.length > 0 && (
                            <>
                              {group.freeLounges.length > 0 && (
                                <div className="flex items-center gap-2 pt-2 pb-1">
                                  <div className="h-px flex-1 bg-border" />
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "de" ? "Ausgebucht" : "Sold out"}</span>
                                  <div className="h-px flex-1 bg-border" />
                                </div>
                              )}
                              {group.soldOutLounges.map((lounge: Lounge) => (
                                <div
                                  key={lounge.id}
                                  className="relative rounded-lg border border-destructive/20 overflow-hidden opacity-50 cursor-not-allowed"
                                >
                                  {lounge.image_url && (
                                    <div className="h-28 overflow-hidden">
                                      <img
                                        src={lounge.image_url}
                                        alt={lounge.name}
                                        className="w-full h-full object-cover grayscale"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                                    </div>
                                  )}
                                  <div className="p-3 relative">
                                    <h4 className="font-display text-sm tracking-wider text-foreground">{tr(lounge.name)}</h4>
                                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-1.5">
                                      <span className="flex items-center gap-1"><Users size={10} /> max. {lounge.capacity}</span>
                                      <span className="flex items-center gap-1"><Wine size={10} /> {lounge.min_spend}€ {lang === "de" ? "Mindest." : "min."}</span>
                                    </div>
                                    <div className="mt-2">
                                      <span className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                                        <ShieldCheck size={10} /> {lang === "de" ? "Bereits reserviert" : "Already reserved"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
