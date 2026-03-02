import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an image analysis assistant specialized in determining the optimal focal point for cropping event flyers and promotional images.

Analyze the image and identify the most important visual region that should remain visible when the image is cropped to a wide horizontal banner (roughly 600x180 pixels from a 1920x1080 source).

Consider these priorities:
1. Text with event names, dates, artists, or key information
2. Faces and people (never cut off faces)
3. Logos and branding elements
4. Key visual elements that convey the event's theme

Return ONLY a JSON object with two integer values:
- focus_x: horizontal focal point as percentage (0-100, where 0=left, 50=center, 100=right)
- focus_y: vertical focal point as percentage (0-100, where 0=top, 50=center, 100=bottom)

Example: {"focus_x": 50, "focus_y": 35}

The focal point should be the center of the most important content area, so that when CSS object-position is applied, the critical content stays visible in the crop.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this event flyer and determine the optimal focal point for cropping. Return only the JSON." },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_focal_point",
              description: "Set the optimal focal point for image cropping",
              parameters: {
                type: "object",
                properties: {
                  focus_x: { type: "integer", description: "Horizontal focal point 0-100 (0=left, 50=center, 100=right)" },
                  focus_y: { type: "integer", description: "Vertical focal point 0-100 (0=top, 50=center, 100=bottom)" }
                },
                required: ["focus_x", "focus_y"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "set_focal_point" } },
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
      return new Response(JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let focus_x = 50;
    let focus_y = 50;

    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        focus_x = Math.max(0, Math.min(100, Math.round(args.focus_x ?? 50)));
        focus_y = Math.max(0, Math.min(100, Math.round(args.focus_y ?? 50)));
      } catch {
        console.error("Failed to parse tool call args, using defaults");
      }
    }

    return new Response(JSON.stringify({ focus_x, focus_y }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image-crop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
