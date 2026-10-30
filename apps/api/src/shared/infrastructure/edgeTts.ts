import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { voiceTone } from "./voiceTone";

type Lang = "ja" | "id";

interface Segment {
  lang: Lang;
  text: string;
}

const MAX_CHARS = 800;
const ttsCache = new Map<string, Buffer>();
const instances = new Map<string, Promise<MsEdgeTTS>>();

const JAPANESE_CHAR = /[　-〿぀-ゟ゠-ヿ一-鿿！-｠]/;
const LETTER = /\p{L}/u;

function getTts(voice: string): Promise<MsEdgeTTS> {
  let instance = instances.get(voice);
  if (!instance) {
    instance = (async () => {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      return tts;
    })();
    instances.set(voice, instance);
  }
  return instance;
}

/** Romaji dalam kurung setelah kata Jepang (疲れた (tsukareta)) tidak perlu dibacakan dua kali. */
export function stripRomajiGloss(text: string): string {
  return text.replace(/([぀-ヿ一-鿿][　-〿！-｠]?)\s*[(（][^)）]*[)）]/g, "$1");
}

/** Pecah teks campuran jadi potongan berbahasa Jepang dan non-Jepang; spasi & tanda baca ikut potongan sebelumnya. */
function splitByLanguage(text: string): Segment[] {
  const segments: Segment[] = [];
  let current: { lang: Lang | null; text: string } = { lang: null, text: "" };

  for (const ch of text) {
    const lang: Lang | null = JAPANESE_CHAR.test(ch) ? "ja" : LETTER.test(ch) ? "id" : null;
    if (lang && current.lang && lang !== current.lang) {
      segments.push({ lang: current.lang, text: current.text });
      current = { lang, text: ch };
    } else {
      current.text += ch;
      if (lang && !current.lang) current.lang = lang;
    }
  }
  if (current.lang) segments.push({ lang: current.lang, text: current.text });

  return segments.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => LETTER.test(s.text));
}

interface Prosody {
  pitch: string;
  rate: string;
  volume?: string;
}

async function streamToBuffer(tts: MsEdgeTTS, text: string, prosody: Prosody): Promise<Buffer> {
  const { audioStream } = tts.toStream(text, prosody);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => reject(new Error("Edge TTS timeout")), 10000);
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks));
    });
    audioStream.on("error", (err: unknown) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/** Kalikan prosody rate SSML ("+14%") dengan kecepatan bicara level (mis. 0.75). */
function scaleRate(rate: string, factor: number): string {
  if (factor === 1) return rate;
  const pct = Math.round(((1 + (Number.parseFloat(rate) || 0) / 100) * factor - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

async function synthesizeSegment(segment: Segment, voiceType: "nanami" | "keita", emotion?: string, rate = 1): Promise<Buffer> {
  const voice =
    segment.lang === "ja"
      ? voiceType === "keita" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural"
      : "id-ID-GadisNeural";

  // Suara Miu-chan: pitch tinggi & tempo cepat untuk kesan anime imut dan energetik.
  // Ekspresi chat (emosi diberikan) memakai profil nada per emosi; selain itu nada bawaan per voice.
  const base: Prosody = emotion
    ? voiceTone(emotion).edge
    : segment.lang === "ja"
      ? { pitch: voiceType === "keita" ? "+10%" : "+24%", rate: voiceType === "keita" ? "+8%" : "+14%" }
      : { pitch: "+16%", rate: "+12%" };
  const prosody: Prosody = { ...base, rate: scaleRate(base.rate, rate) };

  try {
    return await streamToBuffer(await getTts(voice), segment.text, prosody);
  } catch {
    // Koneksi websocket bisa putus saat idle: buang instance lama lalu coba sekali lagi.
    instances.delete(voice);
    try {
      return await streamToBuffer(await getTts(voice), segment.text, prosody);
    } catch {
      instances.delete(voice);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${segment.lang}&client=tw-ob&q=${encodeURIComponent(segment.text.slice(0, 200))}`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error("Fallback TTS failed");
      return Buffer.from(await res.arrayBuffer());
    }
  }
}

/**
 * Suara Miu-chan: bagian berbahasa Jepang dibacakan voice Jepang (Nanami/Keita),
 * bagian lainnya voice Indonesia (Gadis), lalu digabung jadi satu MP3.
 */
export async function synthesizeChildVoice(
  text: string,
  voiceType: "nanami" | "keita" = "nanami",
  emotion?: string,
  /** Kecepatan bicara per level (1 = normal). */
  rate = 1,
): Promise<Buffer> {
  const clean = text.slice(0, MAX_CHARS).trim();
  const cacheKey = `${voiceType}:${emotion ?? ""}:${rate}:${clean}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) return cached;

  const segments = splitByLanguage(stripRomajiGloss(clean));
  if (segments.length === 0) throw new Error("Teks tidak bisa dibacakan");

  const parts: Buffer[] = [];
  for (const segment of segments) parts.push(await synthesizeSegment(segment, voiceType, emotion, rate));
  const buffer = Buffer.concat(parts);

  if (ttsCache.size < 3000) ttsCache.set(cacheKey, buffer);
  return buffer;
}
