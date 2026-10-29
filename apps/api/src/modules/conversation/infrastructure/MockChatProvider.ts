import type { ChatMessage } from "../domain/Conversation";
import type { AiChatProvider, AiReply } from "../domain/ports";

/**
 * Maskot tiruan untuk development tanpa API key. Balasan sengaja hanya kana
 * agar aman untuk semua level, dan ada contoh koreksi partikel.
 */
export class MockChatProvider implements AiChatProvider {
  private readonly lines = [
    "こんにちは！わたしは ネコせんせい です。おなまえは なんですか？",
    "いいですね！しゅみは なんですか？",
    "そうですか。わたしも すきです！",
    "きょうは なにを しましたか？",
    "すごい！もっと おしえて ください。",
  ];

  async reply(_system: string, history: ChatMessage[]): Promise<AiReply> {
    const userTurns = history.filter((m) => m.sender === "user");
    const last = userTurns.at(-1)?.text ?? "";
    const line = this.lines[Math.min(userTurns.length, this.lines.length - 1)];
    const correction = last.includes("わたしわ")
      ? { original: "わたしわ", corrected: "わたしは", explanation: "Partikel topik ditulis は walau dibaca \"wa\"." }
      : null;
    return { reply: line, correction, emotion: correction ? "encouraging" : "playful" };
  }
}
