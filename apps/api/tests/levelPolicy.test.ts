import { describe, expect, it } from "vitest";
import { buildSystemPrompt, findDisallowedKanji, rewriteInstruction } from "../src/modules/conversation/domain/LevelPolicy";
import { dailySessionQuota, type ConversationContext } from "../src/modules/conversation/domain/Conversation";
import { parseAiJson } from "../src/modules/conversation/infrastructure/AnthropicChatProvider";

describe("Kebijakan level maskot", () => {
  it("mendeteksi kanji yang belum dipelajari", () => {
    expect(findDisallowedKanji("日本の学校です", new Set(["日", "本"]))).toEqual(["学", "校"]);
    expect(findDisallowedKanji("にほんです", new Set())).toEqual([]);
  });

  it("hard_only: kanji sulit yang diberi furigana boleh dipakai", () => {
    const allowed = new Set(["日", "本"]);
    expect(findDisallowedKanji("日本の進捗(しんちょく)です", allowed, true)).toEqual([]);
    expect(findDisallowedKanji("日本の進捗です", allowed, true)).toEqual(["進", "捗"]);
    expect(findDisallowedKanji("日本の進捗(しんちょく)です", allowed)).toEqual(["進", "捗"]);
  });

  it("instruksi tulis ulang menyertakan jawaban yang dimaksud", () => {
    const text = rewriteInstruction(["遅"], "少し遅れています", true);
    expect(text).toContain("少し遅れています");
    expect(text).toContain("beri furigana");
  });

  it("N3 memakai ragam menengah dan furigana hard_only", () => {
    const ctx: ConversationContext = {
      displayName: "Rina",
      role: "student",
      rules: { levelId: 4, levelCode: "N3", systemPrompt: "", maxSentenceWords: 20, furiganaRule: "hard_only", speechRate: 0.9 },
      mascot: { id: 1, name: "Miu-chan", personality: "ramah" },
      scenario: null,
      memories: { interests: [], weakTopics: [], facts: [] },
      allowedKanji: new Set(["日", "本"]),
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Level N3 menengah");
    expect(prompt).toContain("WAJIB diberi furigana");
    expect(prompt).toContain("SELALU dalam bahasa Indonesia");
  });

  it("melarang kanji untuk pemula di system prompt", () => {
    const ctx: ConversationContext = {
      displayName: "Andi",
      role: "student",
      rules: { levelId: 1, levelCode: "PEMULA", systemPrompt: "Sederhana.", maxSentenceWords: 5, furiganaRule: "full", speechRate: 0.7 },
      mascot: { id: 1, name: "Neko-sensei", personality: "ramah" },
      scenario: null,
      memories: { interests: ["suka anime"], weakTopics: [], facts: [] },
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
