import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// In-memory translation cache (persists across renders, cleared on page reload)
const translationCache = new Map<string, string>();

// Batch queue for pending translations
let batchQueue: { text: string; resolve: (val: string) => void }[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const BATCH_DELAY = 150; // ms to wait before sending batch
const MAX_BATCH_SIZE = 30;

async function flushBatch() {
  if (batchQueue.length === 0) return;

  const batch = batchQueue.splice(0, MAX_BATCH_SIZE);
  const texts = batch.map((b) => b.text);

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: { texts, targetLang: "en" },
    });

    if (error || !data?.translations) {
      // Fallback: resolve with originals
      batch.forEach((b) => {
        translationCache.set(b.text, b.text);
        b.resolve(b.text);
      });
      return;
    }

    const translations = data.translations as string[];
    batch.forEach((b, i) => {
      const translated = translations[i] || b.text;
      translationCache.set(b.text, translated);
      b.resolve(translated);
    });
  } catch {
    batch.forEach((b) => {
      translationCache.set(b.text, b.text);
      b.resolve(b.text);
    });
  }

  // If there are more in the queue, flush again
  if (batchQueue.length > 0) {
    flushBatch();
  }
}

function queueTranslation(text: string): Promise<string> {
  // Check cache first
  const cached = translationCache.get(text);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    batchQueue.push({ text, resolve });

    if (batchTimer) clearTimeout(batchTimer);
    if (batchQueue.length >= MAX_BATCH_SIZE) {
      flushBatch();
    } else {
      batchTimer = setTimeout(flushBatch, BATCH_DELAY);
    }
  });
}

/**
 * Hook for translating dynamic content (event titles, descriptions, etc.)
 * Returns translated text when lang is "en", original when "de".
 */
export function useTranslate(lang: "de" | "en") {
  const [translated, setTranslated] = useState<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const translate = useCallback(
    (text: string | null | undefined): string => {
      if (!text) return "";
      if (lang === "de") return text;

      // Check local state
      const cached = translated.get(text);
      if (cached) return cached;

      // Check global cache
      const globalCached = translationCache.get(text);
      if (globalCached) {
        // Sync to local state without re-render loop
        if (!translated.has(text)) {
          setTranslated((prev) => new Map(prev).set(text, globalCached));
        }
        return globalCached;
      }

      // Queue translation if not already pending
      if (!pendingRef.current.has(text)) {
        pendingRef.current.add(text);
        queueTranslation(text).then((result) => {
          pendingRef.current.delete(text);
          setTranslated((prev) => new Map(prev).set(text, result));
        });
      }

      return text; // Return original while loading
    },
    [lang, translated]
  );

  return translate;
}
