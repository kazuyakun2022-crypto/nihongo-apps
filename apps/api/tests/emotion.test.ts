import { describe, expect, it } from "vitest";
import { extractEmotion } from "../src/modules/ask/domain/emotion";
import { AskQuestion } from "../src/modules/ask/application/AskUseCase";

describe("extractEmotion", () => {
  it("memisahkan tanda di awal jawaban", () => {
    expect(extractEmotion("[marah] Hmph! Enak aja!")).toEqual({ emotion: "marah", text: "Hmph! Enak aja!" });
    expect(extractEmotion("  [Sedih]: Yaah...")).toEqual({ emotion: "sedih", text: "Yaah..." });
    expect(extractEmotion("【biasa】こんにちは")).toEqual({ emotion: "biasa", text: "こんにちは" });
  });

  it("mengenali kesal dan sinonimnya", () => {
    expect(extractEmotion("[kesal] Hmph, terserah.")).toEqual({ emotion: "kesal", text: "Hmph, terserah." });
    expect(extractEmotion("[ngambek] Huh.").emotion).toBe("kesal");
  });

  it("memetakan sinonim ke biasa", () => {
    expect(extractEmotion("(normal) Oke").emotion).toBe("biasa");
  });

  it("mengenali senang, kaget, malu, bingung, dan semangat", () => {
    expect(extractEmotion("[senang] Sugoi! Keren banget!").emotion).toBe("senang");
    expect(extractEmotion("【kaget】Eh, benarkah?!").emotion).toBe("kaget");
    expect(extractEmotion("[malu] A-aku jadi tersipu...").emotion).toBe("malu");
    expect(extractEmotion("[bingung] Hmm, maksudnya apa ya?").emotion).toBe("bingung");
    expect(extractEmotion("[semangat] Ayo gas belajar!").emotion).toBe("semangat");
  });

  it("default biasa kalau tanda tidak ada", () => {
    expect(extractEmotion("Halo semuanya")).toEqual({ emotion: "biasa", text: "Halo semuanya" });
  });

  it("membuang tanda yang muncul di tengah kalimat", () => {
    expect(extractEmotion("[biasa] Oke [marah] deh").text).toBe("Oke deh");
  });

  it("tidak mengosongkan jawaban yang hanya berisi tanda", () => {
    expect(extractEmotion("[marah]").text).toBe("[marah]");
  });
});

describe("AskQuestion emosi", () => {
  const provider = (raw: string) => ({ answer: async () => raw });

  it("mode suara mengembalikan emosi dan teks bersih", async () => {
    const uc = new AskQuestion({ ask: provider("[sedih] Aku ikut sedih.") });
    await expect(uc.execute("aku gagal", [], "voice")).resolves.toEqual({ answer: "Aku ikut sedih.", emotion: "sedih", correction: null, speechRate: null });
  });

  it("mode teks tidak mengubah jawaban", async () => {
    const uc = new AskQuestion({ ask: provider("(senang) = happy") });
    await expect(uc.execute("arti senang", [], "text")).resolves.toEqual({ answer: "(senang) = happy", emotion: "biasa", correction: null, speechRate: null });
  });
});
