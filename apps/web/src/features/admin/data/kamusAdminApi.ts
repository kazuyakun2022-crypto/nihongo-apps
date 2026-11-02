import { apiRequest } from "@/core/http/apiClient";

export type KamusType = "gambar" | "kosakata" | "kanji" | "tata_bahasa" | "ungkapan";
export type KamusStatus = "published" | "draft";
export type KamusCategoryType = "gambar" | "ungkapan";

export interface KamusAdminEntry {
  id: string;
  type: KamusType;
  levelId: number;
  categoryId: string | null;
  term: string;
  reading: string | null;
  romaji: string | null;
  meaning: string;
  onyomi: string | null;
  kunyomi: string | null;
  explanation: string | null;
  note: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  imageUrl: string | null;
  status: KamusStatus;
  sortOrder: number;
  sourceKey: string | null;
  updatedAt: string;
  level: { code: string };
  category: { title: string } | null;
}

export type KamusEntryInput = Omit<KamusAdminEntry, "id" | "sourceKey" | "updatedAt" | "level" | "category">;

export interface KamusAdminCategory {
  id: string;
  type: KamusCategoryType;
  key: string;
  title: string;
  titleJa: string | null;
  titleKana: string | null;
  coverUrl: string | null;
  tint: string | null;
  sortOrder: number;
  _count: { entries: number };
  draftCount: number;
  /** Gambar entri pertama, untuk sampul kartu bila coverUrl kosong. */
  sampleImage: string | null;
}

export type KamusCategoryInput = Omit<KamusAdminCategory, "id" | "_count" | "draftCount" | "sampleImage">;

const base = "/admin/kamus";
const json = (method: string, body?: unknown) => ({ method, body }) as const;

export const kamusAdminApi = {
  summary: () => apiRequest<{ summary: Record<KamusType, Record<KamusStatus, number>> }>(`${base}/summary`),
  /** `categoryId: "none"` = entri tanpa kategori. */
  entries: (params: { type: KamusType; levelId?: number; categoryId?: string; status?: KamusStatus; q?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams({ type: params.type });
    if (params.levelId) sp.set("levelId", String(params.levelId));
    if (params.categoryId) sp.set("categoryId", params.categoryId);
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    return apiRequest<{ entries: KamusAdminEntry[]; total: number; page: number; pageSize: number }>(`${base}/entries?${sp.toString()}`);
  },
  createEntry: (data: KamusEntryInput) => apiRequest<{ entry: KamusAdminEntry }>(`${base}/entries`, json("POST", data)),
  updateEntry: (id: string, data: Partial<KamusEntryInput>) => apiRequest<{ entry: KamusAdminEntry }>(`${base}/entries/${id}`, json("PATCH", data)),
  deleteEntry: (id: string) => apiRequest(`${base}/entries/${id}`, json("DELETE")),
  sync: () => apiRequest<{ added: { kosakata: number; kanji: number; tata_bahasa: number } }>(`${base}/sync`, json("POST")),
  categories: (type?: KamusCategoryType) => apiRequest<{ categories: KamusAdminCategory[]; uncategorized: number }>(`${base}/categories${type ? `?type=${type}` : ""}`),
  createCategory: (data: KamusCategoryInput) => apiRequest<{ category: KamusAdminCategory }>(`${base}/categories`, json("POST", data)),
  updateCategory: (id: string, data: Partial<KamusCategoryInput>) => apiRequest(`${base}/categories/${id}`, json("PATCH", data)),
  deleteCategory: (id: string) => apiRequest(`${base}/categories/${id}`, json("DELETE")),
};
