import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { currentUser } from "../../shared/http/auth";
import { parseBody } from "../../shared/http/validate";
import { issueHistory, logIssues, takeCheckQuota } from "./checkUsage";
import { checkHandwriting } from "./handwritingCheck";

/** Tulis di Buku: periksa foto lembar latihan menulis (dipasang di /api/tulis). */

export const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Foto (±3 MB base64; web mengecilkan foto ke sisi terpanjang 1600 px sebelum dikirim). */
export const photoSchema = z.string().max(3_000_000).regex(DATA_URL, "Foto tidak valid.");

/** 4 sudut kisi kotak di foto (skala 0–1): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
export const cornersSchema = z.array(z.tuple([z.number().min(-0.2).max(1.2), z.number().min(-0.2).max(1.2)])).length(4);

const checkBody = z.object({
  image: photoSchema,
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
  corners: cornersSchema,
});

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
      takeCheckQuota(user.id);
      const [, mimeType, data] = DATA_URL.exec(body.image)!;
      const history = await issueHistory(user.id, body.chars.map((c) => c.char));
      try {
        const result = await checkHandwriting(geminiApiKey, { mimeType, data }, body.script, body.chars, body.corners, { history });
        await logIssues(user.id, result);
        res.json(result);
      } catch (err) {
        console.error("[tulis/periksa]", err instanceof Error ? err.message : err);
        res.status(502).json({ error: { code: "CHECK_FAILED", message: "Miu-chan belum bisa membaca fotomu sekarang. Coba lagi sebentar lagi." } });
      }
    }),
  );

  return router;
}
