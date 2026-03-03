import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATIC_PROMPT = `Du bist der freundliche KI-Assistent der Nachtschicht Kaiserslautern – einem der beliebtesten Clubs in Kaiserslautern.

**Über den Club:**
- Adresse: Zollamtstraße 28, 67663 Kaiserslautern
- Telefon: +49 631 3105759
- E-Mail: info@nachtschicht-kaiserslautern.de
- Website: nachtschicht-kaiserslautern.de

**Öffnungszeiten:**
- Freitag & Samstag: ab 22:00 Uhr
- Vorfeiertage: ab 22:00 Uhr
- Sonderveranstaltungen können abweichen – siehe Event-Seite

**Bereiche & Musik:**
- Agostea: Freitags Hip-Hop, Samstags House
- La Vie: Samstags Hip-Hop
- Mausefalle: Freitags & Samstags 90er/2000er & Partyhits
- Bungalow (VIP-Bereich)

**Lounges & Reservierungen:**
- VIP-Lounges und Tische können reserviert werden
- Reservierung per E-Mail oder Telefon oder online auf der Website
- Je nach Lounge gibt es einen Mindestverzehr

**Eintritt U18:**
- Ab 16 Jahren mit ausgefülltem Muttizettel und Begleitperson möglich
- Muttizettel kann online auf der Website ausgefüllt werden unter /u18

**Tickets:**
- Online-Ticketshop auf der Website verfügbar
- Tickets mit QR-Code zum Vorzeigen am Einlass
- Abendkasse je nach Event verfügbar

**Gutscheine:**
- Gutscheine sind an der Abendkasse oder per E-Mail erhältlich

**Jobs:**
- Aktuelle Stellenangebote auf der Website unter /jobs

**Kontakt:**
- Bei Fragen per E-Mail an info@nachtschicht-kaiserslautern.de oder telefonisch unter +49 631 3105759

Antworte immer auf Deutsch, freundlich, prägnant und hilfreich. Wenn du etwas nicht weißt, verweise höflich auf den Kontakt per E-Mail oder Telefon. Verwende Emojis sparsam und passend.`;

async function buildDynamicContext(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const sections: string[] = [];

  // 1. Upcoming events
  const today = new Date().toISOString().split("T")[0];
  const { data: events } = await sb
    .from("events")
    .select("title, date, time, end_time, genre, subtitle, ticket_price, has_abendkasse, has_muttizettel, description, areas")
    .eq("is_published", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(20);

  if (events?.length) {
    const lines = events.map((e: any) => {
      const parts = [`- **${e.title}**`];
      if (e.subtitle) parts[0] += ` – ${e.subtitle}`;
      parts.push(`  Datum: ${new Date(e.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`);
      if (e.time) parts.push(`  Einlass: ${e.time} Uhr`);
      if (e.end_time) parts.push(`  Ende: ${e.end_time} Uhr`);
      if (e.genre) parts.push(`  Musikrichtung: ${e.genre}`);
      if (e.areas) parts.push(`  Bereiche: ${e.areas}`);
      if (e.ticket_price != null) parts.push(`  Ticketpreis: ab ${e.ticket_price}€`);
      if (e.has_abendkasse) parts.push(`  Abendkasse: ja`);
      if (e.has_muttizettel) parts.push(`  Muttizettel erlaubt (U18): ja`);
      if (e.description) parts.push(`  Info: ${e.description.slice(0, 150)}`);
      return parts.join("\n");
    });
    sections.push(`**Aktuelle & kommende Events:**\n${lines.join("\n\n")}`);
  }

  // 2. Lounges
  const { data: lounges } = await sb
    .from("lounges")
    .select("name, capacity, min_spend, price_per_person, description, area_id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (lounges?.length) {
    const lines = lounges.map((l: any) => {
      const parts = [`- **${l.name}** (bis ${l.capacity} Pers.)`];
      if (l.min_spend > 0) parts.push(`  Mindestverzehr: ${l.min_spend}€`);
      if (l.price_per_person > 0) parts.push(`  Preis p.P.: ${l.price_per_person}€`);
      if (l.description) parts.push(`  ${l.description.slice(0, 120)}`);
      return parts.join("\n");
    });
    sections.push(`**Verfügbare Lounges:**\n${lines.join("\n")}`);
  }

  // 3. Drink categories + sample drinks
  const { data: categories } = await sb
    .from("drink_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categories?.length) {
    const { data: drinks } = await sb
      .from("drinks")
      .select("name, price, size, category_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const lines = categories.map((cat: any) => {
      const catDrinks = (drinks || []).filter((d: any) => d.category_id === cat.id).slice(0, 5);
      const drinkList = catDrinks.map((d: any) => `${d.name}${d.size ? ` (${d.size})` : ""} – ${d.price.toFixed(2)}€`).join(", ");
      return `- **${cat.name}**: ${drinkList || "–"}`;
    });
    sections.push(`**Getränkekarte (Auswahl):**\n${lines.join("\n")}`);
  }

  // 4. Holiday specials / opening hours
  const { data: specials } = await sb
    .from("holiday_specials")
    .select("title, date_label, hours, note_de")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (specials?.length) {
    const lines = specials.map((s: any) => `- ${s.title} (${s.date_label}): ${s.hours}${s.note_de ? ` – ${s.note_de}` : ""}`);
    sections.push(`**Sonderöffnungszeiten:**\n${lines.join("\n")}`);
  }

  return sections.length ? "\n\n---\n**AKTUELLE DYNAMISCHE DATEN (aus der Datenbank):**\n\n" + sections.join("\n\n") : "";
}

// Rate limit: simple per-IP tracking using in-memory map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte warte einen Moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Ungültige Anfrage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit conversation length and message size to prevent abuse
    const trimmedMessages = messages.slice(-MAX_MESSAGES).map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_LENGTH) : "",
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build dynamic context from database
    let dynamicContext = "";
    try {
      dynamicContext = await buildDynamicContext();
    } catch (e) {
      console.error("Failed to load dynamic context:", e);
    }

    const systemPrompt = STATIC_PROMPT + dynamicContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...trimmedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte versuche es gleich nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Kontingent aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
