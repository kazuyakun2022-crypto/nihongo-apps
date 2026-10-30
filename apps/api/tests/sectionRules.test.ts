import { describe, expect, it } from "vitest";
import { examTotal, parseSectionRules, pickQuestions, sectionMin } from "../src/modules/exam/domain/SectionRules";

const N5 = {
  kosakata: { count: 35, minScore: 80 },
  tata_bahasa: { count: 18, minScore: 80 },
  membaca: { count: 12, minScore: 80 },
  mendengar: { count: 20, minScore: 75 },
};
const pool = (["kosakata", "tata_bahasa", "membaca", "mendengar"] as const).flatMap((section) =>
  Array.from({ length: 50 }, (_, i) => ({ id: `${section}-${i}`, section })),
);

describe("aturan ujian per bagian", () => {
  it("membaca aturan valid dan mengabaikan isian rusak", () => {
    expect(parseSectionRules(N5)).toEqual(N5);
    expect(parseSectionRules(null)).toBeNull();
    expect(parseSectionRules({ kosakata: { count: "x", minScore: 80 } })).toBeNull();
  });

  it("total soal = jumlah per bagian; tanpa aturan = questionCount", () => {
    expect(examTotal(30, parseSectionRules(N5))).toBe(85);
    expect(examTotal(30, null)).toBe(30);
  });

  it("mengambil soal sesuai jumlah per bagian", () => {
    const picked = pickQuestions(pool, 30, parseSectionRules(N5));
    expect(picked).toHaveLength(85);
    const count = (s: string) => picked.filter((q) => q.section === s).length;
    expect([count("kosakata"), count("tata_bahasa"), count("membaca"), count("mendengar")]).toEqual([35, 18, 12, 20]);
  });

  it("kekurangan di satu bagian ditutup dari bagian lain", () => {
    const small = pool.filter((q) => q.section !== "membaca" || q.id.endsWith("-1"));
    const picked = pickQuestions(small, 30, parseSectionRules(N5));
    expect(picked).toHaveLength(85);
    expect(new Set(picked.map((q) => q.id)).size).toBe(85);
  });

  it("nilai minimal per bagian, dengan cadangan sectionMinScore", () => {
    const rules = parseSectionRules(N5);
    expect(sectionMin(rules, "mendengar", 60)).toBe(75);
    expect(sectionMin(rules, "kosakata", 60)).toBe(80);
    expect(sectionMin(null, "kosakata", 60)).toBe(60);
  });
});
