import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, event_id } = await req.json();
    if (!image_url) throw new Error("image_url is required");
    if (!event_id) throw new Error("event_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Generating newsletter banner for event:", event_id, "from:", image_url);

    // Use Gemini image model to create a wide banner with generative fill
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transform this event flyer into a wide horizontal email newsletter banner (aspect ratio 3.3:1, like 600x180 pixels).

CRITICAL RULES — follow these exactly:
1. The ENTIRE original image content MUST remain fully visible in the result. Do NOT crop, cut, or remove ANY part of the original image — no text, no faces, no logos, no decorative elements.
2. Scale/shrink the FULL original image so it fits completely within the banner height (180px equivalent).
3. This will leave empty space on the LEFT and RIGHT sides. Fill these empty side areas using generative fill that seamlessly extends the background, colors, textures, and mood of the original image.
4. The original image should appear as the CENTER of the banner, fully intact and uncropped.
5. Think of it like: take the full poster, place it in the center of a wider canvas, then paint the sides to match.
6. The result must look natural, professional, and cohesive — the extended sides should blend seamlessly.
7. NEVER cut off any text (event titles, dates, artist names) or faces/people. Everything from the original must be visible.`
              },
              {
                type: "image_url",
                image_url: { url: image_url }
              }
            ]
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte später erneut versuchen." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "KI-Bildgenerierung fehlgeschlagen" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "KI hat kein Bild generiert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Ungültiges Bildformat von KI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageType = base64Match[1];
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${event_id}-${Date.now()}.${imageType === "jpeg" ? "jpg" : imageType}`;
    const { error: uploadError } = await supabase.storage
      .from("newsletter-banners")
      .upload(fileName, binaryData, {
        contentType: `image/${imageType}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Bild-Upload fehlgeschlagen: " + uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("newsletter-banners").getPublicUrl(fileName);
    const bannerUrl = urlData.publicUrl;

    // Save to events table
    await supabase.from("events").update({ newsletter_banner_url: bannerUrl }).eq("id", event_id);

    console.log("Banner generated and saved:", bannerUrl);

    return new Response(JSON.stringify({ banner_url: bannerUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image-crop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
