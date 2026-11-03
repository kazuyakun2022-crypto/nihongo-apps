import { describe, expect, it } from "vitest";
import { stripEmoji } from "../src/shared/domain/emoji";

describe("stripEmoji", () => {
  it("membuang emoji & keycap tanpa merusak angka", () => {
    expect(stripEmoji("ditulis dengan dua goresan: 1️⃣ goresan pertama 🎉")).toBe("ditulis dengan dua goresan: 1 goresan pertama");
  });
  it("huruf Jepang, panah, dan tanda baca tetap utuh", () => {
    const t = "食べる → 食べます。「たべる」は Golongan II！";
    expect(stripEmoji(t)).toBe(t);
  });
  it("spasi sisa sebelum tanda baca dirapikan", () => {
    expect(stripEmoji("Hebat 👍!\nAyo lanjut 💪.")).toBe("Hebat!\nAyo lanjut.");
  });
  it("teks tanpa emoji tidak diubah", () => {
    expect(stripEmoji("Nya~ 食べる (たべる, taberu) itu artinya makan.")).toBe("Nya~ 食べる (たべる, taberu) itu artinya makan.");
  });
});
