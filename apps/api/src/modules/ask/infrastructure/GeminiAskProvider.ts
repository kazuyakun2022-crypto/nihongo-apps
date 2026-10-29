import type { AskProvider } from "./MockAskProvider";
import { voiceSystemPrompt, type AskUser } from "./voicePrompt";
import { textSystemPrompt } from "./textPrompt";

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
    user?: AskUser,
    transcriptAlt?: string,
  ): Promise<string> {
    const systemPrompt = mode === "voice" ? voiceSystemPrompt(question, user, transcriptAlt) : textSystemPrompt(user);
    const maxTokens = mode === "voice" ? 400 : 2048;

    const contents: GeminiContent[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    contents.push({ role: "user", parts: [{ text: question }] });

    // Alias "latest" mengikuti Flash-Lite terbaru (versi bernomor lama dipensiunkan Google dan membalas 404).
    // Lite dipilih karena menjawab ±1,5 detik; Flash biasa bisa lebih dari 40 detik.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        // Berpikir seminimal mungkin: lebih cepat, dan jatah token output tidak habis untuk berpikir
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.75, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as GeminiResponse;
    return data.candidates[0]?.content?.parts?.map((p) => p.text).join("") ?? "Maaf, tidak ada jawaban dari Sensei AI.";
  }
}
