import express, { Router, type RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { parseBody } from "../../../shared/http/validate";
import type { AskQuestion } from "../application/AskUseCase";
import type { GroqTranscriber } from "../infrastructure/GroqTranscriber";
import type { GeminiTts } from "../../../shared/infrastructure/geminiTts";
import { synthesizeChildVoice } from "../../../shared/infrastructure/edgeTts";
import { EMOTIONS } from "../domain/emotion";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

export function askRoutes(
  uc: { ask: AskQuestion },
  transcriber: GroqTranscriber | null,
  speaker: GeminiTts | null,
  optionalAuth: RequestHandler,
) {
  const r = Router();

  // POST /api/ask — tidak perlu auth agar guest bisa coba; kalau login, nama akun dipakai di mode suara
  r.post("/", optionalAuth, asyncHandler(async (req, res) => {
    const { question, history, mode } = parseBody(
      z.object({
        question: z.string().trim().min(1, "Pertanyaan tidak boleh kosong.").max(2000),
        history: z.array(messageSchema).max(20).default([]),
        mode: z.enum(["text", "voice"]).default("text"),
      }),
      req.body,
    );

    const { answer, emotion, correction } = await uc.ask.execute(question, history, mode, req.user?.id);
    res.json({ answer, emotion, correction });
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
      const text = await transcriber.transcribe(req.body, req.headers["content-type"] ?? "audio/webm", language);
      res.json({ text });
    }),
  );

  // POST /api/ask/speak — suara karakter Neko-sensei dengan nada sesuai emosi; kalau Gemini gagal/kuota habis, pakai TTS cadangan.
  r.post("/speak", asyncHandler(async (req, res) => {
    const { text, emotion } = parseBody(
      z.object({ text: z.string().trim().min(1).max(2000), emotion: z.enum(EMOTIONS).optional() }),
      req.body,
    );
    res.setHeader("Cache-Control", "no-store");

    if (speaker) {
      try {
        const wav = await speaker.speak(text, emotion);
        res.setHeader("Content-Type", "audio/wav");
        res.send(wav);
        return;
      } catch (err) {
        console.warn("[speak] Gemini TTS gagal, pakai cadangan:", err instanceof Error ? err.message : err);
      }
    }
    const mp3 = await synthesizeChildVoice(text, "nanami", emotion ?? "biasa");
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(mp3);
  }));

  return r;
}
