import { useAuth } from "@/lib/clerk-stub";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  apiGet,
  apiPostJson,
  apiPatchJson,
  apiDelete,
  apiPostForm,
  apiStreamPost,
  downloadAutofilledPdf,
  downloadPdf,
  type GetToken,
} from "./api";

function useGetToken(): GetToken {
  const { getToken } = useAuth();
  return useCallback(() => getToken(), [getToken]);
}

// —— Types matching backend response shapes ————————————————————

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ClaudIAStreamChunk =
  | { type: "text"; content: string }
  | { type: "tool_result"; tool_name: string; result: Record<string, unknown> };

export type ReportCategory =
  | "groapa_asfalt"
  | "iluminat_defect"
  | "gunoi_ilegal"
  | "masina_abandonata"
  | "trotuar_deteriorat"
  | "alt_problema";

export type ReportStatus = "inregistrata" | "in_lucru" | "rezolvata";

export type CivicReport = {
  id: string;
  user_id: string;
  category: ReportCategory;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  reference_number: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

export type SubmitReportResult = {
  reference_number: string;
  status: ReportStatus;
  report: CivicReport;
};

export type AuditActionType =
  | "login"
  | "profile_updated"
  | "vehicle_added"
  | "vehicle_updated"
  | "pdf_generated"
  | "report_submitted"
  | "deadline_added"
  | "chat_session"
  | "civil_servant_access"
  | "life_event_started"
  | "life_event_step_completed"
  | "payment_simulated"
  | "appointment_simulated"
  | "translation_quote_started"
  | "payment_handoff_started"
  | "translation_demo_completed";

export type AuditEntry = {
  id: string;
  user_id: string;
  action: string;
  action_type: AuditActionType;
  data: Record<string, unknown> | null;
  data_hash: string;
  previous_hash: string;
  record_hash: string;
  created_at: string;
};

export type AuditLogResult = {
  entries: AuditEntry[];
  chain_valid: boolean;
  total: number;
};

// —— Hooks ————————————————————————————————————————————————————

export type CitizenProfile = {
  full_name?: string | null;
  cnp?: string | null;
  address?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  buletin_series?: string | null;
  buletin_number?: string | null;
  buletin_expiry?: string | null;
  date_of_birth?: string | null;
};

export type PdfFieldSource = "saved" | "acroform" | "heuristic";

export type PdfFormInputDefinition = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type PdfAutofillField = {
  id: string;
  label: string;
  dataKey: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  required: boolean;
  confidence: number;
  source: PdfFieldSource;
  acroFieldName?: string;
};

export type PdfForm = {
  id: string;
  slug: string;
  title: string;
  institution: string;
  description: string | null;
  category: string;
  tags: string[];
  storage_bucket: string;
  storage_path: string;
  source_url: string | null;
  mapping: PdfAutofillField[];
  required_inputs: PdfFormInputDefinition[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PdfFormAnalyzeResult = {
  form: PdfForm;
  fields: PdfAutofillField[];
  missing_inputs: PdfFormInputDefinition[];
  can_autofill_count: number;
  total_required_count: number;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  published_at: string | null;
  created_at: string;
};

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: () => apiGet<NewsItem[]>("/api/news", async () => null),
  });
}

export function useProfile() {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<CitizenProfile | null>("/api/profile", getToken),
    enabled: !!isSignedIn,
  });
}

