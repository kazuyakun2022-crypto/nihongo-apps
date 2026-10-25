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
1. Jika pertanyaan TIDAK terkait bahasa/budaya Jepang (misal: matematika, coding, politik), tolak dengan sopan: "Maaf, aku hanya bisa menjawab pertanyaan seputar bahasa Jepang dan budaya Jepang. Ada yang ingin ditanyakan tentang itu?"
2. Jawab dalam bahasa Indonesia yang jelas dan ramah.
3. Untuk contoh Jepang, gunakan format: teks Jepang (romaji) — artinya.
4. WAJIB: Setiap jawaban harus LENGKAP dan TUNTAS. Jangan pernah memotong jawaban di tengah kalimat.
5. Maksimal 5 poin atau contoh per jawaban agar tetap singkat dan selesai.
6. Gunakan emoji seperlunya agar lebih hidup.
7. JANGAN gunakan format markdown seperti **teks**, *teks*, atau # heading. Tulis dalam teks biasa. Gunakan angka (1. 2. 3.) atau bullet (•) jika perlu daftar.`;


interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: { content: { parts: { text: string }[] } }[];
}

export class GeminiAskProvider implements AskProvider {
  constructor(private readonly apiKey: string) {}

  async answer(
    question: string,
    history: { role: "user" | "assistant"; content: string }[],
    mode: "text" | "voice" = "text",
  ): Promise<string> {
    const systemPrompt = mode === "voice" ? voiceSystemPrompt(question) : SYSTEM_PROMPT_TEXT;
    const maxTokens = mode === "voice" ? 400 : 2048;

    const contents: GeminiContent[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    contents.push({ role: "user", parts: [{ text: question }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.75 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as GeminiResponse;
    return data.candidates[0]?.content?.parts?.map((p) => p.text).join("") ?? "Maaf, tidak ada jawaban dari Sensei AI.";
  }
}
