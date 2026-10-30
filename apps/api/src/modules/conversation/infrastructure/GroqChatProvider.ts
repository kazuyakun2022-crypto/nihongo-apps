import type { ChatMessage } from "../domain/Conversation";
import type { AiChatProvider, AiReply } from "../domain/ports";
import { parseAiReply } from "./AnthropicChatProvider";

/**
 * Adapter ke Groq (API kompatibel OpenAI) untuk ngobrol & skenario, dipakai bila ANTHROPIC_API_KEY kosong.
 * Model sama dengan mode suara Tanya Sensei; format balasan (<correction_data>) dibaca parseAiReply.
 */
export class GroqChatProvider implements AiChatProvider {
  constructor(private readonly apiKey: string) {}

  async reply(systemPrompt: string, history: ChatMessage[], extraInstruction?: string): Promise<AiReply> {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    ];
    // Sapaan pembuka: belum ada pesan user, beri pemicu singkat
    if (history.length === 0) messages.push({ role: "user", content: "（会話を始めてください）" });
    if (extraInstruction) messages.push({ role: "user", content: extraInstruction });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", messages, max_tokens: 1024, temperature: 0.8, reasoning_effort: "medium" }),
    });
    if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { choices: { message?: { content?: string } }[] };
    return parseAiReply(data.choices[0]?.message?.content ?? "");
  }
}
