import type { ChatMessage } from "../domain/Conversation";
import type { AiChatProvider, AiReply } from "../domain/ports";

/** Adapter ke Anthropic Messages API. Model diatur lewat AI_MODEL di .env. */
export class AnthropicChatProvider implements AiChatProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async reply(systemPrompt: string, history: ChatMessage[], extraInstruction?: string): Promise<AiReply> {
    const messages = history.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
    // API mewajibkan pesan pertama dari "user"; untuk sapaan pembuka kita kirim pemicu singkat.
    if (messages.length === 0 || messages[0].role !== "user") messages.unshift({ role: "user", content: "（会話を始めてください）" });
    if (extraInstruction) messages.push({ role: "user", content: extraInstruction });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: this.model, max_tokens: 400, system: systemPrompt, messages: mergeSameRole(messages) }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return parseAiJson(text);
  }
}

/** API tidak menerima dua pesan berurutan dengan role sama; gabungkan bila terjadi. */
function mergeSameRole(messages: { role: string; content: string }[]) {
  return messages.reduce<{ role: string; content: string }[]>((acc, m) => {
    const last = acc.at(-1);
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else acc.push({ ...m });
    return acc;
  }, []);
}

/** Mengurai JSON dari model dengan aman; jika gagal, anggap seluruh teks sebagai balasan. */
export function parseAiJson(text: string): AiReply {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<AiReply>;
    if (typeof parsed.reply === "string") return { reply: parsed.reply, correction: parsed.correction ?? null };
  } catch {
    /* jatuh ke fallback */
  }
  return { reply: cleaned, correction: null };
}
