import rateLimit, { type Options } from "express-rate-limit";

/**
 * Pembatas request per IP. Kuota gratis Groq dan Gemini dipakai bersama oleh semua pengguna,
 * jadi satu klien yang mengirim request terus-menerus tidak boleh menghabiskannya.
 *
 * Catatan: penyimpanannya di memori proses. Di Vercel tiap instance serverless punya hitungan sendiri,
 * jadi ini rem dasar, bukan batas pasti. Untuk batas pasti antar-instance, ganti store ke Redis/Upstash.
 */
function limiter(windowMinutes: number, limit: number, message: string, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "RATE_LIMITED", message } });
    },
    ...extra,
  });
}

const tooFastAi = "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.";

export const rateLimits = {
  /** Masuk: kunci akun setelah 5x gagal sudah ada; ini menahan tebakan ke banyak akun dari satu IP. */
  login: limiter(15, 20, "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit."),
  /** Daftar akun dan akun tamu. */
  signup: limiter(60, 10, "Terlalu banyak akun dibuat dari jaringan ini. Coba lagi nanti."),
  /** Email lupa sandi dan kirim ulang verifikasi (kuota email terbatas). */
  email: limiter(15, 5, "Terlalu banyak permintaan email. Coba lagi dalam 15 menit."),
  /** Tanya Sensei, ngobrol dengan maskot, transkripsi dan suara balasan. Satu pertanyaan suara = 2-3 request. */
  ai: limiter(1, 30, tooFastAi, { skip: (req) => req.method === "GET" }),
  /** Pemeriksaan foto tulisan (Gemini Vision, kuota paling sempit). */
  vision: limiter(1, 10, tooFastAi, { skip: (req) => req.method === "GET" }),
  /** Suara pelafalan: sebagian besar dari cache, yang baru dibuat memakai kuota TTS. */
  tts: limiter(1, 60, tooFastAi),
};
