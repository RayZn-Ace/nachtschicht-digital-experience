import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Link, Navigate } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { Ticket, Calendar, CheckCircle2, Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface TicketWithEvent {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string;
  qr_code: string | null;
  checked_in: boolean;
  event: {
    title: string;
    date: string;
    time: string | null;
    image_url: string | null;
    genre: string | null;
  } | null;
}

const MyTicketsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTickets = async () => {
      const { data } = await supabase
        .from("tickets")
        .select("*, event:events(title, date, time, image_url, genre)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setTickets(data as unknown as TicketWithEvent[]);
      setLoading(false);
    };
    fetchTickets();
  }, [user]);

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              MEINE <span className="text-gradient">TICKETS</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        {loading ? (
          <p className="text-center text-muted-foreground py-16">
            {lang === "de" ? "Tickets werden geladen..." : "Loading tickets..."}
          </p>
        ) : tickets.length === 0 ? (
          <ScrollReveal>
            <div className="text-center py-16 space-y-4">
              <Ticket className="mx-auto text-muted-foreground" size={64} />
              <p className="text-muted-foreground">
                {lang === "de" ? "Du hast noch keine Tickets gebucht." : "You haven't booked any tickets yet."}
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
              >
                {lang === "de" ? "EVENTS ENTDECKEN" : "DISCOVER EVENTS"}
              </Link>
            </div>
          </ScrollReveal>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket, i) => (
              <ScrollReveal key={ticket.id} delay={i * 0.08}>
                <div className="glass-card overflow-hidden flex flex-col md:flex-row">
                  {ticket.event?.image_url && (
                    <div className="md:w-40 h-32 md:h-auto shrink-0">
                      <img
                        src={ticket.event.image_url}
                        alt={ticket.event?.title || "Event"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl tracking-wider text-foreground">
                          {ticket.event?.title || "Event"}
                        </h2>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                          <Calendar size={14} />
                          {ticket.event?.date
                            ? new Date(ticket.event.date).toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                          {ticket.event?.time && ` – ${ticket.event.time}`}
                        </div>
                        {ticket.event?.genre && (
                          <span className="text-xs text-muted-foreground">{ticket.event.genre}</span>
                        )}
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                          ticket.status === "confirmed"
                            ? "bg-green-500/20 text-green-400"
                            : ticket.status === "cancelled"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ticket.status === "confirmed"
                          ? lang === "de" ? "Bestätigt" : "Confirmed"
                          : ticket.status === "cancelled"
                          ? lang === "de" ? "Storniert" : "Cancelled"
                          : ticket.status}
                      </span>
                    </div>

                    {/* QR Code */}
                    {ticket.qr_code && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-lg shrink-0">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(ticket.qr_code)}&bgcolor=FFFFFF&color=000000`}
                              alt="Ticket QR Code"
                              className="w-[160px] h-[160px]"
                            />
                          </div>
                          <div className="flex flex-col items-center sm:items-start gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground tracking-wider select-all break-all">
                              {ticket.qr_code}
                            </span>
                            {ticket.checked_in && (
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle2 size={12} /> {lang === "de" ? "Eingecheckt" : "Checked in"}
                              </span>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(ticket.qr_code!);
                                  toast.success(lang === "de" ? "Code kopiert!" : "Code copied!");
                                }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded"
                              >
                                <Copy size={11} /> {lang === "de" ? "Kopieren" : "Copy"}
                              </button>
                              <a
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(ticket.qr_code)}&bgcolor=FFFFFF&color=000000`}
                                download={`ticket-${ticket.qr_code}.png`}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded"
                              >
                                <Download size={11} /> {lang === "de" ? "Speichern" : "Save"}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {ticket.quantity}x {lang === "de" ? "Ticket" : "Ticket"}
                        </span>
                        <span className="font-display text-lg text-foreground">
                          {ticket.total_price.toFixed(2)}€
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {lang === "de" ? "Gebucht am" : "Booked on"}{" "}
                        {new Date(ticket.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyTicketsPage;
