import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EventTag } from "@/types/database";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const TAG_COLORS = [
  { label: "Primary", value: "bg-primary/20 text-primary" },
  { label: "Grün", value: "bg-green-500/20 text-green-400" },
  { label: "Pink", value: "bg-pink-500/20 text-pink-400" },
  { label: "Gelb", value: "bg-yellow-500/20 text-yellow-400" },
  { label: "Blau", value: "bg-blue-500/20 text-blue-400" },
  { label: "Lila", value: "bg-purple-500/20 text-purple-400" },
  { label: "Orange", value: "bg-orange-500/20 text-orange-400" },
  { label: "Rot", value: "bg-red-500/20 text-red-400" },
];

const AdminTags = () => {
  const [tags, setTags] = useState<EventTag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0].value);

  const fetchTags = async () => {
    const { data } = await supabase.from("event_tags").select("*").order("name");
    if (data) setTags(data as unknown as EventTag[]);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("event_tags").insert({ name: newName.trim(), color: newColor });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Tag existiert bereits!" : error.message);
      return;
    }
    toast.success("Tag erstellt!");
    setNewName("");
    fetchTags();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tag wirklich löschen?")) return;
    await supabase.from("event_tags").delete().eq("id", id);
    toast.success("Tag gelöscht");
    fetchTags();
  };

  return (
    <div className="space-y-6">
      {/* Create new tag */}
      <div className="glass-card p-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">NEUEN TAG ERSTELLEN</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-foreground mb-1 block">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. 90er Party"
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Farbe</label>
            <div className="flex gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${c.value.split(" ")[0]} ${
                    newColor === c.value ? "border-foreground scale-110" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} /> ERSTELLEN
          </button>
        </div>
        {/* Preview */}
        {newName && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground mr-2">Vorschau:</span>
            <span className={`text-xs px-3 py-1 rounded-full ${newColor}`}>{newName}</span>
          </div>
        )}
      </div>

      {/* Existing tags */}
      <div className="glass-card p-6">
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-4">ALLE TAGS</h2>
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Noch keine Tags erstellt.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tag.color}`}>
                <span className="text-sm font-medium">{tag.name}</span>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTags;
