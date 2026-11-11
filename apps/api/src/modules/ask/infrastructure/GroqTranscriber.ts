import { containsJapanese } from "./learnerContext";

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/**
 * Konfigurasi STT untuk Layar Belajar & Review Harian
 * Dikunci mati ke bahasa Jepang murni, anti-halusinasi saat hening.
 */
export const JapaneseSpeakingReviewConfig = {
  language: "ja" as const,
  model: "whisper-large-v3-turbo",
  detect_language: false,
  vad_turnoff: 800,
  endpointing: 500,
  min_volume_threshold: -42,
  temperature: 0.0,
  no_speech_threshold: 0.6,
  logprob_threshold: -1.0,
  prompt: "日本語の学習練習です。平仮名、片仮名、漢字の発音。",
};

export const VoiceNavigatorConfig = {
  prompt: "Pengguna bertanya seputar aplikasi dalam bahasa Indonesia atau Jepang.",
};

// Whisper suka "berhalusinasi" kalimat penutup video YouTube saat rekaman hampir hening / room noise.
const HALLUCINATIONS = [
  "terima kasih telah menonton",
  "terima kasih sudah menonton",
  "terima kasih banyak sudah menonton",
  "terima kasih banyak telah menonton",
  "terima kasih",
  "selamat menonton",
  "ご視聴ありがとうございました",
  "ご視聴ありがとうございました。",
  "ご視聴いただきありがとうございました",
  "ご視聴いただき、ありがとうございました",
  "視聴ありがとうございました",
  "チャンネル登録お願いします",
  "チャンネル登録よろしくお願いします",
  "チャンネル登録をお願いします",
  "チャンネル登録よろしく",
  "チャンネル登録",
  "thank you for watching",
  "thank you for watching.",
  "thank you very much for watching",
  "thank you very much",
  "thank you",
  "subtitles by",
  "subtitle by",
  "transcribed by",
  "bye bye",
  "おやすみなさい",
  "それではまた",
];

// Contoh ucapan campuran sebagai konteks Whisper untuk Voice Navigator / Mascot AI:
// kata Jepang di tengah kalimat Indonesia tetap ditulis huruf Jepang, dan sebaliknya.
const CODE_SWITCH_PROMPT: Record<"id" | "ja", string> = {
  id: "Miu-chan, aku mau latihan 日本語. Artinya 食べる apa sih? Kemarin aku 学校に行きました terus makan ラーメン. ありがとう ya, です sama ます bedanya apa?",
  ja: "ミウちゃん、今日はちょっと capek なの。食べるってどういう意味？でも日本語の勉強、頑張りたい！",
};

/**
 * Selisih avg_logprob id vs ja yang masih dianggap ucapan campuran. Hasil uji: ucapan campuran
 * ("Kalau 頑張って itu maksudnya apa") berselisih 0,1–0,65, sedangkan ucapan murni Indonesia ±1,0
 * dan versi Jepangnya berupa terjemahan yang tidak diucapkan.
 */
const MIXED_MAX_SCORE_GAP = 0.8;

/**
 * Pengguna orang Indonesia: bila mode Indonesia menghasilkan teks Latin biasa, mode Jepang baru dipilih kalau
 * jauh lebih yakin. Mode Jepang sering "menerjemahkan" ucapan Indonesia ("Lanjut" → 続く) atau menulisnya
 * dengan katakana ("Buka kamus" → ブカカムス), dan di mikrofon pelan skornya bisa mendekati mode Indonesia
 * (uji suara pelan: selisih 0,23–0,6). Ucapan Jepang sungguhan menang dengan selisih ≥0,64 di uji yang sama,
 * atau mode Indonesianya sendiri sudah menulis huruf Jepang.
 */
const JA_OVER_LATIN_MARGIN = 0.3;

