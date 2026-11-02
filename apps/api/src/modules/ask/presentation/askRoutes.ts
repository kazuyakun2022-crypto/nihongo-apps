import express, { Router, type RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { parseBody } from "../../../shared/http/validate";
import type { AskQuestion } from "../application/AskUseCase";
import type { GroqTranscriber } from "../infrastructure/GroqTranscriber";
import type { GeminiTts } from "../../../shared/infrastructure/geminiTts";
import type { ElevenLabsTts } from "../../../shared/infrastructure/elevenLabsTts";
import type { MixedVoice } from "../../../shared/infrastructure/mixedVoice";
import { synthesizeChildVoice } from "../../../shared/infrastructure/edgeTts";
import { EMOTIONS } from "../domain/emotion";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

export function askRoutes(
  uc: { ask: AskQuestion },
  transcriber: GroqTranscriber | null,
  voices: { mixed: MixedVoice | null; elevenlabs: ElevenLabsTts | null; gemini: GeminiTts | null },
  optionalAuth: RequestHandler,
) {
  const r = Router();

  // POST /api/ask — tidak perlu auth agar guest bisa coba; kalau login, nama, level, dan memori akun ikut dipakai
  r.post("/", optionalAuth, asyncHandler(async (req, res) => {
    const { question, history, mode, transcriptAlt } = parseBody(
      z.object({
        question: z.string().trim().min(1, "Pertanyaan tidak boleh kosong.").max(2000),
        history: z.array(messageSchema).max(20).default([]),
        mode: z.enum(["text", "voice"]).default("text"),
        transcriptAlt: z.string().trim().max(500).optional(),
      }),
      req.body,
    );

    const { answer, emotion, correction, speechRate, speech } = await uc.ask.execute(question, history, mode, req.user?.id, transcriptAlt);
    res.json({ answer, emotion, correction, speechRate, speech });
  }));

  // POST /api/ask/transcribe — body: audio mentah (webm/ogg/mp4), bahasa dideteksi otomatis (?lang=ja untuk memaksa Jepang)
  r.post(
    "/transcribe",
    express.raw({ type: ["audio/*", "video/*", "application/octet-stream"], limit: "10mb" }),
    asyncHandler(async (req, res) => {
      if (!transcriber) {
        res.status(503).json({ error: { code: "STT_UNAVAILABLE", message: "Pengenalan suara belum dikonfigurasi (GROQ_API_KEY kosong)." } });
        return;
      }
      if (!Buffer.isBuffer(req.body) || req.body.length < 1000) {
        res.json({ text: "" });
        return;
      }
      const language = req.query["lang"] === "ja" ? "ja" : undefined;
      const { text, alt } = await transcriber.transcribe(req.body, req.headers["content-type"] ?? "audio/webm", language);
      res.json({ text, alt });
    }),
  );

  // POST /api/ask/speak — suara karakter Miu-chan dengan nada sesuai emosi. Urutan mesin: VOICEVOX (bagian Jepang) +
  // ElevenLabs (bagian Indonesia) → ElevenLabs saja → Gemini TTS → Edge TTS
  // (cadangan, suara berbeda); yang gagal/kuota habis dilewati. Mesin yang dipakai dikirim di header X-Voice-Engine.
  // `engine` = mulai dari mesin tertentu, supaya potongan kedua jawaban bersuara sama dengan potongan pertama.
  // `text` boleh bertanda <pelan>/<cepat>; `rate` = kecepatan bicara level user.
  r.post("/speak", asyncHandler(async (req, res) => {
    const { text, emotion, rate, engine } = parseBody(
      z.object({
        text: z.string().trim().min(1).max(2000),
        emotion: z.enum(EMOTIONS).optional(),
        rate: z.number().min(0.5).max(1.5).default(1),
        engine: z.enum(["auto", "voicevox", "elevenlabs", "gemini", "edge"]).default("auto"),
      }),
      req.body,
    );
    res.setHeader("Cache-Control", "no-store");

    const chain = [
      { name: "voicevox", tts: voices.mixed },
      { name: "elevenlabs", tts: voices.elevenlabs },
      { name: "gemini", tts: voices.gemini },
    ] as const;
    const from = engine === "auto" ? 0 : engine === "edge" ? chain.length : chain.findIndex((e) => e.name === engine);
    for (const { name, tts } of chain.slice(from)) {
      if (!tts) continue;
      try {
        const wav = await tts.speak(text, emotion, rate);
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("X-Voice-Engine", name);
        // Kredit wajib VOICEVOX ("VOICEVOX:<karakter>"), ditampilkan web di bawah percakapan
        if (name === "voicevox" && voices.mixed) {
          const credit = await voices.mixed.credit().catch(() => "VOICEVOX");
          res.setHeader("X-Voice-Credit", encodeURIComponent(credit));
          if (voices.mixed.lastIndonesian.length) res.setHeader("X-Voice-Indonesian", voices.mixed.lastIndonesian.join(","));
        }
        res.send(wav);
        return;
      } catch (err) {
        console.warn(`[speak] ${name} gagal, coba mesin berikutnya:`, err instanceof Error ? err.message : err);
      }
    }
    const mp3 = await synthesizeChildVoice(text, "nanami", emotion ?? "biasa", rate);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-Voice-Engine", "edge");
    res.send(mp3);
  }));

  return r;
}