export function useUpsertProfile() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CitizenProfile) =>
      apiPostJson<CitizenProfile>("/api/profile", body, getToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useGeneratePdf() {
  const getToken = useGetToken();
  return useMutation({
    mutationFn: async ({
      formType,
      additionalData = {},
      profile: profileOverride,
    }: {
      formType: string;
      additionalData?: Record<string, string>;
      profile?: CitizenProfile | null;
    }) => {
      const catalogSlug = formTypeToCatalogSlug(formType);
      if (catalogSlug) {
        try {
          await downloadAutofilledPdf(catalogSlug, catalogSlug, getToken, {
            additional_data: additionalData,
          });
          return;
        } catch {
          // Keep the legacy generator as a fallback for forms not yet present in the catalog.
        }
      }
      await downloadPdf(formType, getToken, additionalData, profileOverride ?? undefined);
    },
  });
}

export function usePdfForms(query: string) {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());

  return useQuery({
    queryKey: ["pdf-forms", query.trim()],
    queryFn: () =>
      apiGet<PdfForm[]>(`/api/forms/search${params.size ? `?${params}` : ""}`, getToken),
    enabled: !!isSignedIn,
  });
}

export function useAnalyzePdfForm() {
  const getToken = useGetToken();
  return useMutation({
    mutationFn: ({
      formId,
      additionalData = {},
    }: {
      formId: string;
      additionalData?: Record<string, string>;
    }) =>
      apiPostJson<PdfFormAnalyzeResult>(
        `/api/forms/${formId}/analyze`,
        { additional_data: additionalData },
        getToken,
      ),
  });
}

export function useFillPdfForm() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      form,
      additionalData = {},
      fields = [],
    }: {
      form: PdfForm;
      additionalData?: Record<string, string>;
      fields?: PdfAutofillField[];
    }) => {
      await downloadAutofilledPdf(form.slug, form.slug, getToken, {
        additional_data: additionalData,
        fields,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useSavePdfFormMapping() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ form, fields }: { form: PdfForm; fields: PdfAutofillField[] }) =>
      apiPostJson<PdfForm>(`/api/forms/${form.slug}/mapping`, { fields }, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-forms"] });
    },
  });
}

export function useSendChatMessage() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { messages: ChatMessage[]; profile?: CitizenProfile | null }) => {
      const response = await apiStreamPost("/api/claudia", payload, getToken);
      const chunks: ClaudIAStreamChunk[] = [];

      if (!response.body) {
        const text = await response.text();
        if (text) chunks.push({ type: "text", content: text });
        return chunks;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            chunks.push(JSON.parse(trimmed) as ClaudIAStreamChunk);
          } catch {
            // skip non-JSON lines
          }
        }
      }

      const tail = buffer.trim();
      if (tail) {
        try {
          chunks.push(JSON.parse(tail) as ClaudIAStreamChunk);
        } catch {
          // ignore
        }
      }

      return chunks;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export type SubmitReportInput = {
  category: ReportCategory;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  photo?: File;
};

export function useSubmitReport() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitReportInput): Promise<SubmitReportResult> => {
      const fd = new FormData();
      fd.append("category", input.category);
      if (input.description) fd.append("description", input.description);
      if (typeof input.latitude === "number") fd.append("latitude", String(input.latitude));
      if (typeof input.longitude === "number") fd.append("longitude", String(input.longitude));
      if (input.address) fd.append("address", input.address);
      if (input.photo) fd.append("photo", input.photo);
      return apiPostForm<SubmitReportResult>("/api/reports", fd, getToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useReports() {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet<CivicReport[]>("/api/reports", getToken),
    enabled: !!isSignedIn,
  });
}

export function useAuditLog(limit = 50) {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: () => apiGet<AuditLogResult>(`/api/audit?limit=${limit}`, getToken),
    enabled: !!isSignedIn,
  });
}

// —— Life Events ——————————————————————————————————————————————

export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

export type LifeEventStep = {
  order: number;
  title: string;
  office: string;
  address: string;
  hours: string;
  phone: string;
  documents: string[];
  fee: string;
  deadline: string;
  form_type: string | null;
  category?: "docs" | "financial" | "onsite";
  payment_url: string | null;
  tip: string | null;
  online_action?: {
    label: string;
    type: "pdf" | "url" | "payment" | "appointment" | "translation_quote";
    url?: string;
    form_type?: string;
    amount_ron?: number;
    description?: string;
    office?: string;
    slot_hint?: string;
    provider?: "wetranslate" | "ghiseul_drpciv";
    source_language?: string;
    target_language?: string;
    package?: "Economy" | "Optimal" | "Premium";
  };
};

