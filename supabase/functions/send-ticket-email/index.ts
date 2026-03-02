import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateTicketPdf(ticket: any, event: any, ticketType: any): Promise<Uint8Array> {
  const qrData = ticket.qr_code || ticket.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  const qrRes = await fetch(qrUrl);
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer());

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const accent = rgb(0.86, 0.08, 0.24);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.08, 0.08, 0.12) });
  page.drawText("NACHTSCHICHT", { x: 30, y: height - 45, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("TICKET", { x: 30, y: height - 65, size: 12, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });

  let yPos = height - 115;
  page.drawText(event.title || "Event", { x: 30, y: yPos, size: 18, font: fontBold, color: black, maxWidth: width - 60 });

  if (event.subtitle) {
    yPos -= 20;
    page.drawText(event.subtitle, { x: 30, y: yPos, size: 11, font: fontRegular, color: gray, maxWidth: width - 60 });
  }

  yPos -= 20;
  page.drawLine({ start: { x: 30, y: yPos }, end: { x: width - 30, y: yPos }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

  yPos -= 25;
  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "";

  const details = [
    { label: "Datum", value: eventDate },
    { label: "Einlass", value: event.time || "" },
    { label: "Ticket-Typ", value: ticketType?.name || "Standard" },
    { label: "Anzahl", value: `${ticket.quantity}x` },
    { label: "Name", value: ticket.buyer_name || "" },
  ];

  for (const detail of details) {
    if (!detail.value) continue;
    page.drawText(detail.label, { x: 30, y: yPos, size: 9, font: fontRegular, color: gray });
    page.drawText(detail.value, { x: 120, y: yPos, size: 10, font: fontBold, color: black, maxWidth: width - 150 });
    yPos -= 18;
  }

  yPos -= 10;
  page.drawRectangle({ x: 30, y: yPos - 5, width: width - 60, height: 28, color: rgb(0.96, 0.96, 0.96), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1 });
  page.drawText("Gesamtpreis", { x: 40, y: yPos + 3, size: 10, font: fontRegular, color: gray });
  page.drawText(`${Number(ticket.total_price).toFixed(2)} €`, { x: width - 120, y: yPos + 3, size: 14, font: fontBold, color: accent });

  yPos -= 50;
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrSize = 150;
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: yPos - qrSize, width: qrSize, height: qrSize });

  yPos -= qrSize + 15;
  const codeText = String(qrData).substring(0, 36);
  const codeWidth = fontRegular.widthOfTextAtSize(codeText, 7);
  page.drawText(codeText, { x: (width - codeWidth) / 2, y: yPos, size: 7, font: fontRegular, color: gray });

  page.drawText("Bitte zeige dieses Ticket am Einlass vor.", { x: 30, y: 30, size: 8, font: fontRegular, color: gray });

  return await pdfDoc.save();
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_ids } = await req.json();
    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return new Response(JSON.stringify({ error: "ticket_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all tickets with events and ticket types
    const { data: tickets, error: ticketErr } = await adminClient
      .from("tickets")
      .select("*, events(*), ticket_types(*)")
      .in("id", ticket_ids);

    if (ticketErr || !tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ error: "Tickets not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buyerEmail = tickets[0].buyer_email;
    const buyerName = tickets[0].buyer_name || "Gast";
    const event = tickets[0].events;
    const eventTitle = event?.title || "Event";
    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : "";

    // Generate PDFs for all tickets
    const attachments = [];
    for (const ticket of tickets) {
      const pdfBytes = await generateTicketPdf(ticket, ticket.events, ticket.ticket_types);
      attachments.push({
        filename: `ticket-${ticket.id.slice(0, 8)}.pdf`,
        content: uint8ToBase64(pdfBytes),
      });
    }

    const totalQuantity = tickets.reduce((s: number, t: any) => s + t.quantity, 0);
    const totalPrice = tickets.reduce((s: number, t: any) => s + t.total_price, 0);

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht <tickets@smeanet.de>",
        to: [buyerEmail],
        subject: `Dein Ticket für ${eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f13; color: #ffffff; padding: 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; letter-spacing: 4px; margin: 0;">NACHTSCHICHT</h1>
              <p style="color: #888; font-size: 12px; margin-top: 4px;">Kaiserslautern</p>
            </div>
            
            <div style="background: #1a1a22; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px;">Hallo ${buyerName}!</h2>
              <p style="color: #aaa; margin: 0; font-size: 14px;">
                Dein Ticket${totalQuantity > 1 ? "s" : ""} für <strong>${eventTitle}</strong> ${totalQuantity > 1 ? "sind" : "ist"} bestätigt.
              </p>
            </div>

            <div style="background: #1a1a22; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="color: #888; padding: 4px 0;">Event</td><td style="text-align: right;">${eventTitle}</td></tr>
                <tr><td style="color: #888; padding: 4px 0;">Datum</td><td style="text-align: right;">${eventDate}</td></tr>
                <tr><td style="color: #888; padding: 4px 0;">Einlass</td><td style="text-align: right;">${event?.time || "—"}</td></tr>
                <tr><td style="color: #888; padding: 4px 0;">Tickets</td><td style="text-align: right;">${totalQuantity}x</td></tr>
                <tr style="border-top: 1px solid #333;">
                  <td style="color: #888; padding: 8px 0 4px;">Gesamt</td>
                  <td style="text-align: right; font-weight: bold; font-size: 18px; color: #dc143c;">${totalPrice.toFixed(2)} €</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; background: #1a1a22; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #aaa; font-size: 13px; margin: 0 0 8px 0;">
                📎 Dein Ticket-PDF findest du im Anhang dieser E-Mail.
              </p>
              <p style="color: #888; font-size: 12px; margin: 0;">
                Zeige das Ticket (QR-Code) am Einlass auf deinem Handy oder ausgedruckt vor.
              </p>
            </div>

            <div style="text-align: center; color: #555; font-size: 11px; margin-top: 32px;">
              <p>Nachtschicht Kaiserslautern · Zollamtstraße 28 · 67663 Kaiserslautern</p>
              <p>Bei Fragen: info@nachtschicht-kaiserslautern.de</p>
            </div>
          </div>
        `,
        attachments,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Email sending failed", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await emailRes.json();
    return new Response(JSON.stringify({ success: true, email_id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-ticket-email error:", err);
    return new Response(JSON.stringify({ error: "Failed", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
