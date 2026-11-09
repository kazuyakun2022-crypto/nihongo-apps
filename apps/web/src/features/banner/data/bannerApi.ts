import { api } from "@/core/http/apiClient";
import type { BannerItem, BannerInput } from "../domain/types";

export const bannerApi = {
  // Public (Beranda)
  listActive(): Promise<BannerItem[]> {
    return api.get<{ banners: BannerItem[] }>("/banners").then((r) => r.banners);
  },

  // Admin
  listAll(): Promise<BannerItem[]> {
    return api.get<{ banners: BannerItem[] }>("/admin/banners").then((r) => r.banners);
  },

  create(data: BannerInput): Promise<BannerItem> {
    return api.post<{ banner: BannerItem }>("/admin/banners", data).then((r) => r.banner);
  },

  update(id: string, data: BannerInput): Promise<BannerItem> {
    return api.put<{ banner: BannerItem }>(`/admin/banners/${id}`, data).then((r) => r.banner);
  },

  toggle(id: string): Promise<BannerItem> {
    return api.patch<{ banner: BannerItem }>(`/admin/banners/${id}/toggle`).then((r) => r.banner);
  },

  delete(id: string): Promise<void> {
    return api.delete<{ ok: boolean }>(`/admin/banners/${id}`).then(() => undefined);
  },
};

