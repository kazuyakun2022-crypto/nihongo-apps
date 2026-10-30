import { api } from "@/core/http/apiClient";

export type KamusTab = "kosakata" | "kanji" | "tata_bahasa" | "ungkapan";

/** Satu entri kamus; kolom yang terisi bergantung pada jenisnya. */
export interface KamusEntry {
  id: string;
  type: KamusTab | "gambar";
  /** Kata, karakter kanji, pola tata bahasa, atau ungkapan. */
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
  level: string;
  category: { key: string; title: string } | null;
}

export interface KamusPage {
  items: KamusEntry[];
  total: number;
  /** Entri yang cocok tapi baru terbuka di level berikutnya. */
  lockedCount: number;
  page: number;
  pageSize: number;
  unlockedLevels: { code: string; name: string }[];
  nextLevel: { code: string; name: string } | null;
  categories?: { key: string; label: string }[];
}

export interface KamusGambarCategory {
  key: string;
  title: string;
  titleJa: string | null;
  titleKana: string | null;
  coverUrl: string | null;
  tint: string | null;
  entries: { id: string; term: string; reading: string | null; romaji: string | null; meaning: string; imageUrl: string | null }[];
}

export const kamusApi = {
  search(tab: KamusTab, params: { q?: string; level?: string; kategori?: string; page?: number }) {
    const sp = new URLSearchParams({ tab });
    if (params.q) sp.set("q", params.q);
    if (params.level) sp.set("level", params.level);
    if (params.kategori) sp.set("kategori", params.kategori);
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    return api.get<KamusPage>(`/kamus?${sp.toString()}`);
  },
  gambar: () => api.get<{ categories: KamusGambarCategory[] }>("/kamus/gambar"),
};
