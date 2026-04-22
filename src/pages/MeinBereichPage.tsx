import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Ticket, Calendar, CheckCircle2, Copy, Download, FileText, Loader2,
  User, Mail, Camera, Save, Lock, CalendarDays, Gift, TrendingUp,
  ShoppingBag, CreditCard, Star, ChevronRight, LogOut,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { useRef } from "react";

/* ─── Types ─── */
interface TicketWithEvent {
  id: string;
  quantity: number;
  total_price: number;
  fee_amount: number;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string;
  qr_code: string | null;
  checked_in: boolean;
  ticket_type_id: string | null;
  event: { title: string; date: string; time: string | null; image_url: string | null } | null;
  ticket_type: { name: string } | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  buyer_name: string;
  total: number;
  status: string;
  created_at: string;
  event: { title: string; date: string } | null;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  salutation: string | null;
  birthday: string | null;
  avatar_url: string | null;
}

const MeinBereichPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "tickets";

  // Tickets
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Invoices
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [salutation, setSalutation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch tickets
    supabase
      .from("tickets")
      .select("*, event:events(title, date, time, image_url), ticket_type:ticket_types(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTickets(data as unknown as TicketWithEvent[]);
        setTicketsLoading(false);
      });

    // Fetch invoices
    supabase
      .from("invoices")
      .select("id, invoice_number, buyer_name, total, status, created_at, event:events(title, date)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setInvoices(data as unknown as InvoiceRow[]);
        setInvoicesLoading(false);
      });

    // Fetch profile
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p = data as unknown as Profile;
          setProfile(p);
          setFirstName(p.first_name || "");
          setLastName(p.last_name || "");
          setDisplayName(p.display_name || "");
          setSalutation(p.salutation || "");
          setBirthday(p.birthday || "");
          setAvatarUrl(p.avatar_url);
        }
        setProfileLoading(false);
      });
  }, [user]);

  const handleDownloadPdf = async (ticketId: string) => {
    setDownloadingPdf(ticketId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ticket-pdf", {
        body: { ticket_id: ticketId },
      });
      if (error) throw error;
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${ticketId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF-Download fehlgeschlagen");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rechnung-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Rechnung konnte nicht heruntergeladen werden");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max. 5MB"); return; }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
    toast.success("Profilbild aktualisiert");
    setAvatarUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName || null, last_name: lastName || null, display_name: displayName || null, salutation: salutation || null, birthday: birthday || null } as any)
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil gespeichert ✓");
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Mind. 6 Zeichen"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Passwort geändert ✓"); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const inputCls = "w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none";

  // Stats
  const confirmedTickets = tickets.filter(t => t.status === "confirmed");
  const totalSpent = confirmedTickets.reduce((s, t) => s + Number(t.total_price), 0);
  const totalTicketCount = confirmedTickets.reduce((s, t) => s + t.quantity, 0);
  const upcomingEvents = confirmedTickets.filter(t => t.event && new Date(t.event.date) >= new Date()).length;

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl">
        {/* Header with avatar */}
        <ScrollReveal>
          <div className="glass-card p-6 md:p-8 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl md:text-4xl tracking-wider text-foreground truncate">
                  {lang === "de" ? "MEIN " : "MY "}<span className="text-gradient">{lang === "de" ? "BEREICH" : "AREA"}</span>
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                  <Mail size={12} /> {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="font-display text-xl md:text-2xl tracking-wider text-foreground">{totalTicketCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tickets</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="font-display text-xl md:text-2xl tracking-wider text-foreground">{upcomingEvents}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "de" ? "Anstehend" : "Upcoming"}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="font-display text-xl md:text-2xl tracking-wider text-foreground">{totalSpent.toFixed(0)}€</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "de" ? "Ausgaben" : "Spent"}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-4">
          <ScrollReveal delay={0.05}>
            <TabsList className="w-full grid grid-cols-4 bg-muted/50 border border-border p-1 rounded-lg h-auto">
              <TabsTrigger value="tickets" className="font-display text-xs md:text-sm tracking-wider py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Ticket size={14} className="mr-1.5 hidden sm:inline" />
                TICKETS
              </TabsTrigger>
              <TabsTrigger value="ausgaben" className="font-display text-xs md:text-sm tracking-wider py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <CreditCard size={14} className="mr-1.5 hidden sm:inline" />
                {lang === "de" ? "AUSGABEN" : "SPENDING"}
              </TabsTrigger>
              <TabsTrigger value="profil" className="font-display text-xs md:text-sm tracking-wider py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <User size={14} className="mr-1.5 hidden sm:inline" />
                PROFIL
              </TabsTrigger>
              <TabsTrigger value="bonus" className="font-display text-xs md:text-sm tracking-wider py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <Star size={14} className="mr-1.5 hidden sm:inline" />
                BONUS
              </TabsTrigger>
            </TabsList>
          </ScrollReveal>

          {/* ─── TICKETS TAB ─── */}
          <TabsContent value="tickets" className="space-y-4">
            {ticketsLoading ? (
              <p className="text-center text-muted-foreground py-16">Tickets werden geladen...</p>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 space-y-4 glass-card p-8">
                <Ticket className="mx-auto text-muted-foreground" size={64} />
                <p className="text-muted-foreground">{lang === "de" ? "Noch keine Tickets gebucht." : "No tickets yet."}</p>
                <Link to="/events" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90">
                  {lang === "de" ? "EVENTS ENTDECKEN" : "DISCOVER EVENTS"}
                </Link>
              </div>
            ) : (
              tickets.map((ticket, i) => (
                <ScrollReveal key={ticket.id} delay={i * 0.05}>
                  <div className="glass-card overflow-hidden flex flex-col md:flex-row">
                    {ticket.event?.image_url && (
                      <div className="md:w-36 h-28 md:h-auto shrink-0">
                        <img src={ticket.event.image_url} alt={ticket.event?.title || "Event"} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg tracking-wider text-foreground">{ticket.event?.title || "Event"}</h3>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
                            <Calendar size={12} />
                            {ticket.event?.date ? format(new Date(ticket.event.date), "dd. MMMM yyyy", { locale: deLocale }) : "—"}
                            {ticket.event?.time && ` – ${ticket.event.time}`}
                          </div>
                          {ticket.ticket_type?.name && (
                            <span className="text-xs text-primary mt-1 inline-block">{ticket.ticket_type.name}</span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${
                          ticket.status === "confirmed" ? "bg-green-500/20 text-green-400"
                            : ticket.status === "cancelled" ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.status === "confirmed" ? "Bestätigt" : ticket.status === "cancelled" ? "Storniert" : ticket.status}
                        </span>
                      </div>

                      {ticket.qr_code && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg shadow shrink-0">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(ticket.qr_code)}&bgcolor=FFFFFF&color=000000`}
                              alt="QR" className="w-[80px] h-[80px]"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <span className="font-mono text-[9px] text-muted-foreground truncate">{ticket.id.slice(0, 8).toUpperCase()}</span>
                            {ticket.checked_in && (
                              <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={11} /> Eingecheckt</span>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => { navigator.clipboard.writeText(ticket.qr_code!); toast.success("Kopiert!"); }}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 border border-border rounded"
                              >
                                <Copy size={10} /> Code
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(ticket.id)}
                                disabled={downloadingPdf === ticket.id}
                                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 px-2 py-0.5 border border-primary/30 rounded disabled:opacity-50"
                              >
                                {downloadingPdf === ticket.id ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                                PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-sm">
                        <span className="text-muted-foreground">{ticket.quantity}× Ticket</span>
                        <span className="font-display text-foreground">{Number(ticket.total_price).toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))
            )}
          </TabsContent>

          {/* ─── AUSGABEN TAB ─── */}
          <TabsContent value="ausgaben" className="space-y-4">
            {/* Spending summary */}
            <ScrollReveal>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-primary" />
                  <h3 className="font-display text-lg tracking-wider text-foreground">{lang === "de" ? "AUSGABEN ÜBERSICHT" : "SPENDING OVERVIEW"}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-display text-2xl text-foreground">{totalSpent.toFixed(2)}€</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "de" ? "Gesamt ausgegeben" : "Total spent"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-display text-2xl text-foreground">{confirmedTickets.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lang === "de" ? "Bestellungen" : "Orders"}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Invoices */}
            <ScrollReveal delay={0.05}>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-primary" />
                  <h3 className="font-display text-lg tracking-wider text-foreground">{lang === "de" ? "RECHNUNGEN" : "INVOICES"}</h3>
                </div>
                {invoicesLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Laden...</p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{lang === "de" ? "Keine Rechnungen vorhanden." : "No invoices yet."}</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{inv.event?.title || inv.invoice_number}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {inv.invoice_number} · {format(new Date(inv.created_at), "dd.MM.yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-display text-sm text-foreground">{Number(inv.total).toFixed(2)}€</span>
                          <button
                            onClick={() => handleDownloadInvoice(inv.id, inv.invoice_number)}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title="Rechnung herunterladen"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </TabsContent>

          {/* ─── PROFIL TAB ─── */}
          <TabsContent value="profil" className="space-y-4">
            {/* Avatar */}
            <ScrollReveal>
              <div className="glass-card p-6 flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-muted-foreground" />}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Camera size={20} className="text-foreground" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <p className="font-display text-xl tracking-wider text-foreground">{displayName || firstName || user.email?.split("@")[0]}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail size={12} /> {user.email}</p>
                  {avatarUploading && <p className="text-xs text-primary mt-1 animate-pulse">Wird hochgeladen...</p>}
                </div>
              </div>
            </ScrollReveal>

            {/* Profile form */}
            <ScrollReveal delay={0.05}>
              <div className="glass-card p-6 space-y-4">
                <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
                  <User size={16} /> {lang === "de" ? "PERSÖNLICHE DATEN" : "PERSONAL DATA"}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm text-foreground mb-1 block">Anrede</label>
                    <select value={salutation} onChange={(e) => setSalutation(e.target.value)} className={inputCls}>
                      <option value="">–</option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm text-foreground mb-1 block">Anzeigename</label>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder="NightOwl42" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-foreground mb-1 block">Vorname</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="Max" />
                  </div>
                  <div>
                    <label className="text-sm text-foreground mb-1 block">Nachname</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Mustermann" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-foreground mb-1 block flex items-center gap-1"><CalendarDays size={12} /> Geburtstag</label>
                  <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} />
                </div>
                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
                  <Mail size={14} /> E-Mail: <strong className="text-foreground">{user.email}</strong>
                  <span className="text-xs">(nicht änderbar)</span>
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="w-full py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={16} /> {saving ? "..." : "SPEICHERN"}
                </button>
              </div>
            </ScrollReveal>

            {/* Password */}
            <ScrollReveal delay={0.1}>
              <div className="glass-card p-6 space-y-4">
                <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2"><Lock size={16} /> PASSWORT ÄNDERN</h3>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Neues Passwort" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Passwort bestätigen" />
                <button onClick={handlePasswordChange} disabled={changingPassword || !newPassword} className="w-full py-3 bg-muted border border-border text-foreground font-display tracking-wider rounded-md hover:bg-muted/80 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Lock size={16} /> {changingPassword ? "..." : "PASSWORT ÄNDERN"}
                </button>
              </div>
            </ScrollReveal>

            {/* Logout mobile */}
            <div className="md:hidden">
              <button onClick={handleLogout} className="w-full py-3 border border-destructive/30 text-destructive font-display tracking-wider rounded-md hover:bg-destructive/10 flex items-center justify-center gap-2">
                <LogOut size={16} /> LOGOUT
              </button>
            </div>

            <ScrollReveal delay={0.15}>
              <div className="glass-card p-6 space-y-3">
                <h3 className="font-display text-lg tracking-wider text-foreground">{lang === "de" ? "DATENSCHUTZ" : "PRIVACY"}</h3>
                <p className="text-sm text-muted-foreground">
                  {lang === "de"
                    ? "Du kannst deine Daten exportieren oder deinen Account dauerhaft löschen."
                    : "You can export your data or permanently delete your account."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/daten-export"
                    className="flex-1 py-3 px-4 border border-border rounded-md text-center text-foreground hover:bg-muted transition-colors"
                  >
                    {lang === "de" ? "DATEN EXPORTIEREN" : "EXPORT DATA"}
                  </Link>
                  <Link
                    to="/account-loeschen"
                    className="flex-1 py-3 px-4 border border-destructive/30 rounded-md text-center text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {lang === "de" ? "ACCOUNT LÖSCHEN" : "DELETE ACCOUNT"}
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </TabsContent>

          {/* ─── BONUS TAB ─── */}
          <TabsContent value="bonus">
            <ScrollReveal>
              <div className="glass-card p-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
                  <Star size={40} className="text-primary" />
                </div>
                <h3 className="font-display text-2xl tracking-wider text-foreground">
                  {lang === "de" ? "BONUSPROGRAMM" : "LOYALTY PROGRAM"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {lang === "de"
                    ? "Unser Bonusprogramm wird bald freigeschaltet! Sammle Punkte bei jedem Besuch und sichere dir exklusive Vorteile und Rewards."
                    : "Our loyalty program is coming soon! Earn points with every visit and unlock exclusive perks and rewards."}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-display tracking-wider">
                  <Gift size={16} />
                  {lang === "de" ? "COMING SOON" : "COMING SOON"}
                </div>
              </div>
            </ScrollReveal>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default MeinBereichPage;
