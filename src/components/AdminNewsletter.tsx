import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Trash2, Mail, Users, Search, Plus, Send, Eye, Pencil,
  ChevronLeft, CheckCircle, XCircle, Clock, Loader2, Palette,
} from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
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

type View = "subscribers" | "campaigns" | "editor";

/* ─── Design presets ─── */
const COLOR_PRESETS = [
  { name: "Nachtschicht", primary: "#e11d48", bg: "#0a0a0a", text: "#ffffff", accent: "#f43f5e" },
  { name: "Elegant Gold", primary: "#d4a843", bg: "#1a1a2e", text: "#f0f0f0", accent: "#f0d68a" },
  { name: "Neon Grün", primary: "#22c55e", bg: "#0f172a", text: "#e2e8f0", accent: "#4ade80" },
  { name: "Ocean Blue", primary: "#3b82f6", bg: "#0c1222", text: "#e2e8f0", accent: "#60a5fa" },
  { name: "Hell & Clean", primary: "#e11d48", bg: "#ffffff", text: "#1a1a1a", accent: "#f43f5e" },
];

const buildHtml = (
  blocks: EditorBlock[],
  design: DesignConfig,
  previewText?: string
): string => {
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

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface EditorBlock {
  id: string;
  type: "heading" | "text" | "button" | "divider" | "image";
  content: string;
  url?: string;
}

interface DesignConfig {
  primary: string;
  bg: string;
  text: string;
  accent: string;
}

const defaultBlocks: EditorBlock[] = [
  { id: "1", type: "heading", content: "Hey! 👋" },
  { id: "2", type: "text", content: "Hier kommt dein Newsletter-Text..." },
  { id: "3", type: "button", content: "Tickets sichern", url: "https://nachtschicht-digital-experience.lovable.app/events" },
];

const AdminNewsletter = () => {
  const [view, setView] = useState<View>("campaigns");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
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

  const fetchSubscribers = useCallback(async () => {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    if (data) setSubscribers(data);
  }, []);

  const fetchNewsletters = useCallback(async () => {
    const { data } = await supabase
      .from("newsletters")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNewsletters(data as any);
  }, []);

  useEffect(() => {
    Promise.all([fetchSubscribers(), fetchNewsletters()]).finally(() => setLoading(false));
  }, [fetchSubscribers, fetchNewsletters]);

  const activeCount = subscribers.filter((s) => s.is_active).length;

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
    setShowPreview(false);
    setView("editor");
  };

  const addBlock = (type: EditorBlock["type"]) => {
    const b: EditorBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === "heading" ? "Überschrift" : type === "text" ? "Text hier..." : type === "button" ? "Klick mich" : type === "image" ? "Bild" : "",
      url: type === "button" ? "#" : type === "image" ? "https://placehold.co/600x200" : undefined,
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

  const saveNewsletter = async (andSend = false) => {
    if (!subject.trim()) { toast.error("Betreff ist erforderlich"); return; }
    setSaving(true);

    const html = buildHtml(blocks, design, previewText);
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

      if (andSend) {
        await sendNewsletter(editingId!);
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendNewsletter = async (id: string) => {
    if (!confirm(`Newsletter an ${activeCount} aktive Abonnenten senden?`)) return;
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
          body: JSON.stringify({ newsletter_id: id }),
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

  const filtered = subscribers.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()));

  /* ─── Render ─── */
  if (loading) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  /* ─── EDITOR VIEW ─── */
  if (view === "editor") {
    const html = buildHtml(blocks, design, previewText);

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
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. 🎉 Dieses Wochenende: Ladys Night!" className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1 block">Vorschau-Text</label>
              <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Wird in der Inbox-Vorschau angezeigt..." className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            {/* Design Presets */}
            <div>
              <label className="text-sm text-foreground mb-2 block flex items-center gap-1.5"><Palette size={14} /> Farbschema</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setDesign(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      design.primary === p.primary && design.bg === p.bg
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ background: p.bg, color: p.text }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.primary }} />
                    {p.name}
                  </button>
                ))}
              </div>
              {/* Custom colors */}
              <div className="flex gap-3 mt-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Primär <input type="color" value={design.primary} onChange={(e) => setDesign({ ...design, primary: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Hintergrund <input type="color" value={design.bg} onChange={(e) => setDesign({ ...design, bg: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Text <input type="color" value={design.text} onChange={(e) => setDesign({ ...design, text: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                </label>
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
                      <button onClick={() => removeBlock(block.id)} className="text-xs text-destructive hover:text-destructive/80">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {block.type === "divider" ? (
                      <hr className="border-border" />
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
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={() => saveNewsletter(false)} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-muted border border-border text-foreground rounded-md hover:bg-muted/80 font-display tracking-wider text-sm disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                ALS ENTWURF SPEICHERN
              </button>
              {editingId && (
                <button onClick={() => sendNewsletter(editingId)} disabled={sending || activeCount === 0} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-display tracking-wider text-sm disabled:opacity-50">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  AN {activeCount} SENDEN
                </button>
              )}
              {!editingId && (
                <button onClick={async () => { await saveNewsletter(false); }} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-display tracking-wider text-sm disabled:opacity-50">
                  ERSTELLEN
                </button>
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

  /* ─── CAMPAIGNS / SUBSCRIBERS ─── */
  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
          <Send size={20} className="mx-auto mb-1 text-primary" />
          <p className="font-display text-2xl text-foreground">{newsletters.length}</p>
          <p className="text-xs text-muted-foreground">Newsletter</p>
        </div>
      </div>

      {/* View toggle + New button */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setView("campaigns")} className={`px-4 py-2 rounded-md font-display tracking-wider text-sm ${view === "campaigns" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          NEWSLETTER
        </button>
        <button onClick={() => setView("subscribers")} className={`px-4 py-2 rounded-md font-display tracking-wider text-sm ${view === "subscribers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          ABONNENTEN
        </button>
        <div className="flex-1" />
        {view === "campaigns" && (
          <button onClick={() => openEditor()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider text-sm rounded-md hover:bg-primary/90">
            <Plus size={16} /> NEUER NEWSLETTER
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      nl.status === "sent" ? "bg-green-500/20 text-green-400"
                        : nl.status === "sending" ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
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
                      <button onClick={() => openEditor(nl)} className="p-2 hover:bg-muted rounded-md transition-colors text-foreground" title="Bearbeiten">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => sendNewsletter(nl.id)} disabled={sending || activeCount === 0} className="p-2 hover:bg-primary/20 rounded-md transition-colors text-primary" title="Senden">
                        <Send size={16} />
                      </button>
                    </>
                  )}
                  {nl.status === "sent" && (
                    <CheckCircle size={18} className="text-green-400" />
                  )}
                  <button onClick={() => deleteNewsletter(nl.id)} className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive" title="Löschen">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Subscribers list ─── */}
      {view === "subscribers" && (
        <>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="E-Mail suchen..." className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{search ? "Keine Ergebnisse." : "Noch keine Abonnenten."}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((sub) => (
                <div key={sub.id} className="glass-card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm truncate">{sub.email}</p>
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminNewsletter;
