import { describe, expect, it } from "vitest";
import {
  createSpeakingTarget,
  isSpeakingMatch,
  kanjiToKana,
  normalizePhoneticSpeech,
  sanitizePreN5Kana,
} from "../src/modules/learning/domain/speakingTarget";
import { getOrthographyPrompt } from "../src/modules/conversation/domain/LevelPolicy";

describe("Dual-Field Schema & SpeakingTarget", () => {
  it("membuat target pembelajaran dengan field ganda (displayText & phoneticTarget)", () => {
    const target = createSpeakingTarget({
      lessonLevel: "PRE_N5",
      itemType: "VOCABULARY",
      displayText: "ねこ",
      kanjiAlternative: "猫",
      romaji: "neko",
      acceptedReadings: ["ねこ", "ネコ", "猫"],
    });

    expect(target.lessonLevel).toBe("PRE_N5");
    expect(target.itemType).toBe("VOCABULARY");
    expect(target.displayText).toBe("ねこ");
    expect(target.phoneticTarget).toBe("ねこ");
    expect(target.kanjiAlternative).toBe("猫");
    expect(target.romaji).toBe("neko");
    expect(target.acceptedReadings).toContain("ねこ");
    expect(target.acceptedReadings).toContain("ネコ");
    expect(target.acceptedReadings).toContain("猫");
  });

  it("mencocokkan suara STT kanji (猫) terhadap target hiragana (ねこ) secara adil", () => {
    const target = createSpeakingTarget({
      lessonLevel: "PRE_N5",
      displayText: "ねこ",
      acceptedReadings: ["ねこ", "ネコ", "猫"],
    });

    // Semua bentuk ini harus dianggap BENAR
    expect(isSpeakingMatch("猫", target)).toBe(true);
    expect(isSpeakingMatch("ねこ", target)).toBe(true);
    expect(isSpeakingMatch("ネコ", target)).toBe(true);
    expect(isSpeakingMatch("ねこ。", target)).toBe(true);

    // Kata yang salah tetap ditolak
    expect(isSpeakingMatch("いぬ", target)).toBe(false);
  });
});

describe("Normalizer & Sanitizer Backend", () => {
  it("sanitizer Pre-N5 otomatis mengubah kanji yang lolos kembali menjadi kana", () => {
    expect(sanitizePreN5Kana("猫")).toBe("ねこ");
    expect(sanitizePreN5Kana("私は学生です")).toBe("わたしはがくせいです");
    expect(sanitizePreN5Kana("パンを食べます")).toBe("パンをたべます");
    expect(sanitizePreN5Kana("朝ご飯(あさごはん)")).toBe("あさごはん");
  });

  it("normalisasi partikel lisan memetakan bunyi fonem yang sebenarnya diucapkan", () => {
    // Topik 'は' dibaca /wa/ -> dinormalisasi setara 'わ'
    expect(normalizePhoneticSpeech("わたしはがくせいです")).toBe(
      normalizePhoneticSpeech("わたしわがくせいです"),
    );

    // Arah 'へ' dibaca /e/ -> dinormalisasi setara 'え'
    expect(normalizePhoneticSpeech("がっこうへいく")).toBe(
      normalizePhoneticSpeech("がっこうえいく"),
    );

    // Alofon づ/ず dan ぢ/じ
    expect(normalizePhoneticSpeech("つづく")).toBe(normalizePhoneticSpeech("つずく"));
  });

  it("kanjiToKana memetakan kanji dasar ke hiragana", () => {
    expect(kanjiToKana("猫")).toBe("ねこ");
    expect(kanjiToKana("犬")).toBe("いぬ");
    expect(kanjiToKana("水")).toBe("みず");
    expect(kanjiToKana("友達")).toBe("ともだち");
  });
});

describe("Level-Aware Orthography Constraints", () => {
  it("Pre-N5 & N5 Pemula memiliki aturan zero-kanji / pure kana mode yang ketat", () => {
    const prompt = getOrthographyPrompt("PRE_N5");
    expect(prompt).toContain("pemula absolut");
    expect(prompt).toContain("DILARANG menggunakan huruf Kanji apa pun");
    expect(prompt).toContain("WAJIB ditulis murni menggunakan Hiragana dan Katakana");
  });

  it("N5 Lanjutan & N4 dibatasi 100 kanji dasar + furigana", () => {
    const prompt = getOrthographyPrompt("N5");
    expect(prompt).toContain("100 Kanji N5 dasar");
    expect(prompt).toContain("wajib ditulis dalam Hiragana");
    expect(prompt).toContain("furigana");
  });

  it("N3 ke atas menggunakan ortografi penulisan standar orang dewasa", () => {
    const prompt = getOrthographyPrompt("N2");
    expect(prompt).toContain("penulisan standar orang dewasa");
    expect(prompt).toContain("Kanji alami");
  });
});

