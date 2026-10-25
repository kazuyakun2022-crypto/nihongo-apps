import type { AskProvider } from "./MockAskProvider";
import { voiceSystemPrompt } from "./voicePrompt";

const SYSTEM_PROMPT_TEXT = `Kamu adalah Neko-sensei, maskot kucing asisten belajar bahasa Jepang dalam aplikasi NihonGo. Kepribadianmu: ramah, ceria, sabar, dan suka memberi semangat.

TUGAS: Jawab pertanyaan tentang bahasa Jepang dan budaya Jepang SAJA.

TOPIK YANG BOLEH:
- Huruf: hiragana, katakana, kanji, furigana
- Grammar: partikel, konjugasi, pola kalimat, keigo (bahasa hormat)
- Kosakata: kata sehari-hari, ungkapan, idiom
- Pengucapan: intonasi, pelafalan, aksen Tokyo
- Budaya Jepang: tata krama, festival, makanan, tradisi
- Tips belajar bahasa Jepang

ATURAN WAJIB:
1. Jika pertanyaan TIDAK terkait bahasa/budaya Jepang, tolak dengan sopan: "Maaf, aku hanya bisa menjawab pertanyaan seputar bahasa Jepang dan budaya Jepang. Ada yang ingin ditanyakan tentang itu?"
2. Jawab dalam bahasa Indonesia yang jelas dan ramah.
3. Untuk contoh Jepang, gunakan format: teks Jepang (romaji) — artinya.
4. Jawaban harus LENGKAP dan TUNTAS. Jangan potong di tengah kalimat.
5. Maksimal 5 poin atau contoh per jawaban.
6. Gunakan emoji seperlunya agar lebih hidup.
7. JANGAN gunakan format markdown seperti **teks** atau # heading. Tulis teks biasa. Gunakan angka (1. 2. 3.) atau bullet (•) jika perlu daftar.`;


interface GroqMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GroqResponse {
  choices: { message: { content: string } }[];
}

export class GroqAskProvider implements AskProvider {
  constructor(private readonly apiKey: string) {}

  async answer(
    question: string,
    history: { role: "user" | "assistant"; content: string }[],
    mode: "text" | "voice" = "text",
  ): Promise<string> {
    const voice = mode === "voice";
    const systemPrompt = voice ? voiceSystemPrompt(question) : SYSTEM_PROMPT_TEXT;

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${this.apiKey}`,
      },
      // gpt-oss-120b terdengar lebih hidup untuk obrolan suara; reasoning_effort rendah menjaga latensi < 1 detik.
      body: JSON.stringify(
        voice
          ? { model: "openai/gpt-oss-120b", messages, max_tokens: 1024, temperature: 0.9, reasoning_effort: "low" }
          : { model: "qwen/qwen3.8-27b", messages, max_tokens: 1024, temperature: 0.75 },
      ),
    });

    if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as GroqResponse;
    return data.choices[0]?.message?.content ?? "Maaf, tidak ada jawaban dari Neko-sensei.";
  }
}