/**
 * Hasil penggabungan yang hanya MENAMBAHKAN teks Jepang (semua kata Latin dari transkrip Indonesia masih ada)
 * berarti LLM menempelkan halusinasi mode Jepang, mis. "Lanjut. 頑張りたい。". Ucapan campuran asli selalu
 * MENGGANTI kata yang salah dengar ("gambar tek" → 頑張って).
 */
export function fusionOnlyAppends(idText: string, fused: string): boolean {
  if (!containsJapanese(fused)) return false;
  const latin = (t: string) => t.toLowerCase().match(/[a-z]+/g) ?? [];
  const kept = new Set(latin(fused));
  const original = latin(idText);
  return original.length > 0 && original.every((w) => kept.has(w));
}

// Dipilih dari uji 8 pasangan transkrip: qwen 7/8 benar (median ±0,7 s), gpt-oss-120b 5/8 (±1,3 s), gpt-oss-20b 2/6.
const FUSION_MODEL = "qwen/qwen3.8-27b";
const FUSION_TIMEOUT_MS = 3000;

const FUSION_PROMPT = `Kamu menggabungkan dua transkrip mesin dari SATU rekaman yang sama. Penuturnya orang Indonesia yang belajar bahasa Jepang dan sering mencampur dua bahasa dalam satu kalimat, misalnya "Apa arti 食べる?".
- Transkrip A dibuat dengan mode bahasa Indonesia: bagian Indonesianya akurat, tapi kata Jepang sering salah dengar jadi kata Indonesia ("gambar tek" untuk 頑張って) atau ditulis romaji ("ikimasu").
- Transkrip B dibuat dengan mode bahasa Jepang: kata Jepangnya akurat, tapi bagian Indonesia jadi katakana acak ("アッパーアルティ" untuk "apa arti").
Tulis ulang apa yang BENAR-BENAR diucapkan: bagian Indonesia dalam huruf Latin mengikuti A, bagian Jepang dalam huruf Jepang (kanji/kana) mengikuti B atau mengubah romaji dari A.
ATURAN:
- JANGAN menerjemahkan dan JANGAN menambah kata yang tidak diucapkan.
- JANGAN membetulkan tata bahasa atau partikel yang salah; kesalahan penutur harus tetap ada karena akan dikoreksi guru.
- Kalau ucapannya seluruhnya bahasa Indonesia, kembalikan A apa adanya. Kalau seluruhnya bahasa Jepang, kembalikan B.
- Hasilnya SATU kalimat, bukan A dan B yang ditempel berurutan.
- Balas HANYA dengan teks transkrip akhir, tanpa penjelasan dan tanpa tanda kutip.

CONTOH:
A: Kalau gambar tek itu maksudnya apa sih?
B: カラウ ガンバッティ イトマスクニャーアパシヒ?
Hasil: Kalau 頑張って itu maksudnya apa sih?

A: Apa arti? Tabehru?
B: アッパーアルピー 食べる?
Hasil: Apa arti 食べる?

A: bedanya miru sama miseru apa?
B: ベダニャ、見る！、様！、見せる！、あぱ、
Hasil: Bedanya 見る sama 見せる apa?

A: O NAKA SUITA
B: お腹すいた。
Hasil: お腹すいた。

A: Aku mau ke gakko de ikimasu besok
B: アクマウケ 学校で行きます ベソック
Hasil: Aku mau ke 学校で行きます besok`;

interface WhisperResult {
  text: string;
  score: number;
  noSpeech?: boolean;
}

export type TranscriptStatus = "OK" | "SILENT" | "NO_MATCH_JAPANESE" | "LOW_CONFIDENCE";

export interface Transcript {
  text: string;
  /**
   * Versi bahasa Jepang dari ucapan campuran yang sama. Dikirim ke AI sebagai cadangan
   * untuk menebak kata Jepang bila penggabungan transkrip gagal atau masih keliru.
   */
  alt: string | null;
  status?: TranscriptStatus;
  confidence?: number;
}

