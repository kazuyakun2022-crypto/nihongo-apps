import { indonesianToKana } from "../domain/indonesianKana";
import { planSpeech } from "../domain/speechPace";
import { splitByLanguage, stripRomajiGloss } from "./edgeTts";
import type { ElevenLabsTts } from "./elevenLabsTts";
import { estimateSpeechSeconds, pcmToWav, type GeminiTts } from "./geminiTts";
import { shiftPitchByPace } from "./pitchShift";
import { normalizeLoudness, TARGET_SPEECH_RMS } from "./loudness";
import { applyGain, voiceTone } from "./voiceTone";
import { VOICEVOX_SAMPLE_RATE, type VoicevoxStyle, type VoicevoxTts } from "./voicevoxTts";

/**
 * Suara campuran Miu-chan: bagian berbahasa Jepang dibacakan VOICEVOX (suara Jepang asli), bagian bahasa Indonesia
 * dibacakan mesin pertama yang berhasil dari daftar (bawaan: Gemini Leda → VOICEVOX dengan teks diubah ke katakana),
 * lalu semuanya disambung menjadi satu WAV 24 kHz. Potongan dibuat paralel supaya tetap cepat.
 */

const MAX_CHARS = 800;
const GAP_SECONDS = 0.06;
const RATE = VOICEVOX_SAMPLE_RATE;

