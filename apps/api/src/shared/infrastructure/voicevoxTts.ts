import { extractPcm } from "./geminiTts";

/**
 * VOICEVOX Engine (gratis & open-source, https://voicevox.hiroshiba.jp): suara Jepang karakter anime yang natural.
 * Hanya bisa bahasa Jepang, jadi dipakai untuk bagian Jepang jawaban Miu-chan (lihat mixedVoice.ts).
 * Lokal: `docker compose up -d voicevox` → VOICEVOX_URL=http://localhost:50021.
 *
 * Syarat pakai: tampilkan kredit "VOICEVOX:<nama karakter>" (dikirim ke web lewat header X-Voice-Credit) dan ikuti
 * ketentuan masing-masing karakter.
 */

export const VOICEVOX_SAMPLE_RATE = 24000;

export interface VoicevoxStyle {
  /** -0.15..0.15: lebih tinggi/rendah. */
  pitch: number;
  /** 0.5..2: tempo bicara. */
  speed: number;
  /** 0..2: kuat lemahnya naik-turun nada (ekspresif). */
  intonation: number;
  /** 0..2: keras-lembut. */
  volume: number;
}

interface AudioQuery {
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  [key: string]: unknown;
}

export interface VoicevoxSpeaker {
  name: string;
  styles: { name: string; id: number }[];
}

export class VoicevoxTts {
  private readonly cache = new Map<string, Buffer>();
  private speakerName: string | null = null;
  private downUntil = 0;

  constructor(
    private readonly url: string,
    private readonly speaker: number,
  ) {}

  /** Mesin tidak menjawab: lewati sebentar supaya jawaban langsung memakai suara cadangan. */
  get available(): boolean {
    return this.downUntil <= Date.now();
  }

  private async call(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    try {
      const res = await fetch(`${this.url.replace(/\/$/, "")}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`VOICEVOX ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return res;
    } catch (err) {
      // Mesin mati/belum siap: jangan dicoba tiap potongan kalimat
      if (!(err instanceof Error && err.message.startsWith("VOICEVOX"))) this.downUntil = Date.now() + 30_000;
      throw err;
    }
  }

  async speakers(): Promise<VoicevoxSpeaker[]> {
    return (await (await this.call("/speakers", {}, 8000)).json()) as VoicevoxSpeaker[];
  }

  /** Nama karakter untuk kredit wajib, mis. "VOICEVOX:春日部つむぎ". */
  async credit(): Promise<string> {
    if (!this.speakerName) {
      const found = (await this.speakers()).find((s) => s.styles.some((st) => st.id === this.speaker));
      this.speakerName = found?.name ?? `speaker ${this.speaker}`;
    }
    return `VOICEVOX:${this.speakerName}`;
  }

  /** PCM 16-bit mono 24 kHz untuk teks berbahasa Jepang. */
  async pcm(text: string, style: VoicevoxStyle): Promise<Buffer> {
    const key = `${this.speaker}:${JSON.stringify(style)}:${text}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    if (!this.available) throw new Error("VOICEVOX sedang tidak tersedia");
    const query = (await (await this.call(`/audio_query?text=${encodeURIComponent(text)}&speaker=${this.speaker}`, { method: "POST" })).json()) as AudioQuery;
    const pcm = await this.synthesize(query, style);
    if (this.cache.size < 500) this.cache.set(key, pcm);
    return pcm;
  }

  /**
   * PCM untuk teks berbentuk notasi AquesTalk (kata dipisah "/", aksen "'"), mis. bahasa Indonesia yang sudah
   * diubah ke kana (domain/indonesianKana.ts). Bila notasinya ditolak, `plain` (katakana biasa) yang dibacakan.
   */
  async kanaPcm(marked: string, plain: string, style: VoicevoxStyle): Promise<Buffer> {
    const key = `kana:${this.speaker}:${JSON.stringify(style)}:${marked}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    if (!this.available) throw new Error("VOICEVOX sedang tidak tersedia");
    let phrases: unknown;
    try {
      phrases = await (await this.call(`/accent_phrases?text=${encodeURIComponent(marked)}&speaker=${this.speaker}&is_kana=true`, { method: "POST" })).json();
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith("VOICEVOX"))) throw err;
      return this.pcm(plain, style);
    }
    const query: AudioQuery = { ...(await this.template()), accent_phrases: phrases };
    const pcm = await this.synthesize(query, style);
    if (this.cache.size < 500) this.cache.set(key, pcm);
    return pcm;
  }

  /** Kerangka AudioQuery versi mesin ini (nilai bawaan), untuk diisi accent_phrases sendiri. */
  private templateQuery: Promise<AudioQuery> | null = null;
  private template(): Promise<AudioQuery> {
    this.templateQuery ??= this.call(`/audio_query?text=${encodeURIComponent("ア")}&speaker=${this.speaker}`, { method: "POST" })
      .then((r) => r.json() as Promise<AudioQuery>)
      .catch((err) => {
        this.templateQuery = null;
        throw err;
      });
    return this.templateQuery;
  }

  private async synthesize(query: AudioQuery, style: VoicevoxStyle): Promise<Buffer> {
    const q: AudioQuery = {
      ...query,
      speedScale: style.speed,
      pitchScale: style.pitch,
      intonationScale: style.intonation,
      volumeScale: style.volume,
      // Jeda awal/akhir pendek: potongan disambung dengan bagian lain
      prePhonemeLength: 0.05,
      postPhonemeLength: 0.08,
      outputSamplingRate: VOICEVOX_SAMPLE_RATE,
      outputStereo: false,
    };
    const wav = Buffer.from(
      await (
        await this.call(
          `/synthesis?speaker=${this.speaker}`,
          { method: "POST", headers: { "content-type": "application/json", accept: "audio/wav" }, body: JSON.stringify(q) },
          // Sintesis pertama memuat model karakter (bisa >15 detik di CPU lemah); berikutnya ±1–3 detik
          40000,
        )
      ).arrayBuffer(),
    );
    const { pcm, sampleRate } = extractPcm(wav);
    if (sampleRate !== VOICEVOX_SAMPLE_RATE) throw new Error(`VOICEVOX mengirim ${sampleRate} Hz, bukan ${VOICEVOX_SAMPLE_RATE}`);
    return pcm;
  }
}
