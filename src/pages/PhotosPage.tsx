import ScrollReveal from "@/components/ScrollReveal";

const images = [
  "/images/gallery-1.jpg", "/images/gallery-2.jpg", "/images/gallery-3.jpg",
  "/images/gallery-4.jpg", "/images/gallery-5.jpg", "/images/gallery-6.jpg",
  "/images/gallery-7.jpg", "/images/gallery-8.jpg",
];

const PhotosPage = () => (
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
            <div className="break-inside-avoid overflow-hidden rounded-lg group">
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
  </section>
);

export default PhotosPage;
