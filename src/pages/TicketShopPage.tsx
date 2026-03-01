import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import type { Event, TicketType, DiscountCode } from "@/types/database";
import { toast } from "sonner";
import { Calendar, Minus, Plus, Tag, ArrowLeft, Ticket, Users } from "lucide-react";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";
import ScrollReveal from "@/components/ScrollReveal";

const TicketShopPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useI18n();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  // Cart state
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  // Guest info
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Step: 1 = select, 2 = checkout
  const [step, setStep] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      const [eventRes, typesRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).eq("is_published", true).single(),
        supabase.from("ticket_types").select("*").eq("event_id", eventId).eq("is_active", true).order("sort_order"),
      ]);
      if (eventRes.data) setEvent(eventRes.data as unknown as Event);
      if (typesRes.data) setTicketTypes(typesRes.data as unknown as TicketType[]);
      setLoading(false);
    };
    fetchData();
  }, [eventId]);

  const totalTickets = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const subtotal = ticketTypes.reduce((sum, tt) => sum + (cart[tt.id] || 0) * tt.price, 0);
  
  // If no ticket types, use event's global price
  const useGlobalPrice = ticketTypes.length === 0;
  const globalQuantity = cart["global"] || 0;
  const globalSubtotal = useGlobalPrice ? globalQuantity * (event?.ticket_price || 0) : 0;
  const rawTotal = useGlobalPrice ? globalSubtotal : subtotal;
  const totalCount = useGlobalPrice ? globalQuantity : totalTickets;

  let discount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.discount_type === "percent") {
      discount = rawTotal * (appliedDiscount.discount_value / 100);
    } else {
      discount = Math.min(appliedDiscount.discount_value, rawTotal);
    }
  }
  const finalTotal = Math.max(0, rawTotal - discount);

  const updateCart = (typeId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[typeId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [typeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [typeId]: next };
    });
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountLoading(true);
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!data || error) {
      toast.error(lang === "de" ? "Ungültiger Code" : "Invalid code");
      setAppliedDiscount(null);
    } else {
      const dc = data as unknown as DiscountCode;
      // Validate
      if (dc.event_id && dc.event_id !== eventId) {
        toast.error(lang === "de" ? "Code gilt nicht für dieses Event" : "Code not valid for this event");
      } else if (dc.max_uses && dc.uses >= dc.max_uses) {
        toast.error(lang === "de" ? "Code wurde bereits zu oft genutzt" : "Code has been used too many times");
      } else if (dc.valid_until && new Date(dc.valid_until) < new Date()) {
        toast.error(lang === "de" ? "Code ist abgelaufen" : "Code has expired");
      } else {
        setAppliedDiscount(dc);
        toast.success(
          dc.discount_type === "percent"
            ? `${dc.discount_value}% Rabatt angewendet!`
            : `${dc.discount_value}€ Rabatt angewendet!`
        );
      }
    }
    setDiscountLoading(false);
  };

  const handlePurchase = async () => {
    if (totalCount === 0) return;
    const email = user?.email || guestEmail;
    const name = user?.user_metadata?.full_name || guestName;
    if (!email) {
      toast.error(lang === "de" ? "Bitte E-Mail eingeben" : "Please enter email");
      return;
    }

    setBuying(true);
    const qrCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (useGlobalPrice) {
      // Single ticket with global price
      const { error } = await supabase.from("tickets").insert({
        event_id: eventId!,
        user_id: user?.id || null,
        quantity: globalQuantity,
        total_price: finalTotal,
        buyer_email: email,
        buyer_name: name || null,
        qr_code: qrCode,
        discount_code_id: appliedDiscount?.id || null,
      });
      if (error) { toast.error(error.message); setBuying(false); return; }
    } else {
      // One ticket per type
      const inserts = ticketTypes
        .filter((tt) => (cart[tt.id] || 0) > 0)
        .map((tt) => ({
          event_id: eventId!,
          user_id: user?.id || null,
          ticket_type_id: tt.id,
          quantity: cart[tt.id],
          total_price: tt.price * cart[tt.id] - (appliedDiscount ? discount * (tt.price * cart[tt.id] / rawTotal) : 0),
          buyer_email: email,
          buyer_name: name || null,
          qr_code: `${qrCode}-${tt.id.substring(0, 4)}`,
          discount_code_id: appliedDiscount?.id || null,
        }));
      const { error } = await supabase.from("tickets").insert(inserts);
      if (error) { toast.error(error.message); setBuying(false); return; }
    }

    // Increment discount uses
    if (appliedDiscount) {
      await supabase.from("discount_codes").update({ uses: appliedDiscount.uses + 1 }).eq("id", appliedDiscount.id);
    }

    toast.success(lang === "de" ? "Ticket erfolgreich gebucht! 🎉" : "Ticket booked successfully! 🎉");
    setStep(3); // success
    setBuying(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!event) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Event nicht gefunden.</div>;

  const remaining = event.ticket_quantity - event.tickets_sold;
  const soldOut = remaining <= 0;
  const eventAreas = parseAreas(event.areas);

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        {/* Back */}
        <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={18} /> {lang === "de" ? "Zurück zu Events" : "Back to events"}
        </button>

        {/* Event Header */}
        <ScrollReveal>
          <div className="glass-card overflow-hidden mb-6">
            {event.image_url && (
              <div className="relative h-48 md:h-64 overflow-hidden">
                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              </div>
            )}
            <div className="p-5">
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground mb-2">{event.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground text-sm mb-2">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(event.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} – {event.time}
                </span>
              </div>
              {eventAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {eventAreas.map((aId) => {
                    const area = CLUB_AREAS.find((a) => a.id === aId);
                    return area ? <span key={aId} className={`text-xs px-2 py-0.5 rounded-full font-medium ${area.color}`}>{area.name}</span> : null;
                  })}
                </div>
              )}
              {event.description && <p className="text-muted-foreground text-sm">{event.description}</p>}

              {/* Social proof & scarcity */}
              <div className="flex items-center gap-4 mt-3">
                {event.tickets_sold > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users size={12} /> {event.tickets_sold} {lang === "de" ? "Gäste kommen" : "guests attending"}
                  </span>
                )}
                {!soldOut && remaining <= Math.ceil(event.ticket_quantity * 0.2) && (
                  <span className="text-xs text-destructive font-semibold animate-pulse">
                    🔥 {lang === "de" ? `Nur noch ${remaining} Tickets!` : `Only ${remaining} tickets left!`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {soldOut ? (
          <div className="glass-card p-8 text-center">
            <p className="text-2xl font-display text-destructive tracking-wider">{lang === "de" ? "AUSVERKAUFT" : "SOLD OUT"}</p>
          </div>
        ) : step === 3 ? (
          /* Success */
          <div className="glass-card p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-3xl tracking-wider text-foreground mb-2">
              {lang === "de" ? "TICKET GEBUCHT!" : "TICKET BOOKED!"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {lang === "de"
                ? "Dein QR-Code Ticket wurde an deine E-Mail gesendet."
                : "Your QR code ticket has been sent to your email."}
            </p>
            <button
              onClick={() => navigate("/events")}
              className="px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90"
            >
              {lang === "de" ? "WEITERE EVENTS" : "MORE EVENTS"}
            </button>
          </div>
        ) : step === 1 ? (
          /* Step 1: Select tickets */
          <ScrollReveal>
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <h2 className="font-display text-2xl tracking-wider text-foreground flex items-center gap-2">
                <Ticket size={22} /> {lang === "de" ? "TICKETS WÄHLEN" : "SELECT TICKETS"}
              </h2>

              {useGlobalPrice ? (
                /* Global price mode */
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{lang === "de" ? "Eintrittskarte" : "Entry Ticket"}</p>
                    <p className="text-primary font-bold text-lg">{event.ticket_price}€</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateCart("global", -1)} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted">
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-bold text-foreground w-8 text-center">{globalQuantity}</span>
                    <button onClick={() => updateCart("global", 1)} className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Ticket types */
                <div className="space-y-3">
                  {ticketTypes.map((tt) => {
                    const ttRemaining = tt.quantity - tt.sold;
                    const ttSoldOut = ttRemaining <= 0;
                    return (
                      <div key={tt.id} className={`flex items-center justify-between p-4 border border-border rounded-lg ${ttSoldOut ? 'opacity-50' : ''}`}>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{tt.name}</p>
                          {tt.description && <p className="text-xs text-muted-foreground">{tt.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-primary font-bold text-lg">{tt.price}€</span>
                            {ttRemaining <= 10 && !ttSoldOut && (
                              <span className="text-xs text-destructive">
                                {lang === "de" ? `Noch ${ttRemaining}` : `${ttRemaining} left`}
                              </span>
                            )}
                            {ttSoldOut && <span className="text-xs text-destructive font-bold">{lang === "de" ? "Ausverkauft" : "Sold out"}</span>}
                          </div>
                        </div>
                        {!ttSoldOut && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateCart(tt.id, -1)} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted">
                              <Minus size={16} />
                            </button>
                            <span className="text-lg font-bold text-foreground w-8 text-center">{cart[tt.id] || 0}</span>
                            <button
                              onClick={() => updateCart(tt.id, 1)}
                              disabled={(cart[tt.id] || 0) >= ttRemaining}
                              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Discount code */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder={lang === "de" ? "Rabattcode eingeben" : "Enter discount code"}
                    className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
                  />
                </div>
                <button
                  onClick={applyDiscount}
                  disabled={discountLoading}
                  className="px-4 py-2.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-sm"
                >
                  {lang === "de" ? "EINLÖSEN" : "APPLY"}
                </button>
              </div>
              {appliedDiscount && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Tag size={14} />
                  {appliedDiscount.discount_type === "percent" ? `${appliedDiscount.discount_value}%` : `${appliedDiscount.discount_value}€`} Rabatt mit "{appliedDiscount.code}"
                  <button onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }} className="text-muted-foreground hover:text-foreground ml-auto text-xs">✕</button>
                </div>
              )}

              {/* Summary */}
              {totalCount > 0 && (
                <div className="border-t border-border pt-4 space-y-1">
                  {discount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{lang === "de" ? "Zwischensumme" : "Subtotal"}</span>
                        <span>{rawTotal.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-400">
                        <span>{lang === "de" ? "Rabatt" : "Discount"}</span>
                        <span>-{discount.toFixed(2)}€</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-bold text-foreground">
                    <span>{totalCount} {totalCount === 1 ? "Ticket" : "Tickets"}</span>
                    <span>{finalTotal.toFixed(2)}€</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={totalCount === 0}
                className="w-full py-4 bg-primary text-primary-foreground font-display text-xl tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {lang === "de" ? "WEITER ZUR BUCHUNG" : "CONTINUE TO CHECKOUT"}
              </button>
            </div>
          </ScrollReveal>
        ) : (
          /* Step 2: Checkout */
          <ScrollReveal>
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <h2 className="font-display text-2xl tracking-wider text-foreground">
                {lang === "de" ? "DEINE DATEN" : "YOUR DETAILS"}
              </h2>

              {!user && (
                <>
                  <div>
                    <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Dein Name" : "Your name"}</label>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-foreground mb-1 block">E-Mail *</label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="deine@email.de"
                    />
                  </div>
                </>
              )}

              {user && (
                <div className="p-3 bg-muted rounded-md text-sm text-foreground">
                  {lang === "de" ? "Eingeloggt als" : "Logged in as"}: <strong>{user.email}</strong>
                </div>
              )}

              {/* Order summary */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <h3 className="font-display text-sm tracking-wider text-muted-foreground">
                  {lang === "de" ? "BESTELLÜBERSICHT" : "ORDER SUMMARY"}
                </h3>
                {useGlobalPrice ? (
                  <div className="flex justify-between text-sm text-foreground">
                    <span>{globalQuantity}× {lang === "de" ? "Eintrittskarte" : "Entry Ticket"}</span>
                    <span>{(globalQuantity * (event?.ticket_price || 0)).toFixed(2)}€</span>
                  </div>
                ) : (
                  ticketTypes.filter((tt) => (cart[tt.id] || 0) > 0).map((tt) => (
                    <div key={tt.id} className="flex justify-between text-sm text-foreground">
                      <span>{cart[tt.id]}× {tt.name}</span>
                      <span>{(cart[tt.id] * tt.price).toFixed(2)}€</span>
                    </div>
                  ))
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>{lang === "de" ? "Rabatt" : "Discount"} ({appliedDiscount?.code})</span>
                    <span>-{discount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>{finalTotal.toFixed(2)}€</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-border text-foreground font-display tracking-wider rounded-md hover:bg-muted"
                >
                  {lang === "de" ? "ZURÜCK" : "BACK"}
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={buying || (!user && !guestEmail)}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {buying ? "..." : lang === "de" ? "JETZT BUCHEN" : "BOOK NOW"}
                </button>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
};

export default TicketShopPage;
