import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { Env } from "../shared/config/env";
import { errorHandler } from "../shared/http/errorHandler";
import { optionalAuth, requireAuth, requireRole } from "../shared/http/auth";
import { rateLimits } from "../shared/http/rateLimits";
import type { Container } from "./container";
import { authRoutes } from "../modules/auth/presentation/authRoutes";
import { learningRoutes } from "../modules/learning/presentation/learningRoutes";
import { srsRoutes } from "../modules/srs/presentation/srsRoutes";
import { conversationRoutes } from "../modules/conversation/presentation/conversationRoutes";
import { adminUserRoutes } from "../modules/users/presentation/adminUserRoutes";
import { learnerMonitorRoutes } from "../modules/monitoring/learnerMonitorRoutes";
import { levelExamRoutes } from "../modules/exam/presentation/levelExamRoutes";
import { masteryGateRoutes } from "../modules/exam/presentation/masteryGateRoutes";
import { workbookGateRoutes } from "../modules/exam/presentation/workbookGateRoutes";
import { jlptSimRoutes } from "../modules/exam/presentation/jlptSimRoutes";
import { askRoutes } from "../modules/ask/presentation/askRoutes";
import { contentAdminRoutes } from "../modules/content/presentation/contentAdminRoutes";
import { adminMediaRoutes, publicMediaRoutes } from "../modules/content/presentation/mediaRoutes";
import { kamusRoutes } from "../modules/content/presentation/kamusRoutes";
import { kamusAdminRoutes } from "../modules/content/presentation/kamusAdminRoutes";
import { adminBannerRoutes, publicBannerRoutes } from "../modules/content/presentation/bannerRoutes";
import { adminAiRoutes } from "../modules/ai/presentation/adminAiRoutes";
import { tulisRoutes } from "../modules/tulis/tulisRoutes";
import { progressRoutes } from "../modules/progress/presentation/progressRoutes";
import { adminNotificationRoutes, notificationCronRoutes, notificationRoutes } from "../modules/notifications/presentation/notificationRoutes";
import { scanRoutes } from "../modules/scan/presentation/scanRoutes";
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
  // Foto lembar tulisan & scan kamera butuh batas lebih besar; dipasang lebih dulu sehingga parser umum di bawah melewatinya
  app.use("/api/scan", express.json({ limit: "8mb" }));
  app.use("/api/tulis", express.json({ limit: "3mb" }));
  app.use("/api/exam/workbook", express.json({ limit: "3mb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true, ai: c.aiMode }));

  // Audio pelafalan (huruf, kosakata, contoh kalimat). Disimpan permanen di tts_cache dan boleh di-cache
  // browser/CDN, karena teks yang sama selalu menghasilkan audio yang sama (versi suara ada di parameter v).
  app.get("/api/tts", rateLimits.tts, async (req, res) => {
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

  // Rate limit dipasang sebelum route supaya request yang ditolak tidak menyentuh database atau AI
  app.use("/api/auth/login", rateLimits.login);
  app.use(["/api/auth/register", "/api/auth/guest"], rateLimits.signup);
  app.use(["/api/auth/forgot-password", "/api/auth/verify-email/resend"], rateLimits.email);
  app.use(["/api/ask", "/api/conversation"], rateLimits.ai);
  app.use(["/api/tulis", "/api/exam/workbook"], rateLimits.vision);

  app.use("/api/auth", authRoutes(c.auth, c.accessTokens, { secureCookies: env.NODE_ENV === "production" }));
  app.use("/api/notifications/cron", notificationCronRoutes(c.notifications, env.CRON_SECRET));
  app.use("/api/notifications", auth, notificationRoutes(c.notifications));
  app.use("/api/learning", auth, learningRoutes(c.learning));
  app.use("/api/srs", auth, srsRoutes(c.srs));
  app.use("/api/conversation", auth, conversationRoutes(c.conversation));
  app.use("/api/exam/mastery-gate", auth, masteryGateRoutes(c.activity, c.notifications));
  app.use("/api/exam/workbook", auth, workbookGateRoutes(env.GEMINI_API_KEY, c.activity, c.notifications));
  app.use("/api/exam/jlpt-sim", auth, jlptSimRoutes(c.activity, c.notifications));
  app.use("/api/exam", auth, levelExamRoutes(c.activity, c.notifications));
  app.use("/api/media", publicMediaRoutes());
  app.use("/api/banners", publicBannerRoutes());
  app.use("/api/admin/banners", auth, requireRole("admin"), adminBannerRoutes());
  app.use("/api/kamus", auth, kamusRoutes());
  app.use("/api/tulis", auth, tulisRoutes(env.GEMINI_API_KEY, c.activity));
  app.use("/api/progress", auth, progressRoutes(prisma, c.activity));
  app.use("/api/admin/media", auth, requireRole("admin"), adminMediaRoutes());
  app.use("/api/admin/kamus", auth, requireRole("admin"), kamusAdminRoutes());
  app.use("/api/admin/content", auth, requireRole("admin"), contentAdminRoutes());
  app.use("/api/admin/learners", auth, requireRole("super_admin"), learnerMonitorRoutes());
  app.use("/api/admin/notifications", auth, requireRole("admin"), adminNotificationRoutes(c.notifications));
  app.use("/api/admin/ai-engine", auth, requireRole("super_admin"), adminAiRoutes(prisma));
  app.use("/api/admin", auth, requireRole("admin"), adminUserRoutes(c.adminUsers));
  app.use("/api/ask", askRoutes(c.askUc, c.transcriber, c.speaker, optionalAuth(c.accessTokens)));
  app.use("/api/scan", optionalAuth(c.accessTokens), scanRoutes(c.scanVision, c.scanHistory, prisma));

  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." } }));
  app.use(errorHandler);
  return app;
}
