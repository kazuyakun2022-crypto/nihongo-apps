/**
 * Penjaga mode petunjuk: memastikan jawaban Miu-chan saat latihan/kuis tidak membocorkan kunci jawaban.
 * Prompt saja tidak cukup (model kadang memberi "petunjuk" yang sebenarnya jawaban), jadi teks balasan
 * diperiksa terhadap kunci jawaban soal yang sedang dikerjakan.
 */
export interface AnswerKey {
  /** Jenis soal (pilihan_ganda, susun_kalimat, menulis, berbicara, …). */
  type: string;
  answer: string;
  /** Pilihan/kepingan lain; dipakai untuk mencari kata yang membedakan jawaban benar dari pengecoh. */
  options: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();

const words = (s: string) => norm(s).split(" ").filter(Boolean);

/** Kata yang ditulis dengan huruf Jepang dicek sebagai potongan teks (tidak ada spasi antar kata). */
const isJapanese = (s: string) => /[぀-ヿ一-鿿]/.test(s);

/**
 * Daftar kata/frasa jawaban yang muncul di balasan (kosong = aman).
 * - Jawaban utuh selalu dicek.
 * - Untuk pilihan ganda: kata di jawaban benar yang tidak ada di pilihan lain ("pagi" dari "Selamat pagi"
 *   bila pengecohnya "Selamat malam") juga dianggap bocor.
 * Soal berbicara dilewati: kalimat yang harus diucapkan memang tampil di layar.
 */
export function leakedTerms(reply: string, key: AnswerKey): string[] {
  if (key.type === "berbicara" || !key.answer.trim()) return [];
  const text = ` ${norm(reply)} `;
  const flat = norm(reply).replace(/ /g, "");
  const found = new Set<string>();

  const answer = norm(key.answer);
  if (answer.length >= 2) {
    const hit = isJapanese(answer) ? flat.includes(answer.replace(/ /g, "")) : text.includes(` ${answer} `);
    if (hit) found.add(key.answer.trim());
  }

  const others = new Set(key.options.filter((o) => norm(o) !== answer).flatMap(words));
  for (const w of words(key.answer)) {
    if (others.has(w) || w.length < 3) continue;
    const hit = isJapanese(w) ? flat.includes(w) : text.includes(` ${w} `);
    if (hit) found.add(w);
  }
  return [...found];
}

export const SAFE_HINT =
  "Hmm, kalau aku jelaskan lebih jauh, jawabannya jadi ketahuan. Coba baca soalnya pelan-pelan sekali lagi dan ingat materi bab ini ya. Kamu pasti bisa!";
