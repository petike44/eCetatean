export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

const ENV_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

/** In dev, empty base uses Vite proxy (/api → localhost:3001). In prod, VITE_API_URL is required. */
function getApiBaseUrl(): string {
  if (ENV_API_URL) return ENV_API_URL.replace(/\/$/, "")
  if (import.meta.env.DEV) return ""
  throw new ApiError(
    0,
    "VITE_API_URL nu este configurat — adaugă URL-ul API-ului în frontend/.env.local",
  )
}

function buildFetchError(err: unknown): ApiError {
  const message = err instanceof Error ? err.message : String(err)

  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed")
  ) {
    return new ApiError(
      0,
      "Nu mă pot conecta la server — pornește backend-ul (npm run dev în /backend) și verifică FRONTEND_URL (portul Vite, ex. :8080) în backend/.env.local",
      "NETWORK",
    )
  }

  return new ApiError(
    0,
    `Conexiune eșuată — verifică serverul (${message || "eroare necunoscută"})`,
    "NETWORK",
  )
}

type Envelope<T> = { success: true; data: T } | { success: false; error: string; code?: string };

export type GetToken = () => Promise<string | null>;

async function request<T>(
  path: string,
  init: RequestInit,
  getToken: GetToken,
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (err) {
    throw buildFetchError(err);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/pdf") || contentType.startsWith("application/octet-stream")) {
    if (!response.ok) {
      throw new ApiError(response.status, "Eroare la descărcarea fișierului");
    }
    return (await response.blob()) as unknown as T;
  }

  if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response as unknown as T;
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(response.status, `Răspuns invalid (${response.status})`);
  }

  if (!body || body.success === false) {
    const message = body && "error" in body ? body.error : `Eroare ${response.status}`;
    throw new ApiError(response.status, message, body && "code" in body ? body.code : undefined);
  }

  return body.data;
}

export function apiGet<T>(path: string, getToken: GetToken): Promise<T> {
  return request<T>(path, { method: "GET" }, getToken);
}

export function apiPostJson<T>(path: string, body: unknown, getToken: GetToken): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    getToken,
  );
}

export function apiPostForm<T>(path: string, formData: FormData, getToken: GetToken): Promise<T> {
  return request<T>(path, { method: "POST", body: formData }, getToken);
}

export function apiPatchJson<T>(path: string, body: unknown, getToken: GetToken): Promise<T> {
  return request<T>(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    getToken,
  );
}

export function apiDelete<T>(path: string, getToken: GetToken): Promise<T> {
  return request<T>(path, { method: "DELETE" }, getToken);
}

export function getApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

export async function apiStreamPost(
  path: string,
  body: unknown,
  getToken: GetToken,
): Promise<Response> {
  return request<Response>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
    },
    getToken,
  );
}

export async function downloadPdf(
  formType: string,
  getToken: GetToken,
  additionalData: Record<string, string> = {},
  profile: Record<string, unknown> = {},
): Promise<void> {
  const blob = await apiPostJson<Blob>(
    "/api/pdf/generate",
    { form_type: formType, profile, additional_data: additionalData },
    getToken,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${formType}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAutofilledPdf(
  formId: string,
  fileName: string,
  getToken: GetToken,
  body: unknown,
): Promise<void> {
  const blob = await apiPostJson<Blob>(`/api/forms/${formId}/fill`, body, getToken);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
