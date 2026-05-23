const BASE_URL = import.meta.env.VITE_API_URL as string | undefined;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { success: true; data: T } | { success: false; error: string; code?: string };

export type GetToken = () => Promise<string | null>;

async function request<T>(
  path: string,
  init: RequestInit,
  getToken: GetToken,
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "VITE_API_URL nu este configurat");
  }

  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Conexiune eșuată — verifică serverul");
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
