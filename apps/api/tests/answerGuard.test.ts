import { describe, expect, it } from "vitest";
import { SAFE_HINT, leakedTerms } from "../src/modules/ask/domain/answerGuard";
import { AskQuestion } from "../src/modules/ask/application/AskUseCase";

const salam = { type: "pilihan_ganda", answer: "Selamat pagi", options: ["Selamat malam", "Selamat pagi", "Terima kasih", "Sampai jumpa"] };

describe("leakedTerms", () => {
  it("menangkap kata pembeda jawaban benar", () => {
    expect(leakedTerms("Biasanya diucapkan di waktu yang cukup pagi.", salam)).toEqual(["pagi"]);
  });

  it("menangkap jawaban utuh", () => {
    expect(leakedTerms("Jawabannya Selamat pagi!", salam)).toContain("Selamat pagi");
  });

  it("kata yang juga ada di pengecoh tidak dianggap bocor", () => {
    expect(leakedTerms("Semua pilihan diawali kata selamat atau ungkapan lain, coba ingat kapan salam ini dipakai.", salam)).toEqual([]);
  });

  it("tidak salah tangkap potongan kata", () => {
    expect(leakedTerms("Coba ingat lagi pagian? bukan, maksudku pagar.", { ...salam, answer: "Pagi", options: ["Pagi", "Malam"] })).toEqual([]);
  });

  it("soal menulis: huruf Jepang dicek sebagai potongan teks", () => {
    const key = { type: "menulis", answer: "ねこ", options: [] };
    expect(leakedTerms("Tulisnya ねこ ya", key)).toEqual(["ねこ"]);
    expect(leakedTerms("Ingat bunyi ne dan ko", key)).toEqual([]);
  });

  it("soal berbicara dilewati karena kalimatnya memang tampil", () => {
    expect(leakedTerms("Ucapkan おはよう", { type: "berbicara", answer: "おはよう", options: [] })).toEqual([]);
  });
});

describe("AskQuestion mode petunjuk", () => {
  const app = { assessment: "kuis" as const, questionId: "00000000-0000-0000-0000-000000000001", widget: true };
  const deps = (replies: string[]) => {
    const seen: (string[] | undefined)[] = [];
    return {
      seen,
      deps: {
        ask: {
          answer: async (_q: string, _h: unknown[], _m?: "text" | "voice", user?: { app?: { avoid?: string[] } | null }) => {
            seen.push(user?.app?.avoid);
            return replies.shift()!;
          },
        },
        userProfile: async () => ({ name: "Tester", level: "PEMULA" }),
        answerKey: async () => salam,
      },
    };
  };

  it("menulis ulang petunjuk yang bocor dengan kata terlarang", async () => {
    const { deps: d, seen } = deps(["Diucapkan saat pagi.", "Ingat kapan hari baru dimulai."]);
    const res = await new AskQuestion(d).execute("kasih tau dong", [], "text", "u1", undefined, app);
    expect(res.answer).toBe("Ingat kapan hari baru dimulai.");
    expect(seen).toEqual([undefined, ["pagi"]]);
  });

  it("tetap bocor setelah ditulis ulang → jawaban aman", async () => {
    const { deps: d } = deps(["Selamat pagi!", "Itu pagi."]);
    const res = await new AskQuestion(d).execute("kasih tau dong", [], "text", "u1", undefined, app);
    expect(res.answer).toBe(SAFE_HINT);
    expect(res.guide).toBeNull();
  });
});
