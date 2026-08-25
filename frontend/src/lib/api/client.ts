const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_PREFIX = BASE_URL.endsWith("/api/v1") ? "" : "/api/v1";

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
  body: TBody
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleResponseError(res);
  }

  return res.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`);

  if (!res.ok) {
    await handleResponseError(res);
  }

  return res.json() as Promise<TResponse>;
}
