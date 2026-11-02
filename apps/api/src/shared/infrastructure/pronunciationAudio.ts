import { createHash } from "node:crypto";
import type { Db } from "./prisma";
import { synthesizeChildVoice, synthesizePronunciation } from "./edgeTts";

/** Suara pelafalan teks Jepang (Nanami bernada imut); teks campuran memakai suara Miu-chan per bahasa. */
export const EDGE_PRONUNCIATION_VOICE = "edge-pron-v6:nanami-imut";
const LATIN = /[A-Za-z]/;
const memory = new Map<string, Buffer>();

export const ttsKey = (voice: string, text: string) => createHash("sha256").update(`${voice}|${text}`).digest("hex");

/**
 * Audio pelafalan, disimpan permanen di tts_cache supaya teks yang sama tidak dibuat ulang:
 * memori → database → buat dengan Edge TTS lalu simpan.
 */
export async function pronunciationAudio(db: Db, text: string, voice: "nanami" | "keita"): Promise<{ data: Buffer; mimeType: string }> {
  const mimeType = "audio/mpeg";
  const japaneseOnly = voice === "nanami" && !LATIN.test(text);
  const storedVoice = japaneseOnly ? EDGE_PRONUNCIATION_VOICE : `edge-mix-v1:${voice}`;
  const key = ttsKey(storedVoice, text);

  const hit = memory.get(key);
  if (hit) return { data: hit, mimeType };
  const stored = await db.ttsCache.findUnique({ where: { key }, select: { data: true, mimeType: true } }).catch(() => null);
  if (stored) {
    const data = Buffer.from(stored.data);
    remember(key, data);
    return { data, mimeType: stored.mimeType };
  }

  const data = japaneseOnly ? await synthesizePronunciation(text) : await synthesizeChildVoice(text, voice);
  // Gagal menyimpan (mis. database sibuk) tidak boleh menggagalkan pemutaran
  await db.ttsCache.create({ data: { key, voice: storedVoice, text, mimeType, data } }).catch(() => undefined);
  remember(key, data);
  return { data, mimeType };
}

function remember(key: string, data: Buffer) {
  if (memory.size >= 500) memory.delete(memory.keys().next().value!);
  memory.set(key, data);
}
