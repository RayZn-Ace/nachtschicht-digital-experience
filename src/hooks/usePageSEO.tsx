import { useEffect } from "react";

interface PageSEOOptions {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}

const BASE_URL = "https://nachtschicht-kaiserslautern.de";
const DEFAULT_OG_IMAGE = "/images/gallery-8.jpg";

/**
 * Sets <title>, meta description, canonical, Open-Graph & Twitter tags,
 * and optional JSON-LD structured data per page.
 */
export function usePageSEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  noindex = false,
  jsonLd,
}: PageSEOOptions) {
  useEffect(() => {
    // Title
    document.title = title;

    // Helper to upsert a <meta> tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Description
    setMeta("name", "description", description);

    // Canonical
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalUrl) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonicalUrl);
    }

    // Robots
    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    }

    // Open Graph
    const img = ogImage || DEFAULT_OG_IMAGE;
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", img.startsWith("http") ? img : `${BASE_URL}${img}`);
    if (canonicalUrl) setMeta("property", "og:url", canonicalUrl);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img.startsWith("http") ? img : `${BASE_URL}${img}`);

    // JSON-LD
    let scriptEl = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (jsonLd) {
      const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.setAttribute("type", "application/ld+json");
        scriptEl.setAttribute("data-seo-jsonld", "true");
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    // Cleanup JSON-LD on unmount
    return () => {
      const el = document.querySelector('script[data-seo-jsonld]');
      if (el) el.remove();
    };
  }, [title, description, canonical, ogImage, ogType, noindex, jsonLd]);
}
