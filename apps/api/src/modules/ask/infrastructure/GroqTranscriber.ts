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
const CODE_SWITCH_PROMPT: Record<"id" | "ja", string> = {
  id: "Miu-chan, aku mau latihan 日本語. Kemarin aku 学校に行きました terus makan ラーメン. ありがとう ya!",
  ja: "ミウちゃん、今日はちょっと capek なの。でも日本語の勉強、頑張りたい！",
};

interface WhisperResult {
  text: string;
  score: number;
}

interface VerboseJson {
  text?: string;
  segments?: { start: number; end: number; avg_logprob: number; no_speech_prob: number }[];
}

export class GroqTranscriber {
  constructor(private readonly apiKey: string) {}

  /**
   * Deteksi otomatis bahasa Indonesia atau Jepang: audio ditranskripsi dua kali secara paralel
   * dengan bahasa dipaksa id dan ja, lalu dipilih hasil yang paling yakin (avg_logprob tertinggi).
   * Deteksi bawaan Whisper sering salah untuk ucapan pendek beraksen.
   * Latihan berbicara memaksa "ja" karena siswa memang diminta mengucapkan bahasa Jepang.
   */
  async transcribe(audio: Buffer, mimeType: string, language?: "ja"): Promise<string> {
    const baseType = mimeType.split(";")[0].trim().toLowerCase();
    const file = new Blob([new Uint8Array(audio)], { type: baseType });
    const fileName = `audio.${EXTENSIONS[baseType] ?? "webm"}`;

    const [id, ja] = await Promise.all([
      language ? null : this.request(file, fileName, "id"),
      this.request(file, fileName, "ja"),
    ]);
    const best = id && id.score >= ja.score ? id : ja;

    const normalized = best.text.toLowerCase().replace(/[.!?。！？\s]+$/u, "");
    // Rekaman hampir hening kadang membuat Whisper mengulang prompt konteks.
    const echoesPrompt = Object.values(CODE_SWITCH_PROMPT).some((p) => best.text.includes(p.slice(0, 20)));
    return HALLUCINATIONS.includes(normalized) || echoesPrompt ? "" : best.text;
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
