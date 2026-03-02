import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Navigate, Link } from "react-router-dom";
import ScrollReveal from "@/components/ScrollReveal";
import { FileText, Calendar, Download, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { toast } from "sonner";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  buyer_name: string;
  buyer_email: string;
  total: number;
  vat_amount: number;
  subtotal: number;
  vat_rate: number;
  status: string;
  issued_at: string | null;
  created_at: string;
  event_id: string | null;
  event: {
    title: string;
    date: string;
  } | null;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  paid: { label: "Bezahlt", cls: "bg-green-500/20 text-green-400" },
  draft: { label: "Entwurf", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Storniert", cls: "bg-destructive/20 text-destructive" },
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const MeineRechnungenPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const de = lang === "de";

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchInvoices = async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, buyer_name, buyer_email, total, vat_amount, subtotal, vat_rate, status, issued_at, created_at, event_id, event:events(title, date)")
        .order("created_at", { ascending: false });
      if (data) setInvoices(data as unknown as InvoiceRow[]);
      setLoading(false);
    };
    fetchInvoices();
  }, [user]);

  const downloadPdf = async (invoice: InvoiceRow) => {
    setDownloadingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoice.id },
      });

      if (error) {
        toast.error(de ? "PDF-Download fehlgeschlagen" : "PDF download failed");
        console.error(error);
        setDownloadingId(null);
        return;
      }

      // data is the PDF blob
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rechnung-${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(de ? "Rechnung heruntergeladen!" : "Invoice downloaded!");
    } catch (err) {
      toast.error(de ? "PDF-Download fehlgeschlagen" : "PDF download failed");
      console.error(err);
    }
    setDownloadingId(null);
  };

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
              MEINE <span className="text-gradient">{de ? "RECHNUNGEN" : "INVOICES"}</span>
            </h1>
          </div>
          <div className="w-20 h-1 bg-primary mt-2 mb-6 rounded-full" />
        </ScrollReveal>

        {loading ? (
          <p className="text-center text-muted-foreground py-16">
            {de ? "Rechnungen werden geladen..." : "Loading invoices..."}
          </p>
        ) : invoices.length === 0 ? (
          <ScrollReveal>
            <div className="text-center py-16 space-y-4">
              <FileText className="mx-auto text-muted-foreground" size={64} />
              <p className="text-muted-foreground">
                {de ? "Du hast noch keine Rechnungen." : "You don't have any invoices yet."}
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
            {invoices.map((inv, i) => {
              const st = statusConfig[inv.status] || {
                label: inv.status,
                cls: "bg-muted text-muted-foreground",
              };
              const isDownloading = downloadingId === inv.id;

              return (
                <ScrollReveal key={inv.id} delay={i * 0.05}>
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-primary shrink-0" />
                          <h2 className="font-display text-lg tracking-wider text-foreground truncate">
                            {inv.invoice_number}
                          </h2>
                        </div>
                        {inv.event && (
                          <p className="text-sm text-muted-foreground truncate">
                            {inv.event.title}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                          <Calendar size={12} />
                          {inv.issued_at
                            ? format(new Date(inv.issued_at), "dd. MMMM yyyy", { locale: deLocale })
                            : format(new Date(inv.created_at), "dd. MMMM yyyy", { locale: deLocale })}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {de ? "Netto" : "Subtotal"}
                        </p>
                        <p className="text-foreground text-xs mt-0.5">{fmtCurrency(Number(inv.subtotal))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          MwSt. {Number(inv.vat_rate)}%
                        </p>
                        <p className="text-foreground text-xs mt-0.5">{fmtCurrency(Number(inv.vat_amount))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {de ? "Gesamt" : "Total"}
                        </p>
                        <p className="text-foreground font-display text-sm mt-0.5">{fmtCurrency(Number(inv.total))}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                      <button
                        onClick={() => downloadPdf(inv)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        {de ? "PDF herunterladen" : "Download PDF"}
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

export default MeineRechnungenPage;
