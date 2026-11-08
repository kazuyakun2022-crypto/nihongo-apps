import { loadEnv } from "../shared/config/env";
import { prisma } from "../shared/infrastructure/prisma";
import { buildContainer } from "./container";
import { createApp } from "./app";

const env = loadEnv();
const container = buildContainer(env, prisma);
const app = createApp(env, container);

const server = app.listen(env.PORT, () => {
  console.info(`API berjalan di http://localhost:${env.PORT} (AI maskot: ${container.aiMode})`);
});

// Penjadwal berkala (tiap 5 menit): memeriksa kandidat pengingat belajar dan mengirim Web Push ke perangkat yang sedang tertutup
const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const reminderTimer = setInterval(async () => {
  try {
    const result = await container.notifications.runReminders(new Date());
    if (result.created > 0 || result.pushSent > 0) {
      console.info(`[scheduler] Pengingat belajar terkirim: ${result.created} notifikasi in-app, ${result.pushSent} web push.`);
    }
  } catch (err) {
    console.error("[scheduler] Gagal menjalankan pengingat berkala:", err);
  }
}, REMINDER_INTERVAL_MS);

const shutdown = () => {
  clearInterval(reminderTimer);
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
