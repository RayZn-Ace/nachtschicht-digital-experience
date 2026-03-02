import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Navigate, Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import {
  ShoppingBag, Calendar, Ticket, ChevronDown, Filter,
  ArrowLeft, FileText, Loader2, Download,
} from "lucide-react";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { toast } from "sonner";

interface OrderWithEvent {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string;
  qr_code: string | null;
  event_id: string;
  event: {
    title: string;
    date: string;
    time: string | null;
    image_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; labelEN: string; cls: string }> = {
  confirmed: { label: "Bezahlt", labelEN: "Paid", cls: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Storniert", labelEN: "Cancelled", cls: "bg-destructive/20 text-destructive" },
  refunded: { label: "Erstattet", labelEN: "Refunded", cls: "bg-orange-500/20 text-orange-400" },
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const MeineBestellungenPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const de = lang === "de";

  const [orders, setOrders] = useState<OrderWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadInvoice = async (ticketId: string) => {
    setDownloadingId(ticketId);
    try {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("ticket_id", ticketId)
        .maybeSingle();
      if (!inv) {
        toast.error(de ? "Keine Rechnung für diese Bestellung gefunden." : "No invoice found for this order.");
        setDownloadingId(null);
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
      toast.success(de ? "Rechnung heruntergeladen!" : "Invoice downloaded!");
    } catch (err) {
      console.error(err);
      toast.error(de ? "PDF-Download fehlgeschlagen" : "PDF download failed");
    }
    setDownloadingId(null);
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, quantity, total_price, status, created_at, buyer_name, buyer_email, qr_code, event_id, event:events(title, date, time, image_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setOrders(data as unknown as OrderWithEvent[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    return sortDesc ? result : [...result].reverse();
  }, [orders, statusFilter, sortDesc]);

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-4xl md:text-6xl tracking-wider text-foreground">
              MEINE <span className="text-gradient">{de ? "BESTELLUNGEN" : "ORDERS"}</span>
            </h1>
          </div>
          <div className="w-20 h-1 bg-primary mt-2 mb-6 rounded-full" />
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.05}>
          <div className="glass-card p-3 mb-6 flex flex-wrap gap-2 items-center">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-xs"
            >
              <option value="all">{de ? "Alle Status" : "All statuses"}</option>
              <option value="confirmed">{de ? "Bezahlt" : "Paid"}</option>
              <option value="refunded">{de ? "Erstattet" : "Refunded"}</option>
              <option value="cancelled">{de ? "Storniert" : "Cancelled"}</option>
            </select>
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="flex items-center gap-1 px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronDown size={12} className={`transition-transform ${sortDesc ? "" : "rotate-180"}`} />
              {de ? "Datum" : "Date"}
            </button>
          </div>
        </ScrollReveal>

        {loading ? (
          <p className="text-center text-muted-foreground py-16">
            {de ? "Bestellungen werden geladen..." : "Loading orders..."}
          </p>
        ) : filtered.length === 0 ? (
          <ScrollReveal>
            <div className="text-center py-16 space-y-4">
              <ShoppingBag className="mx-auto text-muted-foreground" size={64} />
              <p className="text-muted-foreground">
                {de ? "Keine Bestellungen gefunden." : "No orders found."}
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
              >
                {de ? "EVENTS ENTDECKEN" : "DISCOVER EVENTS"}
              </Link>
            </div>
          </ScrollReveal>
        ) : (
          <div className="space-y-3">
            {filtered.map((order, i) => {
              const st = statusConfig[order.status] || { label: order.status, labelEN: order.status, cls: "bg-muted text-muted-foreground" };
              return (
                <ScrollReveal key={order.id} delay={i * 0.05}>
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-display text-lg tracking-wider text-foreground truncate">
                          {order.event?.title || "Event"}
                        </h2>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                          <Calendar size={12} />
                          {order.event?.date
                            ? format(new Date(order.event.date), "dd. MMMM yyyy", { locale: deLocale })
                            : "—"}
                          {order.event?.time && ` – ${order.event.time}`}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${st.cls}`}>
                        {de ? st.label : st.labelEN}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{de ? "Bestell-Nr." : "Order #"}</p>
                        <p className="text-foreground font-mono text-xs mt-0.5">{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{de ? "Datum" : "Date"}</p>
                        <p className="text-foreground text-xs mt-0.5">
                          {format(new Date(order.created_at), "dd.MM.yyyy HH:mm", { locale: deLocale })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tickets</p>
                        <p className="text-foreground text-xs mt-0.5">{order.quantity}x</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{de ? "Betrag" : "Amount"}</p>
                        <p className="text-foreground font-display text-sm mt-0.5">{fmtCurrency(order.total_price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                      <Link
                        to="/meine-tickets"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-md hover:bg-primary/20 transition-colors"
                      >
                        <Ticket size={12} /> {de ? "Tickets anzeigen" : "View tickets"}
                      </Link>
                      <button
                        onClick={() => downloadInvoice(order.id)}
                        disabled={downloadingId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === order.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <FileText size={12} />
                        )}
                        {de ? "Rechnung" : "Invoice"}
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default MeineBestellungenPage;
