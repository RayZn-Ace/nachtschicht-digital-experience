import { useState, useCallback, useEffect } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/images/gallery-1.jpg", "/images/gallery-2.jpg", "/images/gallery-3.jpg",
  "/images/gallery-4.jpg", "/images/gallery-5.jpg", "/images/gallery-6.jpg",
  "/images/gallery-7.jpg", "/images/gallery-8.jpg",
];

const PhotosPage = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const open = (i: number) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const prev = useCallback(() => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null)), []);
  const next = useCallback(() => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null)), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
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

  return (
    <section className="section-padding">
      <div className="container mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              FOTOS & <span className="text-gradient">VIDEOS</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
          </div>
        </ScrollReveal>
        <div className="columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {images.map((img, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div
                className="break-inside-avoid overflow-hidden rounded-lg group cursor-pointer"
                onClick={() => open(i)}
              >
                <img
                  src={img}
                  alt={`Nachtschicht Party Foto ${i + 1}`}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
            onClick={close}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10"
              aria-label="Schließen"
            >
              <X size={24} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft size={28} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 p-2 rounded-full bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors z-10"
              aria-label="Nächstes Bild"
            >
              <ChevronRight size={28} />
            </button>

            <motion.img
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={images[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 text-muted-foreground text-sm font-display tracking-wider">
              {lightboxIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default PhotosPage;
