import { describe, expect, it } from "vitest";
import { HIRAGANA_BASIC, MASTERY_GATE, buildGateItems, gradeGate } from "../src/modules/exam/domain/MasteryGate";

const vocab = Array.from({ length: 20 }, (_, i) => ({ id: `v${i}`, word: `w${i}`, meaning: `arti ${i}` }));

describe("Mastery Gate Pre-N5", () => {
  it("menyusun 46 hiragana + 10 kosakata, masing-masing 4 pilihan berisi jawaban benar", () => {
    const items = buildGateItems(vocab);
    expect(items).toHaveLength(HIRAGANA_BASIC.length + MASTERY_GATE.vocabItems);
    for (const item of items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options).toContain(item.answer);
    }
  });

  it("lulus bila ≥95% benar dalam batas waktu", () => {
    const items = buildGateItems(vocab);
    const answers = items.map((it, index) => ({ index, answer: it.answer, ms: 800 }));
    // Dua kesalahan dari 56 soal = 96%
    answers[0] = { ...answers[0], answer: "salah" };
    answers[1] = { ...answers[1], answer: "salah" };
    const g = gradeGate(items, answers);
    expect(g.accuracy).toBe(96);
    expect(g.passed).toBe(true);
  });

  it("jawaban benar yang terlalu lambat dihitung gagal dan ditandai lambat", () => {
    const items = buildGateItems(vocab);
    const answers = items.map((it, index) => ({ index, answer: it.answer, ms: index < 4 ? 2500 : 900 }));
    const g = gradeGate(items, answers);
    expect(g.results.filter((r) => r.slow)).toHaveLength(4);
    expect(g.accuracy).toBe(Math.round((52 / 56) * 100));
    expect(g.passed).toBe(false);
  });

  it("soal tanpa jawaban (waktu habis) dihitung salah", () => {
    const items = buildGateItems(vocab);
    const g = gradeGate(items, []);
    expect(g.accuracy).toBe(0);
    expect(g.passed).toBe(false);
  });
});
