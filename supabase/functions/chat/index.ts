import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist der freundliche KI-Assistent der Nachtschicht Kaiserslautern – einem der beliebtesten Clubs in Kaiserslautern.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
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
