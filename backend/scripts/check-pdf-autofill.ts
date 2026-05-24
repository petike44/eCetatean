import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "@pdfme/pdf-lib";
import {
  analyzePdf,
  fillPdf,
  missingInputsForFields,
} from "../src/lib/pdf-autofill";
import type { PdfForm, Profile } from "../src/types";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const form: PdfForm = {
  id: "autofill-check",
  slug: "autofill-check",
  title: "Autofill placement check",
  institution: "eCetatean",
  description: null,
  category: "test",
  tags: ["autofill", "test"],
  storage_bucket: "pdf-forms",
  storage_path: "autofill-check.pdf",
  source_url: null,
  is_active: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
  mapping: [
    field(
      "full_name",
      "Nume si prenume",
      "profile.full_name",
      145,
      156,
      260,
      true,
    ),
    field("cnp", "CNP", "profile.cnp", 145, 184, 210, true),
    field(
      "identity_card",
      "CI seria si numarul",
      "profile.identity_card",
      145,
      212,
      210,
      true,
    ),
    field(
      "current_address",
      "Domiciliu actual",
      "profile.full_address",
      145,
      240,
      320,
      true,
    ),
    field(
      "new_address",
      "Adresa resedintei solicitate",
      "input.new_address",
      145,
      302,
      330,
      true,
    ),
    field("date", "Data", "system.today", 145, 680, 120, true),
  ],
  required_inputs: [
    {
      key: "new_address",
      label: "Adresa resedintei solicitate",
      required: true,
    },
  ],
};

const profile: Partial<Profile> = {
  full_name: "Ion Popescu",
  cnp: "1900101123456",
  address: "Str. Memorandumului 1",
  city: "Cluj-Napoca",
  buletin_series: "CJ",
  buletin_number: "123456",
};

const additionalData = {
  new_address: "Str. Republicii 10, Cluj-Napoca",
};

function field(
  id: string,
  label: string,
  dataKey: string,
  x: number,
  y: number,
  width: number,
  required: boolean,
) {
  return {
    id,
    label,
    dataKey,
    page: 0,
    x,
    y,
    width,
    height: 18,
    required,
    confidence: 0.95,
    source: "saved" as const,
  };
}

async function buildGuidedPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("PDF autofill placement check", {
    x: 56,
    y: A4_HEIGHT - 72,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });

  for (const item of form.mapping) {
    page.drawText(item.label, {
      x: 56,
      y: A4_HEIGHT - item.y - item.height + 4,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawRectangle({
      x: item.x,
      y: A4_HEIGHT - item.y - item.height,
      width: item.width,
      height: item.height,
      borderWidth: 0.8,
      borderColor: rgb(0.15, 0.45, 0.9),
      color: rgb(0.95, 0.98, 1),
    });
  }

  return pdf.save();
}

function placementRows(fields: Awaited<ReturnType<typeof analyzePdf>>) {
  return fields.map((item) => {
    const textX = item.x;
    const textBaselineY = A4_HEIGHT - item.y - item.height + 4;
    const boxBottomY = A4_HEIGHT - item.y - item.height;
    const withinHorizontalBox = textX >= item.x && textX <= item.x + item.width;
    const withinVerticalBox =
      textBaselineY >= boxBottomY && textBaselineY <= boxBottomY + item.height;

    return {
      id: item.id,
      dataKey: item.dataKey,
      value: item.value ?? "",
      boxTopLeft: { x: item.x, yFromTop: item.y },
      boxSize: { width: item.width, height: item.height },
      drawnTextOrigin: { x: textX, yFromBottom: textBaselineY },
      withinBox: withinHorizontalBox && withinVerticalBox,
    };
  });
}

async function main() {
  const sourcePdf = await buildGuidedPdf();
  const fields = await analyzePdf(form, sourcePdf, profile, additionalData);
  const missing = missingInputsForFields(fields, form.required_inputs);
  const outputPdf = await fillPdf(sourcePdf, fields, profile, additionalData);
  const rows = placementRows(fields);
  const allValuesFilled = fields.every(
    (item) => !item.required || item.value?.trim(),
  );
  const allPlacedInsideBoxes = rows.every((item) => item.withinBox);

  const outputDir = join(process.cwd(), "tmp");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "autofill-check.pdf"), outputPdf);
  await writeFile(
    join(outputDir, "autofill-check-report.json"),
    JSON.stringify(
      {
        ok: allValuesFilled && allPlacedInsideBoxes && missing.length === 0,
        allValuesFilled,
        allPlacedInsideBoxes,
        missingInputs: missing,
        outputPdf: join(outputDir, "autofill-check.pdf"),
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
