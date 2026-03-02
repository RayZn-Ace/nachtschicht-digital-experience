import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Upload, Download, ChevronDown, ChevronUp, X, Check, UserCheck, UserX, Mail, Euro, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface UnifiedCustomer {
  email: string;
  name: string | null;
  subscriberId: string | null;
  profileUserId: string | null;
  isRegistered: boolean;
  isSubscribed: boolean;
  tags: { id: string; name: string; color: string }[];
  totalSpent: number;
  ticketCount: number;
  eventBreakdown: { eventTitle: string; eventDate: string; amount: number; qty: number }[];
  subscribedAt: string | null;
  createdAt: string | null;
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<UnifiedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "registered" | "subscribers_only">("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TARGET_FIELDS = [
    { key: "email", label: "E-Mail *", required: true },
    { key: "name", label: "Name", required: false },
    { key: "tags", label: "Tags (kommagetrennt)", required: false },
    { key: "skip", label: "– Ignorieren –", required: false },
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);

    // Fetch all data in parallel
    const [subsRes, profilesRes, ticketsRes, tagsRes, subCatsRes, eventsRes] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*"),
      supabase.from("profiles").select("user_id, email, first_name, last_name, display_name, created_at").eq("is_deleted", false),
      supabase.from("tickets").select("buyer_email, event_id, total_price, quantity, status").eq("status", "confirmed"),
      supabase.from("event_tags").select("*"),
      supabase.from("newsletter_subscriber_categories").select("subscriber_id, category_id"),
      supabase.from("events").select("id, title, date"),
    ]);

    const subscribers = subsRes.data || [];
    const profiles = profilesRes.data || [];
    const tickets = ticketsRes.data || [];
    const allTags = tagsRes.data || [];
    const subCats = subCatsRes.data || [];
    const events = eventsRes.data || [];

    const eventsMap = new Map(events.map((e: any) => [e.id, { title: e.title, date: e.date }]));
    const tagMap = new Map(allTags.map((t: any) => [t.id, t]));

    // Build subscriber tag map
    const subTagMap = new Map<string, { id: string; name: string; color: string }[]>();
    subCats.forEach((sc: any) => {
      const tag = tagMap.get(sc.category_id);
      if (!tag) return;
      const existing = subTagMap.get(sc.subscriber_id) || [];
      existing.push({ id: tag.id, name: tag.name, color: tag.color });
      subTagMap.set(sc.subscriber_id, existing);
    });

    // Merge by email
    const emailMap = new Map<string, UnifiedCustomer>();

    // Add subscribers
    subscribers.forEach((s: any) => {
      const key = s.email.toLowerCase();
      emailMap.set(key, {
        email: s.email,
        name: s.name,
        subscriberId: s.id,
        profileUserId: null,
        isRegistered: false,
        isSubscribed: s.is_active,
        tags: subTagMap.get(s.id) || [],
        totalSpent: 0,
        ticketCount: 0,
        eventBreakdown: [],
        subscribedAt: s.subscribed_at,
        createdAt: null,
      });
    });

    // Merge profiles
    profiles.forEach((p: any) => {
      const key = (p.email || "").toLowerCase();
      if (!key) return;
      const existing = emailMap.get(key);
      const displayName = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
      if (existing) {
        existing.profileUserId = p.user_id;
        existing.isRegistered = true;
        existing.createdAt = p.created_at;
        if (!existing.name && displayName) existing.name = displayName;
      } else {
        emailMap.set(key, {
          email: p.email,
          name: displayName,
          subscriberId: null,
          profileUserId: p.user_id,
          isRegistered: true,
          isSubscribed: false,
          tags: [],
          totalSpent: 0,
          ticketCount: 0,
          eventBreakdown: [],
          subscribedAt: null,
          createdAt: p.created_at,
        });
      }
    });

    // Add ticket data
    tickets.forEach((t: any) => {
      const key = t.buyer_email.toLowerCase();
      const c = emailMap.get(key);
      const ev = eventsMap.get(t.event_id);
      if (c) {
        c.totalSpent += Number(t.total_price);
        c.ticketCount += t.quantity;
        if (ev) {
          c.eventBreakdown.push({
            eventTitle: (ev as any).title,
            eventDate: (ev as any).date,
            amount: Number(t.total_price),
            qty: t.quantity,
          });
        }
      } else {
        emailMap.set(key, {
          email: t.buyer_email,
          name: null,
          subscriberId: null,
          profileUserId: null,
          isRegistered: false,
          isSubscribed: false,
          tags: [],
          totalSpent: Number(t.total_price),
          ticketCount: t.quantity,
          eventBreakdown: ev ? [{ eventTitle: (ev as any).title, eventDate: (ev as any).date, amount: Number(t.total_price), qty: t.quantity }] : [],
          subscribedAt: null,
          createdAt: null,
        });
      }
    });

    setCustomers(Array.from(emailMap.values()));
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = customers;
    if (filterType === "registered") list = list.filter((c) => c.isRegistered);
    if (filterType === "subscribers_only") list = list.filter((c) => c.isSubscribed && !c.isRegistered);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.email.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, filterType, search]);

  // CSV Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV muss mindestens Header + 1 Zeile haben"); return; }

      // Detect delimiter
      const delim = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(delim).map((h) => h.replace(/^"|"$/g, "").trim());
      const rows = lines.slice(1).map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, "").trim()));

      setCsvHeaders(headers);
      setCsvData(rows);

      // Auto-map by guessing
      const mapping: Record<string, string> = {};
      headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes("email") || lower.includes("e-mail")) mapping[String(i)] = "email";
        else if (lower.includes("name") || lower.includes("vorname") || lower.includes("nachname")) mapping[String(i)] = "name";
        else if (lower.includes("tag") || lower.includes("kategorie") || lower.includes("category")) mapping[String(i)] = "tags";
        else mapping[String(i)] = "skip";
      });
      setColumnMapping(mapping);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    const emailCol = Object.entries(columnMapping).find(([_, v]) => v === "email");
    if (!emailCol) { toast.error("Bitte E-Mail-Spalte zuordnen"); return; }

    setImporting(true);
    const emailIdx = Number(emailCol[0]);
    const nameIdx = Number(Object.entries(columnMapping).find(([_, v]) => v === "name")?.[0] ?? -1);
    const tagsIdx = Number(Object.entries(columnMapping).find(([_, v]) => v === "tags")?.[0] ?? -1);

    // Get existing tags
    const { data: existingTags } = await supabase.from("event_tags").select("*");
    const tagNameMap = new Map((existingTags || []).map((t: any) => [t.name.toLowerCase(), t.id]));

    let imported = 0;
    let skipped = 0;

    for (const row of csvData) {
      const email = row[emailIdx]?.trim();
      if (!email || !email.includes("@")) { skipped++; continue; }

      const name = nameIdx >= 0 ? row[nameIdx]?.trim() || null : null;
      const tagStr = tagsIdx >= 0 ? row[tagsIdx]?.trim() || "" : "";

      // Upsert subscriber
      const { data: sub, error } = await supabase
        .from("newsletter_subscribers")
        .upsert({ email, name, is_active: true } as any, { onConflict: "email" })
        .select("id")
        .single();

      if (error || !sub) { skipped++; continue; }

      // Handle tags
      if (tagStr) {
        const tagNames = tagStr.split(",").map((t) => t.trim()).filter(Boolean);
        for (const tName of tagNames) {
          let tagId = tagNameMap.get(tName.toLowerCase());
          if (!tagId) {
            const { data: newTag } = await supabase.from("event_tags").insert({ name: tName } as any).select("id").single();
            if (newTag) {
              tagId = (newTag as any).id;
              tagNameMap.set(tName.toLowerCase(), tagId);
            }
          }
          if (tagId) {
            await supabase.from("newsletter_subscriber_categories").upsert(
              { subscriber_id: (sub as any).id, category_id: tagId } as any,
              { onConflict: "subscriber_id,category_id" }
            );
          }
        }
      }
      imported++;
    }

    toast.success(`${imported} Kunden importiert, ${skipped} übersprungen`);
    setShowImport(false);
    setCsvData([]);
    setCsvHeaders([]);
    setImporting(false);
    fetchCustomers();
  };

  const exportCsv = () => {
    const header = "E-Mail;Name;Registriert;Newsletter;Tags;Gesamtumsatz;Tickets";
    const rows = filtered.map((c) =>
      [
        c.email,
        c.name || "",
        c.isRegistered ? "Ja" : "Nein",
        c.isSubscribed ? "Ja" : "Nein",
        c.tags.map((t) => t.name).join(", "),
        c.totalSpent.toFixed(2),
        c.ticketCount,
      ].join(";")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunden-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => ({
    total: customers.length,
    registered: customers.filter((c) => c.isRegistered).length,
    subscribed: customers.filter((c) => c.isSubscribed).length,
    totalRevenue: customers.reduce((s, c) => s + c.totalSpent, 0),
  }), [customers]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Lade Kundendaten...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: stats.total, icon: Mail },
          { label: "Registriert", value: stats.registered, icon: UserCheck },
          { label: "Newsletter", value: stats.subscribed, icon: Mail },
          { label: "Gesamtumsatz", value: `${stats.totalRevenue.toFixed(2)} €`, icon: Euro },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <s.icon size={14} /> {s.label}
            </div>
            <div className="text-xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name oder E-Mail..."
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm"
        >
          <option value="all">Alle Kunden</option>
          <option value="registered">Nur registriert</option>
          <option value="subscribers_only">Nur Newsletter</option>
        </select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} className="mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={14} className="mr-1" /> Export
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead className="text-right">Umsatz</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Tickets</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Kunden gefunden
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 200).map((c) => (
                <>
                  <TableRow key={c.email} className="cursor-pointer" onClick={() => setExpandedEmail(expandedEmail === c.email ? null : c.email)}>
                    <TableCell>
                      <div className="font-medium text-foreground text-sm">{c.name || "–"}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1.5">
                        {c.isRegistered && (
                          <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-400">
                            <UserCheck size={10} /> Account
                          </Badge>
                        )}
                        {c.isSubscribed && (
                          <Badge variant="outline" className="text-xs gap-1 border-blue-500/30 text-blue-400">
                            <Mail size={10} /> Newsletter
                          </Badge>
                        )}
                        {!c.isRegistered && !c.isSubscribed && (
                          <Badge variant="outline" className="text-xs gap-1 border-muted text-muted-foreground">
                            <UserX size={10} /> Gast
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>
                        ))}
                        {c.tags.length > 3 && <Badge variant="secondary" className="text-[10px]">+{c.tags.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {c.totalSpent > 0 ? `${c.totalSpent.toFixed(2)} €` : "–"}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">{c.ticketCount || "–"}</TableCell>
                    <TableCell>
                      {expandedEmail === c.email ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </TableCell>
                  </TableRow>
                  {expandedEmail === c.email && (
                    <TableRow key={`${c.email}-details`}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Info</h4>
                            <div className="space-y-1 text-sm">
                              <div>Registriert: {c.isRegistered ? "Ja" : "Nein"}</div>
                              <div>Newsletter: {c.isSubscribed ? "Aktiv" : "Nein"}</div>
                              {c.subscribedAt && <div>Newsletter seit: {new Date(c.subscribedAt).toLocaleDateString("de-DE")}</div>}
                              {c.createdAt && <div>Account seit: {new Date(c.createdAt).toLocaleDateString("de-DE")}</div>}
                              {c.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Tag size={12} className="text-muted-foreground mt-0.5" />
                                  {c.tags.map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Event-Ausgaben</h4>
                            {c.eventBreakdown.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Keine Ticketkäufe</div>
                            ) : (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {c.eventBreakdown.map((ev, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="truncate mr-2">{ev.eventTitle}</span>
                                    <span className="shrink-0 font-medium">{ev.qty}× · {ev.amount.toFixed(2)} €</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > 200 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
            Zeige 200 von {filtered.length} Kunden. Nutze die Suche zum Filtern.
          </div>
        )}
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV Import – Spalten zuordnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {csvData.length} Zeilen erkannt. Ordne die Spalten den Feldern zu:
            </p>
            <div className="space-y-3">
              {csvHeaders.map((header, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-medium truncate" title={header}>{header}</div>
                  <span className="text-muted-foreground">→</span>
                  <Select value={columnMapping[String(idx)] || "skip"} onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, [String(idx)]: v }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={csvData[0]?.[idx]}>
                    z.B. {csvData[0]?.[idx] || "–"}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="border border-border rounded-md p-3 bg-muted/30 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground mb-1">Vorschau (erste 3 Zeilen):</div>
              {csvData.slice(0, 3).map((row, i) => (
                <div key={i} className="text-xs text-foreground truncate">{row.join(" | ")}</div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>Abbrechen</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importiere..." : `${csvData.length} Kunden importieren`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
