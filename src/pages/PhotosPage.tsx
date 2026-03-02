import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { useI18n } from "@/hooks/useI18n";
import { Image, ChevronLeft, ChevronRight, X, Download, CheckCircle2, Flag } from "lucide-react";
import { AlbumSkeletonCard, PhotoSkeletonGrid } from "@/components/SkeletonCard";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ReportPhotoModal from "@/components/ReportPhotoModal";

interface Album {
  id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
}

interface AlbumPhoto {
  id: string;
  image_url: string;
  title: string | null;
  sort_order: number;
}

const PhotosPage = () => {
  const { t, lang } = useI18n();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [reportPhoto, setReportPhoto] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    const fetchAlbums = async () => {
      const { data } = await supabase
        .from("albums")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (data) setAlbums(data as Album[]);
      setLoading(false);
    };
    fetchAlbums();
  }, []);

  const openAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    setPhotos([]);
    const { data } = await supabase
      .from("album_photos")
      .select("*")
      .eq("album_id", album.id)
      .order("sort_order", { ascending: true });
    if (data) setPhotos(data as AlbumPhoto[]);
    setLoadingPhotos(false);
  };

  const closeAlbum = () => {
    setSelectedAlbum(null);
    setPhotos([]);
    setSelectedPhotos(new Set());
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const clearSelection = () => setSelectedPhotos(new Set());

  const downloadSelectedPhotos = async () => {
    const selected = photos.filter((p) => selectedPhotos.has(p.id));
    for (const photo of selected) {
      await downloadImage(photo.image_url, photo.title);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);
  const prev = useCallback(() => setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)), [photos.length]);
  const next = useCallback(() => setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null)), [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, prev, next]);

  const downloadImage = async (url: string, title: string | null) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = (title || "photo") + ".jpg";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  // Album detail view
  if (selectedAlbum) {
    return (
      <section className="section-padding">
        <div className="container mx-auto">
          <ScrollReveal>
            <div className="mb-8">
              <button onClick={closeAlbum} className="text-muted-foreground hover:text-foreground transition-colors text-sm mb-4 inline-block">
                ← {lang === "de" ? "Zurück zu allen Alben" : "Back to all albums"}
              </button>
              <h1 className="font-display text-4xl md:text-6xl tracking-wider text-foreground">
                {selectedAlbum.title}
              </h1>
              <div className="w-20 h-1 bg-primary mt-4 rounded-full" />
            </div>
          </ScrollReveal>

          {loadingPhotos ? (
            <PhotoSkeletonGrid />
          ) : photos.length === 0 ? (
            <p className="text-muted-foreground text-center py-16">
              {lang === "de" ? "Keine Fotos in diesem Album." : "No photos in this album."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, i) => (
                <ScrollReveal key={photo.id} delay={i * 0.05}>
                  <div
                    className={`relative aspect-[4/5] overflow-hidden rounded-lg group cursor-pointer bg-muted ${selectedPhotos.has(photo.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    onClick={() => setLightboxIndex(i)}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.title || `Foto ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors" />
                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                      className={`absolute top-2 left-2 p-1 rounded-full transition-all z-10 ${selectedPhotos.has(photo.id) ? 'bg-primary text-primary-foreground opacity-100 scale-100' : 'bg-background/70 text-foreground opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}
                      aria-label={lang === "de" ? "Foto auswählen" : "Select photo"}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(photo.image_url, photo.title); }}
                      className="absolute bottom-2 right-2 p-2 bg-background/70 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                      aria-label="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReportPhoto({ id: photo.id, url: photo.image_url }); }}
                      className="absolute bottom-2 left-2 p-2 bg-background/70 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      aria-label={lang === "de" ? "Foto melden" : "Report photo"}
                    >
                      <Flag size={16} />
                    </button>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>

        {/* Selection Banner */}
        <AnimatePresence>
          {selectedPhotos.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg"
            >
              <div className="container mx-auto flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {selectedPhotos.size}
                  </div>
                  <span className="text-foreground text-sm font-medium">
                    {lang === "de"
                      ? `${selectedPhotos.size} Foto${selectedPhotos.size !== 1 ? "s" : ""} ausgewählt`
                      : `${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? "s" : ""} selected`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {lang === "de" ? "Abwählen" : "Clear"}
                  </button>
                  <button
                    onClick={downloadSelectedPhotos}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-display tracking-wider hover:bg-primary/90 transition-colors"
                  >
                    <Download size={14} />
                    {lang === "de" ? "ALLE HERUNTERLADEN" : "DOWNLOAD ALL"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        {reportPhoto && selectedAlbum && (
          <ReportPhotoModal
            open={!!reportPhoto}
            onClose={() => setReportPhoto(null)}
            photoId={reportPhoto.id}
            albumId={selectedAlbum.id}
            photoUrl={reportPhoto.url}
          />
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
              onClick={closeLightbox}
            >
              <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10" aria-label="Schließen">
                <X size={24} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10" aria-label="Vorheriges Bild">
                <ChevronLeft size={28} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10" aria-label="Nächstes Bild">
                <ChevronRight size={28} />
              </button>

              <motion.img
                key={lightboxIndex}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={photos[lightboxIndex].image_url}
                alt={photos[lightboxIndex].title || `Foto ${lightboxIndex + 1}`}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="absolute bottom-4 flex items-center gap-4">
                <span className="text-muted-foreground text-sm font-display tracking-wider">
                  {lightboxIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadImage(photos[lightboxIndex!].image_url, photos[lightboxIndex!].title); }}
                  className="p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setReportPhoto({ id: photos[lightboxIndex!].id, url: photos[lightboxIndex!].image_url }); }}
                  className="p-2 rounded-full bg-secondary/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label={lang === "de" ? "Foto melden" : "Report photo"}
                >
                  <Flag size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  // Albums overview
  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              {t("photos.title")} <span className="text-gradient">{t("photos.titleHighlight")}</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AlbumSkeletonCard key={i} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {lang === "de" ? "Noch keine Fotoalben verfügbar." : "No photo albums available yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album, i) => (
              <ScrollReveal key={album.id} delay={i * 0.1}>
                <div
                  className="glass-card overflow-hidden hover-lift group cursor-pointer"
                  onClick={() => openAlbum(album)}
                >
                  <div className="relative h-56 bg-muted">
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Image size={64} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-2xl tracking-wider text-foreground">{album.title}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {new Date(album.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PhotosPage;
