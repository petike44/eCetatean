import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFTextField,
} from "@pdfme/pdf-lib";
import { supabaseAdmin } from "./supabase";
import { getCachedTipizatulPdf } from "./tipizatul/pdf-cache";
import { DriveCredentialsMissingError } from "./tipizatul/drive-proxy";
import { fillTipizatulPdf, type FillValueInput } from "./tipizatul/pdf-fill";
import type { TemplateField } from "./tipizatul/types";
import type {
  PdfAutofillField,
  PdfForm,
  PdfFormInputDefinition,
  Profile,
} from "../types";

type FormRow = Omit<PdfForm, "mapping" | "required_inputs"> & {
  mapping: unknown;
  required_inputs: unknown;
};

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const DEMO_FORMS: PdfForm[] = [
  {
    id: "demo-viza-flotant",
    slug: "cerere-viza-flotant",
    title: "Cerere pentru stabilirea resedintei",
    institution: "Directia pentru Evidenta Persoanelor",
    description:
      "Formular pentru solicitarea vizei de flotant / stabilirea resedintei.",
    category: "evidenta-persoanelor",
    tags: ["viza flotant", "resedinta", "domiciliu", "buletin"],
    storage_bucket: "pdf-forms",
    storage_path: "cerere-viza-flotant.pdf",
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
        0.92,
      ),
      field("cnp", "CNP", "profile.cnp", 145, 184, 210, true, 0.92),
      field(
        "identity_card",
        "CI seria si numarul",
        "profile.identity_card",
        145,
        212,
        210,
        true,
        0.86,
      ),
      field(
        "current_address",
        "Domiciliu actual",
        "profile.full_address",
        145,
        240,
        320,
        true,
        0.88,
      ),
      field(
        "new_address",
        "Adresa resedintei solicitate",
        "input.new_address",
        145,
        302,
        330,
        true,
        0.9,
      ),
      field(
        "period",
        "Perioada solicitata",
        "input.period",
        145,
        330,
        210,
        false,
        0.78,
      ),
      field("date", "Data", "system.today", 145, 680, 120, true, 0.95),
    ],
    required_inputs: [
      {
        key: "new_address",
        label: "Adresa resedintei solicitate",
        placeholder: "Strada, numar, bloc, apartament",
      },
      { key: "period", label: "Perioada solicitata", placeholder: "12 luni" },
    ],
  },
  {
    id: "demo-drpciv",
    slug: "cerere-inmatriculare-drpciv",
    title: "Cerere inmatriculare vehicul",
    institution: "DRPCIV",
    description: "Cerere pentru inmatricularea sau transcrierea unui vehicul.",
    category: "auto",
    tags: ["drpciv", "inmatriculare", "vehicul", "auto"],
    storage_bucket: "pdf-forms",
    storage_path: "cerere-inmatriculare-drpciv.pdf",
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field(
        "full_name",
        "Subsemnatul(a)",
        "profile.full_name",
        145,
        150,
        260,
        true,
        0.9,
      ),
      field("cnp", "CNP / CUI", "profile.cnp", 145, 178, 210, true, 0.9),
      field(
        "address",
        "Domiciliu",
        "profile.full_address",
        145,
        206,
        320,
        true,
        0.88,
      ),
      field("email", "E-mail", "profile.email", 145, 234, 210, false, 0.88),
      field("phone", "Telefon", "profile.phone", 145, 262, 160, false, 0.88),
      field(
        "vehicle_make",
        "Marca vehicul",
        "input.make",
        145,
        340,
        160,
        true,
        0.9,
      ),
      field(
        "vehicle_model",
        "Model / tip",
        "input.model",
        330,
        340,
        150,
        true,
        0.84,
      ),
      field(
        "vin",
        "Numar identificare VIN",
        "input.vin",
        145,
        368,
        260,
        true,
        0.9,
      ),
      field(
        "current_plate",
        "Numar inmatriculare actual",
        "input.current_plate",
        145,
        396,
        160,
        false,
        0.8,
      ),
      field("date", "Data", "system.today", 145, 680, 120, true, 0.95),
    ],
    required_inputs: [
      { key: "make", label: "Marca vehiculului", placeholder: "Dacia" },
      { key: "model", label: "Model / tip", placeholder: "Logan" },
      { key: "vin", label: "Numar identificare VIN", placeholder: "VF1..." },
      {
        key: "current_plate",
        label: "Numar inmatriculare actual",
        placeholder: "CJ 01 ABC",
      },
    ],
  },
  {
    id: "demo-certificat-fiscal",
    slug: "cerere-certificat-fiscal",
    title: "Cerere certificat fiscal",
    institution: "Directia Taxe si Impozite Locale",
    description: "Cerere pentru eliberarea certificatului fiscal local.",
    category: "taxe",
    tags: ["certificat fiscal", "taxe", "impozite", "primarie"],
    storage_bucket: "pdf-forms",
    storage_path: "cerere-certificat-fiscal.pdf",
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field(
        "full_name",
        "Nume si prenume contribuabil",
        "profile.full_name",
        150,
        160,
        260,
        true,
        0.92,
      ),
      field("cnp", "CNP", "profile.cnp", 150, 188, 210, true, 0.92),
      field(
        "address",
        "Domiciliu fiscal",
        "profile.full_address",
        150,
        216,
        320,
        true,
        0.88,
      ),
      field("email", "E-mail", "profile.email", 150, 244, 210, false, 0.86),
      field(
        "purpose",
        "Scopul solicitarii",
        "input.purpose",
        150,
        314,
        320,
        true,
        0.84,
      ),
      field("date", "Data", "system.today", 150, 680, 120, true, 0.95),
    ],
    required_inputs: [
      {
        key: "purpose",
        label: "Scopul solicitarii",
        placeholder: "Dosar vanzare-cumparare",
      },
    ],
  },
  {
    id: "demo-anaf-tva-certificate",
    slug: "anaf_tva_certificate",
    title: "Cerere certificat TVA ANAF",
    institution: "ANAF",
    description:
      "Cerere pentru eliberarea certificatului privind TVA pentru achizitii intracomunitare de vehicule.",
    category: "taxe",
    tags: ["anaf", "tva", "certificat tva", "vehicul", "spv"],
    storage_bucket: "pdf-forms",
    storage_path: "anaf_tva_certificate.pdf",
    source_url: null,
    is_active: true,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    mapping: [
      field("full_name", "Denumire/Nume, Prenume", "profile.full_name", 150, 150, 260, true, 0.75),
      field("fiscal_code", "Cod de identificare fiscala", "input.fiscal_code", 150, 178, 210, false, 0.65),
      field("cnp", "Cod numeric personal", "profile.cnp", 150, 206, 210, true, 0.75),
      field("city", "Localitate", "profile.city", 150, 234, 180, true, 0.7),
      field("address", "Strada", "profile.address", 150, 262, 300, true, 0.7),
      field("email", "E-mail", "profile.email", 150, 290, 220, false, 0.7),
      field("phone", "Telefon", "profile.phone", 150, 318, 160, false, 0.7),
      field("vehicle_make", "Marca vehicul", "input.make", 150, 374, 160, true, 0.68),
      field("vehicle_model", "Denumire comerciala", "input.model", 330, 374, 150, true, 0.68),
      field("vin", "Numar identificare/Sasiu", "input.vin", 150, 402, 260, true, 0.7),
      field("date", "Data", "system.today", 150, 690, 120, true, 0.7),
    ],
    required_inputs: [
      { key: "make", label: "Marca vehiculului", placeholder: "Dacia" },
      { key: "model", label: "Model / denumire comerciala", placeholder: "Logan" },
      { key: "vin", label: "Numar identificare / sasiu", placeholder: "VF1..." },
      { key: "fiscal_code", label: "Cod de identificare fiscala", placeholder: "CNP sau CUI" },
    ],
  },
];

