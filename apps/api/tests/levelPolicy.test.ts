import { describe, expect, it } from "vitest";
import { buildSystemPrompt, findDisallowedKanji } from "../src/modules/conversation/domain/LevelPolicy";
import { dailySessionQuota, type ConversationContext } from "../src/modules/conversation/domain/Conversation";
import { parseAiJson } from "../src/modules/conversation/infrastructure/AnthropicChatProvider";

describe("Kebijakan level maskot", () => {
  it("mendeteksi kanji yang belum dipelajari", () => {
    expect(findDisallowedKanji("日本の学校です", new Set(["日", "本"]))).toEqual(["学", "校"]);
    expect(findDisallowedKanji("にほんです", new Set())).toEqual([]);
  });

  it("melarang kanji untuk pemula di system prompt", () => {
    const ctx: ConversationContext = {
      displayName: "Andi",
      role: "student",
      rules: { levelId: 1, levelCode: "PEMULA", systemPrompt: "Sederhana.", maxSentenceWords: 5, furiganaRule: "full", speechRate: 0.7 },
      mascot: { id: 1, name: "Neko-sensei", personality: "ramah" },
      scenario: null,
      memories: ["suka anime"],
      allowedKanji: new Set(),
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Jangan memakai kanji");
    expect(prompt).toContain("maksimal 5 kata");
    expect(prompt).toContain("suka anime");
  });

  it("kuota harian sesuai role", () => {
    expect(dailySessionQuota("guest", 5)).toBe(1);
    expect(dailySessionQuota("student", 5)).toBe(5);
    expect(dailySessionQuota("premium", 5)).toBeNull();
  });

  it("mengurai balasan JSON AI dan fallback ke teks biasa", () => {
    expect(parseAiJson('```json\n{"reply":"はい","correction":null}\n```')).toEqual({ reply: "はい", correction: null });
    expect(parseAiJson("こんにちは")).toEqual({ reply: "こんにちは", correction: null });
  });

  it("mengurai format <correction_data> sesuai PRD", () => {
    const raw = `こんにちは！お元気ですか？\n\n<correction_data>\n{\n  "hasCorrection": true,\n  "userMistake": "わたしわ元気",\n  "correctedSentence": "わたしは元気",\n  "explanation": "Partikel topik ditulis は."\n}\n</correction_data>`;
    expect(parseAiJson(raw)).toEqual({
      reply: "こんにちは！お元気ですか？",
      correction: {
        original: "わたしわ元気",
        corrected: "わたしは元気",
        explanation: "Partikel topik ditulis は.",
      },
    });

    const noCorrectionRaw = `すごいですね！\n<correction_data>\n{\n  "hasCorrection": false,\n  "userMistake": null,\n  "correctedSentence": null,\n  "explanation": null\n}\n</correction_data>`;
    expect(parseAiJson(noCorrectionRaw)).toEqual({
      reply: "すごいですね！",
      correction: null,
    });
  });
});
