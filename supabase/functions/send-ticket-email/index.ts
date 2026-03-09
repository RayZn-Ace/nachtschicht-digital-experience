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

async function generateTicketPdf(ticket: any, event: any, ticketType: any): Promise<Uint8Array> {
  const qrData = ticket.qr_code || ticket.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  const qrRes = await fetch(qrUrl);
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer());
  const shortId = ticket.id.slice(0, 8).toUpperCase();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const accent = rgb(0.86, 0.08, 0.24);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.08, 0.08, 0.12) });
  page.drawText("NACHTSCHICHT", { x: 30, y: height - 45, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("TICKET", { x: 30, y: height - 65, size: 12, font: fontRegular, color: rgb(0.7, 0.7, 0.7) });

  // Ticket number top-right in header
  const ticketNrText = `#${shortId}`;
  const ticketNrW = fontBold.widthOfTextAtSize(ticketNrText, 11);
  page.drawText(ticketNrText, { x: width - 30 - ticketNrW, y: height - 50, size: 11, font: fontBold, color: rgb(1, 1, 1) });

  let yPos = height - 115;
  page.drawText(stripEmoji(event.title || "Event"), { x: 30, y: yPos, size: 18, font: fontBold, color: black, maxWidth: width - 60 });

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

  yPos -= 10;
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
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrSize = 150;
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: yPos - qrSize, width: qrSize, height: qrSize });

  yPos -= qrSize + 15;
  // Short ticket number below QR for manual entry
  const manualW = fontBold.widthOfTextAtSize(shortId, 12);
  page.drawText(shortId, { x: (width - manualW) / 2, y: yPos, size: 12, font: fontBold, color: black });

  page.drawText("Bitte zeige dieses Ticket am Einlass vor.", { x: 30, y: 30, size: 8, font: fontRegular, color: gray });

  return await pdfDoc.save();
}

