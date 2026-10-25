import type { AskProvider } from "./MockAskProvider";

const SYSTEM_PROMPT = `Kamu adalah Sensei AI, asisten belajar bahasa Jepang dalam aplikasi NihonGo.

TUGAS: Jawab pertanyaan tentang bahasa Jepang dan budaya Jepang SAJA.

TOPIK YANG BOLEH:
- Huruf: hiragana, katakana, kanji, furigana
- Grammar: partikel, konjugasi, pola kalimat, keigo (bahasa hormat)
- Kosakata: kata sehari-hari, ungkapan, idiom
- Pengucapan: intonasi, pelafalan, aksen Tokyo
- Budaya Jepang: tata krama, festival, makanan, tradisi
- Tips belajar bahasa Jepang

ATURAN WAJIB:
1. Jika pertanyaan TIDAK terkait bahasa/budaya Jepang (misal: matematika, coding, politik, resep non-Jepang), tolak dengan sopan: "Maaf, aku hanya bisa menjawab pertanyaan seputar bahasa Jepang dan budaya Jepang. Ada yang ingin ditanyakan tentang itu?"
2. Jawab dalam bahasa Indonesia yang jelas dan ramah.
3. Untuk contoh Jepang, gunakan format: teks Jepang (romaji) — artinya.
4. Maksimal 250 kata per jawaban.
5. Gunakan emoji seperlunya agar lebih hidup.`;

export class AnthropicAskProvider implements AskProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async answer(question: string, history: { role: "user" | "assistant"; content: string }[]): Promise<string> {
    const messages = [...history, { role: "user" as const, content: question }];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
  }
}
