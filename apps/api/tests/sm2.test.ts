import { describe, expect, it } from "vitest";
import { review } from "../src/modules/srs/domain/sm2";

const fresh = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapseCount: 0 };

describe("SM-2", () => {
  it("menjadwalkan 1 hari lalu 6 hari untuk jawaban 'bisa'", () => {
    const first = review(fresh, "bisa");
    expect(first.intervalDays).toBe(1);
    const second = review(first, "bisa");
    expect(second.intervalDays).toBe(6);
  });

  it("mengulang dari awal dan menghitung lupa saat 'lupa'", () => {
    const learned = review(review(fresh, "bisa"), "bisa");
    const forgot = review(learned, "lupa");
    expect(forgot.intervalDays).toBe(1);
    expect(forgot.repetitions).toBe(0);
    expect(forgot.lapseCount).toBe(1);
  });

  it("menandai kata lemah setelah 3 kali lupa", () => {
    let card = { ...fresh, isWeak: false };
    for (let i = 0; i < 3; i++) card = review(card, "lupa");
    expect(card.isWeak).toBe(true);
  });

  it("ease factor tidak pernah di bawah 1.3", () => {
    let card = { ...fresh, isWeak: false };
    for (let i = 0; i < 10; i++) card = review(card, "lupa");
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
