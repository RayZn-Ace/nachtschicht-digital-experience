import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

// Strip emojis & non-WinAnsi characters for pdf-lib compatibility
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "").trim();
}

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
    const { form_id } = await req.json();
    if (!form_id) {
      return new Response(JSON.stringify({ error: "form_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: form, error: formErr } = await adminClient
      .from("u18_forms")
      .select("*")
      .eq("id", form_id)
      .single();

    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Form loaded:", {
      id: form.id,
      has_signature: form.has_signature,
      has_supervisor_signature: form.has_supervisor_signature,
      parent_sig_len: form.parent_signature?.length || 0,
      supervisor_sig_len: form.supervisor_signature?.length || 0,
    });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const accent = rgb(0.86, 0.08, 0.24);
    const white = rgb(1, 1, 1);

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: white });

    // Header bar
    page.drawRectangle({
      x: 0, y: height - 90, width, height: 90,
      color: rgb(0.08, 0.08, 0.12),
    });

    page.drawText("NACHTSCHICHT", {
      x: 40, y: height - 40,
      size: 24, font: fontBold, color: white,
    });

    page.drawText("CLUBZETTEL / MUTTIZETTEL", {
      x: 40, y: height - 65,
      size: 12, font: fontRegular, color: rgb(0.7, 0.7, 0.7),
    });

    // Event info
    let y = height - 120;

    page.drawText("VERANSTALTUNG", {
      x: 40, y, size: 9, font: fontBold, color: accent,
    });
    y -= 18;

    page.drawText(stripEmoji(form.event_title || "–"), {
      x: 40, y, size: 14, font: fontBold, color: black,
    });
    y -= 16;

    if (form.event_date) {
      const dateStr = new Date(form.event_date).toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });
      page.drawText(dateStr, {
        x: 40, y, size: 10, font: fontRegular, color: gray,
      });
      y -= 14;
    }

    // Separator
    y -= 10;
    page.drawLine({
      start: { x: 40, y }, end: { x: width - 40, y },
      thickness: 1, color: rgb(0.85, 0.85, 0.85),
    });

    // Helper to draw a section
    const drawSection = (title: string, fields: { label: string; value: string }[]) => {
      y -= 25;
      page.drawText(title, {
        x: 40, y, size: 10, font: fontBold, color: accent,
      });
      y -= 5;

      for (const field of fields) {
        if (!field.value) continue;
        y -= 16;
        page.drawText(field.label + ":", {
          x: 40, y, size: 9, font: fontRegular, color: gray,
        });
        page.drawText(field.value, {
          x: 180, y, size: 10, font: fontBold, color: black,
          maxWidth: width - 220,
        });
      }
    };

    // Helper to embed a signature image from base64 data URL
    const embedSignature = async (dataUrl: string, xPos: number, yPos: number, maxW: number, maxH: number) => {
      try {
        const base64Data = dataUrl.split(",")[1];
        if (!base64Data) return;
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(imageBytes);
        const dims = pngImage.scaleToFit(maxW, maxH);
        page.drawImage(pngImage, {
          x: xPos,
          y: yPos,
          width: dims.width,
          height: dims.height,
        });
      } catch (err) {
        console.error("Failed to embed signature:", err);
        page.drawText("[Unterschrift nicht lesbar]", {
          x: xPos, y: yPos + 2, size: 8, font: fontRegular, color: accent,
        });
      }
    };

    // Parent section
    drawSection("SORGEBERECHTIGTE PERSON", [
      { label: "Name", value: form.parent_name },
      { label: "Anschrift", value: form.parent_address },
      { label: "PLZ / Ort", value: [form.parent_zip, form.parent_city].filter(Boolean).join(" ") },
      { label: "Land", value: form.parent_country },
      { label: "Telefon", value: form.parent_phone },
      { label: "Geburtsdatum", value: form.parent_birthday ? new Date(form.parent_birthday).toLocaleDateString("de-DE") : "" },
    ]);

    // Minor section
    drawSection("MINDERJAEHRIGE PERSON", [
      { label: "Name", value: form.minor_name },
      { label: "Anschrift", value: form.minor_address },
      { label: "PLZ / Ort", value: [form.minor_zip, form.minor_city].filter(Boolean).join(" ") },
      { label: "Land", value: form.minor_country },
      { label: "Telefon", value: form.minor_phone },
      { label: "Geburtsdatum", value: form.minor_birthday ? new Date(form.minor_birthday).toLocaleDateString("de-DE") : "" },
    ]);

    // Supervisor section
    if (form.supervisor_name) {
      drawSection("AUFSICHTSPERSON (18+)", [
        { label: "Name", value: form.supervisor_name },
        { label: "Anschrift", value: form.supervisor_address || "" },
        { label: "PLZ / Ort", value: [form.supervisor_zip, form.supervisor_city].filter(Boolean).join(" ") },
        { label: "Land", value: form.supervisor_country || "" },
        { label: "E-Mail", value: form.supervisor_email || "" },
        { label: "Telefon", value: form.supervisor_phone || "" },
        { label: "Geburtsdatum", value: form.supervisor_birthday ? new Date(form.supervisor_birthday).toLocaleDateString("de-DE") : "" },
      ]);
    } else {
      y -= 25;
      page.drawText("AUFSICHTSPERSON (18+)", {
        x: 40, y, size: 10, font: fontBold, color: accent,
      });
      y -= 18;
      page.drawText("Bitte hier handschriftlich eintragen:", {
        x: 40, y, size: 9, font: fontRegular, color: gray,
      });
      const emptyFields = ["Name", "Anschrift", "Telefon", "Geburtsdatum"];
      for (const label of emptyFields) {
        y -= 22;
        page.drawText(label + ":", {
          x: 40, y, size: 9, font: fontRegular, color: gray,
        });
        page.drawLine({
          start: { x: 180, y: y - 2 }, end: { x: width - 40, y: y - 2 },
          thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
        });
      }
    }

    // Signature section
    y -= 35;
    page.drawLine({
      start: { x: 40, y }, end: { x: width - 40, y },
      thickness: 1, color: rgb(0.85, 0.85, 0.85),
    });

    y -= 25;
    page.drawText("ERKLAERUNG", {
      x: 40, y, size: 10, font: fontBold, color: accent,
    });
    y -= 16;

    const declaration = "Hiermit erklaere ich mich als sorgeberechtigte Person einverstanden, dass die oben genannte minderjaehrige Person die Veranstaltung besucht. Die Aufsichtspflicht uebertrage ich an die oben genannte Aufsichtsperson.";
    const words = declaration.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (fontRegular.widthOfTextAtSize(test, 9) > width - 80) {
        page.drawText(line, { x: 40, y, size: 9, font: fontRegular, color: black });
        y -= 14;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: 40, y, size: 9, font: fontRegular, color: black });
      y -= 14;
    }

    // Signature lines
    y -= 30;
    page.drawText("Ort, Datum", {
      x: 40, y: y + 12, size: 8, font: fontRegular, color: gray,
    });
    page.drawLine({
      start: { x: 40, y }, end: { x: 250, y },
      thickness: 0.5, color: black,
    });

    page.drawText("Unterschrift Sorgeberechtigte/r", {
      x: 300, y: y + 12, size: 8, font: fontRegular, color: gray,
    });
    page.drawLine({
      start: { x: 300, y }, end: { x: width - 40, y },
      thickness: 0.5, color: black,
    });

    // Embed parent signature image if available
    if (form.parent_signature) {
      await embedSignature(form.parent_signature, 305, y + 2, 240, 40);
    } else if (form.has_signature) {
      page.drawText("[Elektronisch unterschrieben]", {
        x: 310, y: y + 2, size: 8, font: fontRegular, color: accent,
      });
    }

    // Supervisor signature line
    y -= 50;
    page.drawText("Unterschrift Aufsichtsperson (18+)", {
      x: 40, y: y + 12, size: 8, font: fontRegular, color: gray,
    });
    page.drawLine({
      start: { x: 40, y }, end: { x: 300, y },
      thickness: 0.5, color: black,
    });

    // Embed supervisor signature image if available
    if (form.supervisor_signature) {
      await embedSignature(form.supervisor_signature, 45, y + 2, 250, 40);
    } else if (form.has_supervisor_signature) {
      page.drawText("[Elektronisch unterschrieben]", {
        x: 50, y: y + 2, size: 8, font: fontRegular, color: accent,
      });
    }

    // Footer
    page.drawText("Nachtschicht Kaiserslautern | Zollamtstrasse 28 | 67663 Kaiserslautern", {
      x: 40, y: 30, size: 7, font: fontRegular, color: gray,
    });

    page.drawText(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, {
      x: 40, y: 20, size: 7, font: fontRegular, color: gray,
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="clubzettel-${form_id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("generate-u18-pdf error:", err);
    return new Response(JSON.stringify({ error: "PDF generation failed", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
