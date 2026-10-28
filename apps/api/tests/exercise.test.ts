import { describe, expect, it } from "vitest";
import { canCompose, exerciseProblem, isAnswerCorrect, scriptOf, speechSimilarity } from "../src/modules/learning/domain/Exercise";

describe("penilaian latihan", () => {
  it("susun kalimat: spasi dan tanda baca diabaikan", () => {
    const key = { type: "susun_kalimat" as const, correctAnswer: "わたしはがくせいです", options: [] };
    expect(isAnswerCorrect(key, "わたし は がくせい です。")).toBe(true);
    expect(isAnswerCorrect(key, "がくせいはわたしです")).toBe(false);
    expect(isAnswerCorrect(key, "")).toBe(false);
  });

  it("menulis: hiragana dan katakana tidak dianggap sama", () => {
    const key = { type: "menulis" as const, correctAnswer: "ねこ", options: [] };
    expect(isAnswerCorrect(key, "ねこ")).toBe(true);
    expect(isAnswerCorrect(key, "ネコ")).toBe(false);
  });

  it("berbicara: menerima variasi tulisan dan sedikit salah dengar", () => {
    const key = { type: "berbicara" as const, correctAnswer: "わたしはがくせいです", options: ["私は学生です"] };
    expect(isAnswerCorrect(key, "私は学生です。")).toBe(true);
    expect(isAnswerCorrect(key, "わたしはがくせえです")).toBe(true);
    expect(isAnswerCorrect(key, "こんにちは")).toBe(false);
    expect(speechSimilarity("コーヒー", "こーひー")).toBe(1);
  });

  it("kepingan harus bisa membentuk jawaban", () => {
    expect(canCompose("わたしは", ["は", "わたし", "が"])).toBe(true);
    expect(canCompose("ねこ", ["ね", "か"])).toBe(false);
    expect(canCompose("ここ", ["こ"])).toBe(false);
  });

  it("menulis hanya boleh kana atau kanji yang ada di bab", () => {
    expect(exerciseProblem({ type: "menulis", correctAnswer: "ねこ", options: [] }, [])).toBeNull();
    expect(exerciseProblem({ type: "menulis", correctAnswer: "猫", options: [] }, [])).toMatch(/猫/);
    expect(exerciseProblem({ type: "menulis", correctAnswer: "猫", options: [] }, ["猫"])).toBeNull();
  });
});

describe("aksara soal menulis", () => {
  it("mengenali hiragana, katakana, dan campuran", () => {
    expect(scriptOf("ねこ")).toBe("hiragana");
    expect(scriptOf("コーヒー")).toBe("katakana");
    expect(scriptOf("猫ちゃん")).toBe("campuran");
  });
});
