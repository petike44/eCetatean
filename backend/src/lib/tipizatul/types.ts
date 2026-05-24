// Interop schema for tipizatul.eu (MIT — https://github.com/iamandiradu/tipizatul.eu).
// Mirrors src/types/template.ts upstream so JSON received from Firestore /
// procedures.json deserialises directly into these shapes.
//
// Verified-live additions vs upstream TS:
//   - TemplateField.detectorConfidence?: number  (present on 'generated'
//     acroForms, used to rank trust in auto-detected labels)

export type TemplateFieldType =
  | 'text'
  | 'checkbox'
  | 'dropdown'
  | 'radio'
  | 'unsupported'

export interface TemplateFieldValidation {
  pattern?: string
  min?: number
  max?: number
  customMessage?: string
}

export interface TemplateField {
  pdfFieldName: string
  type: TemplateFieldType
  label: string
  placeholder?: string
  hint?: string
  group?: string
  order?: number
  isRequired: boolean
  isMultiline?: boolean
  maxLength?: number
  options?: string[]
  validation?: TemplateFieldValidation
  hidden?: boolean
  /** Present on acroFormOrigin='generated' rows. 0..1. Not in upstream TS. */
  detectorConfidence?: number
}

export type AcroFormOrigin = 'original' | 'generated'

export interface Template {
  id: string
  name: string
  description?: string
  category?: string
  organization?: string
  county?: string         // full Romanian name e.g. 'Cluj', or undefined for national
  procedure?: string
  procedureId?: string
  eDirectDocId?: string
  version: number
  createdAt: string | number
  fields: TemplateField[]
  archived?: boolean
  driveFileId: string
  originalDriveFileId?: string
  acroFormOrigin?: AcroFormOrigin
  voteCount?: number
}

/** Slim row shipped in the gzipped `catalog/index` bundle. */
export interface SlimTemplate {
  id: string
  name: string
  category?: string
  organization?: string
  county?: string
  procedure?: string
  procedureId?: string
  eDirectDocId?: string
  driveFileId: string
  acroFormOrigin?: AcroFormOrigin
  voteCount?: number
  version: number
}

export interface CatalogIndex {
  encoding: 'gzip+json'
  /** base64-encoded gzipped JSON of SlimTemplate[]. */
  compressed: string
  generatedAt: string | number
}

// ─── Procedures (procedures.json) ────────────────────────────────

export interface ProcedureDocument {
  nr?: number
  name: string
  required?: boolean
  eSignature?: boolean
  type?: string
  downloadUrl?: string
  eDirectDocId?: string
}

export interface ProcedureOutputDocument {
  name: string
  type?: string
  downloadUrl?: string
}

export interface ProcedureLaw {
  name: string
  url?: string
}

export interface ProcedureFields {
  descriere?: string
  taxe?: string
  timpSolutionare?: string
  caiDeAtac?: string
  institutiaResponsabila?: string
  // upstream feed adds more keys ad-hoc — keep open
  [key: string]: string | undefined
}

export interface Procedure {
  procedureId: string
  title: string
  institution?: string
  county?: string
  city?: string
  informational: boolean
  fields: ProcedureFields
  documents: ProcedureDocument[]
  outputDocuments?: ProcedureOutputDocument[]
  laws?: ProcedureLaw[]
}

export interface ProceduresFeed {
  builtAt: string | number
  total: number
  procedures: Record<string, Procedure>
}
