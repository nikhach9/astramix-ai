const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_PREFIX = BASE_URL.endsWith("/api/v1") ? "" : "/api/v1";

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.text();
    return body || res.statusText;
  } catch {
    return res.statusText;
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
    throw new Error(`API error (${res.status}): ${await parseErrorBody(res)}`);
  }

  return res.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`);

  if (!res.ok) {
    throw new Error(`API error (${res.status}): ${await parseErrorBody(res)}`);
  }

  return res.json() as Promise<TResponse>;
}
