import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, Filter, Loader2, MessageSquare, Trash2, AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface PhotoReport {
  id: string;
  photo_id: string;
  album_id: string;
  user_id: string | null;
  reason: string;
  detail_text: string | null;
  verification_photo_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = ["open", "in_review", "resolved"] as const;
const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  in_review: "In Prüfung",
  resolved: "Erledigt",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/20 text-destructive",
  in_review: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
};

const AdminPhotoReports = () => {
  const [reports, setReports] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<PhotoReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [albumTitles, setAlbumTitles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase.from("photo_reports" as any).select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    const { data, error } = await query;
    if (error) { toast.error(error.message); setLoading(false); return; }
    const reportData = (data || []) as unknown as PhotoReport[];
    setReports(reportData);

    // Fetch photo URLs and album titles
    const photoIds = [...new Set(reportData.map((r) => r.photo_id))];
    const albumIds = [...new Set(reportData.map((r) => r.album_id))];

    if (photoIds.length > 0) {
      const { data: photos } = await supabase.from("album_photos").select("id, image_url").in("id", photoIds);
      if (photos) {
        const map: Record<string, string> = {};
        photos.forEach((p: any) => { map[p.id] = p.image_url; });
        setPhotoUrls(map);
      }
    }
    if (albumIds.length > 0) {
      const { data: albums } = await supabase.from("albums").select("id, title").in("id", albumIds);
      if (albums) {
        const map: Record<string, string> = {};
        albums.forEach((a: any) => { map[a.id] = a.title; });
        setAlbumTitles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [filterStatus]);

  const updateStatus = async (reportId: string, newStatus: string) => {
    setSaving(true);
    const { error } = await supabase.from("photo_reports" as any).update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", reportId);
    if (error) toast.error(error.message);
    else { toast.success("Status aktualisiert"); fetchReports(); }
    setSaving(false);
  };

  const saveNotes = async (reportId: string) => {
    setSaving(true);
    const { error } = await supabase.from("photo_reports" as any).update({ admin_notes: adminNotes, updated_at: new Date().toISOString() } as any).eq("id", reportId);
    if (error) toast.error(error.message);
    else toast.success("Notizen gespeichert");
    setSaving(false);
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm("Foto wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    const { error } = await supabase.from("album_photos").delete().eq("id", photoId);
    if (error) toast.error(error.message);
    else { toast.success("Foto gelöscht"); fetchReports(); }
  };

  const openDetail = (report: PhotoReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Filter size={16} className="text-muted-foreground" />
        {["all", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-display tracking-wider transition-colors ${
              filterStatus === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "ALLE" : STATUS_LABELS[s]?.toUpperCase()}
          </button>
        ))}
        <span className="text-muted-foreground text-sm ml-auto">{reports.length} Meldungen</span>
      </div>

      {reports.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Keine Meldungen gefunden.</p>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="glass-card p-4 flex flex-col sm:flex-row gap-4 items-start cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => openDetail(report)}
            >
              {/* Photo thumbnail */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {photoUrls[report.photo_id] ? (
                  <img src={photoUrls[report.photo_id]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <AlertTriangle size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status] || "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABELS[report.status] || report.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-foreground font-medium truncate">{report.reason}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Album: {albumTitles[report.album_id] || report.album_id.slice(0, 8)}
                </p>
                {report.detail_text && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{report.detail_text}</p>
                )}
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); openDetail(report); }}
                  className="p-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Details"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelectedReport(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card p-6 rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl tracking-wider text-foreground">MELDUNG DETAILS</h3>
              <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-muted rounded-full">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Reported photo */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gemeldetes Foto</p>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  {photoUrls[selectedReport.photo_id] ? (
                    <img src={photoUrls[selectedReport.photo_id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Gelöscht</div>
                  )}
                </div>
              </div>

              {/* Verification photo */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Verifizierungsfoto</p>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  {selectedReport.verification_photo_url ? (
                    <img src={selectedReport.verification_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Kein Upload</div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grund:</span>
                <span className="text-foreground font-medium">{selectedReport.reason}</span>
              </div>
              {selectedReport.detail_text && (
                <div>
                  <span className="text-muted-foreground">Details:</span>
                  <p className="text-foreground mt-1 text-xs bg-muted p-2 rounded-md">{selectedReport.detail_text}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Album:</span>
                <span className="text-foreground">{albumTitles[selectedReport.album_id] || "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nutzer-ID:</span>
                <span className="text-foreground text-xs font-mono">{selectedReport.user_id?.slice(0, 12) || "–"}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Erstellt:</span>
                <span className="text-foreground">
                  {new Date(selectedReport.created_at).toLocaleString("de-DE")}
                </span>
              </div>
            </div>

            {/* Status change */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">Status ändern</p>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => updateStatus(selectedReport.id, s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-display tracking-wider transition-colors ${
                      selectedReport.status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {STATUS_LABELS[s].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin notes */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">Interne Notizen</p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value.slice(0, 2000))}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                placeholder="Interne Notizen..."
              />
              <button
                onClick={() => saveNotes(selectedReport.id)}
                disabled={saving}
                className="mt-1 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-display tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "SPEICHERN..." : "NOTIZEN SPEICHERN"}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={() => deletePhoto(selectedReport.photo_id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-xs font-display tracking-wider hover:bg-destructive/90 transition-colors"
              >
                <Trash2 size={14} /> FOTO LÖSCHEN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPhotoReports;