function field(
  id: string,
  label: string,
  dataKey: string,
  x: number,
  y: number,
  width: number,
  required: boolean,
  confidence: number,
): PdfAutofillField {
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
    confidence,
    source: "saved",
  };
}

export function demoForms(): PdfForm[] {
  return DEMO_FORMS;
}

export function normalizeForm(row: FormRow): PdfForm {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    mapping: normalizeFields(row.mapping),
    required_inputs: normalizeInputDefinitions(row.required_inputs),
  };
}

export function normalizeFields(raw: unknown): PdfAutofillField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const value = item as Partial<PdfAutofillField>;
      const normalized: PdfAutofillField = {
        id: String(value.id || value.acroFieldName || `field_${index + 1}`),
        label: String(
          value.label || value.acroFieldName || `Camp ${index + 1}`,
        ),
        dataKey: String(
          value.dataKey ||
            guessDataKey(String(value.label || value.acroFieldName || "")),
        ),
        page: Number(value.page ?? 0),
        x: Number(value.x ?? 80),
        y: Number(value.y ?? 140 + index * 28),
        width: Number(value.width ?? 220),
        height: Number(value.height ?? 18),
        value: typeof value.value === "string" ? value.value : undefined,
        required: Boolean(value.required ?? true),
        confidence: Number(value.confidence ?? 0.55),
        source: value.source || "heuristic",
      };
      if (typeof value.value === "string") normalized.value = value.value;
      if (value.acroFieldName) normalized.acroFieldName = value.acroFieldName;
      return normalized;
    })
    .filter((item): item is PdfAutofillField => Boolean(item));
}

