import { Router } from "express";
import { z } from "zod";
import { Errors } from "../../shared/domain/errors";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { currentUser } from "../../shared/http/auth";
import { parseBody } from "../../shared/http/validate";
import { prisma } from "../../shared/infrastructure/prisma";
import { checkHandwriting } from "./handwritingCheck";

/** Tulis di Buku: periksa foto lembar latihan menulis (dipasang di /api/tulis). */

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const checkBody = z.object({
  // ±3 MB base64; web mengecilkan foto ke sisi terpanjang 1600 px sebelum dikirim
  image: z.string().max(3_000_000).regex(DATA_URL, "Foto tidak valid."),
  script: z.enum(["hiragana", "katakana", "kanji"]),
  chars: z
    .array(
      z.object({
        char: z.string().min(1).max(4),
        reading: z.string().max(40),
        strokes: z.number().int().min(1).max(30).optional(),
        tips: z.array(z.string().max(200)).max(30).optional(),
      }),
    )
    .min(1)
    .max(8),
  /** 4 sudut kisi kotak di foto (skala 0–1): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: z.array(z.tuple([z.number().min(-0.2).max(1.2), z.number().min(-0.2).max(1.2)])).length(4),
});

/**
 * Batas wajar per pengguna supaya kuota Gemini gratis (±500 permintaan/hari per model) tidak habis oleh satu akun:
 * satu pemeriksaan memakai 5 permintaan (3 penjaring + 2 pemeriksa ulang).
 */
const HOURLY_LIMIT = 15;
const recent = new Map<string, number[]>();

function takeQuota(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= HOURLY_LIMIT) throw Errors.quota("Kamu sudah banyak memeriksa tulisan dalam satu jam ini. Istirahat sebentar, lalu coba lagi ya.");
  list.push(now);
  recent.set(userId, list);
}

export function tulisRoutes(geminiApiKey: string) {
  const router = Router();

  router.post(
    "/periksa",
    asyncHandler(async (req, res) => {
      const user = currentUser(req);
      const body = parseBody(checkBody, req.body);
      if (!geminiApiKey) {
        return res.status(503).json({ error: { code: "UNAVAILABLE", message: "Pemeriksaan tulisan belum tersedia di server ini." } });
      }
      takeQuota(user.id);
      const [, mimeType, data] = DATA_URL.exec(body.image)!;
      // Riwayat kesalahan huruf-huruf ini: penjelasan Miu-chan berganti sudut pandang bila kesalahan terulang
      const logs = await prisma.handwritingLog
        .findMany({ where: { userId: user.id, char: { in: body.chars.map((c) => c.char) } }, select: { char: true, issue: true, count: true } })
        .catch(() => []);
      const history = Object.fromEntries(logs.map((l) => [`${l.char}|${l.issue}`, l.count]));
      try {
        const result = await checkHandwriting(geminiApiKey, { mimeType, data }, body.script, body.chars, body.corners, { history });
        if (result.photoOk) {
          await Promise.all(
            result.chars
              .filter((c) => c.issueKey)
              .map((c) =>
                prisma.handwritingLog.upsert({
                  where: { userId_char_issue: { userId: user.id, char: c.char, issue: c.issueKey!.slice(0, 40) } },
                  create: { userId: user.id, char: c.char, issue: c.issueKey!.slice(0, 40) },
                  update: { count: { increment: 1 } },
                }),
              ),
          ).catch((err) => console.error("[tulis/log]", err instanceof Error ? err.message : err));
        }
        res.json(result);
      } catch (err) {
        console.error("[tulis/periksa]", err instanceof Error ? err.message : err);
        res.status(502).json({ error: { code: "CHECK_FAILED", message: "Miu-chan belum bisa membaca fotomu sekarang. Coba lagi sebentar lagi." } });
      }
    }),
  );

  return router;
}
