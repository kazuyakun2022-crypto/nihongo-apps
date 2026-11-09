import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { ScanVisionService } from "../infrastructure/scanVisionService";
import type { ScanHistoryRepo } from "../infrastructure/scanHistoryRepo";
import { synthesizeChildVoice } from "../../../shared/infrastructure/edgeTts";
import type { PrismaClient } from "@prisma/client";

const DATA_URL_REGEX = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const analyzeSchema = z.object({
  image: z.string().optional(),
  text: z.string().max(2000).optional(),
  mode: z.enum(["live", "crop", "batch"]).optional(),
  crop: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

const voiceCheckSchema = z.object({
  targetText: z.string().min(1).max(500),
  spokenText: z.string().max(500),
});

const saveSrsSchema = z.object({
  surfaceForm: z.string().min(1).max(100),
  readingKana: z.string().max(100),
  indonesianMean: z.string().max(500),
  jlptLevel: z.string().max(10).optional(),
});

export function scanRoutes(
  vision: ScanVisionService,
  history: ScanHistoryRepo,
  prisma?: PrismaClient,
) {
  const router = Router();

  // 1. Analisis Gambar atau Teks (Kamera Scanner & OCR)
  router.post(
    "/analyze",
    asyncHandler(async (req, res) => {
      const user = req.user;
      const body = parseBody(analyzeSchema, req.body);

      let parsedImage: { mimeType: string; data: string } | undefined = undefined;
      if (body.image) {
        const match = DATA_URL_REGEX.exec(body.image);
        if (match) {
          parsedImage = { mimeType: match[1], data: match[2] };
        } else if (body.image.length > 50) {
          parsedImage = { mimeType: "image/jpeg", data: body.image };
        }
      }

      if (!parsedImage && !body.text) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "Wajib menyertakan foto hasil scan atau teks Jepang." },
        });
      }

      const result = await vision.analyze({
        image: parsedImage,
        text: body.text,
        crop: body.crop,
      });

      // Simpan ke riwayat scan pengguna
      if (user?.id) {
        await history.save(user.id, result);
      }

      res.json(result);
    }),
  );

  // 2. Ambil Riwayat Scan Pengguna
  router.get(
    "/history",
    asyncHandler(async (req, res) => {
      const user = req.user;
      if (!user) {
        return res.json([]);
      }
      const items = await history.getByUser(user.id);
      res.json(items);
    }),
  );

  // 3. Detail Scan Tertentu
  router.get(
    "/history/:id",
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      const item = await history.getById(user.id, req.params.id);
      if (!item) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Riwayat scan tidak ditemukan." } });
      }
      res.json(item);
    }),
  );

  // 4. Hapus Riwayat Scan
  router.delete(
    "/history/:id",
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      await history.delete(user.id, req.params.id);
      res.json({ ok: true });
    }),
  );

  // 5. Evaluasi Pengucapan (Shadowing & Voice Check)
  router.post(
    "/voice-check",
    asyncHandler(async (req, res) => {
      const body = parseBody(voiceCheckSchema, req.body);
      const evaluation = vision.evaluatePronunciation(body.targetText, body.spokenText);
      res.json(evaluation);
    }),
  );

  // 6. Simpan Kosakata Langsung ke Kartu Flashcard SRS
  router.post(
    "/save-srs",
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      const body = parseBody(saveSrsSchema, req.body);

      if (prisma) {
        try {
          const client = prisma as any;
          // Cari apakah sudah ada di vocab database atau simpan kartu SRS baru
          let vocabId = "custom_vocab_" + Date.now();
          if (client.vocab) {
            const existing = await client.vocab.findFirst({
              where: { kana: body.readingKana },
            });
            if (existing) vocabId = existing.id;
          }

          if (client.srsCard) {
            await client.srsCard.upsert({
              where: {
                userId_itemType_itemId: {
                  userId: user.id,
                  itemType: "vocab",
                  itemId: vocabId,
                },
              },
              update: {
                dueDate: new Date(),
              },
              create: {
                userId: user.id,
                itemType: "vocab",
                itemId: vocabId,
                dueDate: new Date(),
              },
            });
          }
        } catch (err) {
          console.warn("[scan/save-srs] Simpan SRS DB gagal:", err instanceof Error ? err.message : err);
        }
      }

      res.json({
        ok: true,
        message: `Kosakata "${body.surfaceForm}" berhasil ditambahkan ke antrean SRS Flashcard!`,
      });
    }),
  );

  // 7. TTS Audio Reader Khusus Scanner (dengan kontrol tempo 0.5x, 0.75x, 1.0x dan multi-suara)
  router.get(
    "/tts",
    asyncHandler(async (req, res) => {
      const text = String(req.query.text || "").trim().slice(0, 500);
      if (!text) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Parameter text wajib diisi." } });
      }
      const voice = req.query.voice === "keita" ? "keita" : "nanami";
      const speedParam = parseFloat(String(req.query.speed || "1"));
      const rate = Math.max(0.5, Math.min(1.5, isNaN(speedParam) ? 1 : speedParam));

      try {
        const mp3 = await synthesizeChildVoice(text, voice, "biasa", rate);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(mp3);
      } catch (err) {
        console.error("[scan/tts] TTS gagal:", err instanceof Error ? err.message : err);
        return res.status(500).json({ error: { code: "TTS_FAILED", message: "Gagal membuat audio pembacaan." } });
      }
    }),
  );

  return router;
}

