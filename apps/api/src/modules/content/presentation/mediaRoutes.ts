import express, { Router } from "express";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { prisma } from "../../../shared/infrastructure/prisma";

/** Gambar dikompres di browser admin sebelum diunggah; batas ini hanya pagar pengaman. */
const MAX_BYTES = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Jenis gambar ditentukan dari isi berkas, bukan header klien. SVG sengaja tidak diterima (bisa memuat skrip). */
function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  return null;
}

export const mediaUrl = (id: string) => `/api/media/${id}`;

/** POST /api/admin/media — badan permintaan berupa byte gambar mentah. */
export function adminMediaRoutes() {
  const r = Router();
  r.post(
    "/",
    express.raw({ type: "image/*", limit: MAX_BYTES }),
    asyncHandler(async (req, res) => {
      const data = Buffer.isBuffer(req.body) ? req.body : null;
      if (!data || data.length === 0) throw Errors.validation("Berkas gambar kosong.");
      const mimeType = sniffImage(data);
      if (!mimeType) throw Errors.validation("Format gambar harus WebP, PNG, JPEG, atau GIF.");
      const asset = await prisma.mediaAsset.create({
        data: { mimeType, data, sizeBytes: data.length, createdById: req.user?.id },
        select: { id: true },
      });
      res.status(201).json({ id: asset.id, url: mediaUrl(asset.id) });
    }),
  );
  return r;
}

/** GET /api/media/:id — publik; isi tidak pernah berubah, jadi boleh di-cache selamanya. */
export function publicMediaRoutes() {
  const r = Router();
  r.get(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!UUID.test(req.params.id)) throw Errors.notFound("Gambar");
      const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id }, select: { mimeType: true, data: true } });
      if (!asset) throw Errors.notFound("Gambar");
      res.setHeader("Content-Type", asset.mimeType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(Buffer.from(asset.data));
    }),
  );
  return r;
}
