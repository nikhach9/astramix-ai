/**
 * Central API URL resolver for AstraMix AI.
 * 
 * Guarantees:
 * 1. Default to same-origin relative `/api/v1` for cPanel static hosting.
 * 2. Never falls back to localhost:8000 in production.
 * 3. Never duplicates `/api/v1` even if the caller supplies `/api/v1/...` or `/...`.
 * 4. Respects `NEXT_PUBLIC_API_BASE_URL` when explicitly configured.
 */
export function resolveApiEndpoint(path: string): string {
  let cleanPath = (path || "").trim();
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  // Strip leading /api/v1 or /api to prevent duplication
  if (cleanPath.startsWith("/api/v1/")) {
    cleanPath = cleanPath.substring(7);
  } else if (cleanPath === "/api/v1") {
    cleanPath = "";
  } else if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.substring(4);
  }

  const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");

  if (rawBase) {
    const trimmedBase = rawBase.replace(/\/api(\/v1)?\/?$/, "");
    return `${trimmedBase}/api/v1${cleanPath}`;
  }

  return `/api/v1${cleanPath}`;
}

export class ApiError extends Error {
  status: number;
  details?: any;
  fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    details?: any,
    fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

function snakeToCamel(str: string): string {
  if (str === "age") return "ageDays";
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function handleResponseError(res: Response): Promise<never> {
  let text = "";
  try {
    text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const fieldErrors: Record<string, string> = {};
    const detailsPayload = json?.detail ?? json?.details;

    if (Array.isArray(detailsPayload)) {
      for (const err of detailsPayload) {
        if (err.loc && Array.isArray(err.loc)) {
          const fieldName = String(err.loc[err.loc.length - 1]);
          if (fieldName && err.msg) {
            const camelKey = snakeToCamel(fieldName);
            fieldErrors[camelKey] = err.msg;
            fieldErrors[fieldName] = err.msg;
          }
        }
      }
    }

    const mainMsg =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.detail === "string" && json.detail) ||
      (typeof json?.error === "string" && json.error) ||
      `API Error (HTTP ${res.status}): Request validation failed.`;

    throw new ApiError(res.status, mainMsg, detailsPayload, fieldErrors);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      res.status,
      `API Error (HTTP ${res.status}): ${res.statusText}`
    );
  }
}

export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options?: RequestInit
): Promise<TResponse> {
  const url = resolveApiEndpoint(path);
  const res = await fetch(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleResponseError(res);
  }

  return res.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(
  path: string,
  options?: RequestInit
): Promise<TResponse> {
  const url = resolveApiEndpoint(path);
  const res = await fetch(url, options);

  if (!res.ok) {
    await handleResponseError(res);
  }

  return res.json() as Promise<TResponse>;
}
