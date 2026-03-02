import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch ticket with event and ticket type
    const { data: ticket, error: ticketErr } = await adminClient
      .from("tickets")
      .select("*, events(*), ticket_types(*)")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = ticket.events;
    const ticketType = ticket.ticket_types;

    // Generate QR code via external API (no canvas needed in Deno)
    const qrData = ticket.qr_code || ticket.id;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=000000&format=png`;
    const qrResponse = await fetch(qrApiUrl);
    if (!qrResponse.ok) throw new Error("QR code generation failed");
    const qrArrayBuffer = await qrResponse.arrayBuffer();

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const accent = rgb(0.86, 0.08, 0.24); // Crimson accent

    // Background
    page.drawRectangle({
      x: 0, y: 0, width, height,
      color: rgb(1, 1, 1),
    });

    // Header bar
    page.drawRectangle({
      x: 0, y: height - 80, width, height: 80,
      color: rgb(0.08, 0.08, 0.12),
    });

    page.drawText("NACHTSCHICHT", {
      x: 30, y: height - 45,
      size: 22, font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("TICKET", {
      x: 30, y: height - 65,
      size: 12, font: fontRegular,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Event title
    let yPos = height - 115;
    page.drawText(event.title || "Event", {
      x: 30, y: yPos,
      size: 18, font: fontBold, color: black,
      maxWidth: width - 60,
    });

    if (event.subtitle) {
      yPos -= 20;
      page.drawText(event.subtitle, {
        x: 30, y: yPos,
        size: 11, font: fontRegular, color: gray,
        maxWidth: width - 60,
      });
    }

    // Separator
    yPos -= 20;
    page.drawLine({
      start: { x: 30, y: yPos },
      end: { x: width - 30, y: yPos },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Event details
    yPos -= 25;
    const eventDate = event.date
      ? new Date(event.date).toLocaleDateString("de-DE", {
          weekday: "long", day: "2-digit", month: "long", year: "numeric",
        })
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
      page.drawText(detail.label, {
        x: 30, y: yPos,
        size: 9, font: fontRegular, color: gray,
      });
      page.drawText(detail.value, {
        x: 120, y: yPos,
        size: 10, font: fontBold, color: black,
        maxWidth: width - 150,
      });
      yPos -= 18;
    }

    // Price
    yPos -= 10;
    page.drawRectangle({
      x: 30, y: yPos - 5, width: width - 60, height: 28,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });
    page.drawText("Gesamtpreis", {
      x: 40, y: yPos + 3,
      size: 10, font: fontRegular, color: gray,
    });
    page.drawText(`${Number(ticket.total_price).toFixed(2)} €`, {
      x: width - 120, y: yPos + 3,
      size: 14, font: fontBold, color: accent,
    });

    // QR Code
    yPos -= 50;
    const qrBytes = new Uint8Array(qrArrayBuffer);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 150;

    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: yPos - qrSize,
      width: qrSize,
      height: qrSize,
    });

    yPos -= qrSize + 15;
    const codeText = String(qrData).substring(0, 36);
    const codeWidth = fontRegular.widthOfTextAtSize(codeText, 7);
    page.drawText(codeText, {
      x: (width - codeWidth) / 2, y: yPos,
      size: 7, font: fontRegular, color: gray,
    });

    // Footer
    page.drawText("Bitte zeige dieses Ticket am Einlass vor.", {
      x: 30, y: 30,
      size: 8, font: fontRegular, color: gray,
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${ticket.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("generate-ticket-pdf error:", err);
    return new Response(JSON.stringify({ error: "PDF generation failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