/** Naik-turun nada per emosi (VOICEVOX intonationScale; 1 = biasa). */
const INTONATION: Record<string, number> = {
  senang: 1.3,
  semangat: 1.4,
  kaget: 1.4,
  rese: 1.25,
  kesal: 1.15,
  marah: 1.2,
  sedih: 0.85,
  nangis: 0.9,
  malu: 0.9,
  bingung: 1.05,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Parameter VOICEVOX untuk satu bagian: emosi Miu-chan + tempo bagian itu. */
export function voicevoxStyle(emotion: string | undefined, tempo: number): VoicevoxStyle {
  const tone = voiceTone(emotion);
  const neutral = voiceTone("biasa");
  return {
    pitch: Math.round(clamp((tone.pitch / neutral.pitch - 1) * 0.6, -0.08, 0.08) * 1000) / 1000,
    speed: Math.round(clamp(tone.tempo * tempo, 0.8, 1.3) * 100) / 100,
    intonation: INTONATION[emotion ?? ""] ?? 1.15,
    volume: Math.round(clamp(tone.gain, 0.7, 1.3) * 100) / 100,
  };
}

export interface MixedPart {
  lang: "ja" | "id";
  text: string;
  tempo: number;
}

/** Potong jawaban menjadi bagian per bahasa, masing-masing dengan tempo bagiannya. */
export function mixedParts(text: string, rate: number): MixedPart[] {
  return planSpeech(stripRomajiGloss(text.slice(0, MAX_CHARS).trim()), rate)
    .flatMap((run) => splitByLanguage(run.text).map((s) => ({ lang: s.lang, text: s.text.trim(), tempo: run.tempo })))
    .filter((p) => p.text.length > 0);
}

/** Mesin untuk bagian bahasa Indonesia: PCM 16-bit 24 kHz, tempo & emosi sudah diterapkan. */
export interface IndonesianVoice {
  name: string;
  readonly available: boolean;
  pcm(text: string, emotion: string | undefined, tempo: number): Promise<Buffer>;
}

/** Gemini Leda (suara bahasa Indonesia yang dipakai sebelumnya); kuota gratis kecil. */
export function geminiIndonesian(gemini: GeminiTts): IndonesianVoice {
  return {
    name: "gemini",
    get available() {
      return gemini.available;
    },
    pcm: (text, emotion, tempo) => gemini.pcm(text, emotion, tempo, RATE),
  };
}

export function elevenLabsIndonesian(eleven: ElevenLabsTts): IndonesianVoice {
  return {
    name: "elevenlabs",
    get available() {
      return eleven.available;
    },
    async pcm(text, emotion, tempo) {
      const tone = voiceTone(emotion);
      const pcm = await eleven.pcm(text, emotion);
      const t = clamp(tone.tempo * tempo, 0.8, 1.3);
      // Tempo saja (nada 1): sample rate tetap 24 kHz supaya bisa disambung
      const stretched = Math.abs(t - 1) < 0.01 ? pcm : shiftPitchByPace(pcm, RATE, 1, [{ seconds: estimateSpeechSeconds(text), tempo: t }]).pcm;
      return applyGain(stretched, tone.gain);
    },
  };
}

/** Karakter VOICEVOX yang sama membacakan bahasa Indonesia (diubah ke katakana, berlogat Jepang); tanpa kuota. */
export function voicevoxIndonesian(voicevox: VoicevoxTts): IndonesianVoice {
  return {
    name: "voicevox",
    get available() {
      return voicevox.available;
    },
    pcm(text, emotion, tempo) {
      const { marked, plain } = indonesianToKana(text);
      if (!marked) return Promise.resolve(Buffer.alloc(0));
      return voicevox.kanaPcm(marked, plain, voicevoxStyle(emotion, tempo));
    },
  };
}

export class MixedVoice {
  private readonly cache = new Map<string, Buffer>();
  /** Mesin yang membacakan bagian Indonesia pada jawaban terakhir (untuk header X-Voice-Indonesian / debug). */
  lastIndonesian: string[] = [];

  constructor(
    private readonly japanese: VoicevoxTts,
    private readonly indonesian: IndonesianVoice[],
  ) {}

  get available(): boolean {
    return this.japanese.available;
  }

  credit(): Promise<string> {
    return this.japanese.credit();
  }

  /** Bagian Indonesia: mesin pertama yang tersedia dan berhasil. */
  private async indonesianPcm(text: string, emotion: string | undefined, tempo: number, used: string[]): Promise<Buffer> {
    const errors: string[] = [];
    for (const voice of this.indonesian) {
      if (!voice.available) continue;
      try {
        const pcm = await voice.pcm(text, emotion, tempo);
        used.push(voice.name);
        return pcm;
      } catch (err) {
        errors.push(`${voice.name}: ${err instanceof Error ? err.message : err}`);
      }
    }
    throw new Error(`Bagian bahasa Indonesia gagal dibacakan (${errors.join("; ") || "tidak ada mesin tersedia"})`);
  }

  async speak(text: string, emotion?: string, rate = 1): Promise<Buffer> {
    const parts = mixedParts(text, rate);
    if (!parts.length) throw new Error("Teks tidak bisa dibacakan");
    const cacheKey = `${emotion ?? "biasa"}:${rate}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.available) throw new Error("VOICEVOX sedang tidak tersedia");

    const used: string[] = [];
    const audio = await Promise.all(
      parts.map((p) => (p.lang === "ja" ? this.japanese.pcm(p.text, voicevoxStyle(emotion, p.tempo)) : this.indonesianPcm(p.text, emotion, p.tempo, used))),
    );
    this.lastIndonesian = [...new Set(used)];
    // Keras tiap potongan disamakan (VOICEVOX jauh lebih pelan dari Gemini), lalu dikali keras-lembut emosi
    const target = TARGET_SPEECH_RMS * clamp(voiceTone(emotion).gain, 0.75, 1.2);
    const levelled = audio.map((pcm) => normalizeLoudness(pcm, RATE, target));
    const gap = Buffer.alloc(Math.round(RATE * GAP_SECONDS) * 2);
    const joined = Buffer.concat(levelled.filter((pcm) => pcm.length).flatMap((pcm, i) => (i ? [gap, pcm] : [pcm])));
    const wav = pcmToWav(joined, RATE);
    if (this.cache.size < 200) this.cache.set(cacheKey, wav);
    return wav;
  }
}