function normalizeInputDefinitions(raw: unknown): PdfFormInputDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = item as Partial<PdfFormInputDefinition>;
      if (!value.key || !value.label) return null;
      const normalized: PdfFormInputDefinition = {
        key: String(value.key),
        label: String(value.label),
        required: Boolean(value.required ?? true),
      };
      if (value.placeholder) normalized.placeholder = String(value.placeholder);
      return normalized;
    })
    .filter((item): item is PdfFormInputDefinition => Boolean(item));
}

export async function getPdfBytes(form: PdfForm): Promise<Uint8Array> {
  // ─── Tipizatul branch (Phase 3) ─────────────────────────────
  // For source='tipizatul' rows, the storage_path is pre-set to
  // `tipizatul/<driveFileId>.pdf`. Try the cache (which serves the
  // SDK download path), and on cache miss go to the Drive proxy.
  if (form.source === "tipizatul" && form.drive_file_id) {
    try {
      return await getCachedTipizatulPdf(form.drive_file_id);
    } catch (err) {
      if (err instanceof DriveCredentialsMissingError) {
        console.warn(
          `tipizatul fetch unavailable (no SA creds): ${err.message} — falling back to placeholder`,
        );
        return createPlaceholderPdf(form);
      }
      console.warn(`tipizatul fetch for ${form.drive_file_id} failed:`, err);
      // Fall through to generic storage paths below, which will most likely
      // fail too (file isn't there yet), and eventually placeholder.
    }
  }

  // Attempt 1 — authenticated SDK download (requires real service_role key)
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(form.storage_bucket)
      .download(form.storage_path);

    if (data && !error) {
      console.log(
        `PDF loaded via SDK: ${form.storage_bucket}/${form.storage_path}`,
      );
      return new Uint8Array(await data.arrayBuffer());
    }
    if (error)
      console.warn(
        `SDK download rejected (${error.message}) — trying public URL`,
      );
  } catch (err) {
    console.warn("SDK download threw:", err);
  }

  // Attempt 2 — public URL (works when bucket is set to public in Supabase dashboard)
  try {
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(form.storage_bucket)
      .getPublicUrl(form.storage_path);

    console.log(`Trying public URL: ${publicUrl}`);
    const res = await fetch(publicUrl);
    if (res.ok) {
      console.log(`PDF loaded via public URL: ${publicUrl}`);
      return new Uint8Array(await res.arrayBuffer());
    }
    console.warn(
      `Public URL returned ${res.status} — bucket may not be public`,
    );
  } catch (err) {
    console.warn("Public URL fetch failed:", err);
  }

  // Both attempts failed — generate a placeholder PDF with the form layout
  console.warn(
    `Storage unavailable for ${form.storage_path} — generating placeholder PDF`,
  );
  return createPlaceholderPdf(form);
}

export async function analyzePdf(
  form: PdfForm,
  sourcePdf: Uint8Array,
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {},
): Promise<PdfAutofillField[]> {
  const savedFields = normalizeFields(form.mapping);
  const nativeFields = await extractAcroFields(sourcePdf);
  const baseFields =
    savedFields.length > 0
      ? mergeSavedAndNativeFields(savedFields, nativeFields)
      : nativeFields;
  const fallbackFields =
    baseFields.length > 0 ? baseFields : heuristicFields(form);
  const hydrated = hydrateFieldValues(fallbackFields, profile, inputValues);
  // Phase 6: surface field_type / options / needs_review from fields_raw
  // (tipizatul rows) so the frontend FieldRenderer can pick the right widget.
  return enrichWithTemplateMeta(hydrated, form);
}

