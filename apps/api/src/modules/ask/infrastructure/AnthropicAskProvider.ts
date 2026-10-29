import type { AskProvider } from "./MockAskProvider";
import { voiceSystemPrompt, type AskUser } from "./voicePrompt";
import { textSystemPrompt } from "./textPrompt";

export class AnthropicAskProvider implements AskProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async answer(
    question: string,
    history: { role: "user" | "assistant"; content: string }[],
    mode: "text" | "voice" = "text",
    user?: AskUser,
    transcriptAlt?: string,
  ): Promise<string> {
    const voice = mode === "voice";
    const system = voice ? voiceSystemPrompt(question, user, transcriptAlt) : textSystemPrompt(user);
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
        max_tokens: voice ? 400 : 1024,
        system,
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
