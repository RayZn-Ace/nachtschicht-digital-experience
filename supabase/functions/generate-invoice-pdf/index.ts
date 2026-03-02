import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatCurrency(val: number): string {
  return val.toFixed(2).replace(".", ",") + " €";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch invoice
    const { data: invoice, error: invErr } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch line items
    const { data: lineItems } = await adminClient
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("sort_order", { ascending: true });

    // Fetch seller config for footer/bank details
    const { data: config } = await adminClient
      .from("invoice_config")
      .select("*")
      .limit(1)
      .single();

    // If buyer_address is empty, try to get billing address from linked ticket
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

    // Create PDF (A4)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.92, 0.92, 0.92);
    const accent = rgb(0.08, 0.08, 0.12);

    const marginLeft = 50;
    const marginRight = 50;
    const contentWidth = width - marginLeft - marginRight;

    let y = height - 50;

    // === HEADER: Seller info top-right ===
    const sellerLines = [
      invoice.seller_name,
      invoice.seller_address,
      invoice.seller_tax_id ? `Steuer-Nr.: ${invoice.seller_tax_id}` : null,
      invoice.seller_vat_id ? `USt-IdNr.: ${invoice.seller_vat_id}` : null,
    ].filter(Boolean) as string[];

    for (const line of sellerLines) {
      const lineWidth = fontRegular.widthOfTextAtSize(line, 8);
      page.drawText(line, {
        x: width - marginRight - lineWidth, y,
        size: 8, font: fontRegular, color: gray,
      });
      y -= 12;
    }

    // === Sender line (small) ===
    y = height - 130;
    const senderLine = `${invoice.seller_name} · ${invoice.seller_address}`;
    page.drawText(senderLine, {
      x: marginLeft, y,
      size: 7, font: fontRegular, color: gray,
    });

    // === Buyer address block ===
    y -= 18;
    const buyerLines = [
      invoice.buyer_name,
      ...(buyerAddress ? buyerAddress.split("\n") : []),
    ];
    for (const line of buyerLines) {
      page.drawText(line, {
        x: marginLeft, y,
        size: 10, font: fontRegular, color: black,
      });
      y -= 14;
    }

    // === Invoice metadata (right side) ===
    const metaY = height - 170;
    const metaX = width - marginRight - 180;
    const metaItems = [
      { label: "Rechnungsnummer:", value: invoice.invoice_number },
      { label: "Rechnungsdatum:", value: formatDate(invoice.issued_at || invoice.created_at) },
      { label: "Status:", value: invoice.status === "paid" ? "Bezahlt" : invoice.status === "cancelled" ? "Storniert" : "Offen" },
    ];

    let metaYPos = metaY;
    for (const m of metaItems) {
      page.drawText(m.label, {
        x: metaX, y: metaYPos,
        size: 9, font: fontRegular, color: gray,
      });
      page.drawText(m.value, {
        x: metaX + 110, y: metaYPos,
        size: 9, font: fontBold, color: black,
      });
      metaYPos -= 14;
    }

    // === Title ===
    y -= 30;
    const isCancellation = invoice.cancellation_invoice_id != null;
    const title = isCancellation ? "STORNORECHNUNG" : "RECHNUNG";
    page.drawText(title, {
      x: marginLeft, y,
      size: 20, font: fontBold, color: accent,
    });

    // === Line items table ===
    y -= 35;

    // Table header
    const colX = {
      pos: marginLeft,
      desc: marginLeft + 30,
      qty: marginLeft + contentWidth - 200,
      price: marginLeft + contentWidth - 140,
      vat: marginLeft + contentWidth - 75,
      total: marginLeft + contentWidth - 10,
    };

    page.drawRectangle({
      x: marginLeft, y: y - 3, width: contentWidth, height: 18,
      color: accent,
    });

    const headerY = y;
    const headerFont = { size: 8, font: fontBold, color: rgb(1, 1, 1) };
    page.drawText("Pos.", { x: colX.pos + 5, y: headerY, ...headerFont });
    page.drawText("Beschreibung", { x: colX.desc, y: headerY, ...headerFont });
    page.drawText("Menge", { x: colX.qty, y: headerY, ...headerFont });
    page.drawText("Einzelpreis", { x: colX.price, y: headerY, ...headerFont });
    page.drawText("MwSt", { x: colX.vat, y: headerY, ...headerFont });

    const totalHeader = "Gesamt";
    const totalHeaderW = fontBold.widthOfTextAtSize(totalHeader, 8);
    page.drawText(totalHeader, { x: colX.total - totalHeaderW, y: headerY, ...headerFont });

    y -= 22;

    // Table rows
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (i % 2 === 0) {
        page.drawRectangle({
          x: marginLeft, y: y - 4, width: contentWidth, height: 16,
          color: lightGray,
        });
      }

      page.drawText(`${i + 1}`, {
        x: colX.pos + 5, y,
        size: 8, font: fontRegular, color: black,
      });
      page.drawText(item.description, {
        x: colX.desc, y,
        size: 8, font: fontRegular, color: black,
        maxWidth: colX.qty - colX.desc - 10,
      });
      page.drawText(`${item.quantity}`, {
        x: colX.qty + 10, y,
        size: 8, font: fontRegular, color: black,
      });
      page.drawText(formatCurrency(Number(item.unit_price)), {
        x: colX.price, y,
        size: 8, font: fontRegular, color: black,
      });
      page.drawText(`${Number(item.vat_rate)}%`, {
        x: colX.vat, y,
        size: 8, font: fontRegular, color: black,
      });

      const totalText = formatCurrency(Number(item.line_total));
      const totalW = fontRegular.widthOfTextAtSize(totalText, 8);
      page.drawText(totalText, {
        x: colX.total - totalW, y,
        size: 8, font: fontRegular, color: black,
      });

      y -= 18;
    }

    // === Totals ===
    y -= 10;
    page.drawLine({
      start: { x: marginLeft + contentWidth - 200, y },
      end: { x: marginLeft + contentWidth, y },
      thickness: 1, color: rgb(0.8, 0.8, 0.8),
    });

    y -= 16;
    const totalsData = [
      { label: "Nettobetrag", value: formatCurrency(Number(invoice.subtotal)) },
      { label: `MwSt. ${Number(invoice.vat_rate)}%`, value: formatCurrency(Number(invoice.vat_amount)) },
    ];

    for (const t of totalsData) {
      page.drawText(t.label, {
        x: marginLeft + contentWidth - 180, y,
        size: 9, font: fontRegular, color: gray,
      });
      const valW = fontRegular.widthOfTextAtSize(t.value, 9);
      page.drawText(t.value, {
        x: marginLeft + contentWidth - valW, y,
        size: 9, font: fontRegular, color: black,
      });
      y -= 16;
    }

    // Grand total
    y -= 4;
    page.drawRectangle({
      x: marginLeft + contentWidth - 210, y: y - 5,
      width: 210, height: 24,
      color: accent,
    });
    page.drawText("Gesamtbetrag", {
      x: marginLeft + contentWidth - 200, y: y + 1,
      size: 10, font: fontBold, color: rgb(1, 1, 1),
    });
    const grandTotal = formatCurrency(Number(invoice.total));
    const grandTotalW = fontBold.widthOfTextAtSize(grandTotal, 12);
    page.drawText(grandTotal, {
      x: marginLeft + contentWidth - grandTotalW, y: y - 1,
      size: 12, font: fontBold, color: rgb(1, 1, 1),
    });

    // === Notes ===
    if (invoice.notes) {
      y -= 40;
      page.drawText("Hinweis:", {
        x: marginLeft, y,
        size: 9, font: fontBold, color: black,
      });
      y -= 14;
      page.drawText(invoice.notes, {
        x: marginLeft, y,
        size: 8, font: fontRegular, color: gray,
        maxWidth: contentWidth,
      });
    }

    // === Footer: Bank details + legal ===
    const footerY = 70;
    page.drawLine({
      start: { x: marginLeft, y: footerY + 15 },
      end: { x: width - marginRight, y: footerY + 15 },
      thickness: 0.5, color: rgb(0.8, 0.8, 0.8),
    });

    const footerCols = [
      [
        config?.company_name || invoice.seller_name,
        config?.company_address || "",
        `${config?.company_zip || ""} ${config?.company_city || ""}`.trim(),
      ],
      [
        config?.email ? `E-Mail: ${config.email}` : "",
        config?.phone ? `Tel.: ${config.phone}` : "",
        config?.website || "",
      ].filter(Boolean),
      [
        config?.bank_name ? `Bank: ${config.bank_name}` : "",
        config?.bank_iban ? `IBAN: ${config.bank_iban}` : "",
        config?.bank_bic ? `BIC: ${config.bank_bic}` : "",
      ].filter(Boolean),
    ];

    const colWidth = contentWidth / 3;
    for (let col = 0; col < footerCols.length; col++) {
      let fy = footerY;
      for (const line of footerCols[col]) {
        page.drawText(line as string, {
          x: marginLeft + col * colWidth, y: fy,
          size: 7, font: fontRegular, color: gray,
        });
        fy -= 10;
      }
    }

    if (config?.footer_text) {
      page.drawText(config.footer_text, {
        x: marginLeft, y: 25,
        size: 6, font: fontRegular, color: gray,
        maxWidth: contentWidth,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rechnung-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("generate-invoice-pdf error:", err);
    return new Response(JSON.stringify({ error: "PDF generation failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