interface VerboseJson {
  text?: string;
  segments?: { start: number; end: number; avg_logprob: number; no_speech_prob: number }[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s.,!?、。！？:;~〜…"'“”()（）「」『』[\]【】\-]/gu, "");
}

function isNoise(text: string, activePrompt?: string): boolean {
  if (!text || !text.trim()) return true;
  const norm = normalize(text);
  if (!norm) return true;

  // Cek blacklist halusinasi Whisper saat hening
  for (const h of HALLUCINATIONS) {
    const hNorm = normalize(h);
    if (norm === hNorm) return true;
    if (hNorm.length >= 6 && norm.includes(hNorm)) return true;
  }

  // Karakter berulang tanpa arti seperti "......" atau "ああああ"
  if (/^(.)\1{3,}$/u.test(norm)) return true;

  // Rekaman hampir hening kadang membuat Whisper mengulang prompt konteks
  const allPrompts = [
    activePrompt,
    JapaneseSpeakingReviewConfig.prompt,
    VoiceNavigatorConfig.prompt,
    ...Object.values(CODE_SWITCH_PROMPT),
  ].filter(Boolean) as string[];

  const echoesPrompt = allPrompts.some((p) => {
    const pNorm = normalize(p);
    // Whisper halusinasi mengulang kalimat panjang dari prompt saat hening
    return norm.length >= 12 && pNorm.length >= 12 && norm.includes(pNorm.slice(0, 15));
  });

  return echoesPrompt;
}

export class GroqTranscriber {
  constructor(private readonly apiKey: string) {}

  /**
   * Dual-Engine STT Routing:
   * 1. Mode Belajar & Review Harian (`language: "ja"`):
   *    - Kunci bahasa ke Jepang murni, auto-detect nonaktif.
   *    - Context prompt memprioritaskan target kosakata / kalimat yang sedang dipelajari.
   *    - Output Latin/Indonesia ditolak dan mengembalikan status `NO_MATCH_JAPANESE`.
   * 2. Mode AI Maskot / Voice Navigator (dwibahasa `id` + `ja`):
   *    - Audio ditranskripsi paralel dengan bahasa dipaksa `id` dan `ja`.
   *    - Menggunakan filter anti-halusinasi dan penggabungan transkrip LLM bila dwibahasa.
   */
  async transcribe(
    audio: Buffer,
    mimeType: string,
    language?: "ja",
    contextTarget?: string,
  ): Promise<Transcript> {
    if (!Buffer.isBuffer(audio) || audio.length < 1000) {
      return { text: "", alt: null, status: "SILENT", confidence: 0 };
    }

    const baseType = mimeType.split(";")[0].trim().toLowerCase();
    const file = new Blob([new Uint8Array(audio)], { type: baseType });
    const fileName = `audio.${EXTENSIONS[baseType] ?? "webm"}`;

    // ── 1. MODE LAYAR BELAJAR & REVIEW (Strict Japanese Only) ──
    if (language === "ja") {
      const targetPrompt = contextTarget?.trim()
        ? `${JapaneseSpeakingReviewConfig.prompt} 練習ターゲット: ${contextTarget.trim()}`
        : JapaneseSpeakingReviewConfig.prompt;

      const ja = await this.request(file, fileName, "ja", targetPrompt);

      if (ja.noSpeech || isNoise(ja.text, targetPrompt)) {
        return { text: "", alt: null, status: "SILENT", confidence: 0 };
      }

      const confidence = Math.min(1, Math.max(0, Math.exp(ja.score)));

      if (ja.score < JapaneseSpeakingReviewConfig.logprob_threshold) {
        return { text: "", alt: null, status: "LOW_CONFIDENCE", confidence };
      }

      // Kunci mati ke bahasa Jepang murni: jika pengguna bicara bahasa Latin/Indonesia/Inggris,
      // engine menolak input dan mengembalikan status NO_MATCH_JAPANESE
      if (!containsJapanese(ja.text)) {
        return { text: "", alt: null, status: "NO_MATCH_JAPANESE", confidence };
      }

      return { text: ja.text, alt: null, status: "OK", confidence };
    }

    // ── 2. MODE AI MASKOT / VOICE NAVIGATOR (Bilingual Bi-directional) ──
    const [id, ja] = await Promise.all([
      this.request(file, fileName, "id"),
      this.request(file, fileName, "ja"),
    ]);

    const idIsLatin = !!id && !containsJapanese(id.text);
    const best = id && (idIsLatin ? ja.score - id.score <= JA_OVER_LATIN_MARGIN : id.score >= ja.score) ? id : ja;

    if (best.noSpeech || isNoise(best.text)) {
      return { text: "", alt: null, status: "SILENT", confidence: 0 };
    }

    const confidence = Math.min(1, Math.max(0, Math.exp(best.score)));

    if (best.score < JapaneseSpeakingReviewConfig.logprob_threshold) {
      return { text: "", alt: null, status: "LOW_CONFIDENCE", confidence };
    }

    const mixed =
      id !== null &&
      Math.abs(id.score - ja.score) <= MIXED_MAX_SCORE_GAP &&
      !isNoise(id.text) &&
      !isNoise(ja.text) &&
      containsJapanese(ja.text) &&
      normalize(id.text) !== normalize(ja.text);

    if (!mixed) {
      return { text: best.text, alt: null };
    }

    const fused = await this.fuse(id.text, ja.text).catch((err: unknown) => {
      console.warn("[transcribe] penggabungan transkrip gagal:", err instanceof Error ? err.message : err);
      return null;
    });

    // Penggabung menempelkan halusinasi: pakai transkrip Indonesia, dan jangan kirim versi Jepang karangan ke AI
    if (fused && fusionOnlyAppends(id.text, fused)) {
      return { text: id.text, alt: null };
    }

    return { text: fused ?? best.text, alt: ja.text };
  }

