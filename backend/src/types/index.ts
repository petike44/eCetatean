// —— Auth ——————————————————————————————————————————————————————

export interface ClerkPayload {
  sub: string
  email?: string
  role?: 'citizen' | 'civil_servant'
  exp: number
  iat: number
}

// —— Civic Profile —————————————————————————————————————————————

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  cnp: string | null
  date_of_birth: string | null
  buletin_series: string | null
  buletin_number: string | null
  buletin_expiry: string | null
  address: string | null
  city: string
  phone: string | null
  email: string | null
  language: 'ro' | 'hu'
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  user_id: string
  plate_number: string
  make: string | null
  model: string | null
  year: number | null
  engine_cc: number | null
  fuel_type: string | null
  color: string | null
  vin: string | null
  itp_expiry: string | null
  rca_expiry: string | null
  rca_insurer: string | null
  rca_policy_number: string | null
  impozit_amount: number | null
  impozit_paid_until: string | null
  created_at: string
}

// —— Audit Log —————————————————————————————————————————————————

export type AuditActionType =
  | 'login'
  | 'profile_updated'
  | 'vehicle_added'
  | 'vehicle_updated'
  | 'pdf_generated'
  | 'report_submitted'
  | 'deadline_added'
  | 'chat_session'
  | 'civil_servant_access'
  | 'life_event_started'
  | 'life_event_step_completed'
  | 'payment_simulated'
  | 'appointment_simulated'

export interface AuditEntry {
  id: string
  user_id: string
  action: string
  action_type: AuditActionType
  data: Record<string, unknown> | null
  data_hash: string
  previous_hash: string
  record_hash: string
  created_at: string
}

// —— Civic Reports —————————————————————————————————————————————

export type ReportCategory =
  | 'groapa_asfalt'
  | 'iluminat_defect'
  | 'gunoi_ilegal'
  | 'masina_abandonata'
  | 'trotuar_deteriorat'
  | 'alt_problema'

export type ReportStatus = 'inregistrata' | 'in_lucru' | 'rezolvata'

export interface CivicReport {
  id: string
  user_id: string
  category: ReportCategory
  description: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  photo_url: string | null
  reference_number: string
  status: ReportStatus
  created_at: string
  updated_at: string
}

// —— Life Events / Knowledge Base ——————————————————————————————

export interface LifeEventStep {
  order: number
  title: string
  office: string
  address: string
  hours: string
  phone: string
  documents: string[]
  fee: string
  deadline: string
  form_type: string | null
  category?: 'docs' | 'financial' | 'onsite'
  payment_url: string | null
  tip: string | null
  online_action?: {
    label: string
    type: 'pdf' | 'url' | 'payment' | 'appointment'
    url?: string
    form_type?: FormType
    amount_ron?: number
    description?: string
    office?: string
    slot_hint?: string
  }
}

export interface LifeEventProcedure {
  event_type: string
  title: string
  emoji: string
  summary: string
  total_estimated_time: string
  steps: LifeEventStep[]
}

export interface OfficeInfo {
  name: string
  address: string
  hours: string
  phone: string
  notes: string | null
}

// —— PDF ———————————————————————————————————————————————————————

export type FormType =
  | 'sale_contract'
  | 'transcription'
  | 'impozit_auto'
  | 'viza_flotant'
  | 'doctor_transfer'
  | 'scholarship_certificate'
  | 'anaf_tva_certificate_request'
  | 'anaf_tva_certificate'
  | 'cerere_drpciv'

export interface PDFGenerationRequest {
  form_type: FormType
  profile: Partial<Profile>
  additional_data?: Record<string, string>
}

export type PdfFieldSource = 'saved' | 'acroform' | 'heuristic'

export interface PdfFormInputDefinition {
  key: string
  label: string
  placeholder?: string
  required?: boolean
}

export interface PdfAutofillField {
  id: string
  label: string
  dataKey: string
  page: number
  x: number
  y: number
  width: number
  height: number
  value?: string
  required: boolean
  confidence: number
  source: PdfFieldSource
  acroFieldName?: string
}

export interface PdfForm {
  id: string
  slug: string
  title: string
  institution: string
  description: string | null
  category: string
  tags: string[]
  storage_bucket: string
  storage_path: string
  source_url: string | null
  mapping: PdfAutofillField[]
  required_inputs: PdfFormInputDefinition[]
  is_active: boolean
  created_at: string
  updated_at: string
  // ─── Tipizatul (Phase 1/3) ───
  source?: 'manual' | 'tipizatul'
  drive_file_id?: string | null
  acroform_origin?: 'original' | 'generated' | null
}

export interface PdfFormAnalyzeResult {
  form: PdfForm
  fields: PdfAutofillField[]
  missing_inputs: PdfFormInputDefinition[]
  can_autofill_count: number
  total_required_count: number
}

// —— ClaudIA Chat ——————————————————————————————————————————————

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudIARequest {
  messages: ChatMessage[]
  profile?: Partial<Profile>
  vehicles?: Vehicle[]
}

// —— Life Event Progress ———————————————————————————————————————

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface LifeEventProgress {
  id: string
  user_id: string
  event_type: string
  event_title: string
  event_data: Record<string, unknown>
  steps_status: Record<string, StepStatus>
  current_step: number
  total_steps: number
  is_completed: boolean
  started_at: string
  updated_at: string
  completed_at: string | null
}

export interface LifeEventProgressWithDetails extends LifeEventProgress {
  step_details: LifeEventStep[]
  completion_percentage: number
  estimated_total_cost: string
}

// —— API Responses —————————————————————————————————————————————

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
