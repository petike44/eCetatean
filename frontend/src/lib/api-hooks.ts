import { useAuth } from "@/lib/clerk-stub";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiGet, apiPostForm, apiStreamPost, type GetToken } from "./api";

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
  | "civil_servant_access";

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

export function useSendChatMessage() {
  const getToken = useGetToken();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const response = await apiStreamPost("/api/claudia", { messages }, getToken);
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