  /** Menggabungkan transkrip mode Indonesia (A) dan mode Jepang (B) menjadi satu kalimat campuran. */
  private async fuse(idText: string, jaText: string): Promise<string | null> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: FUSION_MODEL,
        messages: [
          { role: "system", content: FUSION_PROMPT },
          { role: "user", content: `A: ${idText}\nB: ${jaText}` },
        ],
        temperature: 0,
        max_tokens: 300,
        // Tanpa reasoning: tugasnya sederhana, dan reasoning menambah ±1 detik sebelum user melihat teksnya
        reasoning_effort: "none",
      }),
      signal: AbortSignal.timeout(FUSION_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim().replace(/^["「]|["」]$/g, "").trim() ?? "";
    // Jawaban kosong atau jauh lebih panjang dari aslinya berarti model mengarang; pakai hasil Whisper saja.
    const limit = Math.max(idText.length, jaText.length) * 1.5 + 10;
    return text && text.length <= limit ? text : null;
  }

  private async request(
    file: Blob,
    fileName: string,
    language: "id" | "ja",
    customPrompt?: string,
  ): Promise<WhisperResult> {
    const form = new FormData();
    form.append("file", file, fileName);
    form.append("model", JapaneseSpeakingReviewConfig.model);
    form.append("response_format", "verbose_json");
    form.append("language", language);
    form.append("temperature", JapaneseSpeakingReviewConfig.temperature.toString());
    const prompt = customPrompt || (language === "ja" ? JapaneseSpeakingReviewConfig.prompt : CODE_SWITCH_PROMPT[language]);
    form.append("prompt", prompt);

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Groq transcription error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as VerboseJson;
    // Layer 1 & 3: Filter segmen di mana no_speech_prob < no_speech_threshold (0.6)
    const segments = (data.segments ?? []).filter((s) => s.no_speech_prob < JapaneseSpeakingReviewConfig.no_speech_threshold);
    const duration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    if (duration === 0 || segments.length === 0) {
      return { text: "", score: -Infinity, noSpeech: true };
    }

    const score = segments.reduce((sum, s) => sum + s.avg_logprob * (s.end - s.start), 0) / duration;
    return { text: data.text?.trim() ?? "", score, noSpeech: false };
  }
}
