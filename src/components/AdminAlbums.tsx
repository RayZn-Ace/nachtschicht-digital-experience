import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Upload, Image, GripVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Album {
  id: string;
  title: string;
  cover_url: string | null;
  is_published: boolean;
  created_at: string;
  photo_count?: number;
}

interface AlbumPhoto {
  id: string;
  album_id: string;
  image_url: string;
  title: string | null;
  sort_order: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const AdminAlbums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchAlbums = async () => {
    const { data } = await supabase
      .from("albums")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      // Get photo counts
      const albumsWithCounts = await Promise.all(
        data.map(async (album: any) => {
          const { count } = await supabase
            .from("album_photos")
            .select("*", { count: "exact", head: true })
            .eq("album_id", album.id);
          return { ...album, photo_count: count || 0 };
        })
      );
      setAlbums(albumsWithCounts);
    }
  };

  const fetchPhotos = async (albumId: string) => {
    const { data } = await supabase
      .from("album_photos")
      .select("*")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });
    if (data) setPhotos(data as AlbumPhoto[]);
  };

  useEffect(() => { fetchAlbums(); }, []);

  useEffect(() => {
    if (selectedAlbum) fetchPhotos(selectedAlbum.id);
  }, [selectedAlbum]);

  const createAlbum = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("albums").insert({ title: newTitle.trim() });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Album erstellt!");
    setNewTitle("");
    setShowCreate(false);
    fetchAlbums();
  };

  const deleteAlbum = async (id: string) => {
    if (!confirm("Album und alle Fotos wirklich löschen?")) return;
    await supabase.from("albums").delete().eq("id", id);
    toast.success("Album gelöscht");
    if (selectedAlbum?.id === id) { setSelectedAlbum(null); setPhotos([]); }
    fetchAlbums();
  };

  const togglePublish = async (album: Album) => {
    await supabase.from("albums").update({ is_published: !album.is_published }).eq("id", album.id);
    fetchAlbums();
  };

  const uploadCover = async (album: Album, file: File) => {
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `covers/${album.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("albums").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload-Fehler: " + upErr.message); setUploadingCover(false); return; }
    const coverUrl = `${SUPABASE_URL}/storage/v1/object/public/albums/${path}`;
    await supabase.from("albums").update({ cover_url: coverUrl }).eq("id", album.id);
    toast.success("Cover hochgeladen!");
    setUploadingCover(false);
    fetchAlbums();
  };

  const uploadPhotos = async (files: FileList) => {
    if (!selectedAlbum) return;
    setUploading(true);
    const maxOrder = photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) : 0;
    let idx = 0;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${idx}.${ext}`;
      const path = `photos/${selectedAlbum.id}/${fileName}`;

      const { error: upErr } = await supabase.storage.from("albums").upload(path, file);
      if (upErr) { toast.error(`Fehler bei ${file.name}`); continue; }

      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/albums/${path}`;
      await supabase.from("album_photos").insert({
        album_id: selectedAlbum.id,
        image_url: imageUrl,
        title: file.name.replace(/\.[^.]+$/, ""),
        sort_order: maxOrder + idx + 1,
      });
      idx++;
    }
    toast.success(`${idx} Foto(s) hochgeladen!`);
    setUploading(false);
    fetchPhotos(selectedAlbum.id);
    fetchAlbums();
  };

  const deletePhoto = async (photo: AlbumPhoto) => {
    await supabase.from("album_photos").delete().eq("id", photo.id);
    const storagePath = photo.image_url.split("/storage/v1/object/public/albums/")[1];
    if (storagePath) await supabase.storage.from("albums").remove([storagePath]);
    toast.success("Foto gelöscht");
    if (selectedAlbum) fetchPhotos(selectedAlbum.id);
    fetchAlbums();
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`${selectedPhotos.size} Foto(s) wirklich löschen?`)) return;
    setDeleting(true);
    const toDelete = photos.filter((p) => selectedPhotos.has(p.id));
    const storagePaths = toDelete
      .map((p) => p.image_url.split("/storage/v1/object/public/albums/")[1])
      .filter(Boolean) as string[];

    await Promise.all(toDelete.map((p) => supabase.from("album_photos").delete().eq("id", p.id)));
    if (storagePaths.length) await supabase.storage.from("albums").remove(storagePaths);

    toast.success(`${toDelete.length} Foto(s) gelöscht`);
    setSelectedPhotos(new Set());
    setDeleting(false);
    if (selectedAlbum) fetchPhotos(selectedAlbum.id);
    fetchAlbums();
  };

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
  };

  // Drag & drop state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDragIdx(null);
      return;
    }
    const reordered = [...photos];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setPhotos(reordered);
    setDragIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;

    // Persist new order
    const updates = reordered.map((p, i) =>
      supabase.from("album_photos").update({ sort_order: i }).eq("id", p.id)
    );
    await Promise.all(updates);
    toast.success("Reihenfolge gespeichert");
  };

  // Album detail view
  if (selectedAlbum) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedAlbum(null); setPhotos([]); setSelectedPhotos(new Set()); }} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              ← Zurück
            </button>
            <h3 className="font-display text-2xl tracking-wider text-foreground">{selectedAlbum.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {photos.length > 0 && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-2 text-xs border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  {selectedPhotos.size === photos.length ? "ALLE ABWÄHLEN" : "ALLE AUSWÄHLEN"}
                </button>
                {selectedPhotos.size > 0 && (
                  <button
                    onClick={deleteSelectedPhotos}
                    disabled={deleting}
                    className="px-3 py-2 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    {deleting ? "LÖSCHEN..." : `${selectedPhotos.size} LÖSCHEN`}
                  </button>
                )}
              </>
            )}
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors text-sm">
                <Upload size={16} />
                {uploading ? "WIRD HOCHGELADEN..." : "FOTOS HOCHLADEN"}
              </span>
            </label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Fotos per Drag & Drop sortieren – einfach ziehen und loslassen.</p>

        {photos.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Noch keine Fotos in diesem Album.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`relative group rounded-lg overflow-hidden bg-muted aspect-square cursor-grab active:cursor-grabbing transition-all ${
                  dragIdx === idx ? "opacity-40 scale-95 ring-2 ring-primary" : ""
                } ${selectedPhotos.has(photo.id) ? "ring-2 ring-primary" : ""}`}
              >
                <img src={photo.image_url} alt={photo.title || ""} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                {/* Selection checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                  className={`absolute top-1 right-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all z-10 ${
                    selectedPhotos.has(photo.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-foreground/50 bg-background/60 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {selectedPhotos.has(photo.id) && <Check size={14} />}
                </button>
                <div className="absolute top-1 left-1 p-1 rounded bg-background/60 text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} />
                </div>
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="p-2 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {photo.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-background/70 px-2 py-1 text-xs text-foreground truncate">
                    {photo.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Albums list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl tracking-wider text-foreground">FOTOALBEN</h3>
        <Button onClick={() => setShowCreate(!showCreate)} className="font-display tracking-wider gap-1">
          <Plus size={16} /> NEUES ALBUM
        </Button>
      </div>

      {showCreate && (
        <div className="glass-card p-4 flex gap-3 items-end animate-fade-in">
          <div className="flex-1">
            <label className="text-sm text-foreground mb-1 block">Album-Titel *</label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="z.B. Ladys Night 14.03.2026" className="bg-muted border-border" />
          </div>
          <Button onClick={createAlbum}>ERSTELLEN</Button>
          <Button variant="outline" onClick={() => setShowCreate(false)}>ABBRECHEN</Button>
        </div>
      )}

      {albums.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Noch keine Alben erstellt.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div key={album.id} className="glass-card overflow-hidden hover-lift group">
              <div
                className="relative h-40 bg-muted cursor-pointer"
                onClick={() => setSelectedAlbum(album)}
              >
                {album.cover_url ? (
                  <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Image size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <span className="text-xs text-muted-foreground">{album.photo_count} Fotos</span>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-display text-lg tracking-wider text-foreground mb-2">{album.title}</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePublish(album)} className="p-1.5 hover:bg-muted rounded transition-colors text-foreground" title={album.is_published ? "Verstecken" : "Veröffentlichen"}>
                    {album.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <label className="cursor-pointer p-1.5 hover:bg-muted rounded transition-colors text-foreground" title="Cover hochladen">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadCover(album, e.target.files[0])}
                    />
                    <Upload size={16} />
                  </label>
                  <button onClick={() => setSelectedAlbum(album)} className="p-1.5 hover:bg-muted rounded transition-colors text-foreground" title="Fotos verwalten">
                    <Image size={16} />
                  </button>
                  <button onClick={() => deleteAlbum(album.id)} className="p-1.5 hover:bg-destructive/20 rounded transition-colors text-destructive ml-auto" title="Löschen">
                    <Trash2 size={16} />
                  </button>
                  {album.is_published ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Live</span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Entwurf</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAlbums;
