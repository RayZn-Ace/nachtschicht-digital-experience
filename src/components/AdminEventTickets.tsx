import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TicketType, Event } from "@/types/database";
import { toast } from "sonner";
import {
  X, Plus, Trash2, Pencil, Send, Search, Loader2,
  GripVertical, Mail, User, Hash,
} from "lucide-react";

const PRESET_TYPES = [
  { name: "Early Bird", price: 8 },
  { name: "Standard", price: 12 },
  { name: "Last Call", price: 15 },
  { name: "VIP", price: 25 },
  { name: "Ladies", price: 5 },
  { name: "Studenten", price: 8 },
  { name: "Gruppenticket (5er)", price: 45 },
  { name: "Fast Lane / Skip the Line", price: 20 },
  { name: "Geburtstag", price: 0 },
];

interface Profile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  event: Event;
  onClose: () => void;
}

const AdminEventTickets = ({ event, onClose }: Props) => {
  const [types, setTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, quantity: 100 });

  // Send ticket
  const [sendingFor, setSendingFor] = useState<TicketType | null>(null);
  const [sendMode, setSendMode] = useState<"user" | "email">("user");
  const [sendEmail, setSendEmail] = useState("");
  const [sendQuantity, setSendQuantity] = useState(1);
  const [sendName, setSendName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchTypes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order");
    if (data) setTypes(data as unknown as TicketType[]);
    setLoading(false);
  };

  useEffect(() => { fetchTypes(); }, [event.id]);

  // Search registered users
  useEffect(() => {
    if (sendMode !== "user" || userSearch.length < 2) {
      setUsers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      const q = `%${userSearch}%`;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, first_name, last_name")
        .or(`email.ilike.${q},display_name.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`)
        .eq("is_deleted", false)
        .limit(10);
      setUsers((data || []) as Profile[]);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, sendMode]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, quantity: 100 });
    setEditingType(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      event_id: event.id,
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      quantity: Number(form.quantity),
    };
    if (editingType) {
      const { error } = await supabase.from("ticket_types").update(payload).eq("id", editingType.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Ticketart aktualisiert!");
    } else {
      const { error } = await supabase.from("ticket_types").insert({ ...payload, sort_order: types.length });
      if (error) { toast.error(error.message); return; }
      toast.success("Ticketart erstellt!");
    }
    resetForm();
    fetchTypes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ticketart löschen?")) return;
    await supabase.from("ticket_types").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchTypes();
  };

  const handleToggle = async (t: TicketType) => {
    await supabase.from("ticket_types").update({ is_active: !t.is_active }).eq("id", t.id);
    fetchTypes();
  };

  const startEdit = (t: TicketType) => {
    setForm({ name: t.name, description: t.description || "", price: t.price, quantity: t.quantity });
    setEditingType(t);
    setShowForm(true);
  };

  const openSend = (t: TicketType) => {
    setSendingFor(t);
    setSendMode("user");
    setSendEmail("");
    setSendName("");
    setSendQuantity(1);
    setSelectedUser(null);
    setUserSearch("");
  };

  const handleSendTicket = async () => {
    if (!sendingFor) return;

    let email = "";
    let name = "";
    let userId: string | null = null;

    if (sendMode === "user") {
      if (!selectedUser) { toast.error("Bitte wähle einen Nutzer aus"); return; }
      email = selectedUser.email || "";
      name = selectedUser.display_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || email;
      userId = selectedUser.user_id;
    } else {
      if (!sendEmail) { toast.error("Bitte gib eine E-Mail ein"); return; }
      email = sendEmail;
      name = sendName || email;
    }

    if (!email) { toast.error("Keine E-Mail vorhanden"); return; }

    setSending(true);
    try {
      // Create QR code
      const qrCode = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase.from("tickets").insert({
        event_id: event.id,
        ticket_type_id: sendingFor.id,
        buyer_email: email,
        buyer_name: name,
        user_id: userId,
        quantity: sendQuantity,
        total_price: sendingFor.price * sendQuantity,
        status: "confirmed",
        qr_code: qrCode,
        fee_amount: 0,
      }).select().single();

      if (ticketError) throw ticketError;

      // Update sold count
      await supabase.from("ticket_types").update({
        sold: sendingFor.sold + sendQuantity,
      }).eq("id", sendingFor.id);

      // Try to send ticket email
      try {
        await supabase.functions.invoke("send-ticket-email", {
          body: {
            ticket_ids: [ticket.id],
          },
        });
        toast.success(`Ticket an ${email} versendet!`);
      } catch {
        toast.success(`Ticket erstellt (E-Mail-Versand konnte nicht bestätigt werden)`);
      }

      setSendingFor(null);
      fetchTypes();
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "Unbekannt"));
    } finally {
      setSending(false);
    }
  };

  const addPreset = (preset: { name: string; price: number }) => {
    setForm({ ...form, name: preset.name, price: preset.price });
    setShowForm(true);
  };

  const remaining = (t: TicketType) => t.quantity - t.sold;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-xl tracking-wider text-foreground">TICKETS</h2>
            <p className="text-sm text-muted-foreground">{event.title} – {new Date(event.date).toLocaleDateString("de-DE")}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md transition-colors text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Add button */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{types.length} Ticketart(en)</span>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Hinzufügen
            </button>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
              <h3 className="font-display text-sm tracking-wider text-foreground">
                {editingType ? "TICKETART BEARBEITEN" : "NEUE TICKETART"}
              </h3>

              {/* Presets */}
              {!editingType && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Schnellauswahl:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TYPES.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => addPreset(p)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                      >
                        {p.name} ({p.price}€)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <input
                  placeholder="Beschreibung"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preis (€)"
                  value={form.price || ""}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Kontingent"
                  value={form.quantity || ""}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  {editingType ? "AKTUALISIEREN" : "ERSTELLEN"}
                </button>
                <button onClick={resetForm} className="px-4 py-1.5 text-sm border border-border text-foreground rounded-md hover:bg-muted">
                  ABBRECHEN
                </button>
              </div>
            </div>
          )}

          {/* Ticket types list */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Lädt...</div>
          ) : types.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Ticketarten vorhanden. Erstelle eine, um Tickets zu versenden.
            </div>
          ) : (
            <div className="space-y-2">
              {types.map((t) => (
                <div
                  key={t.id}
                  className={`border rounded-lg p-3 transition-all ${
                    t.is_active ? "border-border bg-muted/20" : "border-border/50 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-sm text-primary font-medium">{t.price}€</span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.sold}/{t.quantity} verkauft · {remaining(t)} verfügbar
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggle(t)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          t.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.is_active ? "Aktiv" : "Inaktiv"}
                      </button>
                      <button
                        onClick={() => openSend(t)}
                        className="p-1.5 hover:bg-primary/20 rounded-md transition-colors text-primary"
                        title="Ticket versenden"
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-foreground"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Send ticket inline panel */}
                  {sendingFor?.id === t.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Send size={14} className="text-primary" />
                        Ticket versenden – {t.name}
                      </h4>

                      {/* Mode toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSendMode("user"); setSelectedUser(null); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                            sendMode === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <User size={13} /> Registrierter Nutzer
                        </button>
                        <button
                          onClick={() => setSendMode("email")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                            sendMode === "email" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Mail size={13} /> E-Mail Adresse
                        </button>
                      </div>

                      {sendMode === "user" ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              placeholder="Nutzer suchen (Name oder E-Mail)..."
                              value={userSearch}
                              onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }}
                              className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            {searchLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
                          </div>

                          {selectedUser && (
                            <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-md text-sm">
                              <User size={14} className="text-primary" />
                              <span className="text-foreground font-medium">
                                {selectedUser.display_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || "—"}
                              </span>
                              <span className="text-muted-foreground">{selectedUser.email}</span>
                              <button onClick={() => setSelectedUser(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          {!selectedUser && users.length > 0 && (
                            <div className="border border-border rounded-md max-h-32 overflow-y-auto">
                              {users.map((u) => (
                                <button
                                  key={u.user_id}
                                  onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(""); }}
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors flex items-center gap-2"
                                >
                                  <User size={13} className="text-muted-foreground shrink-0" />
                                  <span className="text-foreground font-medium truncate">
                                    {u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "—"}
                                  </span>
                                  <span className="text-muted-foreground text-xs truncate">{u.email}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {userSearch.length >= 2 && !searchLoading && users.length === 0 && !selectedUser && (
                            <p className="text-xs text-muted-foreground text-center py-2">Keine Nutzer gefunden</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="email"
                            placeholder="E-Mail Adresse *"
                            value={sendEmail}
                            onChange={(e) => setSendEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <input
                            placeholder="Name (optional)"
                            value={sendName}
                            onChange={(e) => setSendName(e.target.value)}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Quantity */}
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Hash size={13} /> Anzahl:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={remaining(t)}
                          value={sendQuantity}
                          onChange={(e) => setSendQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-20 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm text-center focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">
                          = {(sendingFor.price * sendQuantity).toFixed(2)}€
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSendTicket}
                          disabled={sending || (sendMode === "user" && !selectedUser) || (sendMode === "email" && !sendEmail)}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Ticket versenden
                        </button>
                        <button
                          onClick={() => setSendingFor(null)}
                          className="px-4 py-1.5 text-sm border border-border text-foreground rounded-md hover:bg-muted"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEventTickets;
