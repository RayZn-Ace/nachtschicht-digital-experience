import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Event, Ticket, TicketType } from "@/types/database";
import { toast } from "sonner";
import { Download, FileText, Printer, ChevronDown } from "lucide-react";

const AdminEventRevenue = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [ev, tk, tt] = await Promise.all([
        supabase.from("events").select("*").order("date", { ascending: false }),
        supabase.from("tickets").select("*"),
        supabase.from("ticket_types").select("*"),
      ]);
      if (ev.data) setEvents(ev.data as unknown as Event[]);
      if (tk.data) setTickets(tk.data as unknown as Ticket[]);
      if (tt.data) setTicketTypes(tt.data as unknown as TicketType[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventTickets = useMemo(
    () => (selectedEventId ? tickets.filter((t) => t.event_id === selectedEventId) : []),
    [tickets, selectedEventId]
  );
  const eventTypes = useMemo(
    () => (selectedEventId ? ticketTypes.filter((t) => t.event_id === selectedEventId) : []),
    [ticketTypes, selectedEventId]
  );

  const confirmed = eventTickets.filter((t) => t.status === "confirmed");
  const canceled = eventTickets.filter((t) => t.status === "canceled");
  const refunded = eventTickets.filter((t) => t.status === "refunded");

  const totalBrutto = confirmed.reduce((s, t) => s + t.total_price, 0);
  const totalQty = confirmed.reduce((s, t) => s + t.quantity, 0);
  const canceledQty = canceled.reduce((s, t) => s + t.quantity, 0);
  const refundedQty = refunded.reduce((s, t) => s + t.quantity, 0);
  const vatRate = (selectedEvent as any)?.vat_rate ?? 19;
  const totalNetto = +(totalBrutto / (1 + vatRate / 100)).toFixed(2);
  const totalVat = +(totalBrutto - totalNetto).toFixed(2);
  const checkedIn = confirmed.filter((t) => t.checked_in).length;

  // Breakdown by ticket type
  const byType = useMemo(() => {
    const map: Record<string, { name: string; qty: number; brutto: number; price: number }> = {};
    confirmed.forEach((t) => {
      const tt = eventTypes.find((et) => et.id === t.ticket_type_id);
      const name = tt?.name || "Standard";
      if (!map[name]) map[name] = { name, qty: 0, brutto: 0, price: tt?.price || t.total_price / (t.quantity || 1) };
      map[name].qty += t.quantity;
      map[name].brutto += t.total_price;
    });
    return Object.values(map).sort((a, b) => b.brutto - a.brutto);
  }, [confirmed, eventTypes]);

  // Breakdown by day
  const byDay = useMemo(() => {
    const map: Record<string, { date: string; qty: number; brutto: number }> = {};
    confirmed.forEach((t) => {
      const d = new Date(t.created_at).toLocaleDateString("de-DE");
      if (!map[d]) map[d] = { date: d, qty: 0, brutto: 0 };
      map[d].qty += t.quantity;
      map[d].brutto += t.total_price;
    });
    return Object.values(map).sort((a, b) => {
      const [da, ma, ya] = a.date.split(".");
      const [db, mb, yb] = b.date.split(".");
      return new Date(`${ya}-${ma}-${da}`).getTime() - new Date(`${yb}-${mb}-${db}`).getTime();
    });
  }, [confirmed]);

  const exportCSV = () => {
    if (!selectedEvent) return;
    const ev = selectedEvent;
    let csv = "\ufeff";
    csv += `UMSATZEXPORT;${ev.title}\n`;
    csv += `Eventdatum;${new Date(ev.date).toLocaleDateString("de-DE")}\n`;
    csv += `Uhrzeit;${ev.time}${(ev as any).end_time ? " - " + (ev as any).end_time : ""}\n`;
    csv += `MwSt.-Satz;${vatRate}%\n\n`;

    csv += `ZUSAMMENFASSUNG\n`;
    csv += `Verkaufte Tickets;${totalQty}\n`;
    csv += `Storniert;${canceledQty}\n`;
    csv += `Erstattet;${refundedQty}\n`;
    csv += `Eingecheckt;${checkedIn}\n`;
    csv += `Umsatz brutto;${totalBrutto.toFixed(2)} €\n`;
    csv += `Umsatz netto;${totalNetto.toFixed(2)} €\n`;
    csv += `MwSt.;${totalVat.toFixed(2)} €\n\n`;

    csv += `AUFSCHLÜSSELUNG NACH KATEGORIE\n`;
    csv += `Kategorie;Stückpreis;Menge;Umsatz brutto;Umsatz netto;MwSt.\n`;
    byType.forEach((t) => {
      const netto = +(t.brutto / (1 + vatRate / 100)).toFixed(2);
      const vat = +(t.brutto - netto).toFixed(2);
      csv += `${t.name};${t.price.toFixed(2)} €;${t.qty};${t.brutto.toFixed(2)} €;${netto.toFixed(2)} €;${vat.toFixed(2)} €\n`;
    });
    csv += "\n";

    csv += `AUFSCHLÜSSELUNG NACH TAG\n`;
    csv += `Datum;Menge;Umsatz brutto\n`;
    byDay.forEach((d) => {
      csv += `${d.date};${d.qty};${d.brutto.toFixed(2)} €\n`;
    });
    csv += "\n";

    csv += `EINZELPOSITIONEN\n`;
    csv += `Ticket-ID;Bestelldatum;Käufer;E-Mail;Kategorie;Menge;Brutto;Status;Check-in;Scan-Zeit\n`;
    eventTickets.forEach((t) => {
      const tt = eventTypes.find((et) => et.id === t.ticket_type_id);
      csv += `${t.id};${new Date(t.created_at).toLocaleString("de-DE")};${t.buyer_name || "-"};${t.buyer_email};${tt?.name || "Standard"};${t.quantity};${t.total_price.toFixed(2)} €;${t.status};${t.checked_in ? "Ja" : "Nein"};${t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("de-DE") : "-"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `umsatz-${ev.title.replace(/\s+/g, "-").toLowerCase()}-${new Date(ev.date).toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV-Export heruntergeladen");
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWin = window.open("", "_blank");
    if (!printWin) { toast.error("Popup-Blocker aktiv"); return; }
    printWin.document.write(`
      <html><head><title>Umsatzexport – ${selectedEvent?.title || ""}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; color: #111; }
        h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        h2 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.85rem; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .right { text-align: right; }
        .meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .summary-card { border: 1px solid #ddd; padding: 0.75rem; border-radius: 4px; }
        .summary-card .value { font-size: 1.3rem; font-weight: 700; }
        .summary-card .label { font-size: 0.75rem; color: #666; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 400);
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  return (
    <div>
      {/* Event selector */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
          >
            <option value="">Event auswählen…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} – {new Date(ev.date).toLocaleDateString("de-DE")}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        {selectedEventId && (
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm">
              <Download size={16} /> CSV Export
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2.5 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 text-sm">
              <Printer size={16} /> PDF / Drucken
            </button>
          </div>
        )}
      </div>

      {!selectedEventId ? (
        <div className="glass-card p-12 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Wähle ein Event aus, um den detaillierten Umsatzexport zu sehen.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Verkauft</p>
              <p className="text-2xl font-bold text-foreground">{totalQty}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Umsatz brutto</p>
              <p className="text-2xl font-bold text-primary">{totalBrutto.toFixed(2)} €</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">Umsatz netto</p>
              <p className="text-2xl font-bold text-foreground">{totalNetto.toFixed(2)} €</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground">MwSt. ({vatRate}%)</p>
              <p className="text-2xl font-bold text-foreground">{totalVat.toFixed(2)} €</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{canceledQty}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Storniert</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{refundedQty}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Erstattet</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{checkedIn}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Eingecheckt</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">
                {totalQty > 0 ? ((checkedIn / totalQty) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">Check-in-Rate</p>
            </div>
          </div>

          {/* By type table */}
          <div className="glass-card p-4 mb-4">
            <h3 className="font-display text-base tracking-wider text-foreground mb-3">AUFSCHLÜSSELUNG NACH KATEGORIE</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left py-2 px-2">Kategorie</th>
                    <th className="text-right py-2 px-2">Stückpreis</th>
                    <th className="text-right py-2 px-2">Menge</th>
                    <th className="text-right py-2 px-2">Brutto</th>
                    <th className="text-right py-2 px-2">Netto</th>
                    <th className="text-right py-2 px-2">MwSt.</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((t) => {
                    const netto = +(t.brutto / (1 + vatRate / 100)).toFixed(2);
                    const vat = +(t.brutto - netto).toFixed(2);
                    return (
                      <tr key={t.name} className="border-b border-border/50">
                        <td className="py-2 px-2 text-foreground">{t.name}</td>
                        <td className="py-2 px-2 text-right text-foreground">{t.price.toFixed(2)} €</td>
                        <td className="py-2 px-2 text-right text-foreground">{t.qty}</td>
                        <td className="py-2 px-2 text-right text-foreground font-medium">{t.brutto.toFixed(2)} €</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{netto.toFixed(2)} €</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{vat.toFixed(2)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="py-2 px-2 text-foreground">Gesamt</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-right text-foreground">{totalQty}</td>
                    <td className="py-2 px-2 text-right text-primary">{totalBrutto.toFixed(2)} €</td>
                    <td className="py-2 px-2 text-right text-foreground">{totalNetto.toFixed(2)} €</td>
                    <td className="py-2 px-2 text-right text-foreground">{totalVat.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* By day table */}
          <div className="glass-card p-4 mb-4">
            <h3 className="font-display text-base tracking-wider text-foreground mb-3">VERKÄUFE NACH TAG</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left py-2 px-2">Datum</th>
                    <th className="text-right py-2 px-2">Menge</th>
                    <th className="text-right py-2 px-2">Umsatz brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((d) => (
                    <tr key={d.date} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground">{d.date}</td>
                      <td className="py-2 px-2 text-right text-foreground">{d.qty}</td>
                      <td className="py-2 px-2 text-right text-foreground">{d.brutto.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hidden print content */}
          <div ref={printRef} className="hidden">
            <h1>Umsatzexport – {selectedEvent?.title}</h1>
            <p className="meta">
              Eventdatum: {selectedEvent ? new Date(selectedEvent.date).toLocaleDateString("de-DE") : ""} |
              Uhrzeit: {selectedEvent?.time}{(selectedEvent as any)?.end_time ? ` – ${(selectedEvent as any).end_time}` : ""} |
              MwSt.-Satz: {vatRate}% | Exportiert am: {new Date().toLocaleString("de-DE")}
            </p>

            <div className="summary-grid">
              <div className="summary-card"><div className="value">{totalQty}</div><div className="label">Verkaufte Tickets</div></div>
              <div className="summary-card"><div className="value">{totalBrutto.toFixed(2)} €</div><div className="label">Umsatz brutto</div></div>
              <div className="summary-card"><div className="value">{totalNetto.toFixed(2)} €</div><div className="label">Umsatz netto</div></div>
              <div className="summary-card"><div className="value">{totalVat.toFixed(2)} €</div><div className="label">MwSt.</div></div>
            </div>

            <p>Storniert: {canceledQty} | Erstattet: {refundedQty} | Eingecheckt: {checkedIn}/{totalQty}</p>

            <h2>Aufschlüsselung nach Kategorie</h2>
            <table>
              <thead><tr><th>Kategorie</th><th className="right">Stückpreis</th><th className="right">Menge</th><th className="right">Brutto</th><th className="right">Netto</th><th className="right">MwSt.</th></tr></thead>
              <tbody>
                {byType.map((t) => {
                  const netto = +(t.brutto / (1 + vatRate / 100)).toFixed(2);
                  const vat = +(t.brutto - netto).toFixed(2);
                  return (
                    <tr key={t.name}>
                      <td>{t.name}</td><td className="right">{t.price.toFixed(2)} €</td><td className="right">{t.qty}</td>
                      <td className="right">{t.brutto.toFixed(2)} €</td><td className="right">{netto.toFixed(2)} €</td><td className="right">{vat.toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td><strong>Gesamt</strong></td><td></td><td className="right"><strong>{totalQty}</strong></td><td className="right"><strong>{totalBrutto.toFixed(2)} €</strong></td><td className="right"><strong>{totalNetto.toFixed(2)} €</strong></td><td className="right"><strong>{totalVat.toFixed(2)} €</strong></td></tr></tfoot>
            </table>

            <h2>Verkäufe nach Tag</h2>
            <table>
              <thead><tr><th>Datum</th><th className="right">Menge</th><th className="right">Brutto</th></tr></thead>
              <tbody>
                {byDay.map((d) => (
                  <tr key={d.date}><td>{d.date}</td><td className="right">{d.qty}</td><td className="right">{d.brutto.toFixed(2)} €</td></tr>
                ))}
              </tbody>
            </table>

            <h2>Einzelpositionen</h2>
            <table>
              <thead><tr><th>ID</th><th>Datum</th><th>Käufer</th><th>Kategorie</th><th className="right">Menge</th><th className="right">Brutto</th><th>Status</th><th>Check-in</th></tr></thead>
              <tbody>
                {eventTickets.map((t) => {
                  const tt = eventTypes.find((et) => et.id === t.ticket_type_id);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontSize: "0.7rem" }}>{t.id.slice(0, 8)}</td>
                      <td>{new Date(t.created_at).toLocaleDateString("de-DE")}</td>
                      <td>{t.buyer_name || t.buyer_email}</td>
                      <td>{tt?.name || "Standard"}</td>
                      <td className="right">{t.quantity}</td>
                      <td className="right">{t.total_price.toFixed(2)} €</td>
                      <td>{t.status}</td>
                      <td>{t.checked_in ? "✓" : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEventRevenue;