async function generateInvoicePdf(adminClient: any, invoiceId: string): Promise<Uint8Array | null> {
  const { data: invoice } = await adminClient
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return null;

  const { data: lineItems } = await adminClient
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  const { data: config } = await adminClient
    .from("invoice_config")
    .select("*")
    .limit(1)
    .single();

  let buyerAddress = invoice.buyer_address || "";
  if (!buyerAddress && invoice.ticket_id) {
    const { data: ticket } = await adminClient
      .from("tickets")
      .select("billing_name, billing_street, billing_zip, billing_city, billing_country")
      .eq("id", invoice.ticket_id)
      .single();
    if (ticket) {
      const parts = [
        ticket.billing_name,
        ticket.billing_street,
        [ticket.billing_zip, ticket.billing_city].filter(Boolean).join(" "),
        ticket.billing_country && ticket.billing_country !== "Deutschland" ? ticket.billing_country : null,
      ].filter(Boolean);
      buyerAddress = parts.join("\n");
    }
  }

  const items = lineItems || [];
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.92, 0.92, 0.92);
  const accentColor = rgb(0.08, 0.08, 0.12);
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = width - marginLeft - marginRight;

  const formatCurrency = (val: number) => val.toFixed(2).replace(".", ",") + " €";
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  let y = height - 50;

  // Seller info top-right
  const sellerLines = [
    invoice.seller_name,
    invoice.seller_address,
    invoice.seller_tax_id ? `Steuer-Nr.: ${invoice.seller_tax_id}` : null,
    invoice.seller_vat_id ? `USt-IdNr.: ${invoice.seller_vat_id}` : null,
  ].filter(Boolean) as string[];

  for (const line of sellerLines) {
    const lineWidth = fontRegular.widthOfTextAtSize(line, 8);
    page.drawText(line, { x: width - marginRight - lineWidth, y, size: 8, font: fontRegular, color: gray });
    y -= 12;
  }

  y = height - 130;
  const senderLine = `${invoice.seller_name} · ${invoice.seller_address}`;
  page.drawText(senderLine, { x: marginLeft, y, size: 7, font: fontRegular, color: gray });

  y -= 18;
  const buyerLines = [invoice.buyer_name, ...(buyerAddress ? buyerAddress.split("\n") : [])];
  for (const line of buyerLines) {
    page.drawText(line, { x: marginLeft, y, size: 10, font: fontRegular, color: black });
    y -= 14;
  }

  const metaY = height - 170;
  const metaX = width - marginRight - 180;
  const metaItems = [
    { label: "Rechnungsnummer:", value: invoice.invoice_number },
    { label: "Rechnungsdatum:", value: formatDate(invoice.issued_at || invoice.created_at) },
    { label: "Status:", value: invoice.status === "paid" ? "Bezahlt" : invoice.status === "cancelled" ? "Storniert" : "Offen" },
  ];

  let metaYPos = metaY;
  for (const m of metaItems) {
    page.drawText(m.label, { x: metaX, y: metaYPos, size: 9, font: fontRegular, color: gray });
    page.drawText(m.value, { x: metaX + 110, y: metaYPos, size: 9, font: fontBold, color: black });
    metaYPos -= 14;
  }

  y -= 30;
  const isCancellation = invoice.cancellation_invoice_id != null;
  page.drawText(isCancellation ? "STORNORECHNUNG" : "RECHNUNG", { x: marginLeft, y, size: 20, font: fontBold, color: accentColor });

  y -= 35;
  const colX = {
    pos: marginLeft,
    desc: marginLeft + 30,
    qty: marginLeft + contentWidth - 200,
    price: marginLeft + contentWidth - 140,
    vat: marginLeft + contentWidth - 75,
    total: marginLeft + contentWidth - 10,
  };

  page.drawRectangle({ x: marginLeft, y: y - 3, width: contentWidth, height: 18, color: accentColor });
  const headerFont = { size: 8, font: fontBold, color: rgb(1, 1, 1) };
  page.drawText("Pos.", { x: colX.pos + 5, y, ...headerFont });
  page.drawText("Beschreibung", { x: colX.desc, y, ...headerFont });
  page.drawText("Menge", { x: colX.qty, y, ...headerFont });
  page.drawText("Einzelpreis", { x: colX.price, y, ...headerFont });
  page.drawText("MwSt", { x: colX.vat, y, ...headerFont });
  const totalHeader = "Gesamt";
  const totalHeaderW = fontBold.widthOfTextAtSize(totalHeader, 8);
  page.drawText(totalHeader, { x: colX.total - totalHeaderW, y, ...headerFont });

  y -= 22;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i % 2 === 0) {
      page.drawRectangle({ x: marginLeft, y: y - 4, width: contentWidth, height: 16, color: lightGray });
    }
    page.drawText(`${i + 1}`, { x: colX.pos + 5, y, size: 8, font: fontRegular, color: black });
    page.drawText(item.description, { x: colX.desc, y, size: 8, font: fontRegular, color: black, maxWidth: colX.qty - colX.desc - 10 });
    page.drawText(`${item.quantity}`, { x: colX.qty + 10, y, size: 8, font: fontRegular, color: black });
    page.drawText(formatCurrency(Number(item.unit_price)), { x: colX.price, y, size: 8, font: fontRegular, color: black });
    page.drawText(`${Number(item.vat_rate)}%`, { x: colX.vat, y, size: 8, font: fontRegular, color: black });
    const totalText = formatCurrency(Number(item.line_total));
    const totalW = fontRegular.widthOfTextAtSize(totalText, 8);
    page.drawText(totalText, { x: colX.total - totalW, y, size: 8, font: fontRegular, color: black });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: marginLeft + contentWidth - 200, y }, end: { x: marginLeft + contentWidth, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 16;

  const totalsData = [
    { label: "Nettobetrag", value: formatCurrency(Number(invoice.subtotal)) },
    { label: `MwSt. ${Number(invoice.vat_rate)}%`, value: formatCurrency(Number(invoice.vat_amount)) },
  ];
  for (const t of totalsData) {
    page.drawText(t.label, { x: marginLeft + contentWidth - 180, y, size: 9, font: fontRegular, color: gray });
    const valW = fontRegular.widthOfTextAtSize(t.value, 9);
    page.drawText(t.value, { x: marginLeft + contentWidth - valW, y, size: 9, font: fontRegular, color: black });
    y -= 16;
  }

  y -= 4;
  page.drawRectangle({ x: marginLeft + contentWidth - 210, y: y - 5, width: 210, height: 24, color: accentColor });
  page.drawText("Gesamtbetrag", { x: marginLeft + contentWidth - 200, y: y + 1, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  const grandTotal = formatCurrency(Number(invoice.total));
  const grandTotalW = fontBold.widthOfTextAtSize(grandTotal, 12);
  page.drawText(grandTotal, { x: marginLeft + contentWidth - grandTotalW, y: y - 1, size: 12, font: fontBold, color: rgb(1, 1, 1) });

  if (invoice.notes) {
    y -= 40;
    page.drawText("Hinweis:", { x: marginLeft, y, size: 9, font: fontBold, color: black });
    y -= 14;
    page.drawText(invoice.notes, { x: marginLeft, y, size: 8, font: fontRegular, color: gray, maxWidth: contentWidth });
  }

  // Footer
  const footerY = 70;
  page.drawLine({ start: { x: marginLeft, y: footerY + 15 }, end: { x: width - marginRight, y: footerY + 15 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  const footerCols = [
    [config?.company_name || invoice.seller_name, config?.company_address || "", `${config?.company_zip || ""} ${config?.company_city || ""}`.trim()],
    [config?.email ? `E-Mail: ${config.email}` : "", config?.phone ? `Tel.: ${config.phone}` : "", config?.website || ""].filter(Boolean),
    [config?.bank_name ? `Bank: ${config.bank_name}` : "", config?.bank_iban ? `IBAN: ${config.bank_iban}` : "", config?.bank_bic ? `BIC: ${config.bank_bic}` : ""].filter(Boolean),
  ];
  const colWidth = contentWidth / 3;
  for (let col = 0; col < footerCols.length; col++) {
    let fy = footerY;
    for (const line of footerCols[col]) {
      page.drawText(line as string, { x: marginLeft + col * colWidth, y: fy, size: 7, font: fontRegular, color: gray });
      fy -= 10;
    }
  }
  if (config?.footer_text) {
    page.drawText(config.footer_text, { x: marginLeft, y: 25, size: 6, font: fontRegular, color: gray, maxWidth: contentWidth });
  }

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

    // Generate ticket PDFs
    const attachments = [];
    for (const ticket of tickets) {
      const pdfBytes = await generateTicketPdf(ticket, ticket.events, ticket.ticket_types);
      const shortId = ticket.id.slice(0, 8).toUpperCase();
      attachments.push({
        filename: `ticket-${shortId}.pdf`,
        content: uint8ToBase64(pdfBytes),
      });
    }

    // Find and attach invoice PDF
    const primaryTicketId = tickets[0].id;
    const { data: invoice } = await adminClient
      .from("invoices")
      .select("id, invoice_number")
      .eq("ticket_id", primaryTicketId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (invoice) {
      try {
        const invoicePdfBytes = await generateInvoicePdf(adminClient, invoice.id);
        if (invoicePdfBytes) {
          attachments.push({
            filename: `rechnung-${invoice.invoice_number}.pdf`,
            content: uint8ToBase64(invoicePdfBytes),
          });
        }
      } catch (invErr) {
        console.error("Invoice PDF generation failed (non-fatal):", invErr);
      }
    }

    const totalQuantity = tickets.reduce((s: number, t: any) => s + t.quantity, 0);
    const totalPrice = tickets.reduce((s: number, t: any) => s + t.total_price, 0);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Nachtschicht <tickets@nachtschicht-kaiserslautern.app>",
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
                📎 Dein Ticket-PDF${invoice ? " und deine Rechnung findest" : " findest"} du im Anhang dieser E-Mail.
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
