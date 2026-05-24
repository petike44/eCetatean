import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { writeAuditEntry } from "../lib/hash-chain";
import { generatePDF } from "../lib/pdf-templates";
import { supabaseAdmin } from "../lib/supabase";
import {
  analyzePdf,
  demoForms,
  fillPdf,
  getPdfBytes,
  normalizeForm,
} from "../lib/pdf-autofill";
import type { PDFGenerationRequest, PdfForm } from "../types";

export const pdfRoute = new Hono();

pdfRoute.post("/generate", requireAuth, async (c) => {
  const userId = c.get("userId");

  let body: PDFGenerationRequest;
  try {
    body = await c.req.json<PDFGenerationRequest>();
  } catch {
    return c.json({ success: false, error: "Request body invalid" }, 400);
  }

  const { form_type, profile, additional_data = {} } = body;

  if (!form_type) {
    return c.json(
      { success: false, error: "Tipul formularului este obligatoriu" },
      400,
    );
  }

  // Always fetch from DB so the PDF gets the most complete data.
  // Frontend-supplied profile fields override DB values (lets the user
  // fill in fields that aren't stored yet).
  let profileData = profile ?? {};
  try {
    const { data: dbProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (dbProfile) profileData = { ...dbProfile, ...profileData };
  } catch (err) {
    console.error("Could not fetch profile from DB:", err);
  }

  try {
    const catalogSlug = formTypeToCatalogSlug(form_type);
    const catalogForm = catalogSlug ? await findCatalogForm(catalogSlug) : null;
    if (catalogForm) {
      const sourcePdf = await getPdfBytes(catalogForm);
      const fields = await analyzePdf(
        catalogForm,
        sourcePdf,
        profileData ?? {},
        additional_data,
      );
      const pdfBuffer = await fillPdf(
        sourcePdf,
        fields,
        profileData ?? {},
        additional_data,
      );

      writeAuditEntry({
        userId,
        action: `Formular autocompletat: ${catalogForm.title}`,
        actionType: "pdf_generated",
        data: { form_type, form_id: catalogForm.id, slug: catalogForm.slug },
      });

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${catalogForm.slug}_${Date.now()}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    }

    const pdfBuffer = await generatePDF(
      form_type,
      profileData ?? {},
      additional_data,
    );

    writeAuditEntry({
      userId,
      action: `Formular generat: ${form_type}`,
      actionType: "pdf_generated",
      data: { form_type },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${form_type}_${Date.now()}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return c.json(
      { success: false, error: "Eroare la generarea PDF-ului" },
      500,
    );
  }
});

function formTypeToCatalogSlug(formType: string): string | null {
  const aliases: Record<string, string> = {
    cerere_drpciv: "cerere-inmatriculare-drpciv",
    viza_flotant: "cerere-viza-flotant",
    certificat_fiscal: "cerere-certificat-fiscal",
    anaf_tva_certificate: "anaf_tva_certificate",
    anaf_tva_certificate_request: "anaf_tva_certificate",
  };
  return aliases[formType] ?? null;
}

async function findCatalogForm(slug: string): Promise<PdfForm | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("pdf_forms")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) return normalizeForm(data as never);
  } catch (err) {
    console.error("PDF catalog lookup failed, checking demo catalog:", err);
  }

  return (
    demoForms().find((form) => form.slug === slug || form.id === slug) ?? null
  );
}
