import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Mail, Users, Search } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

const AdminNewsletter = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden: " + error.message);
    } else {
      setSubscribers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const toggleActive = async (sub: Subscriber) => {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: !sub.is_active })
      .eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    toast.success(sub.is_active ? "Deaktiviert" : "Aktiviert");
    fetchSubscribers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Abonnent wirklich löschen?")) return;
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Abonnent gelöscht");
    fetchSubscribers();
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.is_active).length;

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
          <Mail size={20} className="mx-auto mb-1 text-muted-foreground" />
          <p className="font-display text-2xl text-foreground">{subscribers.length - activeCount}</p>
          <p className="text-xs text-muted-foreground">Inaktiv</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="E-Mail suchen..."
          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-center py-12">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {search ? "Keine Ergebnisse." : "Noch keine Abonnenten."}
        </p>
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
              <button
                onClick={() => toggleActive(sub)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  sub.is_active
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {sub.is_active ? "Aktiv" : "Inaktiv"}
              </button>
              <button
                onClick={() => handleDelete(sub.id)}
                className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                title="Löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNewsletter;
