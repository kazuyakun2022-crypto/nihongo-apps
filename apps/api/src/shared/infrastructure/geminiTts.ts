import { stripRomajiGloss } from "./edgeTts";

// Free tier: 3 request/menit dan 10 request/hari PER model, jadi dirotasi; urutan = tercepat lebih dulu.
// gemini-2.5-flash-preview-tts sengaja tidak dipakai: butuh ~26 detik per jawaban.
// Teks dikirim apa adanya tanpa instruksi gaya: model TTS ini ikut membacakan instruksi apa pun.
const MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];
const VOICE = "Leda";
const SAMPLE_RATE = 24000;
const MAX_CHARS = 800;
const PER_MINUTE_COOLDOWN_MS = 60_000;
const PER_DAY_COOLDOWN_MS = 60 * 60_000;

interface GeminiTtsResponse {
  candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[];
}

/**
 * Model TTS Gemini terbaru menempelkan manifest C2PA ("Created by Google Generative AI") berupa
 * kotak JUMBF di ujung PCM mentah; kalau ikut diputar terdengar seperti bunyi statis radio.
 * Dipotong hanya bila field ukuran kotak tepat sampai akhir buffer.
 */
function stripC2paTrailer(pcm: Buffer): Buffer {
  const marker = Buffer.from("jumb");
  const searchFrom = Math.max(0, pcm.length - 65536);
  for (let i = pcm.indexOf(marker, searchFrom); i !== -1; i = pcm.indexOf(marker, i + 1)) {
    const start = i - 4;
    if (start >= 0 && pcm.readUInt32BE(start) === pcm.length - start) {
      return pcm.subarray(0, start - (start % 2));
    }
  }
  return pcm;
}

function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Suara karakter Neko-sensei: satu voice yang sama untuk bahasa Indonesia dan Jepang. */
export class GeminiTts {
  private readonly cache = new Map<string, Buffer>();
  private readonly limitedUntil = new Map<string, number>();

  constructor(private readonly apiKey: string) {}

  async speak(text: string): Promise<Buffer> {
    const clean = stripRomajiGloss(text.slice(0, MAX_CHARS).trim());
    const cached = this.cache.get(clean);
    if (cached) return cached;

    for (const model of MODELS) {
      if ((this.limitedUntil.get(model) ?? 0) > Date.now()) continue;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: clean }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (res.status === 429) {
        // Kuota harian habis: jangan dicoba lagi tiap jawaban, cukup cek ulang tiap jam.
        const perDay = (await res.text()).includes("PerDay");
        this.limitedUntil.set(model, Date.now() + (perDay ? PER_DAY_COOLDOWN_MS : PER_MINUTE_COOLDOWN_MS));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini TTS ${model} error ${res.status}: ${(await res.text()).slice(0, 200)}`);

      const data = (await res.json()) as GeminiTtsResponse;
      const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audio) throw new Error(`Gemini TTS ${model} tidak mengembalikan audio`);

      const wav = pcmToWav(stripC2paTrailer(Buffer.from(audio, "base64")));
      if (this.cache.size < 200) this.cache.set(clean, wav);
      return wav;
    }
    throw new Error("Semua model Gemini TTS sedang kena batas kuota");
  }
}
