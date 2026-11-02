import { planSpeech, speechText } from "../domain/speechPace";
import { stripRomajiGloss } from "./edgeTts";
import { estimateSpeechSeconds, pcmToWav } from "./geminiTts";
import { shiftPitchByPace } from "./pitchShift";
import { applyGain, voiceTone } from "./voiceTone";

/**
 * Suara Miu-chan lewat ElevenLabs (mesin utama bila ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID diisi).
 * Urutan cadangan di /api/ask/speak: ElevenLabs → Gemini TTS → Edge TTS.
 *
 * Audio diminta sebagai PCM 16-bit 24 kHz supaya bisa diolah sama seperti Gemini: tempo per bagian (<pelan>/<cepat>,
 * kecepatan level) dan nada/volume per emosi, lalu dikirim sebagai WAV, jadi web tidak perlu berubah.
 * Voice ElevenLabs sudah dipilih dengan nada yang pas, jadi nada emosi digeser RELATIF terhadap "biasa"
 * (Gemini Leda dinaikkan ±20% supaya imut; di sini tidak).
 */

const API = "https://api.elevenlabs.io/v1";
const SAMPLE_RATE = 24000;
const OUTPUT_FORMAT = "pcm_24000";
/** Batas karakter per jawaban yang dibacakan: kredit ElevenLabs dihitung per karakter. */
const MAX_CHARS = 800;
const BUSY_COOLDOWN_MS = 60_000;
const QUOTA_COOLDOWN_MS = 60 * 60_000;

/**
 * fetch ke ElevenLabs yang dicoba ulang bila KONEKSI gagal (bukan bila server menjawab error). Di sebagian jaringan
 * (mis. jaringan kantor), sambungan ke server ElevenLabs sering macet di tahap connect lalu berhasil di percobaan
 * berikutnya; sambungan yang berhasil tersambung dalam puluhan milidetik, jadi tiap percobaan diberi batas pendek.
 */
export async function fetchElevenLabs(url: string, init: RequestInit, opts: { attempts?: number; attemptMs?: number; totalMs?: number } = {}): Promise<Response> {
  const attempts = opts.attempts ?? 4;
  const deadline = Date.now() + (opts.totalMs ?? 25000);
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(Math.min(opts.attemptMs ?? 9000, remaining)) });
    } catch (err) {
      last = err;
    }
  }
  const cause = last instanceof Error ? ((last.cause as { code?: string } | undefined)?.code ?? last.name) : String(last);
  throw new Error(`Tidak bisa tersambung ke ElevenLabs setelah ${attempts} percobaan (${cause}). Periksa koneksi internet/jaringan.`);
}

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

/**
 * Ekspresi per emosi: stabilitas rendah + style tinggi = lebih ekspresif; stabilitas tinggi = tenang/lembut.
 * Nilai 0–1 (lihat dokumentasi voice_settings ElevenLabs).
 */
const BASE: ElevenLabsVoiceSettings = { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true };
const SETTINGS: Record<string, Partial<ElevenLabsVoiceSettings>> = {
  senang: { stability: 0.4, style: 0.45 },
  semangat: { stability: 0.32, style: 0.6 },
  kaget: { stability: 0.3, style: 0.6 },
  rese: { stability: 0.38, style: 0.5 },
  kesal: { stability: 0.4, style: 0.45 },
  marah: { stability: 0.35, style: 0.55 },
  sedih: { stability: 0.6, style: 0.35 },
  nangis: { stability: 0.55, style: 0.45 },
  malu: { stability: 0.58, style: 0.35 },
  bingung: { stability: 0.5, style: 0.35 },
};

export function voiceSettings(emotion?: string): ElevenLabsVoiceSettings {
  return { ...BASE, ...(SETTINGS[emotion ?? ""] ?? {}) };
}

export class ElevenLabsTts {
  private readonly cache = new Map<string, Buffer>();
  private limitedUntil = 0;

  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string,
    private readonly model: string,
  ) {}

  /** Kuota/kredit habis atau terlalu banyak permintaan: lewati sementara supaya cadangan langsung dipakai. */
  get available(): boolean {
    return this.limitedUntil <= Date.now();
  }

  /**
   * PCM mentah 16-bit 24 kHz untuk teks yang sudah bersih (tanpa tanda tempo). Dipakai langsung oleh suara campuran
   * (bagian Indonesia lewat ElevenLabs, bagian Jepang lewat VOICEVOX; lihat mixedVoice.ts).
   */
  async pcm(text: string, emotion?: string): Promise<Buffer> {
    const key = `pcm:${emotion ?? "biasa"}:${text}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    if (!this.available) throw new Error("ElevenLabs sedang dibatasi (kuota/sibuk)");
    const res = await fetchElevenLabs(`${API}/text-to-speech/${encodeURIComponent(this.voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": this.apiKey, "content-type": "application/json", accept: "audio/pcm" },
      // Tanpa language_code: jawaban mencampur bahasa Indonesia dan Jepang, bahasa dikenali per kalimat
      body: JSON.stringify({ text, model_id: this.model, voice_settings: voiceSettings(emotion) }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      // Kredit habis (quota_exceeded) atau voice butuh paket berbayar (402 paid_plan_required, mis. voice dari
      // Voice Library di akun gratis): cek ulang tiap jam saja, jawaban langsung memakai suara cadangan
      if (/quota_exceeded/.test(body) || res.status === 402) this.limitedUntil = Date.now() + QUOTA_COOLDOWN_MS;
      else if (res.status === 429) this.limitedUntil = Date.now() + BUSY_COOLDOWN_MS;
      throw new Error(`ElevenLabs ${res.status}: ${body}`);
    }
    const raw = Buffer.from(await res.arrayBuffer());
    const pcm = raw.subarray(0, raw.length - (raw.length % 2));
    if (pcm.length < SAMPLE_RATE / 10) throw new Error("ElevenLabs tidak mengembalikan audio");
    if (this.cache.size < 400) this.cache.set(key, pcm);
    return pcm;
  }

  async speak(text: string, emotion?: string, rate = 1): Promise<Buffer> {
    const runs = planSpeech(stripRomajiGloss(text.slice(0, MAX_CHARS).trim()), rate);
    const clean = speechText(runs);
    if (!clean) throw new Error("Teks tidak bisa dibacakan");
    const cacheKey = `${emotion ?? "biasa"}:${rate}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const pcm = await this.pcm(clean, emotion);

    const tone = voiceTone(emotion);
    const neutral = voiceTone("biasa");
    const parts = runs.map((r) => ({
      seconds: estimateSpeechSeconds(r.text),
      // Di bawah 0,8 WSOLA mulai terdengar patah-patah
      tempo: Math.min(1.3, Math.max(0.8, tone.tempo * r.tempo)),
    }));
    const shifted = shiftPitchByPace(applyGain(pcm, tone.gain), SAMPLE_RATE, tone.pitch / neutral.pitch, parts);
    const wav = pcmToWav(shifted.pcm, shifted.sampleRate);
    if (this.cache.size < 200) this.cache.set(cacheKey, wav);
    return wav;
  }
}
