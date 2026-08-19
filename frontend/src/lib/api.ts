const DEFAULT_API_BASE_URL = "http://localhost:8080";

/**
 * Returns the backend's base URL from NEXT_PUBLIC_API_URL, falling back
 * to the local dev default when unset.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

export type HealthStatus =
  | { ok: true; status: string }
  | { ok: false; error: string };

/**
 * Fetches the backend's /healthz endpoint and normalizes both network
 * failures and non-200 responses into a HealthStatus the UI can render
 * without throwing.
 */
export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `backend responded with ${res.status}` };
    }
    const body = (await res.json()) as { status: string };
    return { ok: true, status: body.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
