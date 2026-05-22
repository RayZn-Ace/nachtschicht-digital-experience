import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Search, Users, Upload, Download, Copy,
  ShoppingCart, UserPlus, Loader2, CheckCircle2, ListPlus,
  Pencil, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

type Subscriber = { id: string; email: string; name: string | null; is_active: boolean };
type NLList = { id: string; name: string; description: string | null; color: string | null };
type ListMember = { id: string; list_id: string; subscriber_id: string };
type EventInfo = { id: string; title: string; date: string | null };
type TicketType = { id: string; event_id: string; name: string };

interface Props {
  open: boolean;
  onClose: () => void;
  lists: NLList[];
  listMembers: ListMember[];
  subscribers: Subscriber[];
  listCounts: Record<string, number>;
  onChanged: () => void;
}

type Tab = "manual" | "subscribers" | "buyers" | "csv";

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const ListManagerModal: React.FC<Props> = ({
  open, onClose, lists, listMembers, subscribers, listCounts, onChanged,
}) => {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [tab, setTab] = useState<Tab>("subscribers");
  const [memberSearch, setMemberSearch] = useState("");

  type LoadedMember = { subscriber_id: string; added_at: string; email: string; name: string | null };
  const [loadedMembers, setLoadedMembers] = useState<LoadedMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersHasMore, setMembersHasMore] = useState(false);
  const [membersReloadKey, setMembersReloadKey] = useState(0);
  const MEMBER_PAGE = 200;

  // Manual
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");

  // Subscribers picker
  const [subSearch, setSubSearch] = useState("");
  const [subSelected, setSubSelected] = useState<Set<string>>(new Set());

  // Buyers
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [buyerEventIds, setBuyerEventIds] = useState<Set<string>>(new Set());
  const [buyerTypeNames, setBuyerTypeNames] = useState<Set<string>>(new Set());
  const [buyerFrom, setBuyerFrom] = useState("");
  const [buyerTo, setBuyerTo] = useState("");
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerPreview, setBuyerPreview] = useState<{ email: string; name: string | null }[]>([]);
  const [eventSearch, setEventSearch] = useState("");

  // CSV
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);

  const [showMoveMenu, setShowMoveMenu] = useState<{ subId: string } | null>(null);

  useEffect(() => {
    if (open && !selectedListId && lists.length > 0) setSelectedListId(lists[0].id);
  }, [open, lists, selectedListId]);

  useEffect(() => {
    if (!open || tab !== "buyers" || events.length > 0) return;
    (async () => {
      try {
        const evs = await fetchAll<EventInfo>((from, to) =>
          supabase.from("events").select("id, title, date").order("date", { ascending: false }).range(from, to)
        );
        const tts = await fetchAll<TicketType>((from, to) =>
          supabase.from("ticket_types").select("id, event_id, name").range(from, to)
        );
        setEvents(evs);
        setTicketTypes(tts);
      } catch {
        toast.error("Events laden fehlgeschlagen");
      }
    })();
  }, [open, tab, events.length]);

  const selectedList = useMemo(() => lists.find((l) => l.id === selectedListId) || null, [lists, selectedListId]);

  // Load members of selected list
  useEffect(() => {
    if (!open || !selectedListId) { setLoadedMembers([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setMembersLoading(true);
      try {
        const { data: members, error: mErr } = await supabase
          .from("newsletter_list_members")
          .select("subscriber_id, created_at")
          .eq("list_id", selectedListId)
          .order("created_at", { ascending: false })
          .range(0, MEMBER_PAGE);
        if (mErr) throw mErr;
        if (cancelled) return;

        const rows = members || [];
        const hasMore = rows.length > MEMBER_PAGE;
        const slice = rows.slice(0, MEMBER_PAGE);
        const subIds = slice.map((m: any) => m.subscriber_id);

        let subs: any[] = [];
        if (subIds.length > 0) {
          let sq = supabase.from("newsletter_subscribers").select("id, email, name").in("id", subIds);
          const q = memberSearch.trim();
          if (q) {
            const safe = q.replace(/[%,()]/g, "");
            sq = sq.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`);
          }
          const { data } = await sq;
          subs = data || [];
        }
        const subMap = new Map(subs.map((s: any) => [s.id, s]));
        const merged: LoadedMember[] = slice
          .map((m: any) => {
            const s = subMap.get(m.subscriber_id);
            if (!s) return null;
            return { subscriber_id: m.subscriber_id, added_at: m.created_at, email: s.email, name: s.name };
          })
          .filter(Boolean) as LoadedMember[];

        if (!cancelled) {
          setLoadedMembers(merged);
          setMembersHasMore(hasMore);
        }
      } catch {
        if (!cancelled) toast.error("Mitglieder laden fehlgeschlagen");
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }, memberSearch ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, selectedListId, memberSearch, membersReloadKey]);

  const reloadMembers = () => setMembersReloadKey((k) => k + 1);
  const memberCount = (id: string) => listCounts?.[id] ?? listMembers.filter((m) => m.list_id === id).length;
  const notifyChanged = () => { onChanged(); setMembersReloadKey((k) => k + 1); };

  // ─── Mutations ─────────────────────────────────────────────
  const createList = async () => {
    const name = newListName.trim();
    if (!name) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("newsletter_lists").insert({ name }).select("id").single();
    setCreating(false);
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Liste erstellt");
    setNewListName("");
    notifyChanged();
    if (data?.id) setSelectedListId(data.id);
  };

  const deleteList = async (id: string) => {
    if (!confirm("Liste wirklich löschen? Abonnenten bleiben erhalten.")) return;
    await supabase.from("newsletter_lists").delete().eq("id", id);
    if (selectedListId === id) setSelectedListId(null);
    toast.success("Liste gelöscht");
    notifyChanged();
  };

  const duplicateList = async (id: string) => {
    const orig = lists.find((l) => l.id === id);
    if (!orig) return;
    const allMembers = await fetchAll<{ subscriber_id: string }>((from, to) =>
      supabase.from("newsletter_list_members").select("subscriber_id").eq("list_id", id).range(from, to)
    );
    const memberIds = allMembers.map((m) => m.subscriber_id);
    const { data, error } = await supabase
      .from("newsletter_lists")
      .insert({ name: `${orig.name} (Kopie)`, description: orig.description, color: orig.color })
      .select("id").single();
    if (error || !data) { toast.error("Fehler beim Duplizieren"); return; }
    if (memberIds.length > 0) {
      const rows = memberIds.map((sid) => ({ list_id: data.id, subscriber_id: sid }));
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("newsletter_list_members").insert(rows.slice(i, i + 500));
      }
    }
    toast.success(`"${orig.name}" dupliziert (${memberIds.length} Mitglieder)`);
    notifyChanged();
    setSelectedListId(data.id);
  };

  const renameList = async (id: string) => {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    await supabase.from("newsletter_lists").update({ name }).eq("id", id);
    setRenamingId(null);
    notifyChanged();
  };

  const addSubscriberIdsToList = async (listId: string, subIds: string[]) => {
    if (subIds.length === 0) return 0;
    const uniqueIds = Array.from(new Set(subIds));
    const existing = new Set<string>();
    for (let i = 0; i < uniqueIds.length; i += 500) {
      const slice = uniqueIds.slice(i, i + 500);
      const { data } = await supabase
        .from("newsletter_list_members").select("subscriber_id")
        .eq("list_id", listId).in("subscriber_id", slice);
      (data || []).forEach((r: any) => existing.add(r.subscriber_id));
    }
    const toInsert = uniqueIds.filter((sid) => !existing.has(sid));
    const rows = toInsert.map((sid) => ({ list_id: listId, subscriber_id: sid }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("newsletter_list_members").insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
    return toInsert.length;
  };

  const removeMember = async (subId: string) => {
    if (!selectedListId) return;
    await supabase.from("newsletter_list_members").delete()
      .eq("list_id", selectedListId).eq("subscriber_id", subId);
    notifyChanged();
  };

  const moveMember = async (subId: string, targetListId: string, copy: boolean) => {
    if (!selectedListId) return;
    await addSubscriberIdsToList(targetListId, [subId]);
    if (!copy) {
      await supabase.from("newsletter_list_members").delete()
        .eq("list_id", selectedListId).eq("subscriber_id", subId);
    }
    toast.success(copy ? "Kopiert" : "Verschoben");
    setShowMoveMenu(null);
    notifyChanged();
  };

  // ─── Manual ────────────────────────────────────────────────
  const addManual = async () => {
    if (!selectedListId) { toast.error("Bitte zuerst Liste wählen"); return; }
    const email = manualEmail.toLowerCase().trim();
    if (!email.includes("@")) { toast.error("Ungültige E-Mail"); return; }
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email, name: manualName.trim() || null, is_active: true }, { onConflict: "email" })
      .select("id").single();
    if (error || !data) { toast.error("Fehler: " + (error?.message || "Unbekannt")); return; }
    const added = await addSubscriberIdsToList(selectedListId, [data.id]);
    toast.success(added > 0 ? `${email} hinzugefügt` : `${email} war bereits in der Liste`);
    setManualEmail(""); setManualName("");
    notifyChanged();
  };

  // ─── Subscribers picker ────────────────────────────────────
  const filteredSubsForPicker = useMemo(() => {
    if (!selectedListId) return [];
    const inList = new Set(listMembers.filter((m) => m.list_id === selectedListId).map((m) => m.subscriber_id));
    const q = subSearch.toLowerCase().trim();
    return subscribers
      .filter((s) => s.is_active && !inList.has(s.id))
      .filter((s) => !q || s.email.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q))
      .slice(0, 200);
  }, [subscribers, listMembers, selectedListId, subSearch]);

  const addSelectedSubs = async () => {
    if (!selectedListId || subSelected.size === 0) return;
    const n = await addSubscriberIdsToList(selectedListId, Array.from(subSelected));
    toast.success(`${n} Abonnent${n === 1 ? "" : "en"} hinzugefügt`);
    setSubSelected(new Set());
    notifyChanged();
  };

  // ─── Buyers ────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const q = eventSearch.toLowerCase().trim();
    if (!q) return events.slice(0, 50);
    return events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 50);
  }, [events, eventSearch]);

  const typeNamesForSelectedEvents = useMemo(() => {
    if (buyerEventIds.size === 0) return [] as string[];
    const names = new Set<string>();
    ticketTypes.filter((c) => buyerEventIds.has(c.event_id)).forEach((c) => names.add(c.name));
    return Array.from(names).sort();
  }, [ticketTypes, buyerEventIds]);

  const previewBuyers = async () => {
    setBuyerLoading(true);
    setBuyerPreview([]);
    try {
      let typeIdFilter: Set<string> | null = null;
      if (buyerTypeNames.size > 0) {
        typeIdFilter = new Set(
          ticketTypes
            .filter((t) => buyerTypeNames.has(t.name) && (buyerEventIds.size === 0 || buyerEventIds.has(t.event_id)))
            .map((t) => t.id)
        );
      }

      const tixAll = await fetchAll<any>((from, to) => {
        let q = supabase.from("tickets")
          .select("event_id, ticket_type_id, buyer_email, buyer_name, status, created_at")
          .eq("status", "confirmed").range(from, to);
        if (buyerEventIds.size > 0) q = q.in("event_id", Array.from(buyerEventIds));
        if (typeIdFilter && typeIdFilter.size > 0) q = q.in("ticket_type_id", Array.from(typeIdFilter));
        if (buyerFrom) q = q.gte("created_at", new Date(buyerFrom).toISOString());
        if (buyerTo) q = q.lte("created_at", new Date(buyerTo + "T23:59:59").toISOString());
        return q as any;
      });

      if (!tixAll || tixAll.length === 0) {
        toast.info("Keine passenden Käufer gefunden");
        setBuyerLoading(false);
        return;
      }

      const dedup = new Map<string, { email: string; name: string | null }>();
      for (const t of tixAll) {
        const email = (t.buyer_email || "").toLowerCase().trim();
        if (!email.includes("@")) continue;
        if (!dedup.has(email)) dedup.set(email, { email, name: t.buyer_name || null });
      }
      setBuyerPreview(Array.from(dedup.values()));
    } catch (e: any) {
      toast.error("Käufer laden fehlgeschlagen: " + (e?.message || ""));
    } finally {
      setBuyerLoading(false);
    }
  };

  const addBuyersToList = async () => {
    if (!selectedListId || buyerPreview.length === 0) return;
    setBuyerLoading(true);
    try {
      // Upsert subscribers
      const rows = buyerPreview.map((b) => ({ email: b.email, name: b.name, is_active: true }));
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("newsletter_subscribers").upsert(rows.slice(i, i + 500), { onConflict: "email" });
      }
      // Fetch ids
      const emails = buyerPreview.map((b) => b.email);
      const ids: string[] = [];
      for (let i = 0; i < emails.length; i += 500) {
        const { data } = await supabase.from("newsletter_subscribers").select("id").in("email", emails.slice(i, i + 500));
        (data || []).forEach((r: any) => ids.push(r.id));
      }
      const added = await addSubscriberIdsToList(selectedListId, ids);
      toast.success(`${added} neue Käufer hinzugefügt`);
      setBuyerPreview([]);
      notifyChanged();
    } catch (e: any) {
      toast.error("Hinzufügen fehlgeschlagen: " + (e?.message || ""));
    } finally {
      setBuyerLoading(false);
    }
  };

  // ─── CSV ───────────────────────────────────────────────────
  const handleCsvImport = async (file: File) => {
    if (!selectedListId) { toast.error("Bitte zuerst Liste wählen"); return; }
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parsed: { email: string; name: string | null }[] = [];
      for (const line of lines) {
        const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        const email = (cols[0] || "").toLowerCase();
        if (!email.includes("@")) continue;
        parsed.push({ email, name: cols[1] || null });
      }
      if (parsed.length === 0) { toast.error("Keine gültigen E-Mails gefunden"); return; }
      for (let i = 0; i < parsed.length; i += 500) {
        await supabase.from("newsletter_subscribers")
          .upsert(parsed.slice(i, i + 500).map((p) => ({ ...p, is_active: true })), { onConflict: "email" });
      }
      const emails = parsed.map((p) => p.email);
      const ids: string[] = [];
      for (let i = 0; i < emails.length; i += 500) {
        const { data } = await supabase.from("newsletter_subscribers").select("id").in("email", emails.slice(i, i + 500));
        (data || []).forEach((r: any) => ids.push(r.id));
      }
      const added = await addSubscriberIdsToList(selectedListId, ids);
      toast.success(`${added} von ${parsed.length} importiert`);
      notifyChanged();
    } catch (e: any) {
      toast.error("Import fehlgeschlagen: " + (e?.message || ""));
    } finally {
      setCsvImporting(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  };

  const exportList = async () => {
    if (!selectedListId) return;
    const all = await fetchAll<{ subscriber_id: string }>((from, to) =>
      supabase.from("newsletter_list_members").select("subscriber_id").eq("list_id", selectedListId).range(from, to)
    );
    const ids = all.map((m) => m.subscriber_id);
    const subs: any[] = [];
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await supabase.from("newsletter_subscribers").select("email, name").in("id", ids.slice(i, i + 500));
      subs.push(...(data || []));
    }
    const csv = "email,name\n" + subs.map((s) => `"${s.email}","${(s.name || "").replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedList?.name || "liste"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          className="w-full max-w-6xl h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Empfänger-Listen verwalten</h2>
                <p className="text-xs text-muted-foreground">Listen, Käufer-Import, manuelle Auswahl</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar: Lists */}
            <aside className="w-72 border-r border-border flex flex-col bg-muted/30">
              <div className="p-3 border-b border-border">
                <div className="flex gap-2">
                  <input
                    value={newListName} onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createList()}
                    placeholder="Neue Liste…"
                    className="flex-1 px-3 py-2 text-sm rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={createList} disabled={creating || !newListName.trim()}
                    className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {lists.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    <ListPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Noch keine Listen
                  </div>
                )}
                {lists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedListId(l.id)}
                    className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedListId === l.id ? "bg-primary/15 border border-primary/30" : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {renamingId === l.id ? (
                          <input
                            autoFocus value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => renameList(l.id)}
                            onKeyDown={(e) => e.key === "Enter" && renameList(l.id)}
                            className="w-full px-2 py-1 text-sm bg-background border border-border rounded"
                          />
                        ) : (
                          <div className="font-medium text-sm text-foreground truncate">{l.name}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">{memberCount(l.id)} Mitglieder</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setRenamingId(l.id); setRenameValue(l.name); }}
                          className="p-1 hover:bg-background rounded"><Pencil className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateList(l.id); }}
                          className="p-1 hover:bg-background rounded"><Copy className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteList(l.id); }}
                          className="p-1 hover:bg-background rounded text-destructive"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {!selectedList ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Liste links auswählen oder neu erstellen
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{selectedList.name}</h3>
                      <p className="text-xs text-muted-foreground">{memberCount(selectedList.id)} Mitglieder</p>
                    </div>
                    <button onClick={exportList} className="px-3 py-2 text-xs rounded-md bg-muted hover:bg-muted/70 flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="px-6 pt-3 border-b border-border flex gap-1">
                    {([
                      { id: "subscribers", label: "Mitglieder", icon: Users },
                      { id: "manual", label: "Manuell", icon: UserPlus },
                      { id: "buyers", label: "Käufer importieren", icon: ShoppingCart },
                      { id: "csv", label: "CSV", icon: Upload },
                    ] as { id: Tab; label: string; icon: any }[]).map((t) => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-xs font-medium rounded-t-md flex items-center gap-2 transition-colors ${
                          tab === t.id ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Mitglieder */}
                    {tab === "subscribers" && (
                      <div>
                        <div className="relative mb-4">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Mitglieder suchen…"
                            className="w-full pl-10 pr-3 py-2 text-sm rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        {membersLoading ? (
                          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : loadedMembers.length === 0 ? (
                          <div className="text-center py-12 text-sm text-muted-foreground">Noch keine Mitglieder</div>
                        ) : (
                          <div className="space-y-1">
                            {loadedMembers.map((m) => (
                              <div key={m.subscriber_id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 group">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{m.email}</div>
                                  {m.name && <div className="text-xs text-muted-foreground truncate">{m.name}</div>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 relative">
                                  <button onClick={() => setShowMoveMenu({ subId: m.subscriber_id })}
                                    className="p-1.5 hover:bg-background rounded"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => removeMember(m.subscriber_id)}
                                    className="p-1.5 hover:bg-background rounded text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                                  {showMoveMenu?.subId === m.subscriber_id && (
                                    <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-popover border border-border rounded-md shadow-lg p-1 max-h-60 overflow-y-auto">
                                      <div className="text-[10px] uppercase text-muted-foreground px-2 py-1">Verschieben/Kopieren nach</div>
                                      {lists.filter((l) => l.id !== selectedListId).map((l) => (
                                        <div key={l.id} className="flex">
                                          <button onClick={() => moveMember(m.subscriber_id, l.id, false)}
                                            className="flex-1 text-left px-2 py-1.5 text-xs hover:bg-muted rounded">↪ {l.name}</button>
                                          <button onClick={() => moveMember(m.subscriber_id, l.id, true)}
                                            title="Kopieren" className="px-2 py-1.5 hover:bg-muted rounded"><Copy className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <button onClick={() => setShowMoveMenu(null)} className="w-full text-center text-xs text-muted-foreground py-1 mt-1 border-t border-border">Schließen</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {membersHasMore && (
                              <div className="text-center text-xs text-muted-foreground py-3">… weitere Mitglieder vorhanden (CSV exportieren für komplette Liste)</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual */}
                    {tab === "manual" && (
                      <div className="max-w-md space-y-3">
                        <div className="text-sm text-muted-foreground mb-2">Einzelnen Empfänger zur Liste hinzufügen</div>
                        <input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="E-Mail" type="email"
                          className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
                        <input value={manualName} onChange={(e) => setManualName(e.target.value)}
                          placeholder="Name (optional)"
                          className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
                        <button onClick={addManual}
                          className="w-full py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center justify-center gap-2">
                          <UserPlus className="w-4 h-4" /> Hinzufügen
                        </button>
                      </div>
                    )}


                    {/* Buyers */}
                    {tab === "buyers" && (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">Käufer aus vergangenen Bestellungen importieren. Filter wählen, Vorschau anzeigen, dann hinzufügen.</div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-foreground mb-1 block">Events</label>
                            <input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)}
                              placeholder="Event suchen…"
                              className="w-full px-3 py-2 mb-2 text-sm rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
                            <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                              {filteredEvents.map((ev) => (
                                <label key={ev.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-xs">
                                  <input type="checkbox" checked={buyerEventIds.has(ev.id)}
                                    onChange={(e) => {
                                      const next = new Set(buyerEventIds);
                                      e.target.checked ? next.add(ev.id) : next.delete(ev.id);
                                      setBuyerEventIds(next); setBuyerTypeNames(new Set());
                                    }} />
                                  <span className="flex-1 truncate">{ev.title}</span>
                                  {ev.date && <span className="text-muted-foreground">{new Date(ev.date).toLocaleDateString("de-DE")}</span>}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-foreground mb-1 block">Ticket-Kategorien (optional)</label>
                            <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                              {typeNamesForSelectedEvents.length === 0 ? (
                                <div className="text-xs text-muted-foreground p-2">Erst Events wählen</div>
                              ) : typeNamesForSelectedEvents.map((n) => (
                                <label key={n} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-xs">
                                  <input type="checkbox" checked={buyerTypeNames.has(n)}
                                    onChange={(e) => {
                                      const next = new Set(buyerTypeNames);
                                      e.target.checked ? next.add(n) : next.delete(n);
                                      setBuyerTypeNames(next);
                                    }} />
                                  <span>{n}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-foreground mb-1 block">Kaufdatum von</label>
                            <input type="date" value={buyerFrom} onChange={(e) => setBuyerFrom(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-border" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-foreground mb-1 block">bis</label>
                            <input type="date" value={buyerTo} onChange={(e) => setBuyerTo(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-md bg-muted/50 border border-border" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={previewBuyers} disabled={buyerLoading}
                            className="px-4 py-2 rounded-md bg-muted hover:bg-muted/70 text-sm flex items-center gap-2">
                            {buyerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Vorschau
                          </button>
                          {buyerPreview.length > 0 && (
                            <button onClick={addBuyersToList} disabled={buyerLoading}
                              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> {buyerPreview.length} hinzufügen
                            </button>
                          )}
                        </div>
                        {buyerPreview.length > 0 && (
                          <div className="border border-border rounded-md p-3 max-h-72 overflow-y-auto space-y-1">
                            {buyerPreview.slice(0, 100).map((b) => (
                              <div key={b.email} className="text-xs flex justify-between p-1.5 bg-muted/30 rounded">
                                <span>{b.email}</span>
                                <span className="text-muted-foreground">{b.name}</span>
                              </div>
                            ))}
                            {buyerPreview.length > 100 && (
                              <div className="text-xs text-muted-foreground text-center pt-2">… und {buyerPreview.length - 100} weitere</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CSV */}
                    {tab === "csv" && (
                      <div className="max-w-md space-y-3">
                        <div className="text-sm text-muted-foreground">
                          CSV-Datei mit Spalten <code className="bg-muted px-1 rounded">email,name</code> (Header optional)
                        </div>
                        <input ref={csvRef} type="file" accept=".csv,text/csv"
                          onChange={(e) => e.target.files?.[0] && handleCsvImport(e.target.files[0])}
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
                        {csvImporting && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Import läuft…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ListManagerModal;
