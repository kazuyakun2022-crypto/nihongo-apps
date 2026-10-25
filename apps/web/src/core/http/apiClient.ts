/**
 * HTTP client bersama. Access token disimpan di memori (bukan localStorage, sesuai dokumen 10.6),
 * refresh token ada di cookie httpOnly. Saat dapat 401, client mencoba refresh sekali lalu mengulang request.
 */
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
const listeners = new Set<(token: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
    listeners.forEach((l) => l(token));
  },
  subscribe(listener: (token: string | null) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

async function refreshAccessToken(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  refreshing ??= fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      tokenStore.set(data.accessToken);
      return true;
    })
    .catch(() => {
      clearTimeout(timeoutId);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; retry?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);

  try {
    const res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers,
      credentials: "include",
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401 && init.retry !== false && !path.startsWith("/auth/")) {
      if (await refreshAccessToken()) return apiRequest<T>(path, { ...init, retry: false });
      tokenStore.set(null);
    }

    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as { error?: { code: string; message: string; details?: unknown } }).error;
      throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Terjadi kesalahan. Coba lagi.", err?.details);
    }
    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus atau server tidak merespons. Silakan coba lagi.", err);
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: body ?? {} }),
  refresh: refreshAccessToken,
};
