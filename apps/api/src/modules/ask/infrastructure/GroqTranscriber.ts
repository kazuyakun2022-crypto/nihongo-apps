import { containsJapanese } from "./learnerContext";

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

// Whisper suka "berhalusinasi" kalimat penutup video saat rekaman hampir hening.
const HALLUCINATIONS = [
  "terima kasih telah menonton",
  "terima kasih sudah menonton",
  "ご視聴ありがとうございました",
  "thank you for watching",
];

// Contoh ucapan campuran sebagai konteks Whisper: kata Jepang di tengah kalimat Indonesia tetap ditulis
// huruf Jepang (bukan dipaksa jadi kata Indonesia), dan sebaliknya.
// Kata yang sering ditanyakan pelajar (食べる, です, artinya) ikut dimasukkan supaya dikenali sejak awal.
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
}

export interface Transcript {
  text: string;
  /**
   * Versi bahasa Jepang dari ucapan campuran yang sama. Dikirim ke AI sebagai cadangan
   * untuk menebak kata Jepang bila penggabungan transkrip gagal atau masih keliru.
   */
  alt: string | null;
}

interface VerboseJson {
  text?: string;
  segments?: { start: number; end: number; avg_logprob: number; no_speech_prob: number }[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s.,!?、。！？]/gu, "");
}

function isNoise(text: string): boolean {
  if (!text) return true;
  const normalized = text.toLowerCase().replace(/[.!?。！？\s]+$/u, "");
  // Rekaman hampir hening kadang membuat Whisper mengulang prompt konteks.
  const echoesPrompt = Object.values(CODE_SWITCH_PROMPT).some((p) => text.includes(p.slice(0, 20)));
  return HALLUCINATIONS.includes(normalized) || echoesPrompt;
}

export class GroqTranscriber {
  constructor(private readonly apiKey: string) {}

  /**
   * Deteksi otomatis bahasa Indonesia atau Jepang: audio ditranskripsi dua kali secara paralel
   * dengan bahasa dipaksa id dan ja, lalu dipilih hasil yang paling yakin (avg_logprob tertinggi).
   * Deteksi bawaan Whisper sering salah untuk ucapan pendek beraksen.
   * Bila skornya berdekatan (ucapan campuran), kedua transkrip digabung oleh LLM supaya bagian
   * Indonesia tetap Latin dan bagian Jepang tetap huruf Jepang.
   * Latihan berbicara memaksa "ja" karena siswa memang diminta mengucapkan bahasa Jepang.
   */
  async transcribe(audio: Buffer, mimeType: string, language?: "ja"): Promise<Transcript> {
    const baseType = mimeType.split(";")[0].trim().toLowerCase();
    const file = new Blob([new Uint8Array(audio)], { type: baseType });
    const fileName = `audio.${EXTENSIONS[baseType] ?? "webm"}`;

    const [id, ja] = await Promise.all([
      language ? null : this.request(file, fileName, "id"),
      this.request(file, fileName, "ja"),
    ]);
    const best = id && id.score >= ja.score ? id : ja;
    if (isNoise(best.text)) return { text: "", alt: null };

    const mixed =
      id !== null &&
      Math.abs(id.score - ja.score) <= MIXED_MAX_SCORE_GAP &&
      !isNoise(id.text) &&
      !isNoise(ja.text) &&
      containsJapanese(ja.text) &&
      normalize(id.text) !== normalize(ja.text);
    if (!mixed) return { text: best.text, alt: null };

    const fused = await this.fuse(id.text, ja.text).catch((err: unknown) => {
      console.warn("[transcribe] penggabungan transkrip gagal:", err instanceof Error ? err.message : err);
      return null;
    });
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

  private async request(file: Blob, fileName: string, language: "id" | "ja"): Promise<WhisperResult> {
    const form = new FormData();
    form.append("file", file, fileName);
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("language", language);
    form.append("temperature", "0");
    form.append("prompt", CODE_SWITCH_PROMPT[language]);

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Groq transcription error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as VerboseJson;
    const segments = (data.segments ?? []).filter((s) => s.no_speech_prob < 0.8);
    const duration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    if (duration === 0) return { text: "", score: -Infinity };

    const score = segments.reduce((sum, s) => sum + s.avg_logprob * (s.end - s.start), 0) / duration;
    return { text: data.text?.trim() ?? "", score };
  }
}
