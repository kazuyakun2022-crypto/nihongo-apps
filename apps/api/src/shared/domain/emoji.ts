/**
 * Aplikasi tampil tanpa emoji. Prompt sudah melarang emoji, tapi model kadang tetap menulisnya (uji: "1️⃣ goresan
 * pertama"), jadi teks AI disaring sebelum ditampilkan atau dibacakan.
 * Aman untuk huruf Jepang, angka, tanda baca, dan panah (→ dipakai di penjelasan tata bahasa: 食べる → 食べ).
 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}\u{200D}]/gu;

export function stripEmoji(text: string): string {
  if (!EMOJI.test(text)) return text;
  EMOJI.lastIndex = 0;
  return text
    .replace(EMOJI, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?。、！？])/g, "$1")
    .replace(/^[ \t]+|[ \t]+$/gm, "");
}
