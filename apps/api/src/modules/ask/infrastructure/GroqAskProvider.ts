import type { AskProvider } from "./MockAskProvider";
import { voiceSystemPrompt, type AskUser } from "./voicePrompt";
import { textSystemPrompt } from "./textPrompt";

interface GroqMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GroqResponse {
  choices: { message: { content: string } }[];
}

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

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(
          voice
            ? { model: "openai/gpt-oss-120b", messages, max_tokens: 1024, temperature: 0.9, reasoning_effort: "low" }
            : { model: "qwen/qwen3.8-27b", messages, max_tokens: 1024, temperature: 0.75 },
        ),
      });

      if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as GroqResponse;
      return data.choices[0]?.message?.content ?? "Maaf, tidak ada jawaban dari Miu-chan.";
    } catch (err) {
      if (this.fallbackProvider) {
        console.warn("[GroqAskProvider] Groq gagal atau kena batas kuota, beralih ke penyedia cadangan:", (err as Error).message);
        return this.fallbackProvider.answer(question, history, mode, user, transcriptAlt);
      }
      throw err;
    }
  }
}
