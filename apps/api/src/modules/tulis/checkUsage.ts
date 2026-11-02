import { Errors } from "../../shared/domain/errors";
import { prisma } from "../../shared/infrastructure/prisma";
import type { CheckResult } from "./handwritingCheck";

/**
 * Batas wajar per pengguna supaya kuota Gemini gratis (±500 permintaan/hari per model) tidak habis oleh satu akun:
 * satu pemeriksaan foto memakai 5 permintaan (3 penjaring + 2 pemeriksa ulang). Dipakai bersama oleh Tulis di Buku
 * dan Gerbang Tulis jalur kertas.
 */
const HOURLY_LIMIT = 15;
const recent = new Map<string, number[]>();

export function takeCheckQuota(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= HOURLY_LIMIT) throw Errors.quota("Kamu sudah banyak memeriksa tulisan dalam satu jam ini. Istirahat sebentar, lalu coba lagi ya.");
  list.push(now);
  recent.set(userId, list);
}

/** Riwayat kesalahan huruf-huruf ini: penjelasan Miu-chan berganti sudut pandang bila kesalahan terulang. */
export async function issueHistory(userId: string, chars: string[]): Promise<Record<string, number>> {
  const logs = await prisma.handwritingLog
    .findMany({ where: { userId, char: { in: chars } }, select: { char: true, issue: true, count: true } })
    .catch(() => []);
  return Object.fromEntries(logs.map((l) => [`${l.char}|${l.issue}`, l.count]));
}

/** Catat masalah utama setiap huruf ke riwayat (HandwritingLog). Gagal mencatat tidak menggagalkan pemeriksaan. */
export async function logIssues(userId: string, result: CheckResult) {
  if (!result.photoOk) return;
  await Promise.all(
    result.chars
      .filter((c) => c.issueKey)
      .map((c) =>
        prisma.handwritingLog.upsert({
          where: { userId_char_issue: { userId, char: c.char, issue: c.issueKey!.slice(0, 40) } },
          create: { userId, char: c.char, issue: c.issueKey!.slice(0, 40) },
          update: { count: { increment: 1 } },
        }),
      ),
  ).catch((err) => console.error("[tulis/log]", err instanceof Error ? err.message : err));
}