export type LifeEventProgressWithDetails = {
  id: string;
  user_id: string;
  event_type: string;
  event_title: string;
  event_data: Record<string, unknown>;
  steps_status: Record<string, StepStatus>;
  current_step: number;
  total_steps: number;
  is_completed: boolean;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  step_details: LifeEventStep[];
  completion_percentage: number;
  estimated_total_cost: string;
};

export function useLifeEvents() {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["life-events"],
    queryFn: () => apiGet<LifeEventProgressWithDetails[]>("/api/life-events", getToken),
    enabled: !!isSignedIn,
  });
}

export function useLifeEvent(id: string | undefined) {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["life-events", id],
    queryFn: () => apiGet<LifeEventProgressWithDetails>(`/api/life-events/${id}`, getToken),
    enabled: !!isSignedIn && !!id,
  });
}

export function useCreateLifeEvent() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { event_type: string; event_data?: Record<string, unknown> }) =>
      apiPostJson<LifeEventProgressWithDetails>("/api/life-events", body, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["life-events"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useUpdateLifeEventStep() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      stepNumber,
      status,
    }: {
      id: string;
      stepNumber: number;
      status: StepStatus;
    }) =>
      apiPatchJson<LifeEventProgressWithDetails>(
        `/api/life-events/${id}/steps/${stepNumber}`,
        { status },
        getToken,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["life-events", vars.id] });
      qc.invalidateQueries({ queryKey: ["life-events"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

// —— Translation Integrations ————————————————————————————————

export type TranslationPackage = "Economy" | "Optimal" | "Premium";

export type WeTranslateHandoff = {
  provider: "wetranslate";
  mode: "partner_api" | "public_form_fallback";
  redirect_url: string;
  handoff_id: string;
  missing_fields: string[];
  payload_preview: {
    service: string;
    source_language: string;
    target_language: string;
    package: TranslationPackage;
    delivery_method: string;
    customer: {
      name: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    };
    documents: Array<{ name: string; size: number; type: string }>;
    vehicle?: {
      make: string | null;
      model: string | null;
      vin: string | null;
      plate_number: string | null;
    } | null;
  };
};

export type GhiseulDrpcivTaxType =
  | "certificat_inmatriculare"
  | "permis_conducere"
  | "autorizatie_provizorie";

export type GhiseulDrpcivPaymentHandoff = {
  provider: "ghiseul_drpciv";
  mode: "partner_api" | "public_form_fallback";
  redirect_url: string;
  handoff_id: string;
  missing_fields: string[];
  payload_preview: {
    institution: "RAAPPS";
    person_type: "Persoană fizică";
    tax_type: string;
    amount_ron: number;
    payer_cnp: string | null;
    beneficiary_cnp: string | null;
    beneficiary_name: string | null;
    email: string | null;
    confirm_email: string | null;
    captcha_required: true;
  };
};

export type LibreTranslateDemoResult = {
  provider: "libretranslate_demo";
  mode: "libretranslate_api" | "offline_demo_fallback";
  source: string;
  target: string;
  format: "text" | "html";
  alternatives: number;
  translated_text: string;
  detected_language?: {
    confidence?: number;
    language?: string;
  };
  alternative_translations?: string[];
  endpoint_used: string | null;
};

export function useCreateWeTranslateQuote() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      sourceLanguage = "Germană",
      targetLanguage = "Română",
      packageName = "Optimal",
      deliveryMethod = "E-mail",
      vehicleId,
      consent,
    }: {
      files: File[];
      sourceLanguage?: string;
      targetLanguage?: string;
      packageName?: TranslationPackage;
      deliveryMethod?: string;
      vehicleId?: string | null;
      consent: boolean;
    }) => {
      const fd = new FormData();
      fd.set("source_language", sourceLanguage);
      fd.set("target_language", targetLanguage);
      fd.set("package", packageName);
      fd.set("delivery_method", deliveryMethod);
      fd.set("consent", consent ? "true" : "false");
      if (vehicleId) fd.set("vehicle_id", vehicleId);
      for (const file of files) fd.append("documents", file);
      return apiPostForm<WeTranslateHandoff>("/api/integrations/wetranslate/quote", fd, getToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useLibreTranslateDemo() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      q,
      source = "auto",
      target = "ro",
      format = "text",
      alternatives = 3,
    }: {
      q: string;
      source?: string;
      target?: string;
      format?: "text" | "html";
      alternatives?: number;
    }) =>
      apiPostJson<LibreTranslateDemoResult>(
        "/api/integrations/libretranslate/translate",
        {
          q,
          source,
          target,
          format,
          alternatives,
        },
        getToken,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function usePrepareGhiseulDrpcivPayment() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taxType: GhiseulDrpcivTaxType = "certificat_inmatriculare") =>
      apiPostJson<GhiseulDrpcivPaymentHandoff>(
        "/api/integrations/ghiseul/drpciv-tax",
        { tax_type: taxType },
        getToken,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

// —— Vehicles ——————————————————————————————————————————————

export type Vehicle = {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  fuel_type: string | null;
  engine_cc: number | null;
  color: string | null;
  itp_expiry: string | null;
  rca_expiry: string | null;
  created_at?: string;
};

export type VehicleInput = Omit<Vehicle, "id" | "created_at">;

export function useVehicles() {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiGet<Vehicle[]>("/api/vehicles", getToken),
    enabled: !!isSignedIn,
  });
}

