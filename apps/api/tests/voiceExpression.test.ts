import { describe, expect, it } from "vitest";
import { extractCorrection, extractEmotion } from "../src/modules/ask/domain/emotion";
import { AskQuestion } from "../src/modules/ask/application/AskUseCase";
import { applyGain, voiceTone } from "../src/shared/infrastructure/voiceTone";

describe("extractCorrection", () => {
  it("memisahkan kalimat yang benar dari jawaban", () => {
    expect(extractCorrection("Pakai に ya, bukan で.{{benar: 学校に行きます}}")).toEqual({
      text: "Pakai に ya, bukan で.",
      correction: "学校に行きます",
    });
    expect(extractCorrection("Coba lagi {{ Benar： 駅に行く }} ya").correction).toBe("駅に行く");
  });

  it("tanpa koreksi, jawaban tidak berubah", () => {
    expect(extractCorrection("Pinter! Udah bener.")).toEqual({ text: "Pinter! Udah bener.", correction: null });
  });
});

describe("tsundere", () => {
  it("dipetakan ke ekspresi malu", () => {
    expect(extractEmotion("[tsundere] Hmph, biasa aja.").emotion).toBe("malu");
  });
});

describe("AskQuestion mode suara", () => {
  it("mengembalikan emosi dan koreksi terpisah dari teks yang dibacakan", async () => {
    const uc = new AskQuestion({
      ask: { answer: async () => "[biasa] Tujuan pakai に ya! {{benar: 学校に行きます}}" },
    });
    await expect(uc.execute("aku 学校で行きます", [], "voice")).resolves.toEqual({
      answer: "Tujuan pakai に ya!",
      emotion: "biasa",
      correction: "学校に行きます",
      speechRate: null,
    });
  });
});

describe("voiceTone", () => {
  it("emosi tak dikenal memakai nada biasa", () => {
    expect(voiceTone("entah")).toEqual(voiceTone("biasa"));
    expect(voiceTone("sedih").tempo).toBeLessThan(voiceTone("semangat").tempo);
  });

  it("applyGain memotong sampel di batas 16-bit", () => {
    const pcm = Buffer.alloc(4);
    pcm.writeInt16LE(30000, 0);
    pcm.writeInt16LE(-1000, 2);
    const out = applyGain(pcm, 1.5);
    expect(out.readInt16LE(0)).toBe(32767);
    expect(out.readInt16LE(2)).toBe(-1500);
  });
});
