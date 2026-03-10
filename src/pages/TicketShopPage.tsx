import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useTranslate } from "@/hooks/useTranslate";
import type { Event, TicketType, DiscountCode } from "@/types/database";
import { toast } from "sonner";
import { Calendar, Minus, Plus, Tag, ArrowLeft, Ticket, Users, CheckCircle2, Copy, Download, FileText, Loader2, ShieldCheck, DoorOpen, Shield } from "lucide-react";
import { CLUB_AREAS, parseAreas } from "@/lib/areas";
import { calcOrderFees, type FeeConfig, type TicketTypeFeeOverride } from "@/lib/fees";
import ScrollReveal from "@/components/ScrollReveal";
import EventLoungeSection from "@/components/EventLoungeSection";

const TicketShopPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const tr = useTranslate(lang);

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

  // Contact info
  const [guestPhone, setGuestPhone] = useState("");
  const [purchasedQrCode, setPurchasedQrCode] = useState<string>("");
  const [purchasedTicketIds, setPurchasedTicketIds] = useState<string[]>([]);
  const [ticketPdfLoading, setTicketPdfLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);

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

  // Handle return from Mollie payment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const ticketIdsParam = params.get("ticket_ids");

    if (paymentStatus === "success" && ticketIdsParam) {
      setPaymentChecking(true);
      const ids = ticketIdsParam.split(",");

      // Poll for confirmed status (webhook might take a moment)
      const checkTickets = async (retries = 0): Promise<void> => {
        const { data } = await supabase
          .from("tickets")
          .select("id, status, qr_code")
          .in("id", ids);

        const allConfirmed = data?.every((t: any) => t.status === "confirmed");
        if (allConfirmed && data && data.length > 0) {
          setPurchasedQrCode(data[0].qr_code || "");
          setPurchasedTicketIds(ids);
          setStep(3);
          setPaymentChecking(false);
          // Clean URL
          window.history.replaceState({}, "", location.pathname);
          toast.success(lang === "de" ? "Zahlung erfolgreich! 🎉" : "Payment successful! 🎉");
        } else if (retries < 15) {
          setTimeout(() => checkTickets(retries + 1), 2000);
        } else {
          setPaymentChecking(false);
          toast.info(lang === "de"
            ? "Zahlung wird verarbeitet – du erhältst dein Ticket per E-Mail."
            : "Payment is being processed – you'll receive your ticket by email.");
          window.history.replaceState({}, "", location.pathname);
        }
      };
      checkTickets();
    }
  }, [location.search]);

  // Scroll to hash (e.g. #lounges)
  useEffect(() => {
    if (!loading && location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        el?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [loading, location.hash]);

  const totalTickets = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const subtotal = ticketTypes.reduce((sum, tt) => sum + (cart[tt.id] || 0) * tt.price, 0);
  
  // If no ticket types, use event's global price
  const useGlobalPrice = ticketTypes.length === 0;
  const globalQuantity = cart["global"] || 0;
  const globalSubtotal = useGlobalPrice ? globalQuantity * (event?.ticket_price || 0) : 0;
  const rawTotal = useGlobalPrice ? globalSubtotal : subtotal;
  const totalCount = useGlobalPrice ? globalQuantity : totalTickets;

  // Fee calculation
  const eventFee: FeeConfig = {
    fee_enabled: (event as any)?.fee_enabled ?? false,
    fee_type: (event as any)?.fee_type ?? "per_ticket",
    fee_mode: (event as any)?.fee_mode ?? "fixed",
    fee_amount: (event as any)?.fee_amount ?? 0,
  };

  const feeItems = useGlobalPrice
    ? [{ price: event?.ticket_price || 0, quantity: globalQuantity }]
    : ticketTypes
        .filter((tt) => (cart[tt.id] || 0) > 0)
        .map((tt) => ({
          price: tt.price,
          quantity: cart[tt.id] || 0,
          override: {
            fee_override_enabled: (tt as any).fee_override_enabled ?? false,
            fee_mode_override: (tt as any).fee_mode_override ?? null,
            fee_amount_override: (tt as any).fee_amount_override ?? null,
          } as TicketTypeFeeOverride,
        }));

  const totalFees = totalCount > 0 ? calcOrderFees(eventFee, feeItems) : 0;

  let discount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.discount_type === "percent") {
      discount = rawTotal * (appliedDiscount.discount_value / 100);
    } else {
      discount = Math.min(appliedDiscount.discount_value, rawTotal);
    }
  }
  const finalTotal = Math.max(0, rawTotal - discount + totalFees);

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
    const name = guestName || user?.user_metadata?.full_name || "";
    if (!name.trim()) {
      toast.error(lang === "de" ? "Bitte Name eingeben" : "Please enter your name");
      return;
    }
    if (!email) {
      toast.error(lang === "de" ? "Bitte E-Mail eingeben" : "Please enter email");
      return;
    }
    setBuying(true);

    // Build cart payload for edge function
    const cartPayload: Record<string, { quantity: number; price: number; ticket_type_id: string }> = {};
    if (!useGlobalPrice) {
      ticketTypes
        .filter((tt) => (cart[tt.id] || 0) > 0)
        .forEach((tt) => {
          cartPayload[tt.id] = {
            quantity: cart[tt.id],
            price: tt.price,
            ticket_type_id: tt.id,
          };
        });
    }

    const redirectUrl = `${window.location.origin}/tickets/${eventId}`;

    try {
      const { data, error } = await supabase.functions.invoke("create-mollie-payment", {
        body: {
          event_id: eventId,
          user_id: user?.id || null,
          cart: useGlobalPrice ? {} : cartPayload,
          guest_name: name,
          guest_email: email,
          guest_phone: guestPhone || null,
          discount_code_id: appliedDiscount?.id || null,
          final_total: finalTotal,
          total_fees: totalFees,
          discount,
          raw_total: rawTotal,
          use_global_price: useGlobalPrice,
          global_quantity: globalQuantity,
          redirect_url: redirectUrl,
        },
      });

      if (error) throw error;

      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (result.error) {
        toast.error(result.error);
        setBuying(false);
        return;
      }

      // Free ticket – no Mollie redirect needed
      if (result.free) {
        setPurchasedQrCode(result.qr_code || "");
        setPurchasedTicketIds(result.ticket_ids || []);
        toast.success(lang === "de" ? "Ticket erfolgreich gebucht! 🎉" : "Ticket booked successfully! 🎉");
        setStep(3);
        setBuying(false);
        return;
      }

      // Redirect to Mollie checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.error(lang === "de" ? "Zahlung konnte nicht erstellt werden" : "Could not create payment");
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(lang === "de" ? "Fehler bei der Zahlung" : "Payment error");
    }
    setBuying(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (paymentChecking) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-foreground gap-4">
      <Loader2 size={40} className="animate-spin text-primary" />
      <p className="text-lg font-display tracking-wider">{lang === "de" ? "ZAHLUNG WIRD ÜBERPRÜFT..." : "VERIFYING PAYMENT..."}</p>
      <p className="text-sm text-muted-foreground">{lang === "de" ? "Bitte warte einen Moment." : "Please wait a moment."}</p>
    </div>
  );
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
              <div className="relative h-40 sm:h-48 md:h-64 overflow-hidden">
                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              </div>
            )}
            <div className="p-5">
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground mb-2">{tr(event.title)}</h1>
              <div className="flex items-center gap-4 text-muted-foreground text-sm mb-2">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(event.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} – {event.time}
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
              {event.description && <p className="text-muted-foreground text-sm">{tr(event.description)}</p>}

              {/* Event info badges */}
              {(event.has_muttizettel || event.has_abendkasse) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {event.has_abendkasse && (
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-accent/50 text-accent-foreground font-medium">
                      <DoorOpen size={13} />
                      {lang === "de" ? "Abendkasse verfügbar" : "Available at the door"}
                    </span>
                  )}
                  {event.has_muttizettel && (
                    <a
                      href={`/u18?event=${eventId}`}
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors"
                    >
                      <ShieldCheck size={13} />
                      {lang === "de" ? "Muttizettel erlaubt" : "Parental consent allowed"}
                    </a>
                  )}
                </div>
              )}

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
          /* Success – Confirmation with QR Code */
          <ScrollReveal>
            <div className="glass-card p-6 md:p-10 animate-fade-in space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <CheckCircle2 size={36} className="text-green-400" />
                </div>
                <h2 className="font-display text-3xl md:text-4xl tracking-wider text-foreground mb-1">
                  {lang === "de" ? "TICKET GEBUCHT!" : "TICKET BOOKED!"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {lang === "de"
                    ? "Zeige diesen QR-Code am Eingang vor."
                    : "Show this QR code at the entrance."}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(purchasedQrCode)}&bgcolor=FFFFFF&color=000000`}
                    alt="Ticket QR Code"
                    className="w-[220px] h-[220px]"
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground tracking-widest select-all">
                  {purchasedQrCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(purchasedQrCode);
                    toast.success(lang === "de" ? "Code kopiert!" : "Code copied!");
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy size={12} /> {lang === "de" ? "Code kopieren" : "Copy code"}
                </button>
              </div>

              {/* Ticket Details */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <h3 className="font-display text-lg tracking-wider text-foreground">
                  {tr(event.title)}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  {new Date(event.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric"
                  })} – {event.time}
                </div>
                {/* Ticket categories breakdown */}
                {useGlobalPrice ? (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">
                      {totalCount} {totalCount === 1 ? "Ticket" : "Tickets"}
                    </span>
                    <span className="text-foreground font-bold">{finalTotal.toFixed(2)}€</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border space-y-1">
                    {ticketTypes.filter((tt) => (cart[tt.id] || 0) > 0).map((tt) => (
                      <div key={tt.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Ticket size={12} />
                          {cart[tt.id]}× {tr(tt.name)}
                        </span>
                        <span className="text-foreground font-medium">{(tt.price * cart[tt.id]).toFixed(2)}€</span>
                      </div>
                    ))}
                    {totalFees > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lang === "de" ? "Servicegebühr" : "Service fee"}</span>
                        <span>{totalFees.toFixed(2)}€</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
                      <span className="text-foreground font-semibold">{lang === "de" ? "Gesamt" : "Total"}</span>
                      <span className="text-foreground font-bold">{finalTotal.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <p className="text-xs text-muted-foreground text-center">
                {lang === "de"
                  ? "Eine Bestätigung wurde an deine E-Mail gesendet. Speichere diesen QR-Code als Screenshot."
                  : "A confirmation has been sent to your email. Save this QR code as a screenshot."}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3 justify-center">
                <button
                  disabled={ticketPdfLoading}
                  onClick={async () => {
                    if (purchasedTicketIds.length === 0) return;
                    setTicketPdfLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-ticket-pdf", {
                        body: { ticket_id: purchasedTicketIds[0] },
                      });
                      if (error) throw error;
                      const blob = new Blob([data], { type: "application/pdf" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `ticket-${purchasedQrCode}.pdf`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error(err);
                      toast.error(lang === "de" ? "Ticket-PDF Download fehlgeschlagen" : "Ticket PDF download failed");
                    }
                    setTicketPdfLoading(false);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 border border-border text-foreground rounded-md hover:bg-muted transition-colors font-display tracking-wider text-sm disabled:opacity-50 min-h-[48px]"
                >
                  {ticketPdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {lang === "de" ? "TICKET PDF" : "DOWNLOAD TICKET PDF"}
                </button>
                <button
                  disabled={invoiceLoading}
                  onClick={async () => {
                    if (purchasedTicketIds.length === 0) return;
                    setInvoiceLoading(true);
                    try {
                      // Find invoice by ticket_id
                      const { data: inv } = await supabase
                        .from("invoices")
                        .select("id, invoice_number")
                        .eq("ticket_id", purchasedTicketIds[0])
                        .maybeSingle();
                      if (!inv) {
                        toast.error(lang === "de" ? "Rechnung wird noch erstellt – bitte versuche es gleich nochmal." : "Invoice is still being created – please try again shortly.");
                        setInvoiceLoading(false);
                        return;
                      }
                      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
                        body: { invoice_id: inv.id },
                      });
                      if (error) throw error;
                      const blob = new Blob([data], { type: "application/pdf" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `rechnung-${inv.invoice_number}.pdf`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error(err);
                      toast.error(lang === "de" ? "PDF-Download fehlgeschlagen" : "PDF download failed");
                    }
                    setInvoiceLoading(false);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 border border-border text-foreground rounded-md hover:bg-muted transition-colors font-display tracking-wider text-sm disabled:opacity-50 min-h-[48px]"
                >
                  {invoiceLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {lang === "de" ? "RECHNUNG" : "DOWNLOAD INVOICE"}
                </button>
                <button
                  onClick={() => navigate("/events")}
                  className="px-5 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 text-sm min-h-[48px]"
                >
                  {lang === "de" ? "WEITERE EVENTS" : "MORE EVENTS"}
                </button>
              </div>
            </div>
          </ScrollReveal>
        ) : step === 1 ? (
          /* Step 1: Select tickets */
          <ScrollReveal>
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              {/* Abendkasse-only mode: no ticket types, only door price */}
              {useGlobalPrice && event.has_abendkasse ? (
                <>
                  <h2 className="font-display text-2xl tracking-wider text-foreground flex items-center gap-2">
                    <DoorOpen size={22} /> {lang === "de" ? "ABENDKASSE" : "BOX OFFICE"}
                  </h2>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-muted-foreground text-sm">
                      {lang === "de"
                        ? "Für dieses Event gibt es keinen Online-Vorverkauf. Tickets sind nur an der Abendkasse erhältlich."
                        : "No online presale for this event. Tickets are available at the door only."}
                    </p>
                    {event.ticket_price > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-foreground font-medium">{lang === "de" ? "Eintrittspreis:" : "Entry price:"}</span>
                        <span className="text-primary font-bold text-xl">{event.ticket_price}€</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                              <p className="font-medium text-foreground">{tr(tt.name)}</p>
                              {tt.description && <p className="text-xs text-muted-foreground">{tr(tt.description)}</p>}
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
                      {(discount > 0 || totalFees > 0) && (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{lang === "de" ? "Zwischensumme" : "Subtotal"}</span>
                            <span>{rawTotal.toFixed(2)}€</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-sm text-green-400">
                              <span>{lang === "de" ? "Rabatt" : "Discount"}</span>
                              <span>-{discount.toFixed(2)}€</span>
                            </div>
                          )}
                          {totalFees > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{lang === "de" ? "Servicegebühr" : "Service fee"}</span>
                              <span>{totalFees.toFixed(2)}€</span>
                            </div>
                          )}
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
                </>
              )}
            </div>
          </ScrollReveal>
        ) : (
          /* Step 2: Checkout */
          <ScrollReveal>
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <h2 className="font-display text-2xl tracking-wider text-foreground">
                {lang === "de" ? "DEINE DATEN" : "YOUR DETAILS"}
              </h2>

              <div>
                <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Name *" : "Name *"}</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder={lang === "de" ? "Vorname" : "First name"}
                />
              </div>

              {!user && (
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
              )}

              {user && (
                <div className="p-3 bg-muted rounded-md text-sm text-foreground">
                  {lang === "de" ? "Eingeloggt als" : "Logged in as"}: <strong>{user.email}</strong>
                </div>
              )}

              <div>
                <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Handynummer *" : "Phone number *"}</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="+49 170 1234567"
                />
              </div>

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
                      <span>{cart[tt.id]}× {tr(tt.name)}</span>
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
                {totalFees > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{lang === "de" ? "Servicegebühr" : "Service fee"}</span>
                    <span>{totalFees.toFixed(2)}€</span>
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
                  disabled={buying || (!user && !guestEmail) || !guestName.trim()}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-display text-lg tracking-wider rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {buying ? <><Loader2 size={18} className="animate-spin" /> {lang === "de" ? "WIRD VERARBEITET..." : "PROCESSING..."}</> : lang === "de" ? (finalTotal > 0 ? "JETZT BEZAHLEN" : "JETZT BUCHEN") : (finalTotal > 0 ? "PAY NOW" : "BOOK NOW")}
                </button>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Muttizettel CTA */}
        {event && event.has_muttizettel && step !== 3 && (
          <ScrollReveal>
            <div className="glass-card p-5 mt-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
                    {lang === "de" ? "UNTER 18?" : "UNDER 18?"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {lang === "de"
                      ? "Für dieses Event ist ein Muttizettel erlaubt. Minderjährige können mit einer unterschriebenen Einverständniserklärung teilnehmen."
                      : "A parental consent form is available for this event. Minors can attend with a signed consent form."}
                  </p>
                  <a
                    href={`/u18?event=${eventId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    <ShieldCheck size={14} />
                    {lang === "de" ? "MUTTIZETTEL ERSTELLEN" : "CREATE CONSENT FORM"}
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Lounge Section */}
        {event && step !== 3 && (
          <EventLoungeSection event={event} />
        )}
      </div>
    </section>
  );
};

export default TicketShopPage;
