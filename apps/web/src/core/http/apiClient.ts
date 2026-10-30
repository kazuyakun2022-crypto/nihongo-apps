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
let refreshing: Promise<{ accessToken: string } | null> | null = null;
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

/**
 * Menukar refresh token (cookie) dengan access token baru. Server memutar refresh token setiap kali dipakai,
 * jadi semua pemanggil (pemulihan sesi saat halaman dibuka dan retry setelah 401) harus berbagi satu
 * permintaan; dua permintaan dengan cookie lama membuat yang kedua ditolak dan user ter-logout.
 */
export function refreshSession<T extends { accessToken: string }>(): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const base = getApiBase();

  refreshing ??= fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      tokenStore.set(data.accessToken);
      return data;
    })
    .catch(() => {
      clearTimeout(timeoutId);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing as Promise<T | null>;
}

async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSession()) !== null;
}

function getApiBase(): string {
  if (typeof window !== "undefined") {
    const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envBase) return envBase.replace(/\/$/, "");
  }
  return "";
}

export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; retry?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}/api${path}`;

  try {
    const res = await fetch(url, {
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

/** Unggah berkas biner (mis. gambar) apa adanya; content-type mengikuti berkas. */
export async function apiUpload<T>(path: string, file: Blob, retry = true): Promise<T> {
  const headers: Record<string, string> = { "content-type": file.type || "application/octet-stream" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/api${path}`, { method: "POST", headers, credentials: "include", body: file });
  } catch (err) {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus saat mengunggah. Silakan coba lagi.", err);
  }
  if (res.status === 401 && retry && (await refreshAccessToken())) return apiUpload<T>(path, file, false);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string } }).error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? (res.status === 413 ? "Gambar terlalu besar." : "Gagal mengunggah."));
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: body ?? {} }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "DELETE", body }),
  refresh: refreshAccessToken,
};
