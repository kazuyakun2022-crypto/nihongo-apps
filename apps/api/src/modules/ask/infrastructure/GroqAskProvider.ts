import type { AskProvider } from "./MockAskProvider";
import { voiceSystemPrompt, type AskUser } from "./voicePrompt";
import { textSystemPrompt } from "./textPrompt";

interface GroqMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GroqResponse {
  choices: { message: { content: string | null } }[];
}

/**
 * Model dicoba berurutan; kalau satu kena batas kuota (429) atau gagal, lanjut ke berikutnya, lalu ke penyedia
 * cadangan (Gemini). Tiap model Groq punya kuota per menit sendiri, jadi rantai ini melipatgandakan kapasitas.
 *
 * Mode teks (tab Tanya AI) mendahulukan gpt-oss-120b: dalam uji pertanyaan tata bahasa dasar (は/が, golongan
 * kata kerja, bentuk て, です/ます) jawabannya benar semua, sedangkan qwen sering mengarang (mis. 食べる disebut
 * golongan I). Temperature rendah karena ini penjelasan fakta, bukan obrolan.
 * Catatan kuota gratis: qwen hanya 1.000 token keluaran/menit (±3 jawaban), gpt-oss 8.000 token/menit.
 */
const TEXT_MODELS = [
  { model: "openai/gpt-oss-120b", max_tokens: 2048, temperature: 0.3, reasoning_effort: "medium" },
  { model: "qwen/qwen3.8-27b", max_tokens: 1024, temperature: 0.3 },
];
// Mode suara tidak diubah: format tanda emosi/tempo/koreksinya sudah diuji dengan gpt-oss
const VOICE_MODELS = [{ model: "openai/gpt-oss-120b", max_tokens: 1024, temperature: 0.9, reasoning_effort: "low" }];

export class GroqAskProvider implements AskProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fallbackProvider?: AskProvider,
  ) {}

  async answer(
    question: string,
    history: { role: "user" | "assistant"; content: string }[],
    mode: "text" | "voice" = "text",
    user?: AskUser,
    transcriptAlt?: string,
  ): Promise<string> {
    const voice = mode === "voice";
    const systemPrompt = voice ? voiceSystemPrompt(question, user, transcriptAlt) : textSystemPrompt(user);

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    let lastError: unknown = null;
    for (const config of voice ? VOICE_MODELS : TEXT_MODELS) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ ...config, messages }),
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error(`Groq ${config.model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

        const data = (await res.json()) as GroqResponse;
        const content = data.choices[0]?.message?.content?.trim();
        // Jawaban kosong (mis. jatah token habis untuk berpikir) dianggap gagal supaya model berikutnya dicoba
        if (!content) throw new Error(`Groq ${config.model}: jawaban kosong`);
        return content;
      } catch (err) {
        lastError = err;
        console.warn("[GroqAskProvider] model gagal atau kena batas kuota, coba berikutnya:", (err as Error).message);
      }
    }

    if (this.fallbackProvider) return this.fallbackProvider.answer(question, history, mode, user, transcriptAlt);
    throw lastError instanceof Error ? lastError : new Error("Miu-chan belum bisa menjawab sekarang.");
  }
}
