import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Strip emojis & non-WinAnsi characters for pdf-lib compatibility
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "").trim();
}

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
    const shortId = ticket.id.slice(0, 8).toUpperCase();

    const qrData = ticket.qr_code || ticket.id;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=000000&format=png`;
    const qrResponse = await fetch(qrApiUrl);
    if (!qrResponse.ok) throw new Error("QR code generation failed");
    const qrArrayBuffer = await qrResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const accent = rgb(0.86, 0.08, 0.24);

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

    // Header bar
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.08, 0.08, 0.12) });
    page.drawText("NACHTSCHICHT", { x: 30, y: height - 45, size: 22, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("TICKET", { x: 30, y: height - 65, size: 12, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });

    // Ticket number top-right in header
    const ticketNrText = `#${shortId}`;
    const ticketNrW = fontBold.widthOfTextAtSize(ticketNrText, 11);
    page.drawText(ticketNrText, { x: width - 30 - ticketNrW, y: height - 50, size: 11, font: fontBold, color: rgb(1, 1, 1) });

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
      { label: "Ticket-Nr.", value: shortId },
    ];

    for (const detail of details) {
      if (!detail.value) continue;
      page.drawText(detail.label, { x: 30, y: yPos, size: 9, font: fontRegular, color: gray });
      page.drawText(detail.value, { x: 120, y: yPos, size: 10, font: fontBold, color: black, maxWidth: width - 150 });
      yPos -= 18;
    }

    // Price
    yPos -= 10;
    const ticketFee = Number(ticket.fee_amount || 0);
    const ticketPriceExFee = Number(ticket.total_price) - ticketFee;

    if (ticketFee > 0) {
      page.drawRectangle({ x: 30, y: yPos - 5, width: width - 60, height: 22, color: rgb(0.96, 0.96, 0.96) });
      page.drawText("Ticketpreis", { x: 40, y: yPos + 1, size: 9, font: fontRegular, color: gray });
      page.drawText(`${ticketPriceExFee.toFixed(2)} €`, { x: width - 120, y: yPos + 1, size: 10, font: fontRegular, color: black });

      yPos -= 22;
      page.drawRectangle({ x: 30, y: yPos - 5, width: width - 60, height: 22, color: rgb(0.96, 0.96, 0.96) });
      page.drawText("Servicegebühr", { x: 40, y: yPos + 1, size: 9, font: fontRegular, color: gray });
      page.drawText(`${ticketFee.toFixed(2)} €`, { x: width - 120, y: yPos + 1, size: 10, font: fontRegular, color: black });

      yPos -= 24;
    }

    page.drawRectangle({ x: 30, y: yPos - 5, width: width - 60, height: 28, color: rgb(0.96, 0.96, 0.96), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1 });
    page.drawText("Gesamtpreis", { x: 40, y: yPos + 3, size: 10, font: fontRegular, color: gray });
    page.drawText(`${Number(ticket.total_price).toFixed(2)} €`, { x: width - 120, y: yPos + 3, size: 14, font: fontBold, color: accent });

    // Ticket type name above QR
    yPos -= 35;
    const typeName = ticketType?.name || "Standard";
    const typeNameW = fontRegular.widthOfTextAtSize(typeName, 9);
    page.drawText(typeName, { x: (width - typeNameW) / 2, y: yPos, size: 9, font: fontRegular, color: gray });

    // QR Code
    yPos -= 15;
    const qrBytes = new Uint8Array(qrArrayBuffer);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 150;
    page.drawImage(qrImage, { x: (width - qrSize) / 2, y: yPos - qrSize, width: qrSize, height: qrSize });

    yPos -= qrSize + 15;
    // Short ticket number below QR for manual entry
    const manualCode = shortId;
    const manualW = fontBold.widthOfTextAtSize(manualCode, 12);
    page.drawText(manualCode, { x: (width - manualW) / 2, y: yPos, size: 12, font: fontBold, color: black });

    // Footer
    page.drawText("Bitte zeige dieses Ticket am Einlass vor.", { x: 30, y: 30, size: 8, font: fontRegular, color: gray });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ticket-${shortId}.pdf"`,
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
