import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ParsedCheckout {
  checkoutId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ticketType: string;
  pricePerTicket: number;
  quantity: number;
  subtotal: number;
  fees: number;
  totalTicket: number;
  vatRate: number;
  vatAmount: number;
  netRevenue: number;
  grossRevenue: number;
}

interface ImportSummary {
  eventTitle: string;
  eventDate: string;
  totalTickets: number;
  totalRevenue: number;
  uniqueCustomers: number;
  ticketTypes: Record<string, { count: number; price: number }>;
}

const parseCurrencyDE = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/[€\s]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const parsePercentDE = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/[%\s]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const AdminCsvMigration = () => {
  const [step, setStep] = useState<"upload" | "preview" | "config" | "importing" | "done">("upload");
  const [csvRows, setCsvRows] = useState<ParsedCheckout[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("22:00");
  const [eventLocation, setEventLocation] = useState("Nachtschicht");
  const [eventCity, setEventCity] = useState("Kaiserslautern");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ events: number; tickets: number; customers: number } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      toast.error("CSV enthält keine Daten");
      return;
    }

    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

    const rows: ParsedCheckout[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim());
      if (cols.length < 5) continue;

      // Auto-detect column indices based on known header patterns
      const idxMap = {
        checkoutId: findCol(headers, ["checkout-id", "checkout_id", "id", "bestellnr", "bestell-nr"]),
        firstName: findCol(headers, ["vorname", "first_name", "firstname"]),
        lastName: findCol(headers, ["nachname", "last_name", "lastname"]),
        email: findCol(headers, ["e-mail", "email", "mail"]),
        phone: findCol(headers, ["telefonnummer", "telefon", "phone", "tel"]),
        ticketType: findCol(headers, ["ticketart", "ticket_type", "tickettype", "typ"]),
        pricePerTicket: findCol(headers, ["kaufpreis p. ticket", "kaufpreis", "preis", "price"]),
        quantity: findCol(headers, ["anzahl", "quantity", "menge"]),
        subtotal: findCol(headers, ["summe ohne gebühren", "summe ohne gebühr", "subtotal", "netto"]),
        fees: findCol(headers, ["gebühren", "gebühr", "fees", "fee"]),
        totalTicket: findCol(headers, ["ticketsumme", "total", "gesamt"]),
        vatRate: findCol(headers, ["ticket-steuersatz", "steuersatz", "vat_rate", "mwst"]),
        vatAmount: findCol(headers, ["ticket-steuern", "steuern", "vat", "tax"]),
        netRevenue: findCol(headers, ["gesamt-umsatz (netto)", "netto-umsatz", "net_revenue"]),
        grossRevenue: findCol(headers, ["gesamt-umsatz (brutto)", "brutto-umsatz", "gross_revenue", "brutto"]),
      };

      rows.push({
        checkoutId: cols[idxMap.checkoutId] || String(i),
        firstName: cols[idxMap.firstName] || "",
        lastName: cols[idxMap.lastName] || "",
        email: cols[idxMap.email] || "",
        phone: cols[idxMap.phone] || "",
        ticketType: cols[idxMap.ticketType] || "Standard",
        pricePerTicket: parseCurrencyDE(cols[idxMap.pricePerTicket]),
        quantity: parseInt(cols[idxMap.quantity]) || 1,
        subtotal: parseCurrencyDE(cols[idxMap.subtotal]),
        fees: parseCurrencyDE(cols[idxMap.fees]),
        totalTicket: parseCurrencyDE(cols[idxMap.totalTicket]),
        vatRate: parsePercentDE(cols[idxMap.vatRate]),
        vatAmount: parseCurrencyDE(cols[idxMap.vatAmount]),
        netRevenue: parseCurrencyDE(cols[idxMap.netRevenue]),
        grossRevenue: parseCurrencyDE(cols[idxMap.grossRevenue]),
      });
    }

    if (rows.length === 0) {
      toast.error("Keine gültigen Zeilen gefunden");
      return;
    }

    setCsvRows(rows);

    // Build summary
    const ticketTypes: Record<string, { count: number; price: number }> = {};
    let totalTickets = 0;
    let totalRevenue = 0;
    const uniqueEmails = new Set<string>();

    rows.forEach(r => {
      totalTickets += r.quantity;
      totalRevenue += r.grossRevenue;
      if (r.email) uniqueEmails.add(r.email.toLowerCase());
      if (!ticketTypes[r.ticketType]) ticketTypes[r.ticketType] = { count: 0, price: r.pricePerTicket };
      ticketTypes[r.ticketType].count += r.quantity;
    });

    // Try to guess event name from filename
    const guessedTitle = fileName
      .replace(/\.csv$/i, "")
      .replace(/EventExport[-_]?Einzelne[-_]?Checkouts[-_]?/i, "")
      .replace(/[-_]/g, " ")
      .trim();

    setSummary({
      eventTitle: guessedTitle || "Importiertes Event",
      eventDate: new Date().toISOString().split("T")[0],
      totalTickets,
      totalRevenue,
      uniqueCustomers: uniqueEmails.size,
      ticketTypes,
    });

    setEventTitle(guessedTitle || "Importiertes Event");
    setStep("preview");
  };

  const findCol = (headers: string[], patterns: string[]): number => {
    for (const pat of patterns) {
      const idx = headers.findIndex(h => h.includes(pat));
      if (idx >= 0) return idx;
    }
    return 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!eventTitle || !eventDate) {
      toast.error("Bitte Event-Titel und Datum angeben");
      return;
    }

    setImporting(true);
    setStep("importing");

    try {
      // 1. Create event
      const totalTickets = csvRows.reduce((s, r) => s + r.quantity, 0);
      const totalRevenue = csvRows.reduce((s, r) => s + r.grossRevenue, 0);
      const vatRate = csvRows[0]?.vatRate || 19;

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          title: eventTitle,
          subtitle: `${eventLocation}, ${eventCity}`,
          date: new Date(eventDate).toISOString(),
          time: eventTime,
          is_published: false,
          ticket_quantity: totalTickets,
          tickets_sold: totalTickets,
          ticket_price: csvRows[0]?.pricePerTicket || 0,
          vat_rate: vatRate,
          description: `Importiert am ${new Date().toLocaleDateString("de-DE")} aus CSV`,
        })
        .select("id")
        .single();

      if (eventError) throw eventError;
      const eventId = eventData.id;

      // 2. Create ticket types
      const ticketTypeMap: Record<string, string> = {};
      const uniqueTypes = Object.entries(
        csvRows.reduce((acc, r) => {
          if (!acc[r.ticketType]) acc[r.ticketType] = { count: 0, price: r.pricePerTicket };
          acc[r.ticketType].count += r.quantity;
          return acc;
        }, {} as Record<string, { count: number; price: number }>)
      );

      for (const [typeName, info] of uniqueTypes) {
        const { data: ttData, error: ttError } = await supabase
          .from("ticket_types")
          .insert({
            event_id: eventId,
            name: typeName,
            price: info.price,
            quantity: info.count,
            sold: info.count,
            is_active: false,
          })
          .select("id")
          .single();

        if (ttError) throw ttError;
        ticketTypeMap[typeName] = ttData.id;
      }

      // 3. Insert tickets
      let ticketCount = 0;
      const ticketInserts = csvRows.map(r => ({
        event_id: eventId,
        ticket_type_id: ticketTypeMap[r.ticketType] || null,
        buyer_name: `${r.firstName} ${r.lastName}`.trim(),
        buyer_email: r.email.toLowerCase(),
        buyer_phone: r.phone || null,
        quantity: r.quantity,
        total_price: r.grossRevenue,
        fee_amount: r.fees,
        status: "confirmed" as const,
        qr_code: `IMPORT-${r.checkoutId}-${Date.now()}`,
      }));

      // Insert in batches of 50
      for (let i = 0; i < ticketInserts.length; i += 50) {
        const batch = ticketInserts.slice(i, i + 50);
        const { error: ticketError } = await supabase.from("tickets").insert(batch);
        if (ticketError) throw ticketError;
        ticketCount += batch.length;
      }

      // 4. Sync customers to newsletter_subscribers
      const uniqueCustomers = new Map<string, { name: string; email: string }>();
      csvRows.forEach(r => {
        const email = r.email.toLowerCase();
        if (email && !uniqueCustomers.has(email)) {
          uniqueCustomers.set(email, {
            email,
            name: `${r.firstName} ${r.lastName}`.trim(),
          });
        }
      });

      let customerCount = 0;
      for (const [, customer] of uniqueCustomers) {
        const { error: subError } = await supabase
          .from("newsletter_subscribers")
          .upsert(
            { email: customer.email, name: customer.name, is_active: true },
            { onConflict: "email" }
          );
        if (!subError) customerCount++;
      }

      setImportResult({ events: 1, tickets: ticketCount, customers: customerCount });
      setStep("done");
      toast.success("Import erfolgreich abgeschlossen!");
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Import fehlgeschlagen: ${err.message}`);
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setCsvRows([]);
    setSummary(null);
    setEventTitle("");
    setEventDate("");
    setEventTime("22:00");
    setImportResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">CSV-Migration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importiere Checkout-Exports aus externen Ticketing-Systemen. Events, Tickets, Umsätze und Kundendaten werden automatisch angelegt.
        </p>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">CSV-Datei hochladen</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unterstützt: Checkout-Exports mit Spalten wie Vorname, E-Mail, Ticketart, Kaufpreis, Anzahl etc.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            CSV auswählen
          </Button>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && summary && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{summary.totalTickets}</div>
              <div className="text-xs text-muted-foreground">Tickets</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{summary.totalRevenue.toFixed(2)}€</div>
              <div className="text-xs text-muted-foreground">Umsatz (Brutto)</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>
              <div className="text-xs text-muted-foreground">Kunden</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{Object.keys(summary.ticketTypes).length}</div>
              <div className="text-xs text-muted-foreground">Ticketarten</div>
            </div>
          </div>

          {/* Ticket types breakdown */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Erkannte Ticketarten</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.ticketTypes).map(([name, info]) => (
                <Badge key={name} variant="secondary">
                  {name}: {info.count}× à {info.price.toFixed(2)}€
                </Badge>
              ))}
            </div>
          </div>

          {/* Event config */}
          <div className="bg-card border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold">Event-Details festlegen</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Event-Titel *</Label>
                <Input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="z.B. 90er Party" />
              </div>
              <div>
                <Label>Datum *</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div>
                <Label>Uhrzeit</Label>
                <Input value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="22:00" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Nachtschicht" />
              </div>
              <div>
                <Label>Ort</Label>
                <Input value={eventCity} onChange={e => setEventCity(e.target.value)} placeholder="Kaiserslautern" />
              </div>
            </div>
          </div>

          {/* Data preview */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {csvRows.length} Checkout-Zeilen anzeigen
            </button>
            {showDetails && (
              <div className="mt-2 max-h-80 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Ticketart</TableHead>
                      <TableHead className="text-right">Anz.</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.checkoutId}</TableCell>
                        <TableCell>{r.firstName} {r.lastName}</TableCell>
                        <TableCell className="text-xs">{r.email}</TableCell>
                        <TableCell>{r.ticketType}</TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell className="text-right">{r.grossRevenue.toFixed(2)}€</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>Abbrechen</Button>
            <Button onClick={handleImport} disabled={!eventTitle || !eventDate}>
              <Upload className="h-4 w-4 mr-2" />
              Import starten ({csvRows.length} Checkouts)
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="font-semibold">Import läuft...</h3>
            <p className="text-sm text-muted-foreground">Event, Tickets und Kundendaten werden angelegt.</p>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <div className="text-center py-12 space-y-6">
          <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Import abgeschlossen!</h3>
            <p className="text-sm text-muted-foreground mt-2">Folgendes wurde importiert:</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{importResult.events}</div>
              <div className="text-xs text-muted-foreground">Event</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{importResult.tickets}</div>
              <div className="text-xs text-muted-foreground">Tickets</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{importResult.customers}</div>
              <div className="text-xs text-muted-foreground">Kunden</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>Weiteren Import starten</Button>
            <Button onClick={() => window.location.href = "/admin?tab=events"}>Zu Events</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCsvMigration;
