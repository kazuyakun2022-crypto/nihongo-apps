import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { Env } from "../shared/config/env";
import { errorHandler } from "../shared/http/errorHandler";
import { optionalAuth, requireAuth, requireRole } from "../shared/http/auth";
import type { Container } from "./container";
import { authRoutes } from "../modules/auth/presentation/authRoutes";
import { learningRoutes } from "../modules/learning/presentation/learningRoutes";
import { srsRoutes } from "../modules/srs/presentation/srsRoutes";
import { conversationRoutes } from "../modules/conversation/presentation/conversationRoutes";
import { adminUserRoutes } from "../modules/users/presentation/adminUserRoutes";
import { learnerMonitorRoutes } from "../modules/monitoring/learnerMonitorRoutes";
import { levelExamRoutes } from "../modules/exam/presentation/levelExamRoutes";
import { masteryGateRoutes } from "../modules/exam/presentation/masteryGateRoutes";
import { askRoutes } from "../modules/ask/presentation/askRoutes";
import { contentAdminRoutes } from "../modules/content/presentation/contentAdminRoutes";
import { adminMediaRoutes, publicMediaRoutes } from "../modules/content/presentation/mediaRoutes";
import { kamusRoutes } from "../modules/content/presentation/kamusRoutes";
import { kamusAdminRoutes } from "../modules/content/presentation/kamusAdminRoutes";
import { tulisRoutes } from "../modules/tulis/tulisRoutes";
import { pronunciationAudio } from "../shared/infrastructure/pronunciationAudio";
import { prisma } from "../shared/infrastructure/prisma";

export function createApp(env: Env, c: Container) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  const allowedOrigins = Array.from(
    new Set([
      env.WEB_ORIGIN,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.NGROK_WEB_ORIGIN,
      process.env.PUBLIC_WEB_ORIGIN,
    ].filter((o): o is string => Boolean(o))),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (/\.ngrok(-free)?\.app$/.test(origin) || /\.ngrok\.io$/.test(origin)) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        return callback(null, true);
      },
      credentials: true,
    }),
  );
  // Foto lembar tulisan butuh batas lebih besar; dipasang lebih dulu sehingga parser umum di bawah melewatinya
  app.use("/api/tulis", express.json({ limit: "3mb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true, ai: c.aiMode }));

  // Audio pelafalan (huruf, kosakata, contoh kalimat). Disimpan permanen di tts_cache dan boleh di-cache
  // browser/CDN, karena teks yang sama selalu menghasilkan audio yang sama (versi suara ada di parameter v).
  app.get("/api/tts", async (req, res) => {
    const text = String(req.query.text || "").trim().slice(0, 300);
    if (!text) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Parameter text wajib diisi." } });
    }
    const voice = req.query.voice === "keita" ? "keita" : "nanami";

    try {
      const { data, mimeType } = await pronunciationAudio(prisma, text, voice);
      res.setHeader("Content-Type", mimeType);
      // s-maxage supaya CDN Vercel ikut menyimpan
      res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
      return res.send(data);
    } catch {
      return res.status(500).json({ error: { code: "TTS_ERROR", message: "Gagal membuat suara pelafalan." } });
    }
  });

  const auth = requireAuth(c.accessTokens);

  app.use("/api/auth", authRoutes(c.auth, c.accessTokens, { secureCookies: env.NODE_ENV === "production" }));
  app.use("/api/learning", auth, learningRoutes(c.learning));
  app.use("/api/srs", auth, srsRoutes(c.srs));
  app.use("/api/conversation", auth, conversationRoutes(c.conversation));
  app.use("/api/exam/mastery-gate", auth, masteryGateRoutes());
  app.use("/api/exam", auth, levelExamRoutes());
  app.use("/api/media", publicMediaRoutes());
  app.use("/api/kamus", auth, kamusRoutes());
  app.use("/api/tulis", auth, tulisRoutes(env.GEMINI_API_KEY));
  app.use("/api/admin/media", auth, requireRole("admin"), adminMediaRoutes());
  app.use("/api/admin/kamus", auth, requireRole("admin"), kamusAdminRoutes());
  app.use("/api/admin/content", auth, requireRole("admin"), contentAdminRoutes());
  app.use("/api/admin/learners", auth, requireRole("super_admin"), learnerMonitorRoutes());
  app.use("/api/admin", auth, requireRole("admin"), adminUserRoutes(c.adminUsers));
  app.use("/api/ask", askRoutes(c.askUc, c.transcriber, c.speaker, optionalAuth(c.accessTokens)));

  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." } }));
  app.use(errorHandler);
  return app;
}
