import { Router, type Request, type Response } from "express";
import { prisma } from "../../../shared/infrastructure/prisma";
import { z } from "zod";

const bannerSchema = z.object({
  title: z.string().min(1, "Judul banner wajib diisi.").max(150),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().min(1, "URL gambar wajib diisi."),
  linkUrl: z.string().min(1, "URL tautan tujuan wajib diisi.").max(500),
  badge: z.string().max(50).optional().nullable(),
  target: z.enum(["_self", "_blank"]).default("_self"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  shadingOpacity: z.number().int().min(0).max(100).default(60),
  shadingPosition: z.enum(["left", "right", "bottom", "full"]).default("left"),
});

/** Rute publik untuk siswa di Beranda (hanya banner yang aktif) */
export function publicBannerRoutes(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const banners = await prisma.banner.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return res.json({ banners });
    } catch (err) {
      console.error("[publicBannerRoutes] Gagal memuat banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal memuat banner." } });
    }
  });

  return router;
}

/** Rute manajemen banner untuk Admin & Super Admin */
export function adminBannerRoutes(): Router {
  const router = Router();

  // Ambil semua banner (aktif maupun tidak)
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const banners = await prisma.banner.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return res.json({ banners });
    } catch (err) {
      console.error("[adminBannerRoutes] Gagal memuat banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal mengambil daftar banner." } });
    }
  });

  // Tambah banner baru
  router.post("/", async (req: Request, res: Response) => {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Data banner tidak valid.";
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: msg } });
    }

    try {
      const created = await prisma.banner.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description || null,
          imageUrl: parsed.data.imageUrl,
          linkUrl: parsed.data.linkUrl,
          badge: parsed.data.badge || null,
          target: parsed.data.target,
          order: parsed.data.order,
          isActive: parsed.data.isActive,
          shadingOpacity: parsed.data.shadingOpacity,
          shadingPosition: parsed.data.shadingPosition,
        },
      });
      return res.status(201).json({ banner: created });
    } catch (err) {
      console.error("[adminBannerRoutes] Gagal membuat banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal menyimpan banner baru." } });
    }
  });

  // Perbarui banner
  router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Data banner tidak valid.";
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: msg } });
    }

    try {
      const updated = await prisma.banner.update({
        where: { id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description || null,
          imageUrl: parsed.data.imageUrl,
          linkUrl: parsed.data.linkUrl,
          badge: parsed.data.badge || null,
          target: parsed.data.target,
          order: parsed.data.order,
          isActive: parsed.data.isActive,
          shadingOpacity: parsed.data.shadingOpacity,
          shadingPosition: parsed.data.shadingPosition,
        },
      });
      return res.json({ banner: updated });
    } catch (err) {
      console.error("[adminBannerRoutes] Gagal memperbarui banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal memperbarui banner." } });
    }
  });

  // Cepat alihkan status aktif / nonaktif
  router.patch("/:id/toggle", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const existing = await prisma.banner.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Banner tidak ditemukan." } });
      }

      const updated = await prisma.banner.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });
      return res.json({ banner: updated });
    } catch (err) {
      console.error("[adminBannerRoutes] Gagal toggle status banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal mengubah status banner." } });
    }
  });

  // Hapus banner
  router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await prisma.banner.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[adminBannerRoutes] Gagal menghapus banner:", err);
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Gagal menghapus banner." } });
    }
  });

  return router;
}

