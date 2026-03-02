import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Trash2, Mail, Users, Search, Plus, Send, Eye, Pencil,
  ChevronLeft, CheckCircle, Loader2, Palette,
  Calendar, Tag, UserPlus, FolderOpen, X,
} from "lucide-react";

/* ─── Types ─── */
interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  subscribed_at: string;
  categories?: Category[];
}

interface Newsletter {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  body_json: any;
  status: string;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface SubCatRow {
  subscriber_id: string;
  category_id: string;
}

interface EventRow {
  id: string;
  title: string;
  subtitle: string | null;
  date: string;
  time: string | null;
  image_url: string | null;
  genre: string | null;
  ticket_price: number | null;
}

type View = "subscribers" | "campaigns" | "editor" | "categories";

/* ─── Design presets ─── */
const COLOR_PRESETS = [
  { name: "Nachtschicht", primary: "#e11d48", bg: "#0a0a0a", text: "#ffffff", accent: "#f43f5e" },
  { name: "Elegant Gold", primary: "#d4a843", bg: "#1a1a2e", text: "#f0f0f0", accent: "#f0d68a" },
  { name: "Neon Grün", primary: "#22c55e", bg: "#0f172a", text: "#e2e8f0", accent: "#4ade80" },
  { name: "Ocean Blue", primary: "#3b82f6", bg: "#0c1222", text: "#e2e8f0", accent: "#60a5fa" },
  { name: "Hell & Clean", primary: "#e11d48", bg: "#ffffff", text: "#1a1a1a", accent: "#f43f5e" },
];

const CAT_COLORS = [
  "bg-rose-500/20 text-rose-400",
  "bg-blue-500/20 text-blue-400",
  "bg-green-500/20 text-green-400",
  "bg-yellow-500/20 text-yellow-400",
  "bg-purple-500/20 text-purple-400",
  "bg-orange-500/20 text-orange-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-pink-500/20 text-pink-400",
];

const PLACEHOLDERS = [
  { tag: "{{NAME}}", desc: "Name des Abonnenten (oder E-Mail-Prefix)" },
  { tag: "{{EMAIL}}", desc: "E-Mail-Adresse" },
];

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

const buildEventCardHtml = (ev: EventRow, design: DesignConfig, baseUrl: string): string => {
  const img = ev.image_url || "/images/gallery-1.jpg";
  const fullImg = img.startsWith("http") ? img : `${baseUrl}${img}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid ${design.primary}33;border-radius:12px;overflow:hidden;">
    <tr><td><img src="${escHtml(fullImg)}" alt="${escHtml(ev.title)}" style="width:100%;height:180px;object-fit:cover;display:block;"/></td></tr>
    <tr><td style="padding:16px;">
      <h3 style="margin:0 0 4px;font-size:20px;font-weight:bold;color:${design.primary};font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(ev.title)}</h3>
      ${ev.subtitle ? `<p style="margin:0 0 8px;font-size:14px;color:${design.text}aa;font-style:italic;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(ev.subtitle)}</p>` : ""}
      <p style="margin:0 0 8px;font-size:14px;color:${design.text}cc;font-family:'Helvetica Neue',Arial,sans-serif;">📅 ${fmtDate(ev.date)}${ev.time ? ` · ${ev.time} Uhr` : ""}${ev.genre ? ` · ${ev.genre}` : ""}</p>
      ${ev.ticket_price ? `<p style="margin:0 0 12px;font-size:14px;color:${design.text}cc;font-family:'Helvetica Neue',Arial,sans-serif;">🎟 ab ${Number(ev.ticket_price).toFixed(2).replace(".", ",")} €</p>` : ""}
      <a href="${baseUrl}/tickets/${ev.id}" target="_blank" style="display:inline-block;padding:10px 24px;background:${design.primary};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;font-family:'Helvetica Neue',Arial,sans-serif;">Tickets sichern</a>
    </td></tr></table>`;
};

interface EditorBlock {
  id: string;
  type: "heading" | "text" | "button" | "divider" | "image" | "event" | "event-list";
  content: string;
  url?: string;
  eventId?: string;
  eventCount?: number;
}

interface DesignConfig {
  primary: string;
  bg: string;
  text: string;
  accent: string;
}

const buildHtml = (blocks: EditorBlock[], design: DesignConfig, previewText: string | undefined, events: EventRow[], baseUrl: string): string => {
  const blocksHtml = blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h1 style="font-size:28px;font-weight:bold;color:${design.primary};margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(b.content)}</h1>`;
        case "text":
          return `<p style="font-size:16px;line-height:1.6;color:${design.text};margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(b.content).replace(/\n/g, "<br/>")}</p>`;
        case "button":
          return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-radius:8px;background:${design.primary};"><a href="${escHtml(b.url || "#")}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(b.content)}</a></td></tr></table>`;
        case "divider":
          return `<hr style="border:none;border-top:1px solid ${design.primary}33;margin:24px 0;"/>`;
        case "image":
          return `<img src="${escHtml(b.url || "")}" alt="${escHtml(b.content)}" style="max-width:100%;height:auto;border-radius:8px;margin:16px 0;display:block;"/>`;
        case "event": {
          const ev = events.find((e) => e.id === b.eventId);
          if (!ev) return `<p style="color:${design.text}88;font-size:14px;font-style:italic;">[Event nicht gefunden]</p>`;
          return buildEventCardHtml(ev, design, baseUrl);
        }
        case "event-list": {
          const count = b.eventCount || 3;
          const upcoming = events.slice(0, count);
          if (upcoming.length === 0) return `<p style="color:${design.text}88;font-size:14px;font-style:italic;">[Keine kommenden Events]</p>`;
          return `<h2 style="font-size:22px;font-weight:bold;color:${design.primary};margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(b.content || "Kommende Events")}</h2>` +
            upcoming.map((ev) => buildEventCardHtml(ev, design, baseUrl)).join("");
        }
        default:
          return "";
      }
    })
    .join("");

  const previewSnippet = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escHtml(previewText)}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:${design.bg};font-family:'Helvetica Neue',Arial,sans-serif;">${previewSnippet}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${design.bg};border-radius:12px;border:1px solid ${design.primary}22;"><tr><td style="padding:40px 32px;">${blocksHtml}<p style="font-size:12px;color:${design.text}88;margin-top:32px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;">Du erhältst diese E-Mail, weil du unseren Newsletter abonniert hast.</p></td></tr></table></td></tr></table></body></html>`;
};

const defaultBlocks: EditorBlock[] = [
  { id: "1", type: "heading", content: "Hey {{NAME}}! 👋" },
  { id: "2", type: "text", content: "Hier kommt dein Newsletter-Text..." },
  { id: "3", type: "button", content: "Tickets sichern", url: "https://nachtschicht-digital-experience.lovable.app/events" },
];

const BASE_URL = "https://nachtschicht-digital-experience.lovable.app";

const AdminNewsletter = () => {
  const [view, setView] = useState<View>("campaigns");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCats, setSubCats] = useState<SubCatRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>(defaultBlocks);
  const [design, setDesign] = useState<DesignConfig>(COLOR_PRESETS[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Add subscriber modal
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubCatIds, setNewSubCatIds] = useState<string[]>([]);

  // Category management (now read-only from event_tags)

  // Send dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendTargetId, setSendTargetId] = useState<string | null>(null);
  const [sendCatIds, setSendCatIds] = useState<string[]>([]);
  const [extraRecipients, setExtraRecipients] = useState<{ name: string; email: string }[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraEmail, setExtraEmail] = useState("");

  const fetchSubscribers = useCallback(async () => {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    if (data) setSubscribers(data as any);
  }, []);

  const fetchNewsletters = useCallback(async () => {
    const { data } = await supabase
      .from("newsletters")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNewsletters(data as any);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("event_tags")
      .select("*")
      .order("name");
    if (data) setCategories(data.map((t: any) => ({ id: t.id, name: t.name, color: t.color, description: null })));
  }, []);

  const fetchSubCats = useCallback(async () => {
    const { data } = await supabase
      .from("newsletter_subscriber_categories")
      .select("subscriber_id, category_id");
    if (data) setSubCats(data as any);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, subtitle, date, time, image_url, genre, ticket_price")
      .eq("is_published", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(20);
    if (data) setEvents(data as any);
  }, []);

  useEffect(() => {
    Promise.all([fetchSubscribers(), fetchNewsletters(), fetchCategories(), fetchSubCats(), fetchEvents()]).finally(() => setLoading(false));
  }, [fetchSubscribers, fetchNewsletters, fetchCategories, fetchSubCats, fetchEvents]);

  const activeCount = subscribers.filter((s) => s.is_active).length;

  const getSubCategoryIds = (subId: string) => subCats.filter((sc) => sc.subscriber_id === subId).map((sc) => sc.category_id);
  const getCategorySubCount = (catId: string) => subCats.filter((sc) => sc.category_id === catId).length;

  /* ─── Subscriber actions ─── */
  const toggleActive = async (sub: Subscriber) => {
    await supabase.from("newsletter_subscribers").update({ is_active: !sub.is_active }).eq("id", sub.id);
    toast.success(sub.is_active ? "Deaktiviert" : "Aktiviert");
    fetchSubscribers();
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm("Abonnent wirklich löschen?")) return;
    await supabase.from("newsletter_subscribers").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchSubscribers();
    fetchSubCats();
  };

  const handleAddSubscriber = async () => {
    if (!newSubEmail.trim()) { toast.error("E-Mail ist erforderlich"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSubEmail.trim())) { toast.error("Ungültige E-Mail-Adresse"); return; }

    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: newSubEmail.trim().toLowerCase(), name: newSubName.trim() || null } as any)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") toast.error("Diese E-Mail existiert bereits");
      else toast.error("Fehler: " + error.message);
      return;
    }

    // Assign categories
    if (data && newSubCatIds.length > 0) {
      await supabase.from("newsletter_subscriber_categories").insert(
        newSubCatIds.map((catId) => ({ subscriber_id: (data as any).id, category_id: catId }))
      );
    }

    toast.success("Abonnent hinzugefügt");
    setNewSubName("");
    setNewSubEmail("");
    setNewSubCatIds([]);
    setShowAddSub(false);
    fetchSubscribers();
    fetchSubCats();
  };

  const toggleSubCategory = async (subId: string, catId: string) => {
    const exists = subCats.some((sc) => sc.subscriber_id === subId && sc.category_id === catId);
    if (exists) {
      await supabase.from("newsletter_subscriber_categories").delete().eq("subscriber_id", subId).eq("category_id", catId);
    } else {
      await supabase.from("newsletter_subscriber_categories").insert({ subscriber_id: subId, category_id: catId });
    }
    fetchSubCats();
  };

  /* ─── Category actions (now managed via Event-Tags) ─── */
  const handleDeleteCategory = async (_id: string) => {
    toast.info("Kategorien werden über Event-Tags verwaltet");
  };

  /* ─── Editor actions ─── */
  const openEditor = (nl?: Newsletter) => {
    if (nl) {
      setEditingId(nl.id);
      setSubject(nl.subject);
      setPreviewText(nl.preview_text || "");
      const json = nl.body_json as any;
      setBlocks(json?.blocks || defaultBlocks);
      setDesign(json?.design || COLOR_PRESETS[0]);
    } else {
      setEditingId(null);
      setSubject("");
      setPreviewText("");
      setBlocks([...defaultBlocks.map((b) => ({ ...b, id: crypto.randomUUID() }))]);
      setDesign(COLOR_PRESETS[0]);
    }
    setSelectedCategoryIds([]);
    setShowPreview(false);
    setView("editor");
  };

  const addBlock = (type: EditorBlock["type"]) => {
    const b: EditorBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === "heading" ? "Überschrift" : type === "text" ? "Text hier..." : type === "button" ? "Klick mich" : type === "image" ? "Bild" : type === "event-list" ? "Kommende Events" : "",
      url: type === "button" ? "#" : type === "image" ? "https://placehold.co/600x200" : undefined,
      eventId: type === "event" ? events[0]?.id : undefined,
      eventCount: type === "event-list" ? 3 : undefined,
    };
    setBlocks((prev) => [...prev, b]);
  };

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const saveNewsletter = async () => {
    if (!subject.trim()) { toast.error("Betreff ist erforderlich"); return; }
    setSaving(true);

    const html = buildHtml(blocks, design, previewText, events, BASE_URL);
    const json = { blocks, design };

    try {
      if (editingId) {
        await supabase
          .from("newsletters")
          .update({ subject, preview_text: previewText || null, body_html: html, body_json: json as any, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        toast.success("Newsletter gespeichert");
      } else {
        const { data, error } = await supabase
          .from("newsletters")
          .insert({ subject, preview_text: previewText || null, body_html: html, body_json: json as any } as any)
          .select("id")
          .single();
        if (error) throw error;
        setEditingId((data as any).id);
        toast.success("Newsletter erstellt");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openSendDialog = (nlId: string) => {
    setSendTargetId(nlId);
    setSendCatIds([]);
    setExtraRecipients([]);
    setExtraName("");
    setExtraEmail("");
    setShowSendDialog(true);
  };

  const getRecipientCount = () => {
    let count = 0;
    if (sendCatIds.length === 0) {
      count = activeCount;
    } else {
      const subIdsInCats = new Set(subCats.filter((sc) => sendCatIds.includes(sc.category_id)).map((sc) => sc.subscriber_id));
      count = subscribers.filter((s) => s.is_active && subIdsInCats.has(s.id)).length;
    }
    return count + extraRecipients.length;
  };

  const addExtraRecipient = () => {
    const email = extraEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error("Ungültige E-Mail"); return; }
    if (extraRecipients.some((r) => r.email === email)) { toast.error("Bereits hinzugefügt"); return; }
    setExtraRecipients((prev) => [...prev, { name: extraName.trim(), email }]);
    setExtraName("");
    setExtraEmail("");
  };

  const sendNewsletter = async () => {
    const recipientCount = getRecipientCount();
    if (recipientCount === 0) { toast.error("Keine Empfänger für diese Auswahl"); return; }
    if (!confirm(`Newsletter an ${recipientCount} Empfänger senden?`)) return;

    setSending(true);
    setShowSendDialog(false);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { toast.error("Nicht angemeldet"); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            newsletter_id: sendTargetId,
            category_ids: sendCatIds.length > 0 ? sendCatIds : null,
            extra_recipients: extraRecipients.length > 0 ? extraRecipients : null,
          }),
        }
      );

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`${data.total_sent}/${data.total_recipients} E-Mails versendet!`);
        setView("campaigns");
      }
    } catch {
      toast.error("Versand fehlgeschlagen");
    } finally {
      setSending(false);
      fetchNewsletters();
    }
  };

  const handleSendDirect = async () => {
    if (!editingId) return;
    setSendTargetId(editingId);
    const recipientCount = getRecipientCount();
    if (recipientCount === 0) { toast.error("Keine Empfänger"); return; }
    if (!confirm(`Newsletter an ${recipientCount} Empfänger senden?`)) return;

    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { toast.error("Nicht angemeldet"); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            newsletter_id: editingId,
            category_ids: sendCatIds.length > 0 ? sendCatIds : null,
            extra_recipients: extraRecipients.length > 0 ? extraRecipients : null,
          }),
        }
      );

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`${data.total_sent}/${data.total_recipients} E-Mails versendet!`);
        setView("campaigns");
      }
    } catch {
      toast.error("Versand fehlgeschlagen");
    } finally {
      setSending(false);
      fetchNewsletters();
    }
  };

  const deleteNewsletter = async (id: string) => {
    if (!confirm("Newsletter wirklich löschen?")) return;
    await supabase.from("newsletters").delete().eq("id", id);
    toast.success("Gelöscht");
    fetchNewsletters();
  };

  const filtered = subscribers.filter((s) => {
    const matchesSearch = s.email.toLowerCase().includes(search.toLowerCase()) || (s.name || "").toLowerCase().includes(search.toLowerCase());
    if (selectedCategoryIds.length === 0) return matchesSearch;
    const sCatIds = getSubCategoryIds(s.id);
    return matchesSearch && selectedCategoryIds.some((c) => sCatIds.includes(c));
  });

  /* ─── Render ─── */
  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  /* ─── EDITOR VIEW ─── */
  if (view === "editor") {
    const html = buildHtml(blocks, design, previewText, events, BASE_URL);

    return (
      <div>
        <button onClick={() => setView("campaigns")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft size={16} /> Zurück
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-wider text-foreground">
              {editingId ? "NEWSLETTER BEARBEITEN" : "NEUER NEWSLETTER"}
            </h2>

            <div>
              <label className="text-sm text-foreground mb-1 block">Betreff *</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. 🎉 Hey {{NAME}}, dieses Wochenende!" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1 block">Vorschau-Text</label>
              <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Wird in der Inbox-Vorschau angezeigt..." className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            {/* Placeholder Info */}
            <div className="glass-card p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Tag size={12} className="text-primary" /> Platzhalter
              </div>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((p) => (
                  <span key={p.tag} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md font-mono cursor-help" title={p.desc}>
                    {p.tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Design Presets */}
            <div>
              <label className="text-sm text-foreground mb-2 block flex items-center gap-1.5"><Palette size={14} /> Farbschema</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button key={p.name} onClick={() => setDesign(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${design.primary === p.primary && design.bg === p.bg ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                    style={{ background: p.bg, color: p.text }}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.primary }} />
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Primär <input type="color" value={design.primary} onChange={(e) => setDesign({ ...design, primary: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" /></label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Hintergrund <input type="color" value={design.bg} onChange={(e) => setDesign({ ...design, bg: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" /></label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Text <input type="color" value={design.text} onChange={(e) => setDesign({ ...design, text: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" /></label>
              </div>
            </div>

            {/* Content Blocks */}
            <div>
              <label className="text-sm text-foreground mb-2 block">Inhaltsblöcke</label>
              <div className="space-y-3">
                {blocks.map((block, idx) => (
                  <div key={block.id} className="glass-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono uppercase">{block.type}</span>
                      <div className="flex-1" />
                      <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                      <button onClick={() => removeBlock(block.id)} className="text-xs text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                    </div>
                    {block.type === "divider" ? (
                      <hr className="border-border" />
                    ) : block.type === "event" ? (
                      <select value={block.eventId || ""} onChange={(e) => updateBlock(block.id, { eventId: e.target.value })} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                        <option value="">Event auswählen...</option>
                        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} – {fmtDate(ev.date)}</option>)}
                      </select>
                    ) : block.type === "event-list" ? (
                      <div className="space-y-2">
                        <input value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Überschrift z.B. Kommende Events" />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Anzahl:</label>
                          <input type="number" min={1} max={10} value={block.eventCount || 3} onChange={(e) => updateBlock(block.id, { eventCount: Math.max(1, Math.min(10, Number(e.target.value))) })} className="w-16 px-2 py-1 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                        </div>
                      </div>
                    ) : (
                      <>
                        {block.type === "heading" ? (
                          <input value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none font-bold" />
                        ) : block.type === "text" ? (
                          <textarea value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} rows={3} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
                        ) : (
                          <input value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder={block.type === "button" ? "Button-Text" : "Alt-Text"} />
                        )}
                        {(block.type === "button" || block.type === "image") && (
                          <input value={block.url || ""} onChange={(e) => updateBlock(block.id, { url: e.target.value })} className="w-full px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none" placeholder={block.type === "button" ? "https://link..." : "https://bild-url..."} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => addBlock("heading")} className="px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80">+ Überschrift</button>
                <button onClick={() => addBlock("text")} className="px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80">+ Text</button>
                <button onClick={() => addBlock("button")} className="px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80">+ Button</button>
                <button onClick={() => addBlock("image")} className="px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80">+ Bild</button>
                <button onClick={() => addBlock("divider")} className="px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground hover:bg-muted/80">+ Trennlinie</button>
                <button onClick={() => addBlock("event")} className="px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-md text-xs text-primary hover:bg-primary/30 flex items-center gap-1"><Calendar size={12} /> + Event</button>
                <button onClick={() => addBlock("event-list")} className="px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-md text-xs text-primary hover:bg-primary/30 flex items-center gap-1"><Calendar size={12} /> + Event-Liste</button>
              </div>
            </div>

            {/* ─── Empfänger-Auswahl ─── */}
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5"><Users size={14} className="text-primary" /> Empfänger</h3>

              {/* Category / Tag selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={sendCatIds.length === 0} onChange={() => setSendCatIds([])} className="rounded border-border" />
                  <span className="font-medium">Alle aktiven Abonnenten</span>
                  <span className="text-xs text-muted-foreground">({activeCount})</span>
                </label>
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-6">
                    {categories.map((cat) => {
                      const count = getCategorySubCount(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            if (sendCatIds.includes(cat.id)) setSendCatIds(sendCatIds.filter((c) => c !== cat.id));
                            else setSendCatIds([...sendCatIds, cat.id]);
                          }}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${sendCatIds.includes(cat.id) ? cat.color + " ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Manual extra recipients */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Zusätzliche Empfänger</label>
                <div className="flex gap-2">
                  <input
                    value={extraName}
                    onChange={(e) => setExtraName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <input
                    value={extraEmail}
                    onChange={(e) => setExtraEmail(e.target.value)}
                    placeholder="E-Mail"
                    type="email"
                    className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && addExtraRecipient()}
                  />
                  <button onClick={addExtraRecipient} className="px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm hover:bg-muted/80">
                    <Plus size={16} />
                  </button>
                </div>
                {extraRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extraRecipients.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                        {r.name ? `${r.name} (${r.email})` : r.email}
                        <button onClick={() => setExtraRecipients((prev) => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipient count */}
              <div className="text-xs text-muted-foreground">
                Gesamt: <span className="text-primary font-display text-sm">{getRecipientCount()}</span> Empfänger
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={saveNewsletter} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 font-display tracking-wider text-sm disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} SPEICHERN
              </button>
              {editingId && (
                <button onClick={handleSendDirect} disabled={sending || getRecipientCount() === 0} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-display tracking-wider text-sm disabled:opacity-50">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} SENDEN ({getRecipientCount()})
                </button>
              )}
              {!editingId && (
                <button onClick={saveNewsletter} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-display tracking-wider text-sm disabled:opacity-50">ERSTELLEN</button>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg tracking-wider text-foreground">VORSCHAU</h3>
              <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Eye size={14} /> {showPreview ? "HTML" : "Vorschau"}
              </button>
            </div>
            <div className="glass-card p-1 rounded-lg overflow-hidden" style={{ minHeight: 400 }}>
              {showPreview ? (
                <pre className="text-xs text-muted-foreground p-4 overflow-auto max-h-[600px] whitespace-pre-wrap break-all">{html}</pre>
              ) : (
                <iframe srcDoc={html} className="w-full border-0 rounded-lg" style={{ minHeight: 500 }} title="Newsletter-Vorschau" sandbox="" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CATEGORIES VIEW ─── */
  if (view === "categories") {
    return (
      <div>
        <button onClick={() => setView("campaigns")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft size={16} /> Zurück
        </button>
        <h2 className="font-display text-xl tracking-wider text-foreground mb-4">KATEGORIEN (EVENT-TAGS)</h2>

        <div className="glass-card p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Kategorien werden automatisch aus den <span className="text-primary font-medium">Event-Tags</span> übernommen. 
            Wenn ein Kunde ein Ticket für ein Event mit dem Tag „Black Music" kauft, wird er automatisch in diese Kategorie eingetragen.
            Verwalte Tags im Bereich <span className="text-primary font-medium">Tags</span>.
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Noch keine Event-Tags erstellt. Erstelle Tags im Tags-Bereich.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="glass-card p-4 flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${cat.color}`}>{cat.name}</span>
                <div className="flex-1" />
                <span className="text-xs text-muted-foreground">{getCategorySubCount(cat.id)} Abonnenten</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── SEND DIALOG (overlay) ─── */
  const sendDialog = showSendDialog && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSendDialog(false)}>
      <div className="glass-card p-6 max-w-lg w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg tracking-wider text-foreground">NEWSLETTER SENDEN</h3>
          <button onClick={() => setShowSendDialog(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Category selection */}
        <div>
          <label className="text-sm text-foreground mb-2 block font-medium">Empfänger-Kategorien</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={sendCatIds.length === 0} onChange={() => setSendCatIds([])} className="rounded border-border" />
              <span className="font-medium">Alle aktiven Abonnenten</span>
              <span className="text-xs text-muted-foreground">({activeCount})</span>
            </label>
            {categories.map((cat) => {
              const count = getCategorySubCount(cat.id);
              return (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendCatIds.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSendCatIds([...sendCatIds, cat.id]);
                      else setSendCatIds(sendCatIds.filter((c) => c !== cat.id));
                    }}
                    className="rounded border-border"
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}>{cat.name}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Manual extra recipients */}
        <div>
          <label className="text-sm text-foreground mb-2 block font-medium">Zusätzliche Empfänger</label>
          <div className="flex gap-2">
            <input
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              value={extraEmail}
              onChange={(e) => setExtraEmail(e.target.value)}
              placeholder="E-Mail"
              type="email"
              className="flex-1 px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && addExtraRecipient()}
            />
            <button onClick={addExtraRecipient} className="px-3 py-1.5 bg-muted border border-border rounded-md text-foreground text-sm hover:bg-muted/80">
              <Plus size={16} />
            </button>
          </div>
          {extraRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {extraRecipients.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {r.name ? `${r.name} (${r.email})` : r.email}
                  <button onClick={() => setExtraRecipients((prev) => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-3 text-center">
          <p className="text-sm text-foreground">
            <span className="font-display text-xl text-primary">{getRecipientCount()}</span> Empfänger
          </p>
        </div>

        <button
          onClick={sendNewsletter}
          disabled={sending || getRecipientCount() === 0}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-display tracking-wider text-sm disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          JETZT SENDEN
        </button>
      </div>
    </div>
  );

  /* ─── ADD SUBSCRIBER MODAL ─── */
  const addSubModal = showAddSub && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddSub(false)}>
      <div className="glass-card p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg tracking-wider text-foreground">ABONNENT HINZUFÜGEN</h3>
          <button onClick={() => setShowAddSub(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div>
          <label className="text-sm text-foreground mb-1 block">Name</label>
          <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Max Mustermann" className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-sm text-foreground mb-1 block">E-Mail *</label>
          <input value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} placeholder="max@example.com" type="email" className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        {categories.length > 0 && (
          <div>
            <label className="text-sm text-foreground mb-2 block">Kategorien</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewSubCatIds((prev) => prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id])}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${newSubCatIds.includes(cat.id) ? cat.color + " ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleAddSubscriber} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-display tracking-wider text-sm hover:bg-primary/90">
          HINZUFÜGEN
        </button>
      </div>
    </div>
  );

  /* ─── CAMPAIGNS / SUBSCRIBERS ─── */
  return (
    <div>
      {sendDialog}
      {addSubModal}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <Users size={20} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">{subscribers.length}</p>
          <p className="text-xs text-muted-foreground">Gesamt</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Mail size={20} className="mx-auto mb-1 text-green-400" />
          <p className="font-display text-2xl text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Aktiv</p>
        </div>
        <div className="glass-card p-4 text-center">
          <FolderOpen size={20} className="mx-auto mb-1 text-blue-400" />
          <p className="font-display text-2xl text-foreground">{categories.length}</p>
          <p className="text-xs text-muted-foreground">Kategorien</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Send size={20} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">{newsletters.length}</p>
          <p className="text-xs text-muted-foreground">Newsletter</p>
        </div>
      </div>

      {/* View toggle + actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => setView("campaigns")} className={`px-4 py-2 rounded-md font-display tracking-wider text-sm ${view === "campaigns" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          NEWSLETTER
        </button>
        <button onClick={() => setView("subscribers")} className={`px-4 py-2 rounded-md font-display tracking-wider text-sm ${view === "subscribers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          ABONNENTEN
        </button>
        <button onClick={() => setView("categories")} className="px-4 py-2 rounded-md font-display tracking-wider text-sm bg-muted text-muted-foreground hover:text-foreground">
          KATEGORIEN
        </button>
        <div className="flex-1" />
        {view === "campaigns" && (
          <button onClick={() => openEditor()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider text-sm rounded-md hover:bg-primary/90">
            <Plus size={16} /> NEUER NEWSLETTER
          </button>
        )}
        {view === "subscribers" && (
          <button onClick={() => setShowAddSub(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider text-sm rounded-md hover:bg-primary/90">
            <UserPlus size={16} /> HINZUFÜGEN
          </button>
        )}
      </div>

      {/* ─── Campaigns list ─── */}
      {view === "campaigns" && (
        <div className="space-y-2">
          {newsletters.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Noch keine Newsletter erstellt.</p>
          ) : (
            newsletters.map((nl) => (
              <div key={nl.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm tracking-wider text-foreground truncate">{nl.subject}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${nl.status === "sent" ? "bg-green-500/20 text-green-400" : nl.status === "sending" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
                      {nl.status === "sent" ? "Versendet" : nl.status === "sending" ? "Wird gesendet..." : "Entwurf"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {new Date(nl.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {nl.status === "sent" && ` · ${nl.total_sent}/${nl.total_recipients} zugestellt`}
                    {nl.total_failed > 0 && ` · ${nl.total_failed} fehlgeschlagen`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {nl.status === "draft" && (
                    <>
                      <button onClick={() => openEditor(nl)} className="p-2 hover:bg-muted rounded-md transition-colors text-foreground" title="Bearbeiten"><Pencil size={16} /></button>
                      <button onClick={() => openSendDialog(nl.id)} disabled={sending || activeCount === 0} className="p-2 hover:bg-primary/20 rounded-md transition-colors text-primary" title="Senden"><Send size={16} /></button>
                    </>
                  )}
                  {nl.status === "sent" && <CheckCircle size={18} className="text-green-400" />}
                  <button onClick={() => deleteNewsletter(nl.id)} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive" title="Löschen"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Subscribers list ─── */}
      {view === "subscribers" && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder E-Mail suchen..." className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          {/* Category filter chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategoryIds([])}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${selectedCategoryIds.length === 0 ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                Alle
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryIds((prev) =>
                      prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                    );
                  }}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${selectedCategoryIds.includes(cat.id) ? cat.color + " ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {cat.name} ({getCategorySubCount(cat.id)})
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{search || selectedCategoryIds.length > 0 ? "Keine Ergebnisse." : "Noch keine Abonnenten."}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((sub) => {
                const sCatIds = getSubCategoryIds(sub.id);
                return (
                  <div key={sub.id} className="glass-card p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm truncate">{sub.name ? `${sub.name} · ${sub.email}` : sub.email}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(sub.subscribed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                      <button onClick={() => toggleActive(sub)} className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${sub.is_active ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {sub.is_active ? "Aktiv" : "Inaktiv"}
                      </button>
                      <button onClick={() => handleDeleteSub(sub.id)} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {/* Category chips */}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => toggleSubCategory(sub.id, cat.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${sCatIds.includes(cat.id) ? cat.color : "bg-muted/50 text-muted-foreground/50 hover:bg-muted"}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminNewsletter;
