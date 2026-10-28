const BASE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o", ん: "n", ゔ: "vu",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};
const SMALL_Y: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o" };
const SMALL_VOWEL: Record<string, string> = { ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o" };

/** Katakana → hiragana; ー tetap. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** Kana → romaji Hepburn (きょう → kyou, がっこう → gakkou, コーヒー → koohii). Karakter selain kana dibiarkan. */
export function toRomaji(text: string): string {
  const chars = [...toHiragana(text)];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (c === "っ") {
      const following = next ? BASE[next] : undefined;
      out += following ? (following.startsWith("ch") ? "t" : following[0]) : "";
      continue;
    }
    if (c === "ー") {
      out += /[aiueo]$/.test(out) ? out[out.length - 1] : "-";
      continue;
    }
    let syllable = BASE[c];
    if (!syllable) {
      out += c;
      continue;
    }
    if (next && SMALL_Y[next] && /i$/.test(syllable) && syllable !== "i") {
      // き+ゃ → kya, し+ゃ → sha, ち+ゃ → cha, じ+ゃ → ja
      syllable = /^(sh|ch|j)/.test(syllable) ? syllable.slice(0, -1) + SMALL_Y[next] : syllable.slice(0, -1) + "y" + SMALL_Y[next];
      i++;
    } else if (next && SMALL_VOWEL[next] && syllable.length > 1) {
      // フ+ァ → fa, テ+ィ → ti
      syllable = syllable.slice(0, -1) + SMALL_VOWEL[next];
      i++;
    }
    if (c === "ん" && next && /^[aiueoy]/.test(BASE[next] ?? "")) syllable = "n'";
    out += syllable;
  }
  return out;
}

/** Ada kana di teks? Dipakai untuk memutuskan apakah romaji perlu ditampilkan. */
export function hasKana(text: string): boolean {
  return /[ぁ-ゖァ-ヺ]/.test(text);
}