export function useAddVehicle() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleInput) => apiPostJson<Vehicle>("/api/vehicles", body, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useUpdateVehicle() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<VehicleInput> & { id: string }) =>
      apiPatchJson<Vehicle>(`/api/vehicles/${id}`, body, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useDeleteVehicle() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/api/vehicles/${id}`, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

// —— EidKit ————————————————————————————————————————————————————

export type EidKitVerificationStatus = {
  verified: boolean;
  configured: boolean;
  demo_enabled: boolean;
  verified_at?: string;
  verification_level?: string;
  scopes?: string[];
  profile_fields?: { cnp?: string };
};

export function useEidKitStatus() {
  const getToken = useGetToken();
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["eidkit-status"],
    queryFn: () => apiGet<EidKitVerificationStatus>("/api/eidkit/status", getToken),
    enabled: !!isSignedIn,
  });
}

export function useStartEidKitVerification() {
  const getToken = useGetToken();
  return useMutation({
    mutationFn: () =>
      apiPostJson<{ redirect_url: string }>("/api/eidkit/start", {}, getToken).then((data) => {
        if (data.redirect_url) window.location.href = data.redirect_url;
      }),
  });
}

export function useDemoEidKitVerification() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPostJson<EidKitVerificationStatus>("/api/eidkit/demo", {}, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eidkit-status"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUnlinkEidKitVerification() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPostJson<void>("/api/eidkit/unlink", {}, getToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eidkit-status"] });
    },
  });
}

// —— PDF Autofill ———————————————————————————————————————————————

export function useAutofillDrpciv() {
  const getToken = useGetToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputValues: Record<string, string>) => {
      await downloadAutofilledPdf("cerere-inmatriculare-drpciv", "cerere_drpciv.pdf", getToken, {
        additional_data: inputValues,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

function formTypeToCatalogSlug(formType: string): string | null {
  const aliases: Record<string, string> = {
    cerere_drpciv: "cerere-inmatriculare-drpciv",
    viza_flotant: "cerere-viza-flotant",
    certificat_fiscal: "cerere-certificat-fiscal",
  };
  return aliases[formType] ?? null;
}