/** Merge fields_raw metadata (type, options, hidden) and the trust gate
 *  (acroform_origin) onto the analyzed PdfAutofillFields. No-op for
 *  non-tipizatul forms. */
function enrichWithTemplateMeta(
  fields: PdfAutofillField[],
  form: PdfForm,
): PdfAutofillField[] {
  if (form.source !== "tipizatul") return fields;
  const raw = (form as PdfForm & { fields_raw?: TemplateField[] }).fields_raw ?? [];
  if (raw.length === 0) return fields;
  const byName = new Map(raw.map((f) => [f.pdfFieldName, f] as const));
  const needsReview = form.acroform_origin !== "original";
  return fields.map((field) => {
    const key = field.acroFieldName;
    const tpl = key ? byName.get(key) : undefined;
    if (!tpl) return field;
    return {
      ...field,
      field_type: tpl.type,
      options: tpl.options,
      needs_review: needsReview,
    };
  });
}

/** Replace Romanian (and common accented) characters with ASCII equivalents so
 *  Helvetica/WinAnsi can render them without throwing. */
function latinize(text: string): string {
  return text
    .replace(/[ăĂ]/g, (c) => (c === "ă" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "â" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "î" ? "i" : "I"))
    .replace(/[șşȘŞ]/g, (c) => (/[șş]/.test(c) ? "s" : "S"))
    .replace(/[țţȚŢ]/g, (c) => (/[țţ]/.test(c) ? "t" : "T"))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function fillPdf(
  sourcePdf: Uint8Array,
  fields: PdfAutofillField[],
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {},
  form?: PdfForm,
): Promise<Buffer> {
  // ─── Tipizatul AcroForm path (Phase 4) ─────────────────────────
  // Only routes here when the form row is tipizatul-sourced. Demo /
  // legacy callers (no `form` arg, or source !== 'tipizatul') fall
  // through to the unchanged overlay+latinize path below.
  if (form?.source === "tipizatul") {
    const hydrated = hydrateFieldValues(fields, profile, inputValues);
    const values: FillValueInput[] = hydrated
      .filter((f) => f.acroFieldName && f.value !== undefined && f.value !== "")
      .map((f) => ({ pdfFieldName: f.acroFieldName as string, value: f.value as string }));
    const fieldsRaw = (form as PdfForm & { fields_raw?: TemplateField[] }).fields_raw;
    const result = await fillTipizatulPdf(sourcePdf, values, {
      acroformOrigin: form.acroform_origin ?? null,
      fieldsRaw,
    });
    return Buffer.from(result.pdf);
  }

  const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const hydratedFields = hydrateFieldValues(fields, profile, inputValues);
  const pdfForm = pdf.getForm();

  for (const field of hydratedFields) {
    const value = (field.value ?? "").trim();
    if (!value) continue;

    if (field.acroFieldName) {
      try {
        const textField = pdfForm.getTextField(
          field.acroFieldName,
        ) as PDFTextField;
        textField.setText(latinize(value));
        continue;
      } catch {
        // If the native field cannot be filled, draw an overlay below.
      }
    }

    const page = pdf.getPage(
      Math.max(0, Math.min(field.page, pdf.getPageCount() - 1)),
    );
    const { height } = page.getSize();
    page.drawText(latinize(value), {
      x: field.x,
      y: height - field.y - field.height + 4,
      size: 10,
      font,
      color: rgb(0.05, 0.05, 0.05),
      maxWidth: field.width,
      lineHeight: 12,
    });
  }

  try {
    pdfForm.flatten();
  } catch {
    // Some arbitrary PDFs do not have a valid AcroForm tree.
  }

  return Buffer.from(await pdf.save());
}

export function hydrateFieldValues(
  fields: PdfAutofillField[],
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {},
): PdfAutofillField[] {
  return fields.map((field) => ({
    ...field,
    value:
      inputValues[field.id] ||
      resolveDataKey(field.dataKey, profile, inputValues) ||
      field.value ||
      "",
  }));
}

export function missingInputsForFields(
  fields: PdfAutofillField[],
  requiredInputs: PdfFormInputDefinition[],
): PdfFormInputDefinition[] {
  const known = new Map(requiredInputs.map((input) => [input.key, input]));
  const missing = new Map<string, PdfFormInputDefinition>();

  for (const field of fields) {
    if (!field.required || field.value?.trim()) continue;
    if (!field.dataKey.startsWith("input.")) continue;
    const key = field.dataKey.replace(/^input\./, "");
    missing.set(
      key,
      known.get(key) ?? {
        key,
        label: field.label,
        required: true,
      },
    );
  }

  return [...missing.values()];
}

async function extractAcroFields(
  sourcePdf: Uint8Array,
): Promise<PdfAutofillField[]> {
  try {
    const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
    const fields = pdf.getForm().getFields();
    return fields.map((fieldItem, index) => {
      const name = fieldItem.getName();
      const rect = getFieldRectangle(fieldItem);
      const pageIndex = rect?.page ?? 0;
      return {
        id: safeId(name) || `acro_${index + 1}`,
        label: name,
        dataKey: guessDataKey(name),
        page: pageIndex,
        x: rect?.x ?? 80,
        y: rect?.y ?? 140 + index * 28,
        width: rect?.width ?? 220,
        height: rect?.height ?? 18,
        required: true,
        confidence: 0.72,
        source: "acroform",
        acroFieldName: name,
      };
    });
  } catch {
    return [];
  }
}

function mergeSavedAndNativeFields(
  savedFields: PdfAutofillField[],
  nativeFields: PdfAutofillField[],
): PdfAutofillField[] {
  if (!nativeFields.length) return savedFields;

  const nativeByKey = new Map<string, PdfAutofillField>();
  for (const nativeField of nativeFields) {
    for (const key of fieldMatchKeys(nativeField)) {
      if (!nativeByKey.has(key)) nativeByKey.set(key, nativeField);
    }
  }

  const matchedNativeIds = new Set<string>();
  const merged = savedFields.map((savedField) => {
    const nativeField = fieldMatchKeys(savedField)
      .map((key) => nativeByKey.get(key))
      .find(Boolean);

    if (!nativeField) return savedField;
    matchedNativeIds.add(nativeField.id);

    return {
      ...savedField,
      acroFieldName: savedField.acroFieldName ?? nativeField.acroFieldName,
      page: Number.isFinite(savedField.page)
        ? savedField.page
        : nativeField.page,
      x: Number.isFinite(savedField.x) ? savedField.x : nativeField.x,
      y: Number.isFinite(savedField.y) ? savedField.y : nativeField.y,
      width: Number.isFinite(savedField.width)
        ? savedField.width
        : nativeField.width,
      height: Number.isFinite(savedField.height)
        ? savedField.height
        : nativeField.height,
      source: savedField.source,
    };
  });

  const newNativeFields = nativeFields
    .filter((nativeField) => !matchedNativeIds.has(nativeField.id))
    .map((nativeField) => ({
      ...nativeField,
      dataKey: nativeField.dataKey.startsWith("input.")
        ? nativeField.dataKey
        : `input.${safeId(nativeField.label || nativeField.id) || nativeField.id}`,
      confidence: Math.min(nativeField.confidence, 0.55),
    }));

  return [...merged, ...newNativeFields];
}

function fieldMatchKeys(field: PdfAutofillField): string[] {
  return [field.id, field.label, field.acroFieldName]
    .filter((value): value is string => Boolean(value))
    .map((value) => safeId(value))
    .filter(Boolean);
}

function getFieldRectangle(
  fieldItem: unknown,
): {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  try {
    const acroField = (
      fieldItem as { acroField?: { getWidgets?: () => unknown[] } }
    ).acroField;
    const widget = acroField?.getWidgets?.()[0] as
      | {
          getRectangle?: () => {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          P?: () => unknown;
        }
      | undefined;
    const rect = widget?.getRectangle?.();
    if (!rect) return null;

    return {
      page: 0,
      x: rect.x,
      y: Math.max(0, A4_HEIGHT - rect.y - rect.height),
      width: rect.width,
      height: rect.height,
    };
  } catch {
    return null;
  }
}

function heuristicFields(form: PdfForm): PdfAutofillField[] {
  const labels = [
    ["full_name", "Nume si prenume", "profile.full_name"],
    ["cnp", "CNP", "profile.cnp"],
    ["address", "Adresa", "profile.full_address"],
    ["email", "E-mail", "profile.email"],
    ["phone", "Telefon", "profile.phone"],
    ["date", "Data", "system.today"],
  ] as const;

  return labels.map(([id, label, dataKey], index) => ({
    id,
    label,
    dataKey,
    page: 0,
    x: 145,
    y: 150 + index * 28,
    width: 260,
    height: 18,
    required: index < 3,
    confidence: 0.45,
    source: "heuristic",
  }));
}

function guessDataKey(label: string): string {
  const value = normalize(label);
  if (value.includes("cnp") || value.includes("numeric personal"))
    return "profile.cnp";
  if (value.includes("email") || value.includes("mail")) return "profile.email";
  if (value.includes("telefon") || value.includes("phone"))
    return "profile.phone";
  if (
    value.includes("adresa") ||
    value.includes("domicili") ||
    value.includes("resedint")
  ) {
    return value.includes("solicitat") || value.includes("nou")
      ? "input.new_address"
      : "profile.full_address";
  }
  if (
    value.includes("serie") ||
    (value.includes("numar") && value.includes("ci"))
  )
    return "profile.identity_card";
  if (value.includes("serie")) return "profile.buletin_series";
  if (value.includes("data naster")) return "profile.date_of_birth";
  if (value.includes("data expir")) return "profile.buletin_expiry";
  if (value.includes("oras") || value.includes("localitate"))
    return "profile.city";
  if (value.includes("data")) return "system.today";
  if (value.includes("marca")) return "input.make";
  if (value.includes("model") || value.includes("tip")) return "input.model";
  if (
    value.includes("vin") ||
    value.includes("sasiu") ||
    value.includes("identificare")
  )
    return "input.vin";
  if (value.includes("scop")) return "input.purpose";
  if (
    value.includes("nume") ||
    value.includes("prenume") ||
    value.includes("subsemnat")
  )
    return "profile.full_name";
  return `input.${safeId(label) || "value"}`;
}

export function resolveDataKey(
  dataKey: string,
  profile: Partial<Profile>,
  inputValues: Record<string, string>,
): string {
  if (dataKey === "system.today") return new Date().toLocaleDateString("ro-RO");
  if (dataKey === "profile.full_address") {
    return [profile.address, profile.city].filter(Boolean).join(", ");
  }
  if (dataKey === "profile.identity_card") {
    return [profile.buletin_series, profile.buletin_number]
      .filter(Boolean)
      .join(" ");
  }
  if (dataKey.startsWith("profile.")) {
    const key = dataKey.replace(/^profile\./, "") as keyof Profile;
    const value = profile[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    return "";
  }
  if (dataKey.startsWith("input.")) {
    const key = dataKey.replace(/^input\./, "");
    return inputValues[key] ?? "";
  }
  return inputValues[dataKey] ?? "";
}

async function createPlaceholderPdf(form: PdfForm): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fields = normalizeFields(form.mapping);

  page.drawText(latinize(form.institution), {
    x: 56,
    y: 778,
    size: 10,
    font: regular,
    color: rgb(0.25, 0.25, 0.25),
  });
  page.drawText(latinize(form.title), {
    x: 56,
    y: 742,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });
  page.drawText(
    "Formular demo generat automat cand PDF-ul oficial lipseste din Supabase Storage.",
    {
      x: 56,
      y: 718,
      size: 9,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
    },
  );

  for (const item of fields) {
    page.drawText(latinize(item.label), {
      x: Math.max(56, item.x - 120),
      y: A4_HEIGHT - item.y - item.height + 4,
      size: 9,
      font: regular,
      color: rgb(0.28, 0.28, 0.28),
    });
    page.drawLine({
      start: { x: item.x, y: A4_HEIGHT - item.y - item.height + 2 },
      end: { x: item.x + item.width, y: A4_HEIGHT - item.y - item.height + 2 },
      thickness: 0.7,
      color: rgb(0.65, 0.65, 0.65),
    });
  }

  return pdf.save();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function safeId(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
