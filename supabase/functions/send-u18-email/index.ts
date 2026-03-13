import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function fetchWithRetry(
  label: string,
  url: string,
  init: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastDetails = "unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      const details = await response.text();
      lastDetails = `status ${response.status}: ${details}`;
      const retryable = response.status === 429 || response.status >= 500;

      console.warn(`${label} attempt ${attempt} failed: ${lastDetails}`);

      if (!retryable || attempt === maxAttempts) {
        throw new Error(lastDetails);
      }
    } catch (err) {
      lastDetails = String(err);
      if (attempt === maxAttempts) {
        throw err;
      }
      console.warn(`${label} attempt ${attempt} exception: ${lastDetails}`);
    }

    await sleep(500 * attempt);
  }

  throw new Error(`${label} failed after ${maxAttempts} attempts: ${lastDetails}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { form_id } = await req.json();
    if (!form_id) {
      return new Response(JSON.stringify({ error: "form_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: form, error: formErr } = await adminClient
      .from("u18_forms")
      .select("id, event_title, event_date, parent_name, email")
      .eq("id", form_id)
      .single();

    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = (form.email || "").trim().toLowerCase();
    if (!isValidEmail(recipient)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("send-u18-email start", { form_id, recipient });

    const pdfRes = await fetchWithRetry(
      "generate-u18-pdf",
      `${supabaseUrl}/functions/v1/generate-u18-pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ form_id }),
      },
      3,
    );

    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    const shortId = form.id.slice(0, 8).toUpperCase();
    const eventTitle = form.event_title || "Event";
    const eventDate = form.event_date
      ? new Date(form.event_date).toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const parentName = escapeHtml(form.parent_name || "Gast");
    const safeEventTitle = escapeHtml(eventTitle);

    const emailRes = await fetchWithRetry(
      "resend-email",
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Nachtschicht <tickets@nachtschicht-kaiserslautern.app>",
          to: [recipient],
          subject: `Dein Clubzettel für ${eventTitle}`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0f0f13; color: #ffffff; padding: 32px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <h1 style="font-size: 28px; letter-spacing: 4px; margin: 0;">NACHTSCHICHT</h1>
              <p style="color: #8b8b94; font-size: 12px; margin-top: 6px;">Kaiserslautern</p>
            </div>

            <div style="background: #1a1a22; border-radius: 12px; padding: 22px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px; font-size: 20px;">Hallo ${parentName}!</h2>
              <p style="margin: 0; color: #c5c5cd; font-size: 14px; line-height: 1.6;">
                dein Clubzettel wurde erfolgreich erstellt und ist als PDF im Anhang.
              </p>
            </div>

            <div style="background: #1a1a22; border-radius: 12px; padding: 22px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="color: #8b8b94; padding: 6px 0;">Event</td>
                  <td style="text-align: right; padding: 6px 0;">${safeEventTitle}</td>
                </tr>
                ${eventDate ? `<tr><td style=\"color: #8b8b94; padding: 6px 0;\">Datum</td><td style=\"text-align: right; padding: 6px 0;\">${eventDate}</td></tr>` : ""}
                <tr>
                  <td style="color: #8b8b94; padding: 6px 0;">Formular-ID</td>
                  <td style="text-align: right; padding: 6px 0;">${shortId}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; font-size: 12px; color: #8b8b94; margin-top: 24px;">
              <p style="margin: 0;">Bitte den Clubzettel ausdrucken und zur Veranstaltung mitbringen.</p>
            </div>
          </div>
        `,
          attachments: [
            {
              filename: `clubzettel-${shortId}.pdf`,
              content: uint8ToBase64(pdfBytes),
            },
          ],
        }),
      },
      3,
    );

    const result = await emailRes.json();
    console.log("send-u18-email success", { form_id, recipient, email_id: result.id });

    return new Response(JSON.stringify({ success: true, email_id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-u18-email error:", err);
    return new Response(JSON.stringify({ error: "Failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
